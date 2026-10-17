# GUARDIANLINK — PHASE 6.10: CITIZEN PHOTO SEARCH UI INTEGRATION REPORT

**Date:** October 16, 2026  
**Status:** COMPLETE (All criteria passed)  
**Lead Role:** Senior React Frontend Engineer  
**Repository:** GuardianLink (`c:\Users\Sumit\Desktop\College Sem Projects\GuardianLink Sem 5`)  
**External AI Repository:** `C:\Users\Sumit\Desktop\Gaurdian` (Strictly untouched)  

---

## EXECUTIVE SUMMARY

Phase 6.10 completes the citizen-facing user interface integration for facial similarity search in GuardianLink. It connects the React frontend directly to the real Phase 6.9 backend API (`POST /api/citizen/search-missing-child`), completely eradicating all previous mock data, fake simulated timers, and hardcoded test matches (`Kabir Mehta`). The interface enforces strict uncertainty messaging, prominently displaying **“Potential Match”** across all candidate leads and completely prohibiting claims of verified identity.

---

## 1. PRE-IMPLEMENTATION FRONTEND AUDIT FINDINGS

| Component / Concern | Discovered Current State | Integration Decision |
| :--- | :--- | :--- |
| **Framework & Versions** | React 18.3.1, Vite 8.2.0, react-router-dom 6.30.1, Axios 1.19.0, Tailwind CSS 3.4.17. | Reuse current stack without introducing new dependencies or heavy state stores. |
| **Routing & Protection** | `App.jsx` wraps authenticated citizen routes in `<RoleRoute allowedRoles={["citizen"]} />` and `<DashboardLayout />`. | Added dedicated routes `/citizen/search` and `/citizen/search-missing-child` within the protected citizen route group. |
| **Previous Mock Flow** | `CitizenContext.jsx` simulated `runAIMatching` with a fake 900ms timer returning hardcoded candidate Kabir Mehta (94.8% vector similarity). `FoundChildResult.jsx` had "Demo: Simulate No Match" / "Match Found" toggle buttons. | **Removed 100% of simulated mock data.** Connected `CitizenContext` and citizen pages directly to the real backend service. |
| **API Client & Credentials** | `client/src/lib/axios.js` configured with `withCredentials: true` and `baseURL` from `VITE_API_BASE_URL` (default `http://localhost:5000`). Content-Type omitted for automatic `FormData` boundary handling. | Reused `@/lib/axios` without hardcoding production URLs or manually overriding multipart boundaries. |
| **Upload Requirements** | Backend accepts `multipart/form-data` with field `'photo'`, max 5 MB, JPEG/PNG/WebP only. | Enforced client-side pre-validation in `validateSearchPhoto()` to fail fast before network dispatch while letting backend remain authoritative. |
| **Camera Capture** | Previously, clicking "Use Camera" set a hardcoded Unsplash image after a fake delay. | Replaced with real WebRTC `navigator.mediaDevices.getUserMedia` viewfinder with canvas snapshot, permission-denied handling, and fallback to file upload. |

---

## 2. CITIZEN SEARCH PAGE & ROUTE ARCHITECTURE

### Integrated Routes in `client/src/App.jsx`
- **Primary Search Route:** `/citizen/search` -> `<CitizenPhotoSearch />`
- **Route Alias:** `/citizen/search-missing-child` -> `<CitizenPhotoSearch />`
- **Connected Found-Child Flow:** `/citizen/found-child/photo` -> `/citizen/found-child/matching` -> `/citizen/found-child/result` (all upgraded to use the real backend API).

### Navigation Touchpoints
1. **Citizen Dashboard Quick Actions:** Added a dedicated **Photo Search Missing Child** card directly navigating to `/citizen/search`.
2. **Found Child Hero CTA:** Added a direct **Search Missing Child** button alongside the full 60-second found child protocol.
3. **Breadcrumbs & Back Navigation:** Clean navigation back to `/citizen/dashboard` with in-flight request cancellation.

---

## 3. UI STATE MANAGEMENT & SAFETY GUARDS

The search workflow manages 6 distinct UI states:

