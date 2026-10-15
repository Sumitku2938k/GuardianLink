# GUARDIANLINK — PHASE 6.7: NODE.JS AI CLIENT & INTERNAL SERVICE COMMUNICATION REPORT

**Execution Date:** October 15, 2026  
**Status:** COMPLETED (ALL CRITERIA VERIFIED)  
**Primary Working Directory:** `C:\Users\Sumit\Desktop\College Sem Projects\GuardianLink Sem 5`  
**Friend's Repository:** `C:\Users\Sumit\Desktop\Gaurdian` (Untouched, Unmodified)

---

## 1. PRE-IMPLEMENTATION AUDIT FINDINGS

Prior to implementing any code, an in-depth audit of both the `server/` codebase and the `ai-service/` microservice was conducted.

### 1.1 Server Architecture Audit
- **Module Convention:** CommonJS (`"type": "commonjs"` in `server/package.json`).
- **Node.js Environment:** Runtime is Node.js `v22.20.0`, which provides native globals: `fetch`, `FormData`, `Blob`, `AbortController`, `Error.cause`, and `node:test` / `node:assert`.
- **Existing Service Skeleton:** `server/services/aiService.js` existed as an empty 0-byte placeholder from previous phase skeletons.
- **Config & Error Patterns:** `server/config/` holds modular configurations (`db.js`, `redis.js`, `cloudinary.js`) with fail-safe initialization and logging. `server/middleware/errorHandler.js` handles operational error dispatching via `{ success: false, message, code }`.
- **Testing Setup:** No formal test runner was configured in `package.json` (`scripts.test` was missing). Tests historically were run as standalone node scripts in `server/scripts/`.

### 1.2 FastAPI AI Microservice Contract Audit
Inspection of `ai-service/app/main.py`, `ai-service/app/routes/*.py`, and `ai-service/app/schemas/biometric.py` revealed:
- **Health Check (`GET /health`):** Unauthenticated internal probe returning `HealthResponse` (`status: "ok" | "degraded"`, `qdrant_connected: bool`, `models_loaded: bool`, `details.collection_ready: bool`).
- **Enrollment (`POST /internal/face/enroll` & `/internal/ai/enroll`):** Requires `X-Internal-Service-Key` header. Expects `multipart/form-data` with `child_id: str` and `file: binary`. Enforces exactly-one-face validation, extracts 512D ArcFace embedding, and indexes to Qdrant via UUIDv5. Returns `EnrollResponse` (`success: true`, `child_id`, `face_profile_id`, `status: "enrolled"`).
- **Search (`POST /internal/face/search` & `/internal/ai/search`):** Requires `X-Internal-Service-Key` header. Expects `multipart/form-data` with `file: binary`, optional `limit: int` (1-50), and optional `threshold: float` (-1.0 to 1.0). Returns `SearchResponse` (`match_found: bool`, `candidates: CandidateMatch[]`, `total_candidates: int`, `threshold_applied: float`).
- **Deletion (`DELETE /internal/face/{child_id}` & `/internal/face/delete/{child_id}`):** Requires `X-Internal-Service-Key` header. Accepts URL path parameter `child_id`. Returns `DeleteResponse` (`success: true`, `child_id`, `face_profile_id`, `message`).
- **Internal Authentication Middleware:** `ai-service/app/middleware/internal_auth.py` strictly validates `X-Internal-Service-Key` against `INTERNAL_SERVICE_KEY` using timing-safe constant-time string comparison (`secrets.compare_digest`).

---

## 2. ACTUAL FASTAPI API CONTRACT DISCOVERED

| Operation | Method | Primary Endpoint | Auth Header Required | Request Content Type | Key Request Parameters | Expected Success Response |
|---|---|---|---|---|---|---|
| **Health Probe** | `GET` | `/health` | No | None | None | `200 OK`: `{ status: "ok"|"degraded", models_loaded: bool, qdrant_connected: bool, details: { collection_ready: bool, ... } }` |
| **Face Enrollment** | `POST` | `/internal/face/enroll` | `X-Internal-Service-Key` | `multipart/form-data` | `child_id: string`, `file: binary` | `200 OK`: `{ success: true, child_id, face_profile_id, status: "enrolled", message }` |
| **Biometric Search** | `POST` | `/internal/face/search` | `X-Internal-Service-Key` | `multipart/form-data` | `file: binary`, `limit?: int` (1-50), `threshold?: float` (-1 to 1) | `200 OK`: `{ match_found: bool, candidates: [{ child_id, similarity, confidence? }], total_candidates, threshold_applied }` |
| **Vector Deletion** | `DELETE` | `/internal/face/{child_id}` | `X-Internal-Service-Key` | None | `child_id` (URL path) | `200 OK`: `{ success: true, child_id, face_profile_id, message }` |

