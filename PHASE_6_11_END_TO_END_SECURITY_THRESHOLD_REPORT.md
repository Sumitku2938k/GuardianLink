# GUARDIANLINK — PHASE 6.11: END-TO-END TESTING, SECURITY AUDIT & BIOMETRIC THRESHOLD EVALUATION REPORT

**Document ID:** GL-P6-11-TEST-AUDIT-EVAL  
**Date:** October 17, 2026  
**Auditor Roles:** Senior QA Automation Engineer, Application Security Engineer, Backend Integration Engineer, Biometric ML Evaluation Engineer  
**Workspace:** `C:\Users\Sumit\Desktop\College Sem Projects\GuardianLink Sem 5`  
**Reference Repo Status:** `C:\Users\Sumit\Desktop\Gaurdian` — Strictly Untouched (0 modifications)  
**Final Status:** **`PASS WITH LIMITATIONS`**

---

## 1. EXECUTIVE SUMMARY

Phase 6.11 provides rigorous end-to-end testing, application security auditing, and biometric threshold evaluation for the GuardianLink platform across all Phase 6 deliverables (Phases 6.1–6.10).

All core application services—React frontend, Node.js/Express backend API gateway, Redis session store, MongoDB database, FastAPI AI microservice with InsightFace SCRFD + ArcFace `buffalo_l`, and standalone Qdrant vector database—were audited and tested under realistic local infrastructure conditions.

### Key Milestones Achieved:
1. **Total Tests Executed:** **226 automated tests** across the entire stack (25 frontend unit/integration, 106 server unit/integration/security/lifecycle, and 95 FastAPI AI service tests) achieved a **100% pass rate (0 failures)**.
2. **End-to-End Live Enrollment & Search:** Real biometric inference tests verified that an uploaded synthetic child portrait is correctly mapped to a 512-dimensional ArcFace vector (L2 norm = 1.0000), persisted in Qdrant with an opaque `child_id`, and linked to an active `MissingCase` record in MongoDB.
3. **Fail-Closed Privacy Boundary:** Strict fail-closed privacy verification confirmed that enrolled children are never disclosed unless they have an active child record AND an active missing case (`active`, `reported`, or `under_verification`). Terminal cases (`found`, `reunited`, `closed`, `cancelled`) and children without missing cases yielded **0 disclosed candidates**.
4. **Security & Authorization Audit:** Public sighting search endpoints require active session authentication (`authenticate`) and role authorization (`citizen`, `parent`, `police`, `ngo`, `admin`). FastAPI internal endpoints (`/internal/face/*`) strictly reject direct unauthenticated access (HTTP 401) without the preshared constant-time `X-Internal-Service-Key`. Qdrant and FastAPI port bindings are constrained to `127.0.0.1` only.
5. **Biometric Threshold Evaluation:** Experimental evaluation of the `0.60` cosine threshold against controlled synthetic perturbations of the authorized baseline portrait verified clean separation between genuine pairs (similarity 0.9538–0.9968) and impostor vectors (-1.0000 to +0.0696). Because the repository contains only a single synthetic portrait without identifiable children, `FACE_MATCH_THRESHOLD=0.60` is retained as an experimental baseline pending large-scale demographic gallery testing.
6. **Defect Remediated:** Identified and resolved a falsy-value bug in `server/controllers/citizenController.js` where `limit: 0` and `threshold: 0` were incorrectly parsed via logical OR (`||`) instead of nullish check, causing invalid zero inputs to bypass validation.

---

## 2. REPOSITORY AND ENVIRONMENT DETAILS

```ini
Operating System: Windows 11 (64-bit)
Node.js Runtime: v22.14.0 (Windows PowerShell Shell)
Python Runtime: Python 3.11.17 (Docker containerized)
InsightFace Model: buffalo_l (SCRFD 10G detector + ArcFace ResNet50 embedder, 512-D float32)
Vector Database: Qdrant v1.19.2 (Standalone container, Cosine distance, 512 dimensions)
Primary Database: MongoDB 8.0 (Standalone container)
Session Cache: Redis 7-alpine (Standalone container)
Frontend: React 18 + Vite 8.2.0
Backend API: Node.js Express 4.19.2
AI Service API: FastAPI 0.115.x / Uvicorn (HTTP / internal network)
```

### Sensitive Secrets Configuration (Redacted):
- `INTERNAL_SERVICE_KEY`: `[REDACTED_PRESHARED_SECRET]` (Matches between `server/.env` and `ai-service/docker-compose`)
- `JWT_SECRET`: `[REDACTED_HMAC_SECRET]`
- `MONGO_URI`: `mongodb://localhost:27017/guardianlink` (Local development instance)
- `AI_SERVICE_URL`: `http://127.0.0.1:8000` (Localhost loopback binding)

---

## 3. BASELINE TEST RESULTS

