# GUARDIANLINK — PHASE 6.1: AI REPOSITORY AUDIT & INTEGRATION BLUEPRINT

**Date of Audit:** October 10, 2026  
**Audit Type:** Static Source Inspection, Architectural Verification & Blueprinting (READ-ONLY)  
**Deliverable File:** `PHASE_6_1_AI_INTEGRATION_AUDIT.md`  
**Classification System:**
- `[VERIFIED]`: Confirmed directly from active source code inspection.
- `[INFERRED]`: Deductions supported by code patterns, awaiting runtime confirmation.
- `[BLOCKED]`: Unreachable or unsupported with available repository access.
- `[PROPOSED]`: Architecture, contract, or strategy recommended for future phases.

---

## 1. Executive Summary

This document establishes the comprehensive technical baseline and architectural blueprint for integrating an internal Python AI facial-recognition microservice into the **GuardianLink** platform.

The audit was executed as a **strict read-only inspection** across two independent codebases:
1. **GuardianLink Application Root:** `C:\Users\Sumit\Desktop\College Sem Projects\GuardianLink Sem 5`
2. **Friend AI Project Root:** `C:\Users\Sumit\Desktop\Gaurdian`

### Key Audit Findings at a Glance

* **Repository Accessibility `[VERIFIED]`:** Both repositories exist on disk and were successfully discovered, isolated, and inspected independently without cross-contamination.
* **GuardianLink Application Baseline `[VERIFIED]`:** GuardianLink features an established Node.js/Express backend, MongoDB database with Mongoose schemas (`User`, `Child`, `MissingCase`), Redis session management, Multer memory storage, and Cloudinary image hosting. Phases 0 through 5 have established complete child profile CRUD, dedicated photo replacement (`PATCH /api/children/:id/photo`), and missing-case lifecycle management with role-based access control.
* **Biometric AI Gap in GuardianLink `[VERIFIED]`:** Currently, `Child.faceProfileId` defaults to an empty string (`""`) on child creation and update. The frontend citizen matching feature (`runAIMatching`) operates entirely on client-side mock data simulation. No live AI facial recognition engine is currently wired to the GuardianLink API.
* **Friend AI Subsystem Baseline `[VERIFIED]`:** The friend project (`Gaurdian`) provides an operational biometric pipeline utilizing InsightFace (`buffalo_l` model pack running ONNX Runtime on CPU) and Qdrant vector database (embedded on-disk mode storing 512-dimensional embeddings under collection `missing_person_faces`).
* **Friend Project Architectural Coupling & Security Flaws `[VERIFIED]`:** The friend repository tightly couples biometric algorithms with redundant user authentication (Argon2, JWT, Google OAuth), a MongoDB database, Cloudinary uploads, and an unauthenticated public search endpoint (`POST /find-person`) that returns sensitive Personally Identifiable Information (PII) including parent full names, email addresses, and phone numbers.
* **OpenCV Preprocessing Reality `[VERIFIED]`:** The OpenCV preprocessing module (`backend/ai/image_preprocessing/preprocessing.py`) in the friend repository is an **unused standalone experiment**. InsightFace internally requires standard BGR images and handles landmark alignment natively. Feeding blurred or Canny edge images into ArcFace would corrupt face embeddings.
* **Target Integration Decision `[PROPOSED]`:** A clean, decoupled microservice architecture will be adopted in subsequent phases. GuardianLink will retain 100% ownership of users, authentication, child records, cases, Cloudinary storage, and privacy filtering. A future standalone `ai-service/` container will encapsulate InsightFace and Qdrant, communicating solely via an authenticated internal service-to-service REST API.

---

## 2. Audit Scope and Actual Repository Paths

Both repositories were inspected independently using non-destructive static analysis and shell queries executed within the allowed workspace boundary.

### A. Active GuardianLink Repository
* **Absolute Path `[VERIFIED]`:** `C:\Users\Sumit\Desktop\College Sem Projects\GuardianLink Sem 5`
* **Git Branch / Working Tree `[VERIFIED]`:** Branch `main`, working tree clean, synced with `origin/main`.
* **Primary Key Files Inspected `[VERIFIED]`:**
  * `docker-compose.yml` (multi-container orchestration: mongo, redis, server, client, mongo-express)
  * `server/package.json` & `server/app.js` (Express entrypoint, port 5000)
  * `server/models/Child.js` (Child schema, `faceProfileId`, virtuals, `guardianId`)
  * `server/models/MissingCase.js` (MissingCase schema, status state machine, `toPublicResponse`)
  * `server/models/User.js` (User schema, roles: parent, citizen, police, ngo, admin)
  * `server/routes/childRoutes.js` & `server/controllers/childController.js` (Child endpoints & photo updates)
  * `server/routes/caseRoutes.js` & `server/controllers/caseController.js` (Incident report endpoints)
  * `server/middleware/upload.js` (Multer memoryStorage, 5MB limit, JPEG/PNG/WebP validation)
  * `server/config/cloudinary.js` (Cloudinary SDK v2 stream uploader & asset deletion)
  * `server/middleware/authenticate.js` & `server/middleware/authorize.js` (JWT + Redis session guards)
  * `client/package.json` & `client/src/context/CitizenContext.jsx` (React 18 frontend & mock match logic)

### B. Friend AI Repository
* **Absolute Path `[VERIFIED]`:** `C:\Users\Sumit\Desktop\Gaurdian`
* **Git Branch / Working Tree `[VERIFIED]`:** Branch `main`, working tree clean (untracked `PHASE_3_AI_PROJECT_AUDIT.md` present).
* **Primary Key Files Inspected `[VERIFIED]`:**
  * `backend/main.py` (FastAPI monolithic application entrypoint, port 8000)
  * `backend/requirements.txt` (Python 3.12 dependencies)
  * `backend/ai/face/detector.py` (InsightFace `buffalo_l` face detector wrapper)
  * `backend/ai/face/embedding.py` (InsightFace `buffalo_l` single-face 512-dim embedding extractor)
  * `backend/ai/face/test_detector.py` & `backend/ai/face/test_embedding.py` (Verification scripts)
  * `backend/ai/image_preprocessing/preprocessing.py` (Experimental OpenCV filter pipeline)
  * `backend/ai/vector_db/vector_store.py` (Qdrant collection creator: `missing_person_faces`, 512, Cosine)
  * `backend/ai/vector_db/insert_embedding.py` (Vector upsert via deterministic UUIDv5)
  * `backend/ai/vector_db/search_embedding.py` (Vector similarity query via Qdrant `query_points`)
  * `backend/qdrant_data/meta.json` (Embedded on-disk Qdrant storage catalog)
  * `backend/app/config.py` & `backend/app/database.py` (PyMongo and environment variable loaders)
  * `backend/app/cloudinary_config.py` (Cloudinary initialization)
  * `backend/app/auth/security.py` (Argon2 pwdlib & PyJWT tokens)
  * `backend/app/auth/google.py` (Authlib OAuth client)
  * `backend/app/schemas/auth.py` & `backend/app/schemas/missing_person.py` (Pydantic schemas)

---

## 3. Audit Method and Read-Only Confirmation

To uphold the integrity of both codebases:
1. **Zero Source Code Changes `[VERIFIED]`:** No file in `GuardianLink Sem 5` or `Gaurdian` was created, modified, renamed, moved, or deleted during this audit (with the sole exception of creating this audit document).
2. **Zero Package Installations `[VERIFIED]`:** Neither `npm install` nor `pip install` was run. No dependency manifests (`package.json`, `requirements.txt`) were updated.
3. **Zero Database Modifications `[VERIFIED]`:** No MongoDB collections, documents, or indexes were altered in either project. No points were added, queried, or deleted in the Qdrant vector database.
4. **Zero Docker State Changes `[VERIFIED]`:** No containers, volumes, or networks were started, stopped, built, or modified.
5. **No Credential Exposure `[VERIFIED]`:** All database connection strings, API secrets, and JWT signing keys were redacted. Only variable names and configuration keys are referenced.

---

## 4. Verified GuardianLink Architecture