### Error Mapping Discovered in AI Microservice:
- `400 Bad Request`: `INVALID_CHILD_ID`, invalid search parameters.
- `401 Unauthorized`: Missing or invalid `X-Internal-Service-Key`.
- `422 Unprocessable Entity`: Domain face validation failures (`NO_FACE_DETECTED`, `MULTIPLE_FACES_DETECTED`, `IMAGE_DECODE_FAILED`, `INVALID_EMBEDDING`, `INVALID_VECTOR`).
- `429 Too Many Requests`: Upstream rate limit.
- `503 Service Unavailable`: Qdrant offline (`VECTOR_DB_UNAVAILABLE`).
- `500 Internal Server Error`: `INCOMPATIBLE_COLLECTION`, `AI_ENGINE_ERROR`.

---

## 3. NEW AND MODIFIED FILES

| File Path | Status | Purpose |
|---|---|---|
| `server/errors/aiErrors.js` | **Created** | Comprehensive typed error hierarchy (`AIServiceError`, `AIServiceConfigError`, `AIServiceTimeoutError`, `AIServiceUnavailableError`, `AIServiceAuthenticationError`, `AIServiceValidationError`, `AIServiceResponseError`). |
| `server/config/ai.js` | **Created** | Environment configuration validator with safe secret handling and URL normalization. |
| `server/services/aiService.js` | **Created** | Complete Node.js AI client exporting `healthCheck`, `enrollFace`, `searchFace`, `deleteFaceProfile`, and `AIServiceClient` class. |
| `server/tests/aiClient.test.js` | **Created** | 16 comprehensive automated unit tests covering all success/failure paths with mock fetch. |
| `server/scripts/test_phase6_7_smoke.js` | **Created** | Dedicated live integration smoke test script testing against the running Docker stack. |
| `server/package.json` | **Modified** | Added `"test": "node --test tests/**/*.test.js"` script. |
| `server/.env.example` | **Modified** | Documented `AI_SERVICE_URL`, `INTERNAL_SERVICE_KEY`, and `AI_SERVICE_TIMEOUT_MS`. |
| `server/.env` | **Modified** | Added local development defaults for host testing. |
| `docker-compose.yml` | **Modified** | Passed `AI_SERVICE_URL: http://ai-service:8000` and `INTERNAL_SERVICE_KEY` into `server` container environment. |
| `.env.example` (root) | **Modified** | Documented backend AI client variables. |

---

## 4. CLIENT ARCHITECTURE AND EXPORTED METHODS

The client is exported in `server/services/aiService.js` following standard CommonJS conventions. It exposes both functional singletons and an injectable `AIServiceClient` class:

```javascript
const {
  AIServiceClient,
  healthCheck,
  enrollFace,
  searchFace,
  deleteFaceProfile
} = require("./services/aiService");
```

### Exported Methods:

1. `healthCheck(options = {})`
   - **Signature:** `Promise<{ status: string, isHealthy: boolean, service: string, version: string, modelsLoaded: boolean, qdrantConnected: boolean, details: Object }>`
   - **Behavior:** Queries `/health`. Evaluates status without loading models or mutating state. Correctly detects whether Qdrant and collection are ready (`isHealthy`).

2. `enrollFace(params, options = {})`
   - **Signature:** `params: { childId: string, imageBuffer: Buffer|Uint8Array|Blob, mimeType?: string, filename?: string }`
   - **Returns:** `Promise<{ success: boolean, childId: string, faceProfileId: string, status: string, message: string }>`
   - **Behavior:** Constructs `multipart/form-data` with `child_id` and binary `file`. Transmits `X-Internal-Service-Key`. Validates output UUID and success flag. Never retries automatically.

3. `searchFace(params, options = {})`
   - **Signature:** `params: { imageBuffer: Buffer|Uint8Array|Blob, mimeType?: string, filename?: string, limit?: number, threshold?: number }`
   - **Returns:** `Promise<{ matchFound: boolean, candidates: Array<{ childId: string, similarity: number, confidence?: number }>, totalCandidates: number, thresholdApplied: number, message: string }>`
   - **Behavior:** Transmits query image with validated integer limit (1-50) and float threshold (-1.0 to 1.0). Validates that all candidate similarity scores are finite numbers in the range `[-1.0, 1.0]`.