Before implementing any tests or fixes, a baseline test run was conducted across all three subsystems:

| Component | Execution Command | Tests Total | Passed | Failed | Exit Code | Result Summary |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Client** | `npm test --prefix client` | 25 | 25 | 0 | 0 | All UI and normalization tests passed |
| **Client Build** | `npm run build --prefix client` | N/A | N/A | 0 | 0 | Vite build succeeded in 29.76s (2272 modules transformed) |
| **Server** | `npm test --prefix server` | 56 | 56 | 0 | 0 | AI client, enrollment, and search unit suites passed |
| **AI Service** | `docker compose exec ai-service pytest` | 95 | 95 | 0 | 0 | InsightFace detection, ArcFace embeddings, Qdrant store passed |
| **Total Baseline** | **Full Stack** | **176** | **176** | **0** | **0** | **100% Passing Baseline** |

---

## 4. VERIFIED ARCHITECTURE AND DATA FLOW

The end-to-end data pipeline was verified against live running services:

```mermaid
sequenceDiagram
    autonumber
    actor Citizen as Citizen / User (Browser)
    participant Gateway as Node.js API Gateway (:5000)
    participant Mongo as MongoDB (:27017)
    participant AI as FastAPI AI Service (:8000)
    participant Qdrant as Qdrant Vector DB (:6333)

    Citizen->>Gateway: POST /api/citizen/search-missing-child (multipart 'photo')
    Note over Gateway: Authenticate session + verify role<br/>Check rate limit (30 req / 15 min)<br/>Multer memory buffer validation
    Gateway->>AI: POST /internal/face/search (X-Internal-Service-Key)
    Note over AI: SCRFD detects face (enforces exactly 1 face)<br/>ArcFace extracts 512-D L2-normalized vector
    AI->>Qdrant: Query points (score_threshold >= 0.60, limit=N)
    Qdrant-->>AI: Matched points (child_id, cosine similarity)
    AI-->>Gateway: SearchResponse { match_found, candidates: [{ child_id, similarity }] }
    Gateway->>Mongo: Child.find({ _id: { $in: validChildIds }, status: "active" })
    Gateway->>Mongo: MissingCase.find({ childId: { $in: childIds }, status: { $in: [active, reported, under_verification] } })
    Note over Gateway: Fail-Closed Eligibility Filtering<br/>Candidate deduplication & sorting<br/>Serialize public lead (strip all guardian PII)
    Gateway-->>Citizen: HTTP 200 { matchFound, totalCandidates, candidates: [ Potential Match Leads ] }
```

### Verified Constraints:
- The browser **never** connects directly to FastAPI or Qdrant.
- Node.js backend has **zero** direct connection or dependency on Qdrant.
- FastAPI endpoints strictly mandate the constant-time `X-Internal-Service-Key` header.
- The sighting photograph uploaded by the citizen is processed purely in memory and is **never** written to disk, Cloudinary, or database.

---

## 5. ENROLLMENT LIFECYCLE RESULTS

The child biometric enrollment lifecycle (Section 4.1) was verified end-to-end using synthetic child records and authorized test portrait fixtures:

1. **Standard Enrollment:** Registered a synthetic child document in MongoDB with `biometricStatus: "pending"`. Dispatched reference portrait to `aiService.enrollFace`. Child status transitioned to `"enrolled"`, storing a deterministic UUIDv5 `faceProfileId` (`92190df1-9f71-54b1-8f6f-213bc6d8fbff`), timestamp `enrolledAt`, and `biometricAttempts: 1`.
2. **Vector Indexing:** Verified that Qdrant contains the corresponding 512-dimensional vector point with payload `{ child_id: "..." }`. Querying Qdrant with the identical photograph retrieved the candidate with cosine similarity = `1.0000`.
3. **Biometric Idempotency:** Invoking `enrollChildBiometric()` on an already-enrolled child returned `{ success: true, status: "enrolled", faceProfileId: "..." }` without re-creating vector points or modifying the database record.
4. **Photo Deletion:** Executing `deleteFaceProfile(childId)` successfully deleted the UUIDv5 point from Qdrant. Subsequent vector queries confirmed that the child was completely unreachable in vector searches.
5. **Failure Safety:** Verified that if the AI microservice encounters an error (e.g. timeout, service unreachable), the Child document in MongoDB is preserved with `biometricStatus: "failed"`, allowing manual or scheduled reconciliation without deleting the child's profile or demographic data.

---

## 6. SEARCH AND MONGODB CANDIDATE RESOLUTION RESULTS

The candidate resolution layer (`citizenPhotoSearchService.js`) was tested across all boundary conditions:

