# PHASE 7.1 — CITIZEN RESPONSE SYSTEM ARCHITECTURAL AUDIT REPORT
**GuardianLink Child Safety Platform**  
**Date:** October 20, 2026  
**Auditor:** Senior Computer Vision, Backend & Application Security Engineer (Phase 7 Lead)

---

## 1. EXECUTIVE SUMMARY

An extensive audit of the GuardianLink codebase was conducted to evaluate readiness for **Phase 7: Citizen Response System (Potential Match → Sighting Report → Authorized Alert)**.

The audit verified that Phase 6 biometric services (InsightFace ArcFace 512-D embeddings, Qdrant vector database, Node.js AI client, and privacy-safe citizen search backend) are **fully operational, healthy, and passing all 106 automated tests**.

However, the server-side sighting persistence, notification dispatching, and case revalidation infrastructure for Phase 7 are currently **missing in the backend** and **simulated in client-side React state**.

This audit details the verified assets, identifies architectural gaps, classifies all findings, and establishes the strict design contracts required to implement Phase 7 safely and compliantly.

---

## 2. PHASE 6 DEPENDENCY VERIFICATION

| Component | Target / Port | Status | Verification Evidence |
| :--- | :--- | :--- | :--- |
| **Qdrant Vector DB** | `127.0.0.1:6333` | **ONLINE & HEALTHY** | Container `guardianlink-qdrant` healthy; collection `missing_person_faces` indexed |
| **FastAPI AI Service** | `127.0.0.1:8000` | **ONLINE & HEALTHY** | Container `guardianlink-ai-service` healthy; `GET /health` returns status `healthy` |
| **Redis Cache** | `0.0.0.0:6379` | **ONLINE** | Container `guardianlink-redis` up; session & rate limit cache operational |
| **MongoDB** | `0.0.0.0:27017` | **ONLINE** | Container `guardianlink-mongo` up; database `guardianlink` active |
| **Node.js AI Client** | `server/services/aiService.js` | **VERIFIED** | 100% test pass; timeout, circuit breaker, retry logic verified |
| **Citizen Search API** | `POST /api/citizen/search-missing-child` | **VERIFIED** | Enforces single face, fail-closed eligibility, sanitized DTO |
| **Candidate Serializer** | `server/services/citizenPhotoSearchService.js` | **VERIFIED** | Strict allowlist excludes guardian PII, medical data, raw vectors |
| **Search UI Integration** | `client/src/pages/citizen/CitizenPhotoSearch.jsx` | **VERIFIED** | 25/25 client tests pass; live capture, format validation, disclaimers |

**Phase 6 Status:** All Phase 6 dependencies are 100% operational and verified. There are **zero blockers** preventing Phase 7 implementation.

---

## 3. AUDIT CLASSIFICATION MATRIX

Findings across frontend, backend, models, security, and workflows are classified below into the five mandatory categories:

### A. Already Implemented and Verified
1. **Citizen Authentication & RBAC:**
   - Existing user roles include `citizen`, `parent`, `police`, `ngo`, `admin` in `server/models/User.js`.
   - Session authentication via `server/middleware/authenticate.js` and role enforcement via `server/middleware/authorize.js`.
   - Client authentication context in `client/src/context/AuthContext.jsx` with HttpOnly cookie support.
2. **Citizen Biometric Photo Search:**
   - Real search endpoint `POST /api/citizen/search-missing-child` with `photoSearchRateLimiter` and Multer memory upload in `server/routes/citizenRoutes.js`.
   - Multi-face and zero-face detection validation handled with HTTP 422 and distinct human-friendly error codes (`NO_FACE_DETECTED`, `MULTIPLE_FACES_DETECTED`).
   - Timeout (504) and service outage (503) mapping in `server/controllers/citizenController.js`.
3. **Server-Side Candidate Resolution & Fail-Closed Privacy:**
   - `searchMissingChildPhoto` queries AI, resolves candidates against MongoDB `Child` (`status: "active"`) and `MissingCase` (`status: { $in: ["active", "reported", "under_verification"] }`).
   - Unenrolled children, closed cases (`found`, `reunited`, `closed`, `cancelled`), or orphaned vectors fail closed and are dropped silently.
   - `serializeCitizenCandidate` enforces strict data minimization: zero guardian phone numbers, zero guardian emails, zero residential addresses, zero raw embeddings, zero Cloudinary public IDs.