4. `deleteFaceProfile(childId, options = {})`
   - **Signature:** `childId: string`
   - **Returns:** `Promise<{ success: true, childId: string, faceProfileId: string, message: string }>`
   - **Behavior:** Calls `DELETE /internal/face/:childId` with URL-encoded identifier. Validates response. Never retries automatically.

---

## 5. ENVIRONMENT VARIABLES & SAFE SECRET SETUP

The client uses environment-based configuration without hardcoding secrets:

| Variable | Default Value (Dev) | Docker Production Value | Description |
|---|---|---|---|
| `AI_SERVICE_URL` | `http://127.0.0.1:8000` | `http://ai-service:8000` | Microservice URL. Internal Docker DNS name is used in Compose. |
| `INTERNAL_SERVICE_KEY` | `dev_internal_secret_change_in_production` | `${INTERNAL_SERVICE_KEY}` | Shared secret passed in `X-Internal-Service-Key` header. |
| `AI_SERVICE_TIMEOUT_MS` | `10000` | `10000` | Network request abort timeout (10 seconds). |
| `MAX_UPLOAD_SIZE_BYTES` | `10485760` | `10485760` | Client-side pre-flight upload size boundary (10 MB). |

### Secret Protection Guarantees:
- `INTERNAL_SERVICE_KEY` is validated before making protected requests (`assertProtectedConfig`).
- If missing, throws `AIServiceConfigError` with a generic message that never prints key fragments or placeholders.
- Error stringification and JSON serialization completely omit the key and raw binary buffers.
- Client environment variables are private to backend processes and never shared with Vite frontend bundles.

---

## 6. TIMEOUT, NETWORK FAILURE, HTTP ERROR & VALIDATION BEHAVIOR

### 6.1 Timeout Handling
Requests use Node.js `AbortController` coupled with `setTimeout`. When a request exceeds `timeoutMs`:
- Abort signal fires.
- Fetch throws `AbortError`.
- Client catches and wraps this as `AIServiceTimeoutError` (`code: "AI_SERVICE_TIMEOUT"`, `statusCode: 504`), with timeout duration and path captured in details.

### 6.2 Network Failure & Connection Refusal
If the AI microservice is down, unreachable, or DNS fails:
- Native fetch throws `TypeError: fetch failed` (e.g. `ECONNREFUSED` or `ENOTFOUND`).
- Client wraps this as `AIServiceUnavailableError` (`code: "AI_SERVICE_UNAVAILABLE"`, `statusCode: 503`).
- The original error is preserved as `.cause` without crashing the Node.js process.

### 6.3 HTTP Error Dissection
- **401 / 403:** Maps to `AIServiceAuthenticationError` (`code: "AI_AUTH_FAILED"`, `statusCode: 401`).
- **400 / 422:** Maps to `AIServiceValidationError` with the AI service's specific domain code preserved (`NO_FACE_DETECTED`, `MULTIPLE_FACES_DETECTED`, `INVALID_CHILD_ID`).
- **429:** Maps to `AIServiceError` (`code: "AI_RATE_LIMITED"`, `statusCode: 429`).
- **503:** Maps to `AIServiceUnavailableError` (`code: "AI_SERVICE_UNAVAILABLE"`, `statusCode: 503`).
- **500 / 502:** Maps to `AIServiceResponseError` (`code: "AI_SERVER_ERROR"`, `statusCode: 500` or `502`).

### 6.4 Strict Response Schema Validation
- **Invalid JSON / HTML responses:** Throws `AIServiceResponseError` with status code and sanitized message.
- **Candidate Validation:** Validates that each candidate has a non-empty `child_id` and a finite numeric `similarity` score between `-1.0` and `1.0`. Rejects `NaN`, `Infinity`, and out-of-range scores immediately.
- **No Automatic Retry on Mutations:** Biometric writes (`enrollFace`) and deletions (`deleteFaceProfile`) are single-shot executions; no automatic retry loop exists.

---

## 7. SECURITY & PII BOUNDARIES

1. **Zero Child/Guardian PII:** The AI client operates strictly with opaque identifiers (`child_id`) and image buffers. It does not accept or transmit child names, guardian contacts, home addresses, or case metadata.
2. **Strict Vector Isolation:** The client never requests, receives, or exposes raw 512D float embeddings.
3. **No Database Pollution:** The client does not perform direct MongoDB lookups or mutate database schemas.
4. **No Direct Qdrant Exposure:** All vector operations route strictly through the authenticated FastAPI service (`ai-service`); Node.js does not connect directly to Qdrant ports `6333` or `6334`.

---

## 8. AUTOMATED TEST SUITE EXECUTION (16 TESTS)