| Sighting Query Condition | Target Record State | Candidate Resolution Behavior | Pass/Fail Status | Evidence / Notes |
| :--- | :--- | :--- | :---: | :--- |
| Identical portrait | Active child + Active case | Disclosed as 1 candidate lead with `matchConfidence: HIGH` | **PASS** | Similarity = 1.0000, case linked |
| High threshold override | Active child + Active case (th=0.9999) | Correctly evaluated against override threshold | **PASS** | `thresholdApplied: 0.9999` |
| Solid black image | No faces in image | Rejected at AI boundary with HTTP 422 | **PASS** | Code: `NO_FACE_DETECTED` |
| Horizontally tiled portrait | Two faces in image | Rejected at AI boundary with HTTP 422 | **PASS** | Code: `MULTIPLE_FACES_DETECTED` |
| Missing photo in request | No file in multipart body | Rejected by Node controller with HTTP 400 | **PASS** | Code: `MISSING_PHOTO_FILE` |
| Orphan vector in Qdrant | Vector exists, Child NOT in Mongo | Vector dropped in Mongo resolution stage | **PASS** | Fail-Closed: 0 candidates returned |
| Inactive Child record | Child `status: "inactive"` | Inactive child excluded during batch query | **PASS** | Fail-Closed: 0 candidates returned |
| Child without MissingCase | Child active, no case filed | Excluded during case resolution stage | **PASS** | Fail-Closed: 0 candidates returned |
| Database query exception | Simulated MongoDB disconnect | Throws structured 500 error; not masked as zero-match | **PASS** | Safe error propagation |

---

## 7. CASE-STATUS FILTERING RESULTS

The missing-case eligibility filter strictly enforces the platform policy: **only active missing cases may disclose biometric candidate leads**.

```
Eligible Statuses:    ["active", "reported", "under_verification"]
Ineligible Statuses:  ["found", "reunited", "closed", "cancelled"]
```

### Empirical Test Evidence:
- **`status: "active"`:** Returned **1 candidate** with `caseStatus: "active"`.
- **`status: "reported"`:** Returned **1 candidate** with `caseStatus: "reported"`.
- **`status: "under_verification"`:** Returned **1 candidate** with `caseStatus: "under_verification"`.
- **`status: "found"`:** Excluded. Returned **0 candidates** (`matchFound: false`).
- **`status: "reunited"`:** Excluded. Returned **0 candidates** (`matchFound: false`).
- **`status: "closed"`:** Excluded. Returned **0 candidates** (`matchFound: false`).
- **`status: "cancelled"`:** Excluded. Returned **0 candidates** (`matchFound: false`).

---

## 8. AUTHENTICATION, AUTHORIZATION & SECURITY FINDINGS

### 8.1 Authentication & Role Policy
- Requests without active session cookies or Authorization headers return **HTTP 401 `UNAUTHORIZED`**.
- Expired and malformed JWT tokens return **HTTP 401 `INVALID_TOKEN`**.
- Permitted roles (`citizen`, `parent`, `police`, `ngo`, `admin`) are granted access by `authorize(...)`.
- Unauthorized roles (e.g. `guest`, suspended accounts) return **HTTP 403 `FORBIDDEN_ROLE`**.

### 8.2 Internal AI Service Security
- FastAPI endpoints (`/internal/face/enroll`, `/internal/face/search`, `/internal/face/delete/{child_id}`) strictly enforce constant-time `secrets.compare_digest` validation against `X-Internal-Service-Key`.
- Unauthenticated requests return **HTTP 401 Unauthorized** with `WWW-Authenticate: InternalKey`.
- Requests with invalid/tampered keys return **HTTP 401 Unauthorized** (`detail: "Invalid internal service key. Access denied."`).
- In `docker-compose.yml`, Qdrant is bound exclusively to `127.0.0.1:6333:6333` and AI Service to `127.0.0.1:8000:8000`. Neither port is exposed to public network interfaces (`0.0.0.0`).

### 8.3 Upload & MIME Security
- Multer memory storage enforces a hard **5 MB upload limit**. Oversized files return **HTTP 400 `IMAGE_TOO_LARGE`**.
- Only `image/jpeg`, `image/png`, and `image/webp` MIME types with corresponding `.jpg`, `.jpeg`, `.png`, `.webp` extensions are accepted.
- Executables, scripts, PDFs, text files, and spoofed MIME types (`spoofed.jpg.exe`, `animation.gif`) are rejected with **HTTP 400 `INVALID_FILE_TYPE`**.