```
[idle] ──(Select File / Snap Camera)──> [photo_selected] ──(Click Search)──> [searching]
                                                                                │
                               ┌─────────────────┬──────────────────────────────┤
                               ▼                 ▼                              ▼
                           [results]       [no_results]                      [error]
                               │                 │                              │
                     (Search Another)     (Try Another)                   (Retry Search)
                               │                 │                              │
                               └─────────────────┴──────────────────────────────┘
```

1. `idle`: Initial state. Upload control and camera capture active. Search button disabled.
2. `photo_selected`: Validated photograph preview rendered. "Remove & Replace" button active. Search button enabled.
3. `searching`: Request in progress. Search button displays loading spinner and is disabled against double-clicks. Live animated biometric scanning radar active. Accessible status announcement (`aria-live="polite"`). User can click "Cancel Search" to abort.
4. `results`: One or more disclosable candidates returned by backend. Candidate leads rendered with mandatory **Potential Match** disclaimer.
5. `no_results`: Successful backend response with 0 eligible candidates. Displays neutral, respectful advisory explaining this does not prove the child is not missing.
6. `error`: Categorized error state with actionable guidance:
   - `NO_FACE_DETECTED` (422): "No human face was detected. Please provide a clear, front-facing image."
   - `MULTIPLE_FACES_DETECTED` (422): "Multiple faces detected. Please submit an image cropped to a single child."
   - `RATE_LIMIT_EXCEEDED` (429): "Too many search requests from this IP. Please wait 15 minutes before searching again."
   - `AI_SERVICE_UNAVAILABLE` (503): "The biometric identification service is temporarily offline for maintenance. Please try again shortly."
   - `AI_SERVICE_TIMEOUT` (504): "The facial similarity search timed out. Please try again in a few moments."
   - `NETWORK_ERROR`: "Unable to connect to the GuardianLink search service. Please check your internet connection."
   - **Retry Safeguard:** Selected photo is retained across recoverable errors so the citizen can retry with a single click.

---

## 4. STRICT UNCERTAINTY & POTENTIAL MATCH MESSAGING

### Prohibited Copy (Enforced by Unit Tests)
- ❌ "Verified Match"
- ❌ "Identity Confirmed"
- ❌ "This is definitely the missing child"
- ❌ "100% Match"
- ❌ Probability percentages (e.g. "94.8% probability of identity")

### Permitted Copy & Disclaimers
- ✅ Primary Badge: **Potential Match**
- ✅ AI Similarity Rating: Categorical rating (`HIGH`, `MEDIUM`, `LOW`) accompanied by raw numeric cosine similarity (e.g. `0.9200`).
- ✅ Prominent Safety Warning on All Result Cards:
  > “AI similarity results are potential leads, not confirmation of identity. A photograph may match incorrectly. Please do not confront anyone or make assumptions based solely on this result. Follow the official reporting and verification process.”
- ✅ Permitted Fields Only: Reference photograph, Child name, Age, Gender, Description, Last Seen Location (City, State), Missing Date, Case Number, Case Status.
- ✅ PII Exclusion: Guardian names, phone numbers, home addresses, medical records, and police notes are completely absent.

---

## 5. REAL CAMERA CAPTURE & UPLOAD PIPELINE

1. **Camera Capture:** Uses `navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } })`.
   - Renders live camera stream in a `<video>` viewfinder with face alignment guide.
   - Snapshot draws frame to `<canvas>` and converts to JPEG `Blob` (quality 0.92).
   - Generates an in-memory `File` instance (`sighting_<timestamp>.jpg`).
   - Clean stream track termination on snapshot, cancel, or unmount.
   - Handles `NotAllowedError` (permission denied) and `NotFoundError` (no camera device) with clear user guidance.
2. **File Selection:** Supports JPEG, PNG, and WebP up to 5 MB.
3. **Memory Management:** Preview uses `URL.createObjectURL(file)`. Any previous object URL is immediately revoked via `URL.revokeObjectURL()` on replacement or unmount.
4. **Zero Persistent Storage:** The query photo is **never** written to `localStorage`, `sessionStorage`, or `IndexedDB`, and is never directly uploaded to Cloudinary.

---

## 6. AUTOMATED TEST SUITE EXECUTION