Executed via Node.js native test runner:
```powershell
npm test
```

### Test Results Breakdown:

| # | Test Name | Status | Duration |
|---|---|---|---|
| 1 | Normalizes AI base URL and constructs correct endpoint URLs | **PASS** | 22.7ms |
| 2 | Sends X-Internal-Service-Key header on protected calls and omits on healthCheck | **PASS** | 1.6ms |
| 3 | Validates enrollment request and parses response contract correctly | **PASS** | 0.9ms |
| 4 | Validates search request and parses ranked candidates contract correctly | **PASS** | 1.0ms |
| 5 | Validates deletion request and parses response contract correctly | **PASS** | 0.8ms |
| 6 | Distinguishes healthy status from degraded dependency state in healthCheck | **PASS** | 0.8ms |
| 7 | Throws AIServiceTimeoutError on request timeout | **PASS** | 65.2ms |
| 8 | Throws AIServiceUnavailableError on network failure or connection refused | **PASS** | 2.7ms |
| 9 | Throws AIServiceAuthenticationError on HTTP 401 or 403 | **PASS** | 4.2ms |
| 10 | Throws AIServiceValidationError on NO_FACE_DETECTED or MULTIPLE_FACES_DETECTED | **PASS** | 3.4ms |
| 11 | Correctly handles HTTP 429 rate limit and 5xx server errors | **PASS** | 2.0ms |
| 12 | Throws AIServiceResponseError when response is invalid JSON or non-JSON | **PASS** | 1.1ms |
| 13 | Rejects candidates with invalid child IDs, NaN/Infinity, or out-of-range similarity | **PASS** | 4.9ms |
| 14 | Throws AIServiceConfigError when INTERNAL_SERVICE_KEY is missing without exposing secrets | **PASS** | 0.8ms |
| 15 | Confirms errors do not leak secrets, image buffers, or biometric vectors | **PASS** | 0.6ms |
| 16 | Confirms no automatic retry on mutation failures (enroll and delete executed exactly once) | **PASS** | 0.6ms |

**Summary:** 16 tests executed, 16 passed, 0 failed, 0 skipped. Duration: 212ms.

---

## 9. LIVE INTEGRATION SMOKE-TEST RESULTS

Executed against the live containerized AI service (`guardianlink-ai-service` and `guardianlink-qdrant`) on `http://127.0.0.1:8000`:

```powershell
node server/scripts/test_phase6_7_smoke.js
```

### Actual Execution Output:
```text
==================================================
🔍 GuardianLink Phase 6.7: Live AI Client Smoke Test
📡 Target URL: http://127.0.0.1:8000
==================================================
✅ 1. Health Check Response: {"status":"ok","isHealthy":true,"service":"guardianlink-ai-service","version":"1.0.0","modelsLoaded":false,"qdrantConnected":true,"details":{"collection_name":"missing_person_faces","collection_ready":true,"model_name":"buffalo_l","threshold":0.6}}
🧪 Using synthetic childId: smoke_test_child_1792069542922 (1808328 bytes image)
⏳ Enrolling reference facial portrait...
✅ 2. Enrollment Succeeded: {"success":true,"childId":"smoke_test_child_1792069542922","faceProfileId":"92396335-dd8f-51eb-818d-f20324e7d5c7","status":"enrolled","message":"Child reference facial biometric enrolled successfully."}
⏳ Executing similarity search query with reference image...
✅ 3. Search Succeeded: {"matchFound":true,"candidates":[{"childId":"smoke_test_child_1792069542922","similarity":1}],"totalCandidates":1,"thresholdApplied":0.6,"message":"Found 1 candidate match(es) meeting threshold 0.60"}
🎯 Candidate Match Verified: childId=smoke_test_child_1792069542922, similarity=1
⏳ Deleting synthetic child vector point...
✅ 4. Deletion Succeeded: {"success":true,"childId":"smoke_test_child_1792069542922","faceProfileId":"92396335-dd8f-51eb-818d-f20324e7d5c7","message":"Child biometric vector deleted successfully."}
⏳ Verifying candidate is no longer returned post-deletion...
✅ 5. Post-Deletion Absence Confirmed. Cleaned up successfully.
==================================================
🎉 ALL LIVE INTEGRATION SMOKE TESTS PASSED!
==================================================
```

---

## 10. REGRESSION CHECKS

1. **Docker Compose Configuration Validation:**
   ```powershell
   docker compose config --quiet
   ```
   **Result:** Exit code `0`. Validated service environments, network aliases, and volumes.