4. **Citizen Search UI & Uncertainty Advisories:**
   - `CitizenPhotoSearch.jsx` and `MatchResultCard.jsx` prominently label results as **"Potential Match"** and mandate the disclaimer: *"AI similarity results are potential leads, not confirmation of identity."*
   - Cosine similarity values are displayed as raw decimal numbers and qualitative ratings (HIGH/MEDIUM/LOW), never converted to misleading identity probabilities or percentages.

### B. Partially Implemented
1. **Citizen Found Child Report Form (`client/src/pages/citizen/FoundChildReportForm.jsx`):**
   - Collects observation details (age, gender, clothing, distinctive features, notes, location, landmark, coordinates).
   - *Gap:* Currently submits via `setTimeout` to `submitFoundReport` in `CitizenContext.jsx` (local React state). It does not call any backend API, does not send `caseId` / `candidateId` from search results, and does not require explicit safety confirmation as an independent validation gate.
2. **Police Found Reports Desk (`client/src/pages/police/PoliceFoundReports.jsx`):**
   - Renders a queue of sighting reports and allows linking a report to a police case.
   - *Gap:* Consumes in-memory mock data from `PoliceContext.jsx`. Does not fetch persisted sightings from MongoDB or update server-side review status.
3. **Citizen Submitted Reports List & Details (`CitizenReportsList.jsx`, `CitizenReportDetails.jsx`):**
   - Renders user's submitted sighting reports and detailed status.
   - *Gap:* Bound to mock records in `CitizenContext.jsx`. Lacks API integration to `GET /api/sightings/mine` and `GET /api/sightings/:id`.

### C. Missing
1. **Sighting Mongoose Model (`server/models/Sighting.js`):**
   - No Mongoose schema exists for sightings.
   - Required schema:
     - `caseId`: ObjectId ref `MissingCase` (indexed, required)
     - `childId`: ObjectId ref `Child` (indexed, required)
     - `reportedBy`: ObjectId ref `User` (indexed, required)
     - `observedAt`: Date (defaults to `Date.now`, validated `<= Date.now()`)
     - `location`:
       - `address`: String, trim, max 300
       - `city`: String, trim, max 100
       - `state`: String, trim, max 100
       - `pinCode`: String, trim, max 20
       - `latitude`: Number (-90 to 90)
       - `longitude`: Number (-180 to 180)
     - `description`: String, trim, max 2000, required
     - `appearance`: { approxAge, approxGender, clothing, distinctiveFeatures }
     - `safetyConfirmed`: Boolean, required true (submission rejected if false)
     - `status`: enum `["submitted", "under_review", "verified", "dismissed"]`, default `"submitted"`, indexed
     - `reviewedBy`: ObjectId ref `User`, default null
     - `reviewedAt`: Date, default null
     - `reviewNotes`: String, default ""
     - `timestamps`: true
2. **Notification Mongoose Model (`server/models/Notification.js`):**
   - No Mongoose schema exists for persistent in-app notifications.
   - Required schema:
     - `recipientId`: ObjectId ref `User` (indexed, required)
     - `senderId`: ObjectId ref `User` (optional)
     - `role`: enum `["police", "parent", "citizen", "admin"]`
     - `type`: enum `["sighting_reported", "sighting_reviewed", "case_updated", "system_alert"]`
     - `title`: String, required
     - `message`: String, required
     - `data`: { sightingId, caseId, childId, caseNumber }
     - `isRead`: Boolean, default false, indexed
     - `readAt`: Date, default null
     - `deliveryStatus`: enum `["created", "attempted", "confirmed", "failed"]`, default `"created"`
     - `timestamps`: true
3. **Sighting Service (`server/services/sightingService.js`):**
   - Revalidates `MissingCase` eligibility at submission time (`status` must be in `["active", "reported", "under_verification"]`).
   - Resolves `childId` directly from the authoritative `MissingCase` (never trusts frontend `childId`).
   - Derives `reportedBy` strictly from `req.user._id`.
   - Validates `safetyConfirmed === true`.
   - Persists Sighting in MongoDB.
   - Dispatches in-app notifications to assigned police / station officers and verified guardian.
4. **Notification Service (`server/services/notificationService.js`):**
   - Dispatches persistent in-app notifications to authorized police personnel and the verified guardian.
   - Excludes guardian private contact info (phone/email) from citizen notifications and API payloads.
   - Tracks delivery status (`created`, `attempted`, `confirmed`, `failed`).
