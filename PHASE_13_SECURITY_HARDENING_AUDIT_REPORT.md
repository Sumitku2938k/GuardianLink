# GUARDIANLINK — PHASE 13: SECURITY HARDENING
## Security Audit Report: Image Processing, AI Service Networking & Internal Service Authentication

**Target Platform:** GuardianLink AI-Assisted Missing Child Safety Platform  
**Auditor Roles:** Senior Application Security Engineer, Backend Architect, Docker Security Engineer, AI Infrastructure Security Engineer  
**Date:** October 24, 2026  
**Status:** Audit Completed — Pre-Implementation Baseline Established  

---

## 1. Executive Summary

Phase 13 focuses on deep security hardening across three interdependent attack surfaces of the GuardianLink platform:
1. **Untrusted Image Upload Pipeline & File Processing**: Ensuring that file uploads cannot bypass validation via MIME/extension spoofing, do not contain malicious executable payloads disguised as photographs, cannot cause denial-of-service via decompression bombs or extreme dimensions, and maintain transactional cleanup integrity across Cloudinary, MongoDB, and AI biometric enrollment.
2. **AI Microservice Network Isolation**: Ensuring that the internal FastAPI biometric microservice (InsightFace SCRFD + ArcFace) and the Qdrant vector database cannot be accessed directly by web browsers, untrusted clients, or external internet traffic, restricting communication strictly to the Express backend via a private Docker network.
3. **Internal Service-to-Service Authentication**: Ensuring that all internal operational AI endpoints (`/enroll`, `/search`, `/delete`) enforce shared pre-shared secret key authentication (`X-Internal-Service-Key`), fail closed when credentials are absent or invalid, prevent timing side-channel attacks, and never leak credentials or internal architectural details.

This audit evaluates the codebase as verified during Phase 12 (where 252 server tests, 59 client tests, and 95 Python AI tests passed), identifies confirmed security gaps, and outlines the precise remediation plan.

---

## 2. Image Upload and Storage Audit

### 2.1 Codebase Inspection Findings

#### A. Multer Middleware (`server/middleware/upload.js`)
- **Current Behavior:**
  - Configures `multer.memoryStorage()` with a `5 * 1024 * 1024` (5MB) single-file limit (`files: 1`).
  - Defines `ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]` and `ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"]`.
  - In `fileFilter`, it inspects `file.mimetype` and `path.extname(file.originalname)`.
- **Security Deficiencies Identified:**
  1. **Header Spoofing / Magic Bytes Absence:** `file.mimetype` is taken directly from the client's HTTP request header (`Content-Type: image/jpeg`). `file.originalname` is taken directly from the client's file path. Multer does **not** inspect the file buffer's magic bytes (file signature). A malicious executable, PHP shell, or random binary payload named `malware.jpg` with header `Content-Type: image/jpeg` passes `uploadPhoto` without error!
  2. **Extension / Content Mismatch:** A PNG file renamed to `.jpg` or a JPEG file renamed to `.webp` is accepted without verifying that the file format matches the extension.
  3. **Zero Dimension & Pixel Count Bounds:** Neither Multer nor downstream route handlers validate image dimensions. A highly compressed 100KB "decompression bomb" (e.g., 40,000 x 40,000 pixels) passes Multer's 5MB size limit but expands to ~4.8 GB of raw RGB pixel memory when decoded, risking Node.js and Python memory exhaustion (OOM crashes).
  4. **Animated Image Handling:** Animated WebP files containing multiple frames are currently not inspected or rejected, creating unpredictable CPU load and potential memory exhaustion during AI face detection.
  5. **Empty / Corrupted Image Handling:** 0-byte or corrupted image buffers are only rejected downstream when Cloudinary or OpenCV fails, producing 500/502 errors rather than controlled 400 validation rejections.