### Frontend Test Suite (`client/tests/citizenPhotoSearchUI.test.js`)
Executed via:
```bash
npm test --prefix client
```

#### Results: 25 / 25 Passed (0 Failed)
```text
TAP version 13
# Subtest: Citizen Photo Search UI Test Suite (Phase 6.10)
    ok 1 - 1. Search page service modules and constants are defined and exported
    ok 2 - 2. Upload control accepts JPEG, PNG, and WebP formats
    ok 3 - 3. Unsupported formats (GIF, PDF, text) are rejected with INVALID_FILE_TYPE
    ok 4 - 4. Oversized images (> 5MB) are rejected before dispatch with FILE_TOO_LARGE
    ok 5 - 5. Zero-byte empty files are rejected before dispatch with EMPTY_FILE
    ok 6 - 6. Missing or null file input is rejected safely with NO_FILE_SELECTED
    ok 7 - 7. searchMissingChildPhoto throws validation error without making network request if photo is invalid
    ok 8 - 8. Builds FormData with field 'photo' and dispatches to /api/citizen/search-missing-child
    ok 9 - 9. Normalizes HTTP 400 with specific code and message
    ok 10 - 10. Normalizes HTTP 401 as UNAUTHORIZED session expiry
    ok 11 - 11. Normalizes HTTP 403 as FORBIDDEN access denied
    ok 12 - 12. Normalizes HTTP 413 as PAYLOAD_TOO_LARGE
    ok 13 - 13. Normalizes HTTP 422 NO_FACE_DETECTED with front-facing guidance
    ok 14 - 14. Normalizes HTTP 422 MULTIPLE_FACES_DETECTED requesting single-child crop
    ok 15 - 15. Normalizes HTTP 429 as RATE_LIMIT_EXCEEDED with 15-minute wait advisory
    ok 16 - 16. Normalizes HTTP 503 as AI_SERVICE_UNAVAILABLE retryable error
    ok 17 - 17. Normalizes HTTP 504 as AI_SERVICE_TIMEOUT retryable error
    ok 18 - 18. Normalizes network failure as NETWORK_ERROR without masquerading as zero-match
    ok 19 - 19. Normalizes request cancellation (AbortController) safely
    ok 20 - 20. Confirms candidate labeling mandates 'Potential Match' and prohibits 'Verified Match'
    ok 21 - 21. Similarity values are kept as finite numeric decimals and NOT converted to percentages
    ok 22 - 22. Successful empty search returns matchFound: false and totalCandidates: 0
    ok 23 - 23. Confirms query photos are not cached in browser storage
    ok 24 - 24. Photo file reference is preserved on retryable errors
    ok 25 - 25. Selecting a new photograph clears stale candidate results and previous errors
1..25
# tests 25
# suites 1
# pass 25
# fail 0
```

---

## 7. FULL REGRESSION VERIFICATION

### 1. Production Build Verification
```bash
npm run build --prefix client
```
**Outcome:** Built in 2.35s with 0 errors (`dist/index.html`, `dist/assets/index-*.js`, `dist/assets/index-*.css`).

### 2. Backend Regression Suite (`server/tests/`)
```bash
npm test --prefix server
```
**Outcome:** All 3 suites passing (56 tests total):
- `aiClient.test.js`: 16/16 passed
- `childBiometricEnrollment.test.js`: 20/20 passed
- `citizenPhotoSearch.test.js`: 20/20 passed

---

## 8. FILES CREATED & MODIFIED

### Files Created
1. `client/src/services/citizenService.js` — Client-side API service handling photo validation, FormData generation, backend dispatch, and safe error normalization.
2. `client/src/pages/citizen/CitizenPhotoSearch.jsx` — Dedicated, accessible Citizen Photo Search page with full UI state management, camera capture, live progress scanning, potential match cards, empty-results state, and uncertainty advisories.
3. `client/tests/citizenPhotoSearchUI.test.js` — 25 automated unit and safety tests covering upload validation, error normalization, uncertainty copy enforcement, and state transitions.
4. `PHASE_6_10_CITIZEN_SEARCH_UI_REPORT.md` — This deliverable report.