2. **Node Backend Syntax Validation:**
   ```powershell
   Get-ChildItem -Recurse -Filter *.js server | Where-Object { $_.FullName -notmatch 'node_modules' } | ForEach-Object { node -c $_.FullName }
   ```
   **Result:** Exit code `0`. All JavaScript files in `server/` passed syntax validation.
3. **Friend's Repository Isolation:**
   ```powershell
   git -C "C:\Users\Sumit\Desktop\Gaurdian" status
   ```
   **Result:** Clean / untouched. Zero changes made.

---

## 11. EXACT COMMANDS EXECUTED AND OUTCOMES

| Command | Working Directory | Outcome | Notes |
|---|---|---|---|
| `node -c server/errors/aiErrors.js` | Repo Root | Exit 0 | Syntax valid |
| `node -c server/config/ai.js` | Repo Root | Exit 0 | Syntax valid |
| `node -c server/services/aiService.js` | Repo Root | Exit 0 | Syntax valid |
| `node --test tests/aiClient.test.js` | `server/` | Exit 0 | 16/16 unit tests passed |
| `npm test` | `server/` | Exit 0 | npm test runner verified |
| `docker compose up -d qdrant ai-service` | Repo Root | Exit 0 | Containers healthy |
| `node server/scripts/test_phase6_7_smoke.js` | Repo Root | Exit 0 | Live inference and vector lifecycle verified |
| `docker compose config --quiet` | Repo Root | Exit 0 | Valid Compose configuration |
| `Get-ChildItem -Recurse -Filter *.js server` | Repo Root | Exit 0 | All server JS files syntax checked |

---

## 12. REMAINING LIMITATIONS & BOUNDARIES

- **Scope Boundary Strictly Respected:** Phase 6.7 creates the transport client only. No Express controller routes, child enrollment workflows, or citizen search endpoints were modified (reserved for Phase 6.8+).
- **No Direct Qdrant Access:** Node.js backend has no direct client or dependency on Qdrant. All vector indexing and search are mediated by the FastAPI AI microservice.

---

## 13. GIT STATUS & WORKSPACE HYGIENE

### GuardianLink Status:
```
Changes not staged for commit:
	modified:   .env.example
	modified:   docker-compose.yml
	modified:   server/.env.example
	modified:   server/package.json
	modified:   server/services/aiService.js

Untracked files:
	server/config/ai.js
	server/errors/aiErrors.js
	server/scripts/test_phase6_7_smoke.js
	server/tests/aiClient.test.js
	PHASE_6_7_NODE_AI_CLIENT_REPORT.md
```

### Friend's Repository Status:
```
On branch main
Your branch is up to date with 'origin/main'.
Untracked files:
	PHASE_3_AI_PROJECT_AUDIT.md
```
Zero files modified in `C:\Users\Sumit\Desktop\Gaurdian`.

---

## 14. COMPLETION CRITERIA CHECKLIST

| Criterion | Status | Evidence |
|---|---|---|
| Dedicated reusable Node.js AI client exists | **PASS** | `server/services/aiService.js` and `server/config/ai.js` implemented. |
| Follows verified FastAPI API contract | **PASS** | Uses `/health`, `/internal/face/enroll`, `/internal/face/search`, `/internal/face/{childId}`. |
| Protected calls use configured internal service key | **PASS** | Transmits `X-Internal-Service-Key` header verified by unit tests 2, 9, 14, 15 and live smoke test. |
| Timeouts and network/upstream failures handled predictably | **PASS** | Verified by unit tests 7, 8, 9, 10, 11, 12 (`AIServiceTimeoutError`, `AIServiceUnavailableError`). |
| Malformed responses rejected safely | **PASS** | Verified by unit tests 12 and 13 (`AIServiceResponseError`). |
| Automated tests cover success and failure paths | **PASS** | 16 unit tests passed in `server/tests/aiClient.test.js` via `npm test`. |
| Application business logic and authentication ownership unchanged | **PASS** | No Express routes or controllers touched in this phase. |
| No frontend, MongoDB schema, Qdrant data, or friend-repo changes | **PASS** | Zero frontend/MongoDB changes; friend's repo untouched; test records cleaned up. |
| Implementation report complete | **PASS** | `PHASE_6_7_NODE_AI_CLIENT_REPORT.md` created at repository root. |

---

## 15. SUMMARY & NEXT STEPS

Phase 6.7 is **100% complete**. The dedicated Node.js AI client is fully implemented, verified via 16 automated unit tests and a live end-to-end integration smoke test against the containerized microservice, and ready for integration in Phase 6.8.