#### B. Child Photo Controllers (`server/controllers/childController.js`)
- **`createChild` (Lines 116–208):**
  - If `req.file` exists, calls `uploadImage(req.file.buffer, { folder: "guardianlink/children" })`.
  - If MongoDB save fails, catches and safely calls `deleteImage(uploadedPhoto.cloudinaryPublicId)`.
  - Initiates `enrollChildBiometric(child._id, ...)` asynchronously with non-blocking error handling.
- **`updateChildPhoto` (Lines 485–594):**
  - Replaces child photo: uploads `newUpload` to Cloudinary first, updates MongoDB, and only deletes `oldPublicId` once MongoDB persistence succeeds.
  - If MongoDB fails, cleans up `newUpload.cloudinaryPublicId` to prevent orphaned assets.
  - Re-enrolls biometric vector in Qdrant.
- **`deleteChildPhoto` (Lines 601–670):**
  - Deletes Cloudinary asset via `deleteImage(child.cloudinaryPublicId)`.
  - Deletes vector point via `aiService.deleteChildFace(child._id)`.
  - Sets `photoUrl: ""`, `cloudinaryPublicId: ""`, `faceProfileId: ""`, `biometricStatus: "not_enrolled"`.
- **Security Deficiencies Identified:**
  - `childController` assumes that passing through `uploadPhoto` guarantees a safe, valid image. Because `uploadPhoto` does not verify magic bytes or dimensions, unvalidated raw buffers reach `uploadImage` (Cloudinary) and `enrollChildBiometric` (FastAPI).

#### C. Citizen Photo Search (`server/controllers/citizenController.js` & `server/services/citizenPhotoSearchService.js`)
- **Current Behavior:**
  - Route `/api/citizen/search-missing-child` uses `uploadPhoto`.
  - Controller passes `req.file.buffer` to `citizenPhotoSearchService.searchMissingChildPhoto`.
  - In `citizenPhotoSearchService.js`: invokes `aiService.searchSimilarFaces(imageBuffer)`.
- **Security Deficiencies Identified:**
  - Directly exposes the AI search pipeline to unverified buffers. If an attacker submits a malformed image, the request travels to the Python AI service before being rejected.

#### D. Cloudinary Storage (`server/config/cloudinary.js`)
- Streams `buffer` to Cloudinary via `Readable.from(buffer).pipe(uploadStream)`.
- Enforces transformation limits (`width: 1000, height: 1000, crop: "limit"`).
- Does not inspect buffer magic numbers prior to streaming.

#### E. SSRF Protection in Remote Image Download (`server/services/childBiometricService.js`)
- **Current Behavior:**
  - `downloadChildPhoto(photoUrl)` validates:
    - HTTPS protocol only.
    - Hostname must be in `ALLOWED_CLOUDINARY_HOSTS` or end with `.cloudinary.com`.
    - Explicit rejection of localhost, 127.0.0.1, ::1, and RFC 1918 private subnets (`10.*`, `192.168.*`, `172.16-31.*`, `169.254.*`).
    - Bounded download timeout (5000 ms) and max size (5 MB).
- **Audit Assessment:** SSRF protection on remote image downloads is already well-implemented and must be strictly preserved.

---

## 3. AI Service Networking Audit

### 3.1 Codebase Inspection Findings

#### A. Docker Compose File (`docker-compose.yml`)
- **Service Configuration for `ai-service` (Lines 101–132):**
  ```yaml
  ai-service:
    build:
      context: ./ai-service
      dockerfile: Dockerfile
    container_name: guardianlink-ai-service
    restart: unless-stopped
    ports:
      - "127.0.0.1:8000:8000"
    environment:
      HOST: "0.0.0.0"
      PORT: 8000
      INTERNAL_SERVICE_KEY: ${INTERNAL_SERVICE_KEY:-dev_internal_secret_change_in_production}
      QDRANT_URL: http://qdrant:6333
  ```