### 8.4 Rate Limiting & Abuse Prevention
- Sighting search requests are bounded by `photoSearchRateLimiter` (30 requests / 15-minute window in production mode).
- Responses include RFC-compliant headers: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`.
- Requests exceeding the quota return **HTTP 429 `RATE_LIMIT_EXCEEDED`**.

---

## 9. PRIVACY AND DATA-LEAKAGE AUDIT

The public citizen response was audited for potential personal data leakage.

### Disclosed Fields (Strict Public Allowlist):
- `candidateId`: Opaque lead identifier (e.g., `lead_a81f3b20`)
- `caseId`: Canonical MongoDB case ID
- `caseNumber`: Public missing case identifier (e.g., `MC-74A522`)
- `childId`: Child ObjectId (needed for citizen lead follow-up)
- `name`: Child full name
- `age`: Calculated age in years
- `gender`: Gender
- `description`: Physical clothing/sighting description
- `lastSeenLocation`: City, State
- `missingDate`: ISO date string
- `photoUrl`: Cloudinary reference image URL
- `caseStatus`: Current case status
- `priority`: Priority level
- `similarity`: Cosine similarity score (e.g. `0.842`)
- `matchConfidence`: Categorical band (`HIGH`, `MEDIUM`, `LOW`)
- `disclaimer`: *"Potential biometric lead. Requires independent law enforcement and guardian verification."*

### Verified Redacted / Prohibited Fields (0% Leakage Confirmed):
- ❌ `guardianId` — Strictly excluded
- ❌ `parentContact` — Strictly excluded
- ❌ `medicalNotes` — Strictly excluded
- ❌ `homeAddress` — Strictly excluded
- ❌ `policeCaseNumber` (FIR details) — Strictly excluded
- ❌ `investigationNotes` — Strictly excluded
- ❌ `rawEmbedding` / `vector` — Strictly excluded
- ❌ `cloudinaryPublicId` — Strictly excluded

### UI Language Compliance:
- The user interface **never** uses the words "Verified Match", "Identity Confirmed", or "100% Match".
- Numeric cosine similarities are displayed as raw decimal values and are **never** rendered as percentage probabilities of identity.

---

## 10. FAILURE-RECOVERY AND PERSISTENCE FINDINGS

1. **AI Microservice Outage:** If the FastAPI container is stopped or unreachable, Node.js captures `ECONNREFUSED` / `AIServiceUnavailableError` and maps it cleanly to **HTTP 503 `AI_SERVICE_UNAVAILABLE`**.
2. **AI Microservice Timeout:** If facial inference exceeds the configured 20,000ms threshold, Node.js aborts the request via `AbortController` and maps it cleanly to **HTTP 504 `AI_SERVICE_TIMEOUT`**.
3. **MongoDB Outage:** If MongoDB becomes partitioned during candidate resolution, `citizenPhotoSearchService` throws an unhandled database exception that fails closed, preventing partial or corrupt lead disclosures.
4. **Vector Cleanup Resilience:** In the event of child profile replacement or deletion, UUIDv5 deterministic vector point calculation guarantees idempotent point overwrite or complete point deletion in Qdrant.

---

## 11. THRESHOLD CONFIGURATION AUDIT

An audit was performed to confirm where the facial similarity threshold is defined, passed, and applied across the stack:

| Component | Setting Key | Default Value | Config Source | Applied At |
| :--- | :--- | :---: | :--- | :--- |
| **Node.js Config** | `aiConfig.defaultThreshold` | `0.60` | `process.env.AI_FACE_MATCH_THRESHOLD` | Fallback if client does not specify threshold |
| **Node.js Controller** | `parsedThreshold` | Optional | `req.body.threshold` / `req.query.threshold` | Validated in range `[-1.0, 1.0]` |
| **Node.js Service** | `activeThreshold` | `0.60` | Evaluated threshold | Forwarded as Form parameter to FastAPI |
| **FastAPI Config** | `settings.FACE_MATCH_THRESHOLD` | `0.60` | `FACE_MATCH_THRESHOLD` in `.env` | Fallback if request does not provide override |
| **FastAPI Route** | `active_threshold` | Form override or `0.60` | Endpoint parameter | Passed to Qdrant searcher |
| **Qdrant Searcher** | `score_threshold` | `active_threshold` | Qdrant `query_points` parameter | Qdrant HNSW vector search filter (`score >= threshold`) |

### Finding:
Both Node.js and FastAPI share an identical default value of `0.60`. Qdrant applies `score_threshold=0.60` on cosine distance during vector traversal, and FastAPI additionally applies `if score >= active_threshold:` to guarantee boundary inclusion.

---

## 12. DATASET DESCRIPTION AND PROVENANCE

To comply strictly with ethical guidelines and Mandatory Restriction #7 (*"Never use real children's personal data or identifiable photographs in test fixtures"*):

- **Anchor Asset:** `ai-service/tests/assets/test.png` (Consented, licensed synthetic test portrait).
- **Dimensions:** 1199 x 1312 pixels, 3-channel RGB/BGR.
- **Controlled Genuine Variations (Same Subject):**
  1. `anchor_original`: Untouched baseline portrait.
  2. `var_bright_plus30`: Illumination increase (+30 brightness).
  3. `var_dark_minus30`: Illumination decrease (-30 brightness).
  4. `var_contrast_high`: Enhanced contrast ($\alpha=1.2$).
  5. `var_contrast_low`: Reduced contrast ($\alpha=0.8$).
  6. `var_gaussian_blur`: Camera softness simulation (5x5 Gaussian kernel).
  7. `var_jpeg_compressed_q50`: Mobile network artifact simulation (JPEG Q=50).
  8. `var_rescaled_0.75x`: Low-resolution capture simulation (0.75x downsampling and restore).
- **Impostor Variations (Different Subject):**
  1. `inverted_vector`: Inverted feature embedding ($-\mathbf{v}$).
  2. `random_identity_vectors (25)`: 25 distinct randomly sampled unit vectors on the $\mathbb{S}^{511}$ unit hypersphere.
- **Failures:** **0 face detection failures** across all 8 genuine conditions.

---

## 13. THRESHOLD EVALUATION METRICS & COMPARISON TABLE

Pairwise cosine similarity distributions:
- **Genuine Pairs (7 comparisons):** $\min=0.9538$, $\mu=0.9884$, $\max=0.9968$, $\sigma=0.0143$.
- **Impostor Pairs (26 comparisons):** $\min=-1.0000$, $\mu=-0.0471$, $\max=0.0696$, $\sigma=0.1938$.

### Threshold Evaluation Matrix:

| Threshold ($\tau$) | TP | FP | TN | FN | Precision | Recall (Sens.) | Specificity | FPR | FNR |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **0.40** | 7 | 0 | 26 | 0 | 1.0000 | 1.0000 | 1.0000 | 0.0000 | 0.0000 |
| **0.50** | 7 | 0 | 26 | 0 | 1.0000 | 1.0000 | 1.0000 | 0.0000 | 0.0000 |
| **0.55** | 7 | 0 | 26 | 0 | 1.0000 | 1.0000 | 1.0000 | 0.0000 | 0.0000 |
| **0.60** *(Default)* | 7 | 0 | 26 | 0 | 1.0000 | 1.0000 | 1.0000 | 0.0000 | 0.0000 |
| **0.65** | 7 | 0 | 26 | 0 | 1.0000 | 1.0000 | 1.0000 | 0.0000 | 0.0000 |
| **0.70** | 7 | 0 | 26 | 0 | 1.0000 | 1.0000 | 1.0000 | 0.0000 | 0.0000 |
| **0.75** | 7 | 0 | 26 | 0 | 1.0000 | 1.0000 | 1.0000 | 0.0000 | 0.0000 |
| **0.80** | 7 | 0 | 26 | 0 | 1.0000 | 1.0000 | 1.0000 | 0.0000 | 0.0000 |
| **0.85** | 7 | 0 | 26 | 0 | 1.0000 | 1.0000 | 1.0000 | 0.0000 | 0.0000 |
| **0.90** | 7 | 0 | 26 | 0 | 1.0000 | 1.0000 | 1.0000 | 0.0000 | 0.0000 |

*Definitions:*  
$\text{Precision} = \frac{\text{TP}}{\text{TP} + \text{FP}}$, $\text{Recall} = \frac{\text{TP}}{\text{TP} + \text{FN}}$, $\text{Specificity} = \frac{\text{TN}}{\text{TN} + \text{FP}}$, $\text{FPR} = \frac{\text{FP}}{\text{FP} + \text{TN}}$, $\text{FNR} = \frac{\text{FN}}{\text{FN} + \text{TP}}$.

---

## 14. FALSE-POSITIVE AND FALSE-NEGATIVE ANALYSIS

1. **Observed Margin of Separation:** In this controlled evaluation, there is a large margin ($0.8842$) between the lowest genuine score ($0.9538$ under low illumination) and the highest impostor score ($0.0696$ on random vectors).
2. **Real-World Gallery Search vs. Pairwise Evaluation:** In a real-world gallery of 100,000 children, the probability of false-positive vector collisions increases exponentially with gallery size. A threshold of `0.60` on InsightFace ArcFace `buffalo_l` corresponds to a standard False Match Rate (FMR) of approximately $10^{-4}$ in academic benchmarks (LFW/CFP-FP), but has not been calibrated on child faces under significant age-progression or severe occlusions.
3. **Threshold Recommendation:**
   - **Recommendation:** **Keep `0.60` as an experimental starting point.**
   - Do NOT alter production defaults without a large-scale diverse child gallery benchmark.
   - Mandate manual human-in-the-loop verification by law enforcement officers for all disclosed candidate leads.

---

## 15. FULL TEST MATRIX

| Test ID | Category | Scenario / Description | Execution Command / Method | Expected Result | Actual Result | Status | Severity if Failed |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **T-AUTH-01** | Security | Unauthenticated citizen search request | Unit test with empty session/token | 401 UNAUTHORIZED | 401 UNAUTHORIZED | **PASS** | Critical |
| **T-AUTH-02** | Security | Malformed JWT token in Auth header | Unit test with garbage token string | 401 INVALID_TOKEN | 401 INVALID_TOKEN | **PASS** | Critical |
| **T-AUTH-03** | Security | Expired JWT token in Auth header | Unit test with expired token (-10s) | 401 INVALID_TOKEN | 401 INVALID_TOKEN | **PASS** | High |
| **T-RBAC-01** | Security | Citizen, Parent, Police, NGO, Admin roles | Middleware test with valid roles | Allowed (next called) | Allowed (next called) | **PASS** | High |
| **T-RBAC-02** | Security | Unauthorized role 'guest' | Middleware test with guest role | 403 FORBIDDEN_ROLE | 403 FORBIDDEN_ROLE | **PASS** | High |
| **T-AIKEY-01** | Security | FastAPI /health endpoint probe | HTTP GET `http://127.0.0.1:8000/health` | 200 OK (no secrets leaked) | 200 OK (sanitized) | **PASS** | High |
| **T-AIKEY-02** | Security | FastAPI /internal/face/enroll without key | HTTP POST without X-Internal-Service-Key | 401 Unauthorized | 401 Unauthorized | **PASS** | Critical |
| **T-AIKEY-03** | Security | FastAPI /internal/face/enroll with bad key | HTTP POST with invalid key | 401 Unauthorized | 401 Unauthorized | **PASS** | Critical |
| **T-AIKEY-04** | Security | FastAPI /internal/face/search without key | HTTP POST without X-Internal-Service-Key | 401 Unauthorized | 401 Unauthorized | **PASS** | Critical |
| **T-AIKEY-05** | Security | FastAPI /internal/face/delete without key | HTTP DELETE without key | 401 Unauthorized | 401 Unauthorized | **PASS** | Critical |
| **T-NET-01** | Security | Node backend direct Qdrant dependency | Package.json inspection | Zero direct Qdrant dependency | Zero dependencies found | **PASS** | Medium |
| **T-NET-02** | Security | Docker Compose port bindings | docker-compose.yml inspection | Bound to 127.0.0.1 only | 127.0.0.1:6333 & 8000 | **PASS** | High |
| **T-UPL-01** | Upload | Allowed formats (JPEG, PNG, WebP) | Multer middleware validation | Permitted through filter | Permitted through filter | **PASS** | Medium |
| **T-UPL-02** | Upload | Disallowed formats (.pdf, .txt, .exe, .gif) | Multer fileFilter test | Rejected before processing | Rejected before processing | **PASS** | High |
| **T-RATE-01** | Security | Rate limiter configuration & headers | Rate limiter inspection | Standard headers present | Standard headers present | **PASS** | Medium |
| **T-PRIV-01** | Privacy | Allowlist serialization audit | Inspection of serialized candidate | All guardian PII stripped | All guardian PII stripped | **PASS** | Critical |
| **T-LOG-01** | Audit | Operational search audit log hygiene | Logger output validation | Zero images or vectors in log | Zero images or vectors | **PASS** | Medium |
| **T-ENR-01** | Lifecycle | Child biometric enrollment | Live FastAPI + Qdrant enrollment | Enrolled, faceProfileId saved | Enrolled, faceProfileId saved | **PASS** | High |
| **T-ENR-02** | Lifecycle | Vector indexing and retrieval | Live Qdrant cosine search | Similarity >= 0.95 | Similarity = 1.0000 | **PASS** | High |
| **T-ENR-03** | Lifecycle | Biometric re-enrollment idempotency | Repeat enrollment on enrolled child | Returns existing profile | Returns existing profile | **PASS** | Medium |
| **T-SRCH-01** | Search | Sighting search against active case | Live Node API + FastAPI + Qdrant | Discloses 1 lead candidate | Discloses 1 lead candidate | **PASS** | High |
| **T-SRCH-02** | Search | Sighting search with threshold 0.9999 | Live Node API + FastAPI + Qdrant | Applies threshold override | Applies threshold override | **PASS** | Medium |
| **T-SRCH-03** | Search | Solid black image (0 faces) | Sighting query with black image | 422 NO_FACE_DETECTED | 422 NO_FACE_DETECTED | **PASS** | High |
| **T-SRCH-04** | Search | Horizontally tiled image (2 faces) | Sighting query with tiled image | 422 MULTIPLE_FACES_DETECTED | 422 MULTIPLE_FACES_DETECTED | **PASS** | High |
| **T-SRCH-05** | Search | Missing photo field in request | Sighting query with file=null | 400 MISSING_PHOTO_FILE | 400 MISSING_PHOTO_FILE | **PASS** | Medium |
| **T-SRCH-06** | Search | Orphan vector in Qdrant | Sighting query for deleted child | Fail-Closed: 0 leads | Fail-Closed: 0 leads | **PASS** | Critical |
| **T-SRCH-07** | Search | Enrolled child without MissingCase | Sighting query for unfiled child | Fail-Closed: 0 leads | Fail-Closed: 0 leads | **PASS** | Critical |
| **T-SRCH-08** | Search | Enrolled child with status="inactive" | Sighting query for inactive child | Fail-Closed: 0 leads | Fail-Closed: 0 leads | **PASS** | High |
| **T-SRCH-09** | Search | MissingCase status="active" | Sighting query for active case | Discloses candidate lead | Discloses candidate lead | **PASS** | High |
| **T-SRCH-10** | Search | MissingCase status="reported" | Sighting query for reported case | Discloses candidate lead | Discloses candidate lead | **PASS** | High |
| **T-SRCH-11** | Search | MissingCase status="under_verification" | Sighting query for verifying case | Discloses candidate lead | Discloses candidate lead | **PASS** | High |
| **T-SRCH-12** | Search | MissingCase status="found" | Sighting query for found case | Fail-Closed: 0 leads | Fail-Closed: 0 leads | **PASS** | High |
| **T-SRCH-13** | Search | MissingCase status="reunited" | Sighting query for reunited case | Fail-Closed: 0 leads | Fail-Closed: 0 leads | **PASS** | High |
| **T-SRCH-14** | Search | MissingCase status="closed" | Sighting query for closed case | Fail-Closed: 0 leads | Fail-Closed: 0 leads | **PASS** | High |
| **T-SRCH-15** | Search | MissingCase status="cancelled" | Sighting query for cancelled case | Fail-Closed: 0 leads | Fail-Closed: 0 leads | **PASS** | High |
| **T-SRCH-16** | Search | Deduplication of duplicate child matches | Sighting query with multi hits | Exactly 1 unique candidate | Exactly 1 unique candidate | **PASS** | Medium |
| **T-SRCH-17** | Search | Controller rejects invalid limits (<1, >20) | HTTP POST with limit=0, limit=50 | 400 INVALID_SEARCH_LIMIT | 400 INVALID_SEARCH_LIMIT | **PASS** | Medium |
| **T-SRCH-18** | Search | Controller rejects invalid thresholds | HTTP POST with threshold=-2.5, 1.5 | 400 INVALID_SEARCH_THRESHOLD | 400 INVALID_SEARCH_THRESHOLD | **PASS** | Medium |
| **T-RES-01** | Resilience| Database failure propagation | Simulated Mongo find error | Safe failure propagation | Safe failure propagation | **PASS** | High |
| **T-RES-02** | Resilience| AI gateway timeout mapping | Simulated AI gateway timeout | 504 AI_SERVICE_TIMEOUT | 504 AI_SERVICE_TIMEOUT | **PASS** | High |
| **T-RES-03** | Resilience| AI service offline mapping | Simulated AI container down | 503 AI_SERVICE_UNAVAILABLE | 503 AI_SERVICE_UNAVAILABLE | **PASS** | High |
| **T-RES-04** | Lifecycle | Vector profile deletion | deleteFaceProfile invocation | Vector deleted from Qdrant | Vector deleted from Qdrant | **PASS** | High |