### Files Modified
1. `client/package.json` — Added `"test": "node --test tests/**/*.test.js"` script.
2. `client/src/App.jsx` — Registered `/citizen/search` and `/citizen/search-missing-child` routes guarded by citizen role and dashboard layout.
3. `client/src/context/CitizenContext.jsx` — Replaced simulated `runAIMatching` and hardcoded Kabir Mehta mock data with real `searchMissingChildPhoto` backend service integration.
4. `client/src/components/citizen/PhotoCaptureCard.jsx` — Added real WebRTC camera capture (`getUserMedia`), file format/size pre-validation, object URL revocation, and removed hardcoded Unsplash sample photo.
5. `client/src/components/citizen/MatchResultCard.jsx` — Enforced **"Potential Match"** badge, uncertainty disclaimer, real backend candidate fields, and removed simulated confidence percentages.
6. `client/src/components/citizen/AIProcessingCard.jsx` — Removed fake `setInterval` mock timer; upgraded to an active scanning feedback component during real network requests.
7. `client/src/components/citizen/FoundChildCTA.jsx` — Added direct "Search Missing Child" action button.
8. `client/src/pages/citizen/CitizenDashboard.jsx` — Added direct "Photo Search Missing Child" quick-action card.
9. `client/src/pages/citizen/FoundChildPhoto.jsx` — Upgraded to pass real `File` and preview URL to `CitizenContext`.
10. `client/src/pages/citizen/FoundChildMatching.jsx` — Connected to real `runAIMatching()` backend invocation with error handling.
11. `client/src/pages/citizen/FoundChildResult.jsx` — Removed demo simulation toggle buttons and rendered real backend candidate leads.
12. `client/src/lib/axios.js` — Made `baseURL` access safe for Node test runners via optional chaining.

### External Repositories Status
- **GuardianLink:** Clean git status with only Phase 6.10 frontend changes.
- **Friend's Repository (`C:\Users\Sumit\Desktop\Gaurdian`):** 100% UNTOUCHED (0 changes).

---

## 9. COMPLETION CRITERIA CHECKLIST

| Criterion | Status | Evidence |
| :--- | :---: | :--- |
| **1. Citizen can select a valid photo and view its preview** | **PASS** | File input and WebRTC camera capture verified with `URL.createObjectURL` and cleanup in `PhotoCaptureCard.jsx`. |
| **2. UI sends photograph to real GuardianLink backend** | **PASS** | `api.post("/api/citizen/search-missing-child", formData)` executed with multipart boundary. |
| **3. Mock data absent from delivered search flow** | **PASS** | Hardcoded Kabir Mehta candidate, Unsplash demo photos, and simulated interval timers completely removed. |
| **4. Loading, validation, empty-results, and error states work** | **PASS** | Managed explicit states: `idle`, `photo_selected`, `searching`, `results`, `no_results`, `error`. |
| **5. Real privacy-filtered backend candidates rendered safely** | **PASS** | `MatchResultCard.jsx` renders only permissible fields: name, age, gender, caseNumber, status, location, date, photoUrl. Zero PII leakage. |
| **6. Every result described as a potential, unverified lead** | **PASS** | Label **"Potential Match"** and prominent advisory displayed on every result card and page header. |
| **7. UI never claims identity has been verified** | **PASS** | Enforced by unit test #20. Zero instances of "Verified Match" or "Identity Confirmed". |
| **8. Existing authentication and navigation remain intact** | **PASS** | Routes guarded under `RoleRoute(["citizen"])` and `DashboardLayout`. |
| **9. Frontend tests and build checks pass** | **PASS** | `npm test --prefix client` (25/25 passed), `npm run build --prefix client` (code 0 in 2.35s). |
| **10. Implementation report accurately documents results** | **PASS** | This document details all architecture, tests, and observed outputs. |

---

## 10. CONCLUSION & FUTURE WORK

Phase 6.10 is complete and verified. The citizen photo search UI is fully integrated with the real Node.js backend API and AI microservice, offering a privacy-safe, accessible, and mock-free experience.

**Potential Next Steps (upon user approval):**
- **Phase 6.11:** Law Enforcement / Police Desk Case Matching Integration (viewing citizen sighting leads, verifying potential biometric candidate leads against FIR records, and initiating family reunification workflows).