- **Service Configuration for `qdrant` (Lines 85–100):**
  ```yaml
  qdrant:
    image: qdrant/qdrant:v1.19.2
    container_name: guardianlink-qdrant
    restart: unless-stopped
    ports:
      - "127.0.0.1:6333:6333"
  ```
- **Service Configuration for `server` (Lines 23–53):**
  ```yaml
  server:
    ports:
      - "5000:5000"
    environment:
      AI_SERVICE_URL: http://ai-service:8000
      INTERNAL_SERVICE_KEY: ${INTERNAL_SERVICE_KEY:-dev_internal_secret_change_in_production}
  ```

#### B. Network Architecture Analysis
1. **Host Port Publishing Risk:**
   - In `docker-compose.yml`, both `ai-service` and `qdrant` publish ports to `127.0.0.1:8000` and `127.0.0.1:6333`.
   - While `127.0.0.1` prevents direct external ingress on default non-firewalled machines, on shared servers, reverse proxies (e.g. Nginx/Traefik) or multi-tenant hosting environments, any process running on the host or any reverse proxy misconfiguration could expose port 8000 to the public.
   - In production deployments, **port 8000 must NOT be published to the host at all**. The Express container connects to `http://ai-service:8000` through Docker internal DNS, rendering host port mapping completely unnecessary for production operations.
2. **Docker Network Segregation:**
   - All services currently run in a single default bridge network.
   - Recommended Hardening: Introduce an isolated internal network (e.g., `ai_internal_net` or dedicated back-tier network) for `server <-> ai-service <-> qdrant` communication, ensuring that frontend client containers and database browsers have zero direct layer-3 network routing to the biometric AI service.

---

## 4. Internal Service Authentication Audit

### 4.1 Codebase Inspection Findings

#### A. FastAPI Internal Auth Middleware (`ai-service/app/middleware/internal_auth.py`)
- **Current Behavior:**
  - Extracts `X-Internal-Service-Key` from request headers.
  - If missing: raises HTTP 401 `Missing required header: X-Internal-Service-Key`.
  - Uses `secrets.compare_digest(x_internal_service_key, expected_key)` for constant-time comparison against timing side-channel attacks.
  - If mismatch: raises HTTP 401 `Invalid internal service key. Access denied.`.
- **Security Deficiencies Identified:**
  1. **Fail-Closed on Unset Secret:** If `settings.INTERNAL_SERVICE_KEY` is not set or empty, `compare_digest` could allow empty-header requests if both are empty. The service must fail closed on startup if `INTERNAL_SERVICE_KEY` is missing or default in non-development environments.
  2. **Default Insecure Secret:** `config.py` defaults to `"dev_internal_secret_change_in_production"`. In production, startup must be aborted or fail health checks if this placeholder is detected.

#### B. FastAPI Route Protection Inventory

| Route Path | HTTP Method | Router File | Authentication Dependency | Classification | Audit Assessment |
|---|---|---|---|---|---|
| `/health` | GET | `health.py` | None | Health/Liveness Probe | **Needs Hardening**: Exposes `collection_name`, `model_name`, and `threshold` in `details` payload without authentication. |
| `/internal/ai/enroll` | POST | `enroll.py` | `Depends(verify_internal_key)` | Operational Biometric | Protected with constant-time key check. |
| `/internal/face/enroll` | POST | `enroll.py` | `Depends(verify_internal_key)` | Operational Biometric (Alias) | Protected with constant-time key check. |
| `/internal/ai/search` | POST | `search.py` | `Depends(verify_internal_key)` | Operational Biometric | Protected with constant-time key check. |
| `/internal/face/search` | POST | `search.py` | `Depends(verify_internal_key)` | Operational Biometric (Alias) | Protected with constant-time key check. |
| `/internal/ai/delete/{child_id}` | DELETE | `delete.py` | `Depends(verify_internal_key)` | Operational Biometric | Protected with constant-time key check. |
| `/internal/face/delete/{child_id}`| DELETE | `delete.py` | `Depends(verify_internal_key)` | Operational Biometric (Alias) | Protected with constant-time key check. |
| `/internal/ai/{child_id}` | DELETE | `delete.py` | `Depends(verify_internal_key)` | Operational Biometric | Protected with constant-time key check. |
| `/internal/face/{child_id}` | DELETE | `delete.py` | `Depends(verify_internal_key)` | Operational Biometric (Alias) | Protected with constant-time key check. |
| `/docs`, `/redoc`, `/openapi.json` | GET | `main.py` | None | Swagger UI / Schema | **Needs Hardening**: Publicly accessible. Should be disabled in production. |