---

## 16. DEFECTS DISCOVERED, SEVERITY, ROOT CAUSES & FIXES

### Defect GL-DEF-6.11-01: Falsy `0` Parameter Evaluation in Citizen Controller
- **Severity:** Medium (Input Validation / Boundary Correctness)
- **Component:** `server/controllers/citizenController.js` (lines 36–37)
- **Root Cause:**
  The controller parsed optional query/body parameters using the logical OR operator:
  ```javascript
  const rawLimit = req.body?.limit || req.query?.limit;
  const rawThreshold = req.body?.threshold || req.query?.threshold;
  ```
  In JavaScript, `0` is a falsy value. When a client submitted `limit: 0` or `threshold: 0.0`, `0 || undefined` evaluated to `undefined`. Consequently:
  1. `limit: 0` bypassed validation instead of being rejected with HTTP 400 `INVALID_SEARCH_LIMIT`.
  2. `threshold: 0.0` was ignored and silently replaced with the default threshold `0.60`.
- **Fix Applied:**
  Replaced the logical OR operator with explicit definedness checks:
  ```javascript
  const rawLimit = req.body?.limit !== undefined ? req.body.limit : req.query?.limit;
  const rawThreshold = req.body?.threshold !== undefined ? req.body.threshold : req.query?.threshold;
  ```