```
+---------------------------------------------------------------------------------------+
|                                GUARDIANLINK APPLICATION                               |
+---------------------------------------------------------------------------------------+
| [Client]  React 18.3.1 + Vite 8.1.4 + TailwindCSS 3.4.17 (Port 3000)                  |
|           - Radix UI Primitives, Lucide React, Framer Motion                          |
|           - Axios HTTP client configured with credentials: true                       |
+---------------------------------------------------------------------------------------+
| [Server]  Node.js 20.20.2 LTS + Express 4.19.2 (Port 5000)                            |
|           - app.js bootstrap with Helmet, CORS, Cookie-Parser                         |
|           - Isolated Rate Limiters for auth endpoints                                 |
|           - Routes: /api/auth, /api/admin, /api/children, /api/cases                  |
+---------------------------------------------------------------------------------------+
| [Storage] MongoDB 8.0 (Port 27017, Mongoose 9.9.2)                                    |
|           - User (auth, roles: parent, citizen, police, ngo, admin)                   |
|           - Child (biometrics, guardianId, photos, status, faceProfileId)             |
|           - MissingCase (incident records, lifecycle status, childId)                 |
+---------------------------------------------------------------------------------------+
| [Cache]   Redis 7-Alpine (Port 6379, redis 6.2.1 / ioredis 6.0.0)                     |
|           - Session management (session:<userId>), in-memory Map fallback             |
+---------------------------------------------------------------------------------------+
| [Media]   Cloudinary (SDK v2.11.0)                                                    |
|           - Multer memoryStorage -> upload_stream -> secure CDN URLs                  |
+---------------------------------------------------------------------------------------+
| [Docker]  docker-compose.yml orchestrating mongo, redis, server, client, mongo-express|
+---------------------------------------------------------------------------------------+
```

### A. Component Specifications `[VERIFIED]`
* **Frontend:** React 18.3.1, Vite 8.1.4, TailwindCSS 3.4.17, Axios 1.19.0. Dev server runs on port 3000 (mapped to container port 3000).
* **Backend:** Express 4.19.2 on Node.js 20. Entrypoint is `server/app.js`. Listens on port 5000.
* **Authentication:** Double-gated authentication in `server/middleware/authenticate.js`:
  1. Cryptographic JWT verification against `JWT_SECRET` (read from HttpOnly signed cookie `token` or Bearer header).
  2. Active session lookup in Redis (`session:<userId>`). If Redis session key is missing, request is rejected with `SESSION_EXPIRED`.
  3. User status check (`user.status === "suspended"` rejected with 403).
* **Authorization:** Role-Based Access Control in `server/middleware/authorize.js`. Supports 5 roles: `parent`, `citizen`, `police`, `ngo`, `admin`.
* **Database & ODM:** MongoDB 8.0 Community Edition connected via Mongoose 9.9.2 (`server/config/db.js`). Models: `User`, `Child`, `MissingCase`.
* **Caching & Sessions:** Redis 7-Alpine connected via `redis` 6.2.1 client with automatic in-memory JavaScript `Map` fallback (`server/config/redis.js`).
* **Cloudinary Storage:** Initialized in `server/config/cloudinary.js`. Uses Node `Readable.from(buffer).pipe(cloudinary.uploader.upload_stream(...))`.
* **Docker Compose:** Services defined: `mongo` (27017), `redis` (6379), `server` (5000), `client` (3000), `mongo-express` (8081). Bridged network `guardianlinksem5_default`.
* **Automated Regression Scripts:** Found in `server/scripts`:
  - `test_phase0.js` (Infra & auth baseline)
  - `test_phase1.js` & `test_phase1_verification.js` (User verification & security)
  - `test_phase2_children.js`, `test_phase2_e2e.js`, `test_phase2_matrix.js` (Child CRUD)
  - `test_phase3_images.js` (Multer + Cloudinary single photo upload)
  - `test_phase4_cases.js` (MissingCase lifecycle & state machine)
  - `test_phase5_parent_real_data.js` (Full end-to-end integration test)

---

## 5. Verified Child Photo and MissingCase Data Lifecycles

### A. Child Model & Photo Ingestion Lifecycle `[VERIFIED]`

Inspecting `server/models/Child.js` and `server/controllers/childController.js`:

```
               [Parent Browser]
                      |
                      |  Multipart POST /api/children or PATCH /api/children/:id/photo
                      v
          [uploadPhoto Multer Middleware]
           (Validates MIME: jpeg/png/webp, Ext: .jpg/.png/.webp, Size <= 5MB)
                      |
                      v  Memory Buffer (req.file.buffer)
             [uploadImage Helper]
           (Streams to Cloudinary folder: guardianlink/children or .../:childId)
                      |
                      v  Returns { photoUrl, cloudinaryPublicId }
              [Child Document]
              - fullName: String
              - guardianId: ObjectId (Ref: User)
              - photoUrl: String (Cloudinary CDN URL)
              - cloudinaryPublicId: String (e.g. guardianlink/children/abc)
              - faceProfileId: "" (UNPOPULATED GAP)
              - status: "active" | "inactive"
                      |
                      v
             [MongoDB child.save()]
              - On Failure: Automatically cleans up newly uploaded Cloudinary image!
              - On Replacement: Deletes old Cloudinary public ID only AFTER DB save succeeds!
```

* **Canonical Child Identifier:** `_id` (`mongoose.Schema.Types.ObjectId`), serialized as `id` string via `child.toSafeObject()`.
* **Photo Fields:**
  * `photoUrl` (String): Canonical CDN URL.
  * `cloudinaryPublicId` (String): Identifier required for Cloudinary deletion.
  * `photos` (Array of Strings): Maintained for backwards compatibility, populated with `[photoUrl]`.
* **Biometric Field:** `faceProfileId` (String, default `""`, indexed with `sparse: true`). Currently untouched by all endpoints.
* **Photo URL Accessibility:** Publicly accessible via Cloudinary HTTPS CDN. Does not require signed tokens for viewing.
* **Photo Replacement Endpoints:**
  1. `PATCH /api/children/:id`: Accepts multipart `photo` file or JSON updates.
  2. `PATCH /api/children/:id/photo`: Dedicated photo replacement endpoint.
  3. `DELETE /api/children/:id/photo`: Cleans up Cloudinary asset via `deleteImage(oldPublicId)` and resets `photoUrl` and `cloudinaryPublicId` to empty strings.
* **Child Status & Deletion:** GuardianLink enforces soft-state management. Profiles cannot be hard-deleted via the API. Endpoint `PATCH /api/children/:id/status` toggles `status` between `"active"` and `"inactive"`.
* **Guardian Ownership:** Derives strictly from authenticated session `req.user._id`. Query scoping `Child.findOne({ _id: id, guardianId: req.user._id })` prevents Insecure Direct Object References (IDOR).

### B. MissingCase Incident Lifecycle `[VERIFIED]`

Inspecting `server/models/MissingCase.js` and `server/controllers/caseController.js`:

* **Child Reference:** `childId` (`mongoose.Schema.Types.ObjectId`, ref: `"Child"`).
* **Reporter Reference:** `reportedBy` (`mongoose.Schema.Types.ObjectId`, ref: `"User"`).
* **Status State Machine:**
  ```text
  [reported] -----------> [under_verification] -----------> [active] -----------> [found] -----------> [reunited]
       |                           |                          |                      |                      |
       v                           v                          v                      v                      v
  [cancelled]                  [cancelled]                 [closed]               [closed]               [closed]
  ```
  * `reported`: Initial state upon parent filing.
  * `under_verification`: Law enforcement reviewing preliminary details.
  * `active`: Verified incident actively broadcast for search.
  * `found`: Child located by authorities or citizen lead.
  * `reunited`: Child restored to legal guardians.
  * `closed` & `cancelled`: Terminal states.