5. **Sighting Controller & Routes (`server/controllers/sightingController.js`, `server/routes/sightingRoutes.js`):**
   - `POST /api/sightings`: Submit sighting report (citizen, parent, police, ngo, admin).
   - `GET /api/sightings/mine`: List authenticated citizen's submitted sightings.
   - `GET /api/sightings/:id`: Retrieve single sighting (restricted to reporter, assigned police, or admin).
   - `PATCH /api/sightings/:id/review`: Review sighting status (restricted to police, admin).
   - `GET /api/sightings/case/:caseId`: List sightings for a specific case (restricted to police, admin, or case guardian).
6. **Notification Controller & Routes (`server/controllers/notificationController.js`, `server/routes/notificationRoutes.js`):**
   - `GET /api/notifications`: List authenticated user's notifications.
   - `PATCH /api/notifications/:id/read`: Mark notification as read.
   - `PATCH /api/notifications/read-all`: Mark all notifications as read.
7. **Rate Limiting for Sightings:**
   - Dedicated `sightingRateLimiter` (e.g. max 15 submissions per 15 minutes per IP/user) to prevent spamming and denial of service.

### D. Blocked by Incomplete Phase 6 Dependencies
- **NONE.** All Phase 6 microservices and vector indices are functioning normally.

### E. Security Concerns & Architectural Safeguards
1. **Guardian Privacy Guarantee:**
   - A citizen must NEVER be able to query, receive, or scrape guardian contact details (phone, email, residential address).
   - Sighting endpoints must strictly sanitize output. Returning raw Mongoose documents is strictly prohibited.
2. **Exact Sighting Coordinates Protection:**
   - Exact latitude/longitude represents sensitive operational intelligence.
   - Non-authorized citizens must never view coordinates of other citizens' sightings.
   - Public candidate search must never disclose exact coordinates of historical sightings.
3. **Re-validation at Submission Time:**
   - If a missing case was active during search, but was closed/reunited before sighting submission, the backend must re-validate the case and reject submission with `CASE_NOT_ELIGIBLE` (HTTP 409/422).
4. **Mandatory Safety Confirmation Gate:**
   - Submissions without `safetyConfirmed: true` must be rejected with HTTP 400 (`SAFETY_CONFIRMATION_REQUIRED`).
5. **Mass-Assignment Defense:**
   - Fields such as `status`, `reviewedBy`, `reviewedAt`, `childId`, and `reportedBy` must be stripped from `req.body` and resolved internally.
6. **Resilience & Notification Non-Rollback:**
   - If in-app notification dispatch fails due to an unexpected error, the successfully persisted `Sighting` document must NOT be rolled back or lost.

---

## 4. ENDPOINT DESIGN CONTRACTS

### A. Sighting Endpoints (`/api/sightings`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/sightings` | `citizen`, `parent`, `police`, `ngo`, `admin` | Create persistent sighting report |
| `GET` | `/api/sightings/mine` | `citizen`, `parent`, `police`, `ngo`, `admin` | List current user's submitted sightings |
| `GET` | `/api/sightings/:id` | Reporter, Authorized Police, Admin, Case Guardian | Get detailed sighting report |
| `PATCH` | `/api/sightings/:id/review` | `police`, `admin` | Update sighting review status & notes |
| `GET` | `/api/sightings/case/:caseId` | `police`, `admin`, Case Guardian | Get all sightings for a case |

### B. Notification Endpoints (`/api/notifications`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/notifications` | Authenticated users | List in-app notifications |
| `PATCH` | `/api/notifications/:id/read` | Recipient user | Mark notification as read |
| `PATCH` | `/api/notifications/read-all` | Recipient user | Mark all user notifications as read |

---

## 5. AUDIT CONCLUSION & NEXT ACTIONS

The architecture is sound and fully prepared for Phase 7 implementation. We will execute according to the prompt sequence:
1. Implement `Sighting` and `Notification` models.
2. Implement `sightingService` and `notificationService`.
3. Implement `sightingController`, `notificationController`, and mount routes in `server/app.js`.
4. Update client services and citizen UI components.
5. Create comprehensive test suite `server/tests/phase7_sighting.test.js` and test script `server/scripts/test_phase7_citizen_response.js`.
6. Run full regression testing across Phases 0–6.
7. Verify client build and manual E2E workflow.
8. Deliver final implementation report `PHASE_7_CITIZEN_RESPONSE_SYSTEM_REPORT.md`.