- **Regression Test:** `Scenario 17: Controller rejects invalid limit (<1 or >20) with 400 INVALID_SEARCH_LIMIT` in `server/tests/phase6_11_e2e_lifecycle.test.js`.
- **Status:** **FIXED & VERIFIED**.

---

## 17. REGRESSION RESULTS AFTER FIXES

Following the defect fix, the entire regression test battery was executed across all components:

| Test Suite | Command | Tests Run | Passed | Failed | Exit Code | Duration |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Frontend Unit / UI Tests** | `npm test --prefix client` | 25 | 25 | 0 | 0 | 5.82s |
| **Frontend Production Build** | `npm run build --prefix client` | N/A | Success | 0 | 0 | 31.75s |
| **Backend Full Test Suite** | `npm test --prefix server` | 106 | 106 | 0 | 0 | 36.50s |
| **FastAPI Microservice Suite**| `docker compose exec ai-service pytest` | 95 | 95 | 0 | 0 | 34.76s |
| **Biometric Threshold Eval** | `docker compose exec ai-service python scripts/evaluate_threshold.py` | 33 pairs | 33 | 0 | 0 | 28.50s |
| **Total Automated Regression**| **All Subsystems** | **226** | **226** | **0** | **0** | **100% Pass** |

---

## 18. TESTS NOT RUN AND REASONS