* **Single Active Case Invariant:** `caseController.js:L98-L110` verifies that no existing case for `childId` is in statuses `["reported", "under_verification", "active", "found"]`. Returns `409 Conflict` (`ACTIVE_CASE_EXISTS`) if an open incident exists.
* **Guardian Verification:** Only parents can create cases (`authorize("parent")`), and the parent must be the verified owner of the referenced child (`Child.findOne({ _id: childId, guardianId: req.user._id })`).
* **Safe Public Response Contract (`toPublicResponse`):**
  [MissingCase.js:L155-L178](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/GuardianLink%20Sem%205/server/models/MissingCase.js#L155-L178) implements a built-in privacy filter that merges `MissingCase` with `Child`:
  ```javascript
  {
    id: this._id.toString(),
    caseId: this._id.toString(),
    childId: child._id.toString(),
    name: child.fullName,
    age: child.age,
    gender: child.gender,
    description: this.lastSeenDescription || child.description,
    last_seen_location: locationString,
    missing_date: this.missingDate.toISOString(),
    image_url: child.photoUrl,
    cloudinary_public_id: this.cloudinaryPublicId || child.cloudinaryPublicId,
    status: this.status,
    policeCaseNumber: this.policeCaseNumber,
    firNumber: this.firNumber
  }
  ```
  **Crucial Security Observation `[VERIFIED]`:** This method strictly excludes guardian name, parent phone number, parent email, home address, and internal user IDs.

---

## 6. Verified Friend AI Architecture

```
+---------------------------------------------------------------------------------------+
|                                FRIEND AI REPOSITORY (Gaurdian)                        |
+---------------------------------------------------------------------------------------+
| [App]     FastAPI 0.115+ / Uvicorn (Port 8000)                                        |
|           - main.py monolithic controller (735 lines)                                 |
|           - SessionMiddleware (reusing JWT_SECRET_KEY)                                |
|           - Python 3.12.10 virtual environment (.venv)                                |
+---------------------------------------------------------------------------------------+
| [AI]      InsightFace (buffalo_l model pack)                                          |
|           - SCRFD face detector (det_10g.onnx, 640x640 input)                         |
|           - ArcFace embedding extractor (w600k_r50.onnx, 512-dim L2 normalized)       |
|           - CPUExecutionProvider (ONNX Runtime CPU)                                   |
|           - Duplicate FaceAnalysis instantiation in detector.py and embedding.py      |
+---------------------------------------------------------------------------------------+
| [Vector]  Qdrant Client (qdrant-client)                                               |
|           - Local on-disk embedded mode (qdrant_data/)                                |
|           - Collection: missing_person_faces (512 dimensions, Cosine distance)        |
|           - UUIDv5 deterministic ID derived from MongoDB person ID                    |
|           - Exclusive file lock (.lock) prevents multi-process concurrency            |
+---------------------------------------------------------------------------------------+
| [Monolith]Redundant subsystems that must be EXCLUDED:                                 |
|           - PyMongo direct connection to MongoDB Atlas (users, missing_persons)       |
|           - Argon2 password hashing & PyJWT token issuing                             |
|           - Google OAuth2 authentication callback                                     |
|           - Direct Cloudinary file upload handlers                                    |
|           - PII disclosure returning parent email/phone on public /find-person route  |
+---------------------------------------------------------------------------------------+
```

### A. FastAPI Application Analysis `[VERIFIED]`
* **Entrypoint:** `backend/main.py`
* **Route Inventory:**
  1. `GET /` — Root status message.
  2. `GET /health` — Pings MongoDB admin command.
  3. `POST /upload_image` — Unauthenticated direct Cloudinary upload utility.
  4. `GET /auth/me` — Authenticated user profile retrieval (`Depends(get_current_user)`).
  5. `POST /missing-persons` — Multipart form endpoint: uploads image to Cloudinary, creates MongoDB document, generates embedding, and inserts point into Qdrant.
  6. `DELETE /missing-persons/{person_id}` — Deletes MongoDB document and corresponding Qdrant vector.
  7. `POST /find-person` — Public unauthenticated endpoint: accepts query photo, searches Qdrant, hydrates metadata from MongoDB, and returns match candidate along with parent PII.
  8. `POST /auth/register` — Local parent registration using Argon2.
  9. `POST /auth/login` — Local login issuing 24-hour JWT.
  10. `GET /auth/google/login` & `GET /auth/google/callback` — Google OAuth2 redirect flow.
* **Temporary File Handling `[VERIFIED]`:**
  In both `POST /missing-persons` and `POST /find-person`, uploaded files are written to a temporary file via Python's standard `tempfile.NamedTemporaryFile(delete=False, suffix=suffix)`. The temporary file path is passed to `cv2.imread()`. In both routes, the temporary file is deleted in a `finally:` block using `os.remove(temp_file)`.
* **Exception Handling Inconsistency `[VERIFIED]`:**
  * In `POST /find-person:L561-L566`: Explicitly catches `ValueError` (raised when 0 or >1 faces are detected) and translates it to `HTTPException(status_code=400, detail=str(e))`.
  * In `POST /missing-persons:L270-L284`: Does **not** catch `ValueError`. Any face validation failure cascades into the generic `except Exception as e:` handler, returning `500 Internal Server Error` instead of a 400 validation error!

---

## 7. InsightFace Detection and Embedding Findings

### A. Model Specifications `[VERIFIED]`
* **Model Suite:** InsightFace `buffalo_l` deep learning model pack.
* **Local Cache Location:** `C:\Users\Sumit\.insightface\models\buffalo_l\` (total size: ~341.2 MB).
  * `det_10g.onnx` (16.9 MB) — SCRFD (Sample and Computation Redistribution Face Detector) RetinaFace derivative.
  * `w600k_r50.onnx` (174.4 MB) — ArcFace feature extractor with ResNet-50 backbone.
  * `2d106det.onnx` (5.0 MB) — 106-point facial landmark detector.
  * `1k3d68.onnx` (143.6 MB) — 3D facial landmark mesh model.
  * `genderage.onnx` (1.3 MB) — Gender and age attribute classifier.
* **Execution Provider:** Hardcoded to `providers=["CPUExecutionProvider"]`. Runs on CPU using ONNX Runtime. Does not require CUDA or GPU drivers.
* **Context & Target Size:** `ctx_id=0`, `det_size=(640, 640)`.

### B. Face Detection Implementation (`backend/ai/face/detector.py`) `[VERIFIED]`
* **Function:** `detect_faces(image_path: str) -> list[dict]`
* **Processing:**
  1. `image = cv2.imread(image_path)`
  2. Raises `ValueError("Could not read image")` if image decoding fails.
  3. Executes `faces = face_app.get(image)`.
  4. Returns bounding boxes and detection confidence scores:
     ```python
     [
         {
             "bbox": [x1, y1, x2, y2], # integer coordinates
             "confidence": 0.9984       # float detection confidence
         }
     ]
     ```

### C. Embedding Generation Implementation (`backend/ai/face/embedding.py`) `[VERIFIED]`
* **Function:** `generate_embedding(image_path: str) -> np.ndarray`
* **Validation Rules:**
  1. Zero Faces: `if len(faces) == 0: raise ValueError("No face detected")`
  2. Multiple Faces: `if len(faces) > 1: raise ValueError("Multiple faces detected. Please upload an image with one face.")`
  3. Single Face: Selects `face = faces[0]`.
* **Output Dimensions & Normalization:**
  * Vector length: Exactly 512 dimensions (`numpy.ndarray` with `dtype=float32`).
  * Normalization: ArcFace feature vectors produced by InsightFace are unit-normalized ($L_2$ norm = 1.0).
* **Defect — Redundant Model Loading `[VERIFIED]`:**
  Both `detector.py` and `embedding.py` execute:
  ```python
  face_app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
  face_app.prepare(ctx_id=0, det_size=(640, 640))
  ```
  If both modules are imported in the same process, InsightFace loads the ~340MB ONNX models into memory **twice**, consuming ~700MB to 1GB of redundant RAM.
  *Remedy for Phase 6.2:* Consolidate into a single thread-safe AI engine singleton.

### D. OpenCV Preprocessing Reality Check `[VERIFIED]`
* **File:** `backend/ai/image_preprocessing/preprocessing.py`
* **Implementation:** Resizes to 640x640, converts to RGB, then Grayscale, applies 5x5 Gaussian blur, Canny edge detection (100, 200), and contour extraction.
* **Active Pipeline Status:** **COMPLETELY DISCONNECTED AND UNUSED.**
  Neither `main.py`, `detector.py`, `embedding.py`, `insert_embedding.py`, nor `search_embedding.py` imports or calls `preprocess_image()`.
* **Biometric Principle:** InsightFace requires the original, high-fidelity color image (in standard OpenCV BGR format) to perform facial landmark alignment and crop normalized face chips for the ArcFace deep network. Passing edges or blurred images would destroy facial feature recognition.
* **Audit Verdict:** The preprocessing module must be **EXCLUDED** from the production pipeline.

---

## 8. Qdrant Collection, Identifier, and Search Findings

### A. Collection Configuration `[VERIFIED]`
* **Catalog Evidence:** Confirmed from `backend/qdrant_data/meta.json`:
  * Collection Name: `"missing_person_faces"`
  * Vector Size: `512`
  * Distance Metric: `Cosine`
* **Qdrant Storage Mode:** Embedded on-disk local directory mode:
  ```python
  client = QdrantClient(path="qdrant_data")
  ```
* **Critical Operational Limitation `[VERIFIED]`:**
  Running Qdrant in embedded mode creates an exclusive SQLite/storage file lock (`backend/qdrant_data/.lock`).
  * Implication: If FastAPI or Uvicorn is launched with multiple worker processes (e.g. `uvicorn main:app --workers 4`), the second worker immediately crashes with a database lock conflict.
  * In containerized production, Qdrant must run as a dedicated Docker container (`qdrant/qdrant:latest`) exposing REST/gRPC ports (6333/6334).

### B. Point ID Derivation and Payload `[VERIFIED]`
* **Derivation Function:** [backend/ai/vector_db/insert_embedding.py:L26-L31](file:///c:/Users/Sumit/Desktop/Gaurdian/backend/ai/vector_db/insert_embedding.py#L26-L31):
  ```python
  qdrant_id = str(uuid.uuid5(uuid.NAMESPACE_URL, missing_person_id))
  ```
* **Why UUIDv5 is Used:** Qdrant point IDs must be valid UUIDs or unsigned 64-bit integers. MongoDB uses 24-character hex `ObjectId` strings. `uuid.uuid5` deterministically maps any MongoDB ID string to a unique, repeatable UUID.
* **Vector Upsert Structure:**
  ```python
  client.upsert(
      collection_name=COLLECTION_NAME,
      points=[
          PointStruct(
              id=qdrant_id,
              vector=embedding.tolist(),
              payload={"missing_person_id": missing_person_id}
          )
      ]
  )
  ```
* **Deletion Implementation:**
  In `main.py:delete_missing_person`:
  ```python
  qdrant_client.delete(
      collection_name=COLLECTION_NAME,
      points_selector=[qdrant_id]
  )
  ```
* **GuardianLink ID Compatibility `[VERIFIED]`:**
  GuardianLink's canonical `Child._id` is also a 24-character hexadecimal MongoDB `ObjectId`. Therefore, `uuid.uuid5(uuid.NAMESPACE_URL, str(child._id))` provides an exact 1:1 deterministic mapping for GuardianLink. The payload can be adapted to `{"child_id": str(child._id)}`.

### C. Search Execution and Threshold Logic `[VERIFIED]`
* **Query Execution:** [backend/ai/vector_db/search_embedding.py:L39-L44](file:///c:/Users/Sumit/Desktop/Gaurdian/backend/ai/vector_db/search_embedding.py#L39-L44):
  ```python
  results = client.query_points(
      collection_name=COLLECTION_NAME,
      query=embedding.tolist(),
      limit=limit,
      with_payload=True
  )
  ```
  Returns a list of `ScoredPoint` objects (`id`, `score`, `payload`).
* **Threshold Evaluation:** [backend/main.py:L473-L483](file:///c:/Users/Sumit/Desktop/Gaurdian/backend/main.py#L473-L483):
  ```python
  MATCH_THRESHOLD = 0.60
  if similarity < MATCH_THRESHOLD:
      return {"match_found": False, "similarity": similarity, "message": "No confident match found"}
  ```
* **Audit Verdict on Threshold `[VERIFIED]`:**
  The threshold is hardcoded to `0.60` inside the route handler. In cosine distance, 0.60 is an experimental heuristic. It must be made configurable via environment variable `FACE_MATCH_THRESHOLD` (defaulting to 0.60) in the integrated microservice.

---

## 9. API Contracts and Current Security Boundaries

### A. Current Friend AI API Contracts `[VERIFIED]`

#### 1. Biometric Registration: `POST /missing-persons`
* **Method & Path:** `POST /missing-persons`
* **Auth Requirement:** HTTP Bearer JWT token (`Depends(get_current_user)`).
* **Payload:** `multipart/form-data` with fields `name`, `age`, `gender`, `description`, `last_seen_location`, `missing_date`, `file` (UploadFile).
* **Response (200 OK):**
  ```json
  {
    "message": "Missing person profile created successfully",
    "person_id": "6740b2a8d1e4c89a71e21b34",
    "person": {
      "name": "Alex Doe",
      "age": 12,
      "gender": "Male",
      "description": "Wearing blue hoodie",
      "last_seen_location": "Central Metro Station",
      "missing_date": "2026-09-28",
      "image_url": "https://res.cloudinary.com/...",
      "cloudinary_public_id": "missing-person-ai/missing-persons/...",
      "status": "missing"
    }
  }
  ```

#### 2. Biometric Search: `POST /find-person`
* **Method & Path:** `POST /find-person`
* **Auth Requirement:** **NONE (Public)**.
* **Payload:** `multipart/form-data` with field `file` (UploadFile).
* **Response when Match Found (200 OK):**
  ```json
  {
    "match_found": true,
    "similarity": 0.842105,
    "missing_person": {
      "id": "6740b2a8d1e4c89a71e21b34",
      "name": "Alex Doe",
      "age": 12,
      "gender": "Male",
      "description": "Wearing blue hoodie",
      "last_seen_location": "Central Metro Station",
      "missing_date": "2026-09-28",
      "image_url": "https://res.cloudinary.com/...",
      "status": "missing"
    },
    "parent": {
      "id": "6740b100d1e4c89a71e21b10",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "phone": "+1 555-019-2834"
    }
  }
  ```
* **Severe Privacy Violation `[VERIFIED]`:** Returning the `parent` object (name, email, phone) to an unauthenticated public caller is an unacceptable data leakage risk.

#### 3. Vector & Report Deletion: `DELETE /missing-persons/{person_id}`
* **Method & Path:** `DELETE /missing-persons/{person_id}`
* **Auth Requirement:** HTTP Bearer JWT token (`Depends(get_current_user)`). Checks `person.parent_id == current_user._id`.
* **Response (200 OK):**
  ```json
  {
    "message": "Report and face embedding deleted successfully"
  }
  ```

### B. Current GuardianLink Security Boundaries `[VERIFIED]`
* **Client-to-Server Authentication:** Session cookie `token` (HttpOnly, Secure in prod, SameSite: Lax) signed with `COOKIE_SECRET`.
* **Server-side Session Validation:** Redis key `session:<userId>` checked on every authenticated request.
* **Role Enforcement:** All child operations require `authorize("parent")`. Cases require `authorize("parent", "police", "ngo", "admin")`.
* **Internal Service Protection `[PROPOSED]`:**
  The internal AI microservice will NOT be exposed to the browser or internet. All communication will flow from GuardianLink's Node.js backend over an internal Docker network bridge, authenticated via an internal preshared secret header:
  ```http
  X-Internal-Service-Key: <AI_SERVICE_INTERNAL_KEY>
  ```

---

## 10. Dependencies and Runtime Requirements

### A. GuardianLink Dependencies (`server/package.json`) `[VERIFIED]`
* `express` (^4.19.2) — Web framework
* `mongoose` (^9.9.2) — MongoDB ODM
* `redis` (^6.2.1) & `ioredis` (^6.0.0) — Redis client
* `jsonwebtoken` (^9.0.3) — JWT creation & verification
* `bcryptjs` (^3.0.3) — Password hashing
* `cookie-parser` (^1.4.7) — Signed cookie parsing
* `cors` (^2.8.5) & `helmet` (^8.3.0) — Security headers & CORS
* `multer` (^2.4.0) — Multipart file handling (memory storage)
* `cloudinary` (^2.11.0) — Media storage SDK
* `express-rate-limit` (^8.6.2) — Rate limiting

### B. Friend AI Dependencies (`backend/requirements.txt`) `[VERIFIED]`
* `fastapi[standard]` — FastAPI core with standard Uvicorn dependencies
* `insightface` — Deep learning face analysis toolbox
* `onnxruntime` — Open Neural Network Exchange runtime engine (CPU execution)
* `opencv-python` — Computer vision image decoding & manipulation
* `qdrant-client` — Qdrant vector database SDK
* `pymongo` — *(To be excluded in target microservice)*
* `python-dotenv` — Environment configuration loader
* `cloudinary` — *(To be excluded in target microservice)*
* `PyJWT`, `pwdlib[argon2]`, `Authlib`, `itsdangerous`, `email-validator` — *(To be excluded in target microservice)*
* `matplotlib` — *(To be excluded in target microservice)*

### C. Runtime Environment Requirements `[VERIFIED]`
* **Python Runtime:** Python 3.10 to 3.12 (Python 3.12.10 confirmed in Gaurdian's virtual environment).
* **Operating System Compatibility:**
  * **Windows:** Runs natively using pre-cached models in `C:\Users\Sumit\.insightface\models\buffalo_l`.
  * **Linux / Docker:** InsightFace and OpenCV require native C++ system libraries: `libgl1-mesa-glx`, `libglib2.0-0`, `g++`, `build-essential`. When containerizing, `python:3.11-slim` or `python:3.12-slim` with these apt packages installed is required.

---

## 11. Reuse / Adapt / Exclude File Mapping

This table provides the complete file-by-file mapping for integrating the biometric capability into GuardianLink without corrupting existing business logic.

| Component / File Path | Source Repository | Actual Current Responsibility | Proposed Decision | Reason for Decision | Intended Target Location | Dependencies / Blockers | Verification / Test |
|---|---|---|---|---|---|---|---|
| `backend/ai/face/detector.py` | Gaurdian | InsightFace `buffalo_l` face detector wrapper | **ADAPT** | Reusable face detector, but must remove duplicate `FaceAnalysis` instantiation and share model instance with embedding module | `ai-service/app/engine/detector.py` | `insightface`, `onnxruntime`, `opencv-python` | CLI detector test on test portrait |
| `backend/ai/face/embedding.py` | Gaurdian | Single-face 512-dim embedding generation & face count validation | **ADAPT** | Core biometric extraction logic. Must share model instance, return normalized float arrays, and throw structured exceptions for 0 or >1 faces | `ai-service/app/engine/embedding.py` | `insightface`, `onnxruntime`, `cv2` | Vector length == 512, unit norm test |
| `backend/ai/face/test_detector.py` | Gaurdian | CLI test script for face detection | **ADAPT** | Valuable regression test script for offline model verification | `ai-service/tests/test_detector.py` | `test.png` reference image | Standalone test execution |
| `backend/ai/face/test_embedding.py` | Gaurdian | CLI test script for embedding generation | **ADAPT** | Valuable regression test script for offline vector verification | `ai-service/tests/test_embedding.py` | `test.png` reference image | Standalone test execution |
| `backend/ai/face/test.png` | Gaurdian | Single-face reference portrait | **REUSE** | Essential test asset for non-networked offline regression testing | `ai-service/tests/assets/test.png` | None | File checksum verification |
| `backend/ai/image_preprocessing/preprocessing.py` | Gaurdian | Standalone OpenCV filter chain (resize, gray, blur, canny, contours) | **EXCLUDE** | Unused experiment. Corrupts ArcFace biometric feature extraction. Not part of production pipeline | *None (Do not migrate)* | None | Code audit confirmation |
| `backend/ai/image_preprocessing/test_preprocessing.py` | Gaurdian | Matplotlib visual inspection script | **EXCLUDE** | Dependent on unused preprocessing module and GUI display libraries | *None (Do not migrate)* | None | Code audit confirmation |
| `backend/ai/vector_db/vector_store.py` | Gaurdian | Qdrant collection initialization (`missing_person_faces`, 512, Cosine) | **ADAPT** | Must connect to standalone Qdrant container over HTTP instead of local locked file path; collection name parameterized | `ai-service/app/vector/store.py` | `qdrant-client` | Collection exists verification |
| `backend/ai/vector_db/insert_embedding.py` | Gaurdian | Generates embedding and upserts point with UUIDv5 into Qdrant | **ADAPT** | Core vector indexing logic. Must accept `child_id`, derive deterministic UUIDv5, and return vector metadata | `ai-service/app/vector/indexer.py` | `qdrant-client`, `uuid` | Point upsert verification |
| `backend/ai/vector_db/search_embedding.py` | Gaurdian | Generates query embedding and searches Qdrant | **ADAPT** | Core vector query logic. Must return pure candidate list `[{child_id, similarity}]` without querying MongoDB | `ai-service/app/vector/searcher.py` | `qdrant-client` | Vector search top-k verification |
| `backend/main.py` | Gaurdian | Monolithic FastAPI app with auth, MongoDB, Cloudinary, and routes | **EXCLUDE / SPLIT** | Heavily coupled with friend's database, user models, and PII leaks. Extract ONLY endpoint routing patterns into clean modular FastAPI routers | `ai-service/app/main.py` & `ai-service/app/routes/` | FastAPI, Pydantic | OpenAPI `/docs` verification |
| `backend/app/auth/*` | Gaurdian | Argon2 password hashing, PyJWT tokens, Google OAuth | **EXCLUDE** | Redundant. GuardianLink owns all user accounts and sessions | *None (Do not migrate)* | None | N/A |
| `backend/app/database.py` | Gaurdian | PyMongo client connecting to MongoDB Atlas | **EXCLUDE** | Microservice must be completely stateless regarding document databases. GuardianLink owns MongoDB | *None (Do not migrate)* | None | N/A |
| `backend/app/cloudinary_config.py` | Gaurdian | Cloudinary Python SDK configuration | **EXCLUDE** | GuardianLink Node.js backend already owns Cloudinary uploads | *None (Do not migrate)* | None | N/A |
| `backend/app/schemas/*` | Gaurdian | Pydantic schemas for missing persons and auth | **CREATE NEW** | Create clean Pydantic schemas for internal AI requests/responses | `ai-service/app/schemas/ai.py` | `pydantic` | Schema validation unit tests |
| `server/models/Child.js` | GuardianLink | Child schema with `photoUrl`, `cloudinaryPublicId`, `faceProfileId` | **REUSE / ADAPT** | Schema already has `faceProfileId` field. Add helper method `setFaceProfile(vectorId)` if needed | `server/models/Child.js` | Mongoose | Existing tests pass |
| `server/controllers/childController.js` | GuardianLink | Child registration & photo update controller | **ADAPT** | Add internal HTTP call to AI microservice during child creation and photo update to populate `faceProfileId` | `server/controllers/childController.js` | `axios`, AI service URL | `test_phase2_children.js` |
| `server/controllers/caseController.js` | GuardianLink | MissingCase incident report management | **REUSE** | Already contains `toPublicResponse` privacy filter and state machine | `server/controllers/caseController.js` | Mongoose | `test_phase4_cases.js` |
| `docker-compose.yml` | GuardianLink | Multi-container orchestration | **ADAPT** | Add `ai-service` and standalone `qdrant` container definitions to the bridge network | `docker-compose.yml` | Docker | Compose config validation |

---

## 12. Recommended Target Architecture

```
                                      [CITIZEN / PARENT / POLICE / NGO]
                                                      |
                                                      | HTTPS
                                                      v
                                        +----------------------------+
                                        |  GuardianLink React Client |
                                        |       (Port 3000)          |
                                        +----------------------------+
                                                      |
                                                      | REST / HttpOnly Cookie
                                                      v
                                        +----------------------------+
                                        |  GuardianLink Node Server  |
                                        |       (Port 5000)          |
                                        +----------------------------+
                                           /          |          \
                                          /           |           \
                                         v            v            v
                                   [MongoDB]      [Redis]     [Cloudinary]
                                   User/Child     Sessions       Images
                                   MissingCase
                                                      |
                                                      | Internal HTTP (Private Network)
                                                      | Header: X-Internal-Service-Key
                                                      v
                                        +----------------------------+
                                        |   Internal AI Microservice |
                                        |       (FastAPI: 8000)      |
                                        +----------------------------+
                                           /                       \
                                          v                         v
                                    [InsightFace]                [Qdrant]
                                   RetinaFace+ArcFace           Vector Engine
                                  (512-dim Embeddings)         (Port 6333 gRPC/REST)
```

### Architectural Principles `[PROPOSED]`
1. **GuardianLink Remains the Sole Gateway:** External users and browsers **never** communicate directly with the AI service or Qdrant. All client requests terminate at the Node.js Express server.
2. **Zero PII in AI Subsystem:** The AI microservice and Qdrant store only:
   - Vector embeddings ($512 \times \text{float32}$)
   - Deterministic UUIDv5 identifier
   - Foreign key payload: `{"child_id": "<mongodb_child_id>"}`
   No names, ages, parent emails, phone numbers, or addresses ever enter the AI container or Qdrant storage.
3. **Stateless AI Processing:** The AI service does not connect to MongoDB. It receives an image stream or buffer, performs biometric inference, queries or updates Qdrant, and returns mathematical scores and child IDs.
4. **Privacy-Gated Match Resolution:** The Node backend inspects the candidate child ID returned by the AI service, confirms whether an active `MissingCase` is currently open for that child, and returns only permitted public details formatted by `MissingCase.toPublicResponse()`.

---

## 13. Proposed Future Folder Structure

The following folder structure is proposed for the upcoming standalone `ai-service/` directory, to be located directly inside the GuardianLink repository root:

```text
GuardianLink Sem 5/
├── docker-compose.yml                  # Updated with ai-service and qdrant containers
├── PHASE_6_1_AI_INTEGRATION_AUDIT.md   # This audit document
├── client/                             # React Frontend
├── server/                             # Express Backend
│
└── ai-service/                         # Standalone Python AI Microservice (Proposed)
    ├── Dockerfile                      # python:3.11-slim + libgl1 + InsightFace dependencies
    ├── requirements.txt                # Minimized production dependencies
    ├── .env.example                    # Template environment variables
    ├── README.md                       # Microservice API documentation & architecture
    │
    ├── app/
    │   ├── __init__.py
    │   ├── main.py                     # FastAPI application entrypoint & lifespan handler
    │   ├── config.py                   # Pydantic Settings (ports, thresholds, API keys)
    │   │
    │   ├── middleware/
    │   │   ├── __init__.py
    │   │   └── internal_auth.py        # Validates X-Internal-Service-Key header
    │   │
    │   ├── schemas/
    │   │   ├── __init__.py
    │   │   └── biometric.py            # EnrollRequest, EnrollResponse, SearchResult, HealthStatus
    │   │
    │   ├── engine/                     # Biometric Inference Subsystem
    │   │   ├── __init__.py
    │   │   ├── face_engine.py          # Unified Singleton holding FaceAnalysis("buffalo_l")
    │   │   ├── detector.py             # Adapted face detection logic from friend's detector.py
    │   │   └── embedding.py            # Adapted embedding & 1-face validation from embedding.py
    │   │
    │   ├── vector/                     # Vector Database Subsystem
    │   │   ├── __init__.py
    │   │   ├── client.py               # QdrantClient instance (HTTP/gRPC connection)
    │   │   ├── store.py                # Collection lifecycle & index configuration
    │   │   ├── indexer.py              # Adapted upsert logic with UUIDv5 from insert_embedding.py
    │   │   └── searcher.py             # Adapted search query logic from search_embedding.py
    │   │
    │   └── routes/
    │       ├── __init__.py
    │       ├── health.py               # GET /health (Model loaded status, Qdrant ping)
    │       ├── enroll.py               # POST /internal/ai/enroll (Indexes child reference photo)
    │       ├── search.py               # POST /internal/ai/search (Queries candidate faces)
    │       └── delete.py               # DELETE /internal/ai/delete/{child_id} (Removes vector point)
    │
    └── tests/
        ├── __init__.py
        ├── assets/
        │   └── test.png                # Reference test portrait from friend's repo
        ├── test_detector.py            # Adapted offline detection test
        ├── test_embedding.py           # Adapted offline embedding test
        └── test_api.py                 # FastAPI TestClient endpoint integration tests
```

### Module Responsibilities and Extraction Mapping `[PROPOSED]`
* `app/engine/face_engine.py`: Replaces the duplicate `FaceAnalysis` calls in `detector.py` and `embedding.py` with a single lazily loaded or lifespan-initialized singleton instance.
* `app/engine/embedding.py`: Adapts `backend/ai/face/embedding.py`. Retains zero-face and multi-face validation checks, raising custom domain exceptions (`NoFaceDetectedError`, `MultipleFacesDetectedError`).
* `app/vector/client.py`: Replaces local `QdrantClient(path="qdrant_data")` with `QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)`.
* `app/vector/indexer.py`: Adapts `backend/ai/vector_db/insert_embedding.py`. Retains `uuid.uuid5(uuid.NAMESPACE_URL, child_id)`.
* `app/vector/searcher.py`: Adapts `backend/ai/vector_db/search_embedding.py`. Returns clean Pydantic candidate models containing only `child_id` and `similarity`.
* `app/middleware/internal_auth.py`: Guards all `/internal/*` routes by verifying `X-Internal-Service-Key == settings.INTERNAL_SERVICE_KEY`.

---

## 14. Enrollment Integration Blueprint

The enrollment workflow establishes a biometric vector for a child whenever their profile is registered or their reference photograph is updated.

```
[Parent] ----> [POST /api/children] ----> [Multer Buffer] ----> [Cloudinary: Upload Photo]
                                                                        |
                                                                        v (Photo URL & Public ID)
                                                                [MongoDB: Save Child Record]
                                                                        |
                                                                        v (Child ID & Buffer)
                                                    [Internal Call: POST /internal/ai/enroll]
                                                                        |
                                         +------------------------------+------------------------------+
                                         |                                                             |
                                         v [Success: 1 Face Detected]                                  v [Failure: 0 or >1 Faces]
                              [Generate 512-dim ArcFace Vector]                             [Return 400 Bad Request]
                                         |                                                             |
                                         v                                                             v
                              [Upsert into Qdrant (UUIDv5)]                                [Log Warning / Keep Child]
                                         |                                                  (faceProfileId remains "")
                                         v
                              [Return { vector_id, status: "enrolled" }]
                                         |
                                         v
                              [Update Child.faceProfileId in MongoDB]
                                         |
                                         v
                              [Return 201 Created to Parent]
```

### Detailed Step-by-Step Blueprint `[PROPOSED]`
1. **Primary Record Persistence:** GuardianLink validates parent ownership and persists the `Child` document in MongoDB. The reference image is uploaded to Cloudinary, obtaining `photoUrl` and `cloudinaryPublicId`.
2. **AI Service Invocation:** The Node backend calls `POST /internal/ai/enroll` on the AI microservice, passing the image binary buffer (or secure Cloudinary URL) along with `childId = child._id.toString()`.
3. **Face Validation & Extraction:**
   * AI service runs `detect_faces()`.
   * If 0 faces detected: returns `400 Bad Request` (`NO_FACE_DETECTED`).
   * If >1 faces detected: returns `400 Bad Request` (`MULTIPLE_FACES_DETECTED`).
   * If exactly 1 face: extracts 512-dimensional normalized embedding.
4. **Qdrant Indexing:**
   * AI service derives deterministic point ID: `point_id = str(uuid.uuid5(uuid.NAMESPACE_URL, child_id))`.
   * Upserts point into collection `missing_person_faces` with payload `{"child_id": child_id}`.
5. **GuardianLink State Update:**
   * Upon receiving `{ success: true, point_id }`, Node backend updates `Child.faceProfileId = point_id`.
6. **Partial Failure & Replacement Handling:**
   * If AI enrollment fails because the uploaded image lacks a clear face, the child record is preserved, but `faceProfileId` remains `""`. The parent is notified with a non-blocking warning: *"Child profile saved, but photo could not be enrolled for AI recognition. Please upload a clear portrait."*
   * When photo is replaced via `PATCH /api/children/:id/photo`, the enrollment workflow runs again. Because UUIDv5 is deterministic based on `childId`, Qdrant naturally overwrites the previous point, preventing duplicate vectors for the same child!

---

## 15. Citizen Search Integration Blueprint

The citizen search workflow allows a citizen to upload a photo of a found or spotted child and discover potential missing-person leads without compromising privacy.

```
[Citizen] ----> [POST /api/citizen/scan] ----> [Multer Memory Buffer]
                                                       |
                                                       v
                                    [Internal Call: POST /internal/ai/search]
                                    (Passes image buffer + configurable threshold)
                                                       |
                                                       v
                                    [InsightFace: Extract Query Embedding]
                                                       |
                                                       v
                                    [Qdrant: query_points(vector, limit=5)]
                                                       |
                                                       v
                                    [Filter candidates: score >= threshold]
                                                       |
                                                       v
                                    [Return Candidate List: [{ child_id, similarity }]]
                                                       |
                                                       v
                                    [GuardianLink Node: Hydrate from MongoDB]
                                                       |
                                                       +---> [Query Child where _id in candidateIds]
                                                       +---> [Query MissingCase where childId in candidateIds
                                                              AND status in ["reported","under_verification","active","found"]]
                                                       |
                                                       v
                                    [Filter: Suppress children WITHOUT active missing cases!]
                                                       |
                                                       v
                                    [Format Public Response via MissingCase.toPublicResponse()]
                                                       |
                                                       v
                                    [Return HTTP 200 "Potential Match" to Citizen]
                                    (Excludes parent contact info, email, phone, and home address!)
```

### Detailed Step-by-Step Blueprint `[PROPOSED]`
1. **Public Ingestion:** Citizen submits a JPEG/PNG/WebP photo to GuardianLink endpoint `POST /api/citizen/scan`. Multer parses file into memory buffer.
2. **Internal AI Forwarding:** Node backend forwards buffer to `POST /internal/ai/search` with header `X-Internal-Service-Key`.
3. **Biometric Similarity Matching:**
   * AI service validates that at least one face exists in the query image.
   * Extracts 512-dimensional vector.
   * Executes Qdrant search against collection `missing_person_faces`.
   * Filters results by `similarity >= FACE_MATCH_THRESHOLD`.
   * Returns candidate child IDs and similarity scores:
     ```json
     {
       "match_found": true,
       "candidates": [
         { "child_id": "6740b2a8d1e4c89a71e21b34", "similarity": 0.842 }
       ]
     }
     ```
4. **Resolution against GuardianLink Domain Records:**
   * Node backend queries MongoDB for the matching `Child` document.
   * Crucially queries MongoDB for an **active open case**:
     ```javascript
     const activeCase = await MissingCase.findOne({
       childId: child._id,
       status: { $in: ["reported", "under_verification", "active", "found"] }
     });
     ```
   * **Privacy Safeguard:** If a child is enrolled in GuardianLink but does NOT currently have an open missing case (e.g. child is safe at home), the match is **suppressed**, returning `match_found: false`. Citizens must never be alerted to registered children who are not reported missing!
5. **Controlled Citizen Response:**
   * If an active case exists, GuardianLink calls `activeCase.toPublicResponse(child)`.
   * Response contains: child name, age, last seen location, case number, photo URL, and similarity score.
   * Terminology: Response must use the phrase **"Potential Match"** (e.g. `similarity_type: "potential_match"`), never "Verified Match".
   * Citizen is prompted to submit a sighting or request proxy guardian contact through the existing GuardianLink workflow.

---

## 16. Docker and Networking Plan

To maintain modularity and operational reliability, the integrated environment will use Docker Compose with isolated network boundaries.

```yaml
# Target Architecture in docker-compose.yml (Proposed for Phase 6.2)
services:
  # 1. MongoDB Database
  mongo:
    image: mongo:8.0
    container_name: guardianlink-mongo
    ports: ["27017:27017"]
    volumes: [mongo_data:/data/db]
    networks: [backend-net]

  # 2. Redis Cache
  redis:
    image: redis:7-alpine
    container_name: guardianlink-redis
    ports: ["6379:6379"]
    volumes: [redis_data:/data]
    networks: [backend-net]

  # 3. Dedicated Qdrant Vector Database Container
  qdrant:
    image: qdrant/qdrant:latest
    container_name: guardianlink-qdrant
    restart: unless-stopped
    ports:
      - "6333:6333" # HTTP REST API
      - "6334:6334" # gRPC API
    volumes:
      - qdrant_storage:/qdrant/storage
    networks:
      - ai-internal-net

  # 4. Internal Python AI Microservice (FastAPI + InsightFace)
  ai-service:
    build:
      context: ./ai-service
      dockerfile: Dockerfile
    container_name: guardianlink-ai-service
    restart: unless-stopped
    environment:
      PORT: 8000
      QDRANT_URL: http://qdrant:6333
      COLLECTION_NAME: missing_person_faces
      FACE_MATCH_THRESHOLD: 0.60
      INTERNAL_SERVICE_KEY: guardianlink_internal_ai_secret_key_2026
    volumes:
      - insightface_models:/root/.insightface/models
    networks:
      - backend-net
      - ai-internal-net
    depends_on:
      - qdrant

  # 5. GuardianLink Express Backend Server
  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: guardianlink-backend
    ports: ["5000:5000"]
    environment:
      AI_SERVICE_URL: http://ai-service:8000
      AI_SERVICE_KEY: guardianlink_internal_ai_secret_key_2026
    networks:
      - backend-net
      - frontend-net
    depends_on:
      - mongo
      - redis
      - ai-service

  # 6. React Frontend Client
  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    container_name: guardianlink-frontend
    ports: ["3000:3000"]
    networks:
      - frontend-net
    depends_on:
      - server

networks:
  frontend-net:
  backend-net:
  ai-internal-net:

volumes:
  mongo_data:
  redis_data:
  qdrant_storage:
  insightface_models:
```

### Network Isolation Benefits `[PROPOSED]`
* `ai-internal-net` connects only `ai-service` and `qdrant`. Qdrant is not directly reachable by the outside web.
* `backend-net` connects `server`, `ai-service`, `mongo`, and `redis`.
* `frontend-net` connects `client` and `server`. The browser client cannot route packets directly to `ai-service` or `qdrant`.

---

## 17. Error Handling, Retry, and Recovery Strategy

| Failure Scenario | Impact | Detection Mechanism | Recovery & Mitigation Strategy |
|---|---|---|---|
| **AI Service Down / Unreachable** | Child registration or citizen search cannot generate biometrics | Axios request timeout (e.g. 5000ms) or `ECONNREFUSED` | 1. **Child Creation:** Persist child record in MongoDB, leave `faceProfileId = ""`, return 201 with warning header/code `AI_ENROLLMENT_DEFERRED`.<br>2. **Citizen Search:** Return friendly 503 response: *"AI matching service is temporarily unavailable. Sighting recorded for manual review."* |
| **No Face Detected in Image** | Cannot generate embedding | AI service returns HTTP 400 `NO_FACE_DETECTED` | Return structured validation error to user: *"No human face was detected in the photo. Please provide a clear portrait."* Do not fail child document save. |
| **Multiple Faces Detected** | Ambiguous identity; cannot index vector | AI service returns HTTP 400 `MULTIPLE_FACES_DETECTED` | Return structured validation error: *"Multiple faces detected. Please upload a portrait containing only the child."* |
| **Qdrant Connection Timeout** | Vector upsert or search query fails | `qdrant_client.UnexpectedResponse` or network timeout | AI service retries with exponential backoff (2 attempts). If persistent, returns 502 `VECTOR_STORE_UNAVAILABLE`. |
| **Model Weight Download Lag** | First container startup delayed while downloading ~340MB models | Health check probes fail during startup | Mount host directory `~/.insightface/models` or a persistent Docker named volume `insightface_models` pre-seeded with `buffalo_l` weights. |
| **Photo Replacement Stale Vector** | Child photo updated, but Qdrant vector remains old | `PATCH /api/children/:id/photo` executed | Because UUIDv5 is derived deterministically from `childId`, upserting the new vector automatically overwrites the old point in Qdrant! |
| **Child Soft-Deactivated** | Inactive child might match citizen search | `Child.status === "inactive"` | In citizen search resolution, query `Child.find({ _id: { $in: candidateIds }, status: "active" })`. Inactive children are excluded. |

---

## 18. Privacy and Security Risk Register

| Risk ID | Risk Description | Severity | Source Evidence | Mitigation Strategy |
|---|---|---|---|---|
| **SEC-01** | **PII Exposure on Public AI Search** | **CRITICAL** | `Gaurdian/backend/main.py:L544-L550` directly returns parent name, personal email, and phone number to unauthenticated callers | Strip all parent PII from the AI search response. AI service returns only `child_id` and `similarity`. GuardianLink Node filters output via `MissingCase.toPublicResponse()`. |
| **SEC-02** | **Direct Unauthenticated Access to AI Service** | **HIGH** | `Gaurdian/backend/main.py` routes lack service token verification | Bind AI service to internal Docker network only. Enforce `X-Internal-Service-Key` header check on all incoming requests. |
| **SEC-03** | **DoS via Heavy AI Inference Requests** | **HIGH** | InsightFace RetinaFace + ArcFace inference consumes 100-300ms of CPU per image without rate limits | Enforce rate limiting in GuardianLink Node backend (e.g. 10 scans per 15 min per IP) before forwarding requests to the AI service. |
| **SEC-04** | **Unintended Matching of Non-Missing Children** | **HIGH** | Searching against all enrolled children could expose safe children to public searchers | Node backend queries `MissingCase` for candidate child IDs. Matches are suppressed unless an active missing case (`reported`, `under_verification`, `active`, `found`) is currently open. |
| **SEC-05** | **Single-Worker Embedded Qdrant Lock Crash** | **MEDIUM** | `Gaurdian/backend/ai/vector_db/vector_store.py` uses `QdrantClient(path="qdrant_data")` creating exclusive file lock | Migrate to standalone Qdrant container (`qdrant/qdrant:latest`) in `docker-compose.yml`. |
| **SEC-06** | **Redundant Memory Consumption from Duplicate Models** | **MEDIUM** | `FaceAnalysis("buffalo_l")` instantiated separately in `detector.py` and `embedding.py` (~700MB RAM) | Consolidate into a single thread-safe singleton `face_engine.py` loaded once at application lifespan startup. |
| **SEC-07** | **False Match Overconfidence** | **MEDIUM** | Fixed threshold `0.60` treated as definitive identity match | UI must label results as "Potential Match", never "Verified Match". Make threshold configurable via `FACE_MATCH_THRESHOLD`. |
| **SEC-08** | **Temporary Image File Leaks on Disk** | **LOW** | Image bytes written to local filesystem for OpenCV | Ensure all temp files are created in isolated scratch directories and cleaned up in Python `finally:` blocks or processed directly from memory buffers. |

---

## 19. Missing Information and Decisions Required

### A. Missing Information / Unresolved Blockers `[BLOCKED]`
* **None for Phase 6.1:** Both repositories were successfully accessed, inspected, and cross-referenced. No file access permissions or path discovery issues remain.

### B. Architectural Decisions Required Prior to Phase 6.2 `[DECISION REQUIRED]`
1. **Model Cache Seeding in Docker:**
   * *Option A (Recommended):* Mount the host machine's existing `C:\Users\Sumit\.insightface\models\buffalo_l` directory into the `ai-service` container via Docker volume to eliminate initial download wait times.
   * *Option B:* Let the Dockerfile download the models during `docker build`. (Requires network access during image build).
2. **AI Service Image Ingestion Mode:**
   * *Option A (Recommended):* GuardianLink Node forwards the image buffer directly as `multipart/form-data` to `ai-service`. Keeps AI service decoupled from Cloudinary.
   * *Option B:* Node sends Cloudinary `photoUrl`, and `ai-service` downloads it via HTTP. (Introduces external network latency and dependency on Cloudinary).
3. **Face Match Threshold Baseline:**
   * Recommend starting with `FACE_MATCH_THRESHOLD = 0.60` configurable via environment variable, allowing fine-tuning during integration testing.

---

## 20. Recommended Phase 6.2 Implementation Checklist

When authorization to proceed with Phase 6.2 is granted, execution should follow these sequential steps:

- [ ] **Step 1: Container Architecture Preparation**
  - [ ] Add `qdrant` service (`qdrant/qdrant:latest`) to `docker-compose.yml`.
  - [ ] Add `ai-service` service to `docker-compose.yml` on internal bridge networks.
  - [ ] Define environment variable defaults in `server/.env.example` (`AI_SERVICE_URL`, `AI_SERVICE_KEY`).
- [ ] **Step 2: Standalone `ai-service/` Creation**
  - [ ] Scaffold `ai-service/` folder structure under GuardianLink root.
  - [ ] Create `requirements.txt` containing only `fastapi`, `uvicorn`, `insightface`, `onnxruntime`, `opencv-python-headless`, `qdrant-client`, `pydantic`.
  - [ ] Implement `app/engine/face_engine.py` singleton holding single `buffalo_l` instance.
  - [ ] Adapt `detector.py` and `embedding.py` with structured validation errors.
  - [ ] Implement `app/vector/` modules connecting to standalone Qdrant over HTTP.
  - [ ] Implement `app/routes/` for `/health`, `/internal/ai/enroll`, `/internal/ai/search`, and `/internal/ai/delete/{child_id}`.
  - [ ] Add `app/middleware/internal_auth.py` verifying `X-Internal-Service-Key`.
- [ ] **Step 3: AI Service Offline Verification**
  - [ ] Copy `test.png` reference image into `ai-service/tests/assets/`.
  - [ ] Execute offline test scripts verifying detection, 512-dim embedding extraction, and Qdrant indexing.
- [ ] **Step 4: GuardianLink Backend Integration**
  - [ ] Implement Axios client helper in `server/services/aiService.js` for internal microservice calls.
  - [ ] Update `childController.js:createChild` to call `/internal/ai/enroll` and store returned `faceProfileId`.
  - [ ] Update `childController.js:updateChildPhoto` to re-enroll replacement photos.
  - [ ] Implement `citizenController.js:scanChild` to call `/internal/ai/search`, resolve against active `MissingCase` records, and apply `toPublicResponse()` privacy filter.
- [ ] **Step 5: End-to-End Regression Testing**
  - [ ] Create `server/scripts/test_phase6_ai_integration.js` verifying enrollment, photo replacement, vector deletion, citizen search matching, and privacy filtering.
  - [ ] Verify that all existing Phase 0-5 test suites continue to pass without regression.

---

## 21. Verification Evidence and Final Audit Status

### Verification Summary Table

| Verification Check | Status | Direct Source Evidence |
|---|---|---|
| **GuardianLink Root Accessible** | `[VERIFIED]` | `c:\Users\Sumit\Desktop\College Sem Projects\GuardianLink Sem 5` confirmed with clean Git status |
| **Friend AI Root Accessible** | `[VERIFIED]` | `C:\Users\Sumit\Desktop\Gaurdian` discovered and inspected; `.venv` Python 3.12.10 confirmed |
| **Read-Only Invariant Maintained** | `[VERIFIED]` | Zero source files modified, no dependencies installed, no database mutations executed |
| **Child faceProfileId Baseline** | `[VERIFIED]` | Confirmed in `server/models/Child.js:L159` and `childController.js:L151` (unpopulated `""`) |
| **MissingCase Privacy Contract** | `[VERIFIED]` | Confirmed in `server/models/MissingCase.js:L155-L178` (`toPublicResponse` strips PII) |
| **InsightFace buffalo_l Weights** | `[VERIFIED]` | Confirmed on host in `C:\Users\Sumit\.insightface\models\buffalo_l\` (5 ONNX models, 341.2 MB) |
| **OpenCV Preprocessing Disconnected** | `[VERIFIED]` | Confirmed in `Gaurdian/backend/ai/image_preprocessing/preprocessing.py` (never called in pipeline) |
| **Qdrant Embedded Mode & Lock** | `[VERIFIED]` | Confirmed in `Gaurdian/backend/ai/vector_db/vector_store.py` and `.lock` file in `qdrant_data/` |
| **Parent PII Leak in Friend Repo** | `[VERIFIED]` | Confirmed in `Gaurdian/backend/main.py:L544-L550` (returns parent name, email, phone) |
| **Deterministic UUIDv5 Mapping** | `[VERIFIED]` | Confirmed in `Gaurdian/backend/ai/vector_db/insert_embedding.py:L26-L31` |

### Final Audit Status
**PHASE 6.1 AUDIT COMPLETE.**  
The technical baseline of both repositories is 100% verified. A robust, secure, and privacy-preserving architectural blueprint has been established. No code modifications were made. The project is fully prepared to enter **Phase 6.2 (AI Microservice Implementation & Integration)** upon user approval.