#### C. Express AI Client (`server/services/aiService.js` & `server/config/ai.js`)
- `_request()` attaches `X-Internal-Service-Key` header when `options.isProtected = true`.
- Asserts that key is non-empty before making protected requests (`_assertAuthKey`).
- Uses `AbortController` with configurable timeout (`AI_SERVICE_TIMEOUT_MS`, default 10000–20000ms).
- Parses responses safely without echoing raw keys in logs or errors.
- Client cannot supply or override `X-Internal-Service-Key` via user input or query parameters.

---

## 5. Risk Assessment Matrix

| Vulnerability / Risk | Severity | Exploitability | Impact | Planned Remediation |
|---|---|---|---|---|
| **MIME / Extension Spoofing** | **HIGH** | Easy | Arbitrary binary / executable files uploaded to Cloudinary & AI service | Inspect magic bytes (file signature) for JPEG, PNG, WebP; reject spoofed files. |
| **MIME / Extension Mismatch** | **MEDIUM** | Easy | Bypass extension checks, confusing storage and client renderers | Verify filename extension matches the detected binary format. |
| **Decompression Bomb (Resource Exhaustion)** | **HIGH** | Medium | Memory exhaustion (OOM crash) of Node.js backend and FastAPI AI engine | Validate dimensions and total pixel counts (e.g., max 4096px, max 16MP) before decoding. |
| **Animated WebP Resource Spikes** | **LOW** | Easy | Uncontrolled CPU spikes during multi-frame face detection | Inspect WebP VP8X animation flag; reject animated images. |
| **Corrupted / Empty Image Handling** | **MEDIUM** | Easy | 500/502 unhandled exceptions instead of 400 validation error | Enforce minimum size (100 bytes) and header integrity checks. |
| **Port 8000 Exposed to Host** | **HIGH** | Medium | Direct unauthenticated network access to AI service if host or proxy is compromised | Remove host port publishing in production configuration; use private Docker networking. |
| **Information Leakage in `/health`** | **LOW** | Easy | Reconnaissance of internal model, threshold, and Qdrant collection names | Minimize unauthenticated `/health` payload; strip internal configuration details. |
| **Public Swagger `/docs` in Production** | **LOW** | Easy | Reconnaissance of internal endpoint contracts | Disable `/docs`, `/redoc`, `/openapi.json` in production environment. |

---

## 6. Security Hardening Remediation Plan

### Step 1: Centralized Server-Side Image Security Validator (`server/utils/imageSecurityValidator.js`)
Implement a robust, dependency-free binary header inspector that:
1. Validates buffer existence and bounds (100 bytes <= size <= 5MB).
2. Inspects magic bytes:
   - JPEG: `FF D8 FF`
   - PNG: `89 50 4E 47 0D 0A 1A 0A`
   - WebP: `RIFF....WEBP`
3. Decodes binary headers to extract `width` and `height`:
   - Checks positive integers: `width >= 32`, `height >= 32`.
   - Bounds maximum dimensions: `width <= 4096`, `height <= 4096`.
   - Bounds maximum pixel count: `width * height <= 16,777,216` (16 Megapixels).