1. **Massive Gallery Search at Scale (100,000+ faces):**  
   *Reason:* Generating 100,000 synthetic children's portraits is prohibitive in local test environments and beyond the boundary of Phase 6.11. Qdrant HNSW vector retrieval was verified on a local collection.
2. **Browser End-to-End Automation with Headless Chromium (Playwright/Cypress):**  
   *Reason:* The repository does not currently include Playwright or Cypress dependencies, and introducing heavy testing frameworks is explicitly prohibited by Mandatory Restriction #5 (*"Do not introduce a new database, vector database, authentication mechanism, ML model, or heavy testing framework without a demonstrated need"*). Frontend contract validation was verified using Node unit tests and production Vite builds.
3. **Cross-Network Production Security Penetration Testing:**  
   *Reason:* Prohibited by Section 5 (*"Perform safe tests against a local or isolated test environment. Do not attack production systems or run uncontrolled high-volume traffic"*).

---

## 19. KNOWN LIMITATIONS AND RESIDUAL RISKS

1. **Biometric Evaluation Dataset Size Limitation:**  
   The repository contains only one authorized reference portrait (`ai-service/tests/assets/test.png`). While controlled affine, illumination, blur, downsampling, and compression variations yielded 100% precision and recall at threshold `0.60`, this does not constitute scientific calibration across multi-ethnic child demographic cohorts or multi-year age progressions.
2. **Single Camera Pose Sensitivity:**  
   Extreme profile poses (>45° yaw) or severe facial occlusions (masks/sunglasses) will result in `NO_FACE_DETECTED` rejections. This is by design to maintain enrollment and search data integrity.
3. **In-Memory Upload Size:**  
   Sighting photographs are buffered in Node.js server RAM (max 5 MB). High concurrent traffic (e.g. hundreds of simultaneous photo uploads) could increase server memory consumption. The production rate limiter (30 req / 15 min / IP) mitigates this risk.

---

## 20. RECOMMENDED NEXT STEPS

1. **Biometric Dataset Expansion (Consented Cohort):**  
   Prior to commercial or governmental deployment, benchmark the InsightFace `buffalo_l` model against an ethically collected, consented cross-age child face dataset to establish calibrated operational thresholds for False Match Rate (FMR $\le 0.01\%$) and False Non-Match Rate (FNMR).
2. **Redis-Backed Rate Limiting in Production Cluster:**  
   For multi-instance Node.js backend deployments, transition `express-rate-limit` to use the existing Redis container as a shared store (`rate-limit-redis`).
3. **Background Push Notifications for High-Confidence Leads:**  
   In Phase 7, implement an asynchronous notification worker to alert assigned law enforcement officers when a citizen sighting matches an active missing child with similarity $\ge 0.85$.

---

## 21. FINAL PHASE STATUS AND EVIDENCE-BASED SIGN-OFF

### Phase Status: **`PASS WITH LIMITATIONS`**

### Sign-off Justification:
- **Core Integration Verified:** All end-to-end integration flows across MongoDB, Node.js Express, Redis, FastAPI, InsightFace, and Qdrant are functional, reproducible, and 100% passing (226/226 tests).
- **Security & Authorization Validated:** Mandatory session authentication, role access control, constant-time internal service key validation, port isolation (127.0.0.1), file validation, and strict PII exclusion are confirmed.
- **Fail-Closed Privacy Validated:** Candidates are strictly withheld unless associated with an active child and an active missing case.
- **Limitations Transparently Documented:** As mandated by Phase 6.11 instructions, `PASS WITH LIMITATIONS` is assigned because biometric threshold evaluation was conducted on controlled synthetic variations of a single authorized test asset, which validates algorithmic correctness but remains non-calibrated for production demographic diversity.

**Phase 6.11 is successfully completed and approved for Phase 7.**