4. Detects and rejects animated WebP images (VP8X animation bit).
5. Validates that the file extension (if provided) matches the detected binary format.
6. Validates that the declared MIME type matches the detected binary format.

### Step 2: Integrate Validator into Upload Middleware & Controllers
1. Update `server/middleware/upload.js` to execute `validateImageBuffer()` immediately after Multer receives the buffer in memory.
2. Ensure invalid images return controlled HTTP 400 responses with exact codes:
   - `INVALID_FILE_SIGNATURE`
   - `MIME_EXTENSION_MISMATCH`
   - `IMAGE_DIMENSIONS_EXCEEDED`
   - `IMAGE_PIXELS_EXCEEDED`
   - `ANIMATED_IMAGE_REJECTED`
   - `IMAGE_CORRUPTED`
   - `IMAGE_TOO_SMALL`
3. Add defensive validation in `childController.js` before `uploadImage` and in `citizenPhotoSearchService.js` before calling the AI service.

### Step 3: Hardened Python AI Image Validation (`ai-service/app/engine/detector.py` & `upload.py`)
1. In `decode_image_input()`, check decoded OpenCV image dimensions:
   - Rejects images with `width > 4096` or `height > 4096` or `width * height > 16_777_216`.
2. In `upload.py`, enforce minimum file size (100 bytes).

### Step 4: Docker Compose Network Hardening
1. In `docker-compose.yml`:
   - Define a dedicated internal bridge network (`guardianlink-backend-net`).
   - For `ai-service`: Remove public host publishing for production or configure `expose: ["8000"]` with host binding restricted to dev. Provide `docker-compose.prod.yml` where port `8000` is **completely absent from `ports:`**.
   - For `qdrant`: Restrict access to `ai-service`.
2. Verify that Express can resolve `http://ai-service:8000` over the private network.

### Step 5: Internal Service Authentication Hardening
1. In `ai-service/app/config.py` & `internal_auth.py`:
   - Enforce that `INTERNAL_SERVICE_KEY` cannot be empty or null (fail closed).
   - In production mode, reject placeholder keys.
2. In `ai-service/app/routes/health.py`:
   - Minimize `/health` response to `{"status": "ok", "service": "guardianlink-ai-service"}` to prevent internal architectural reconnaissance.
3. In `ai-service/app/main.py`:
   - Disable `/docs`, `/redoc`, and `/openapi.json` when `ENVIRONMENT=production`.

### Step 6: Automated Security Test Suites
1. Create `server/tests/phase13_image_security.test.js`:
   - Tests valid JPEG, PNG, WebP.
   - Tests MIME header spoofing (fake image/jpeg on text/exe).
   - Tests extension spoofing (`.jpg` on executable bytes).
   - Tests MIME/extension mismatch.
   - Tests corrupted / truncated image buffers.
   - Tests empty image (0 bytes) and sub-minimum files (<100 bytes).
   - Tests oversized images (>5MB) and boundary-size images (5MB).
   - Tests excessive dimensions (>4096px) and decompression bomb pixel counts (>16MP).
   - Tests animated WebP rejection.
   - Tests Cloudinary cleanup failure behavior on database save errors.
2. Create `server/tests/phase13_ai_security.test.js`:
   - Tests AI client header attachment (`X-Internal-Service-Key`).
   - Tests rejection of missing, invalid, or forged keys.
   - Tests key confidentiality in logs and error responses.
   - Tests healthcheck minimal data leakage.
   - Tests client inability to override internal service key.
3. Add Python FastAPI tests in `ai-service/tests/test_security.py` verifying endpoint auth rejection.

### Step 7: Regression and Production Verification
1. Run all Phase 13 test suites.
2. Run full backend regression (252+ tests).
3. Run full client regression (59+ tests).
4. Run Python AI pytest suite (95+ tests).
5. Build client frontend production bundle.
6. Generate `PHASE_13_SECURITY_HARDENING_IMPLEMENTATION_REPORT.md`.
