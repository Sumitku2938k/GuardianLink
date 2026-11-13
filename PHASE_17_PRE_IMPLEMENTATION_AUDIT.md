# GUARDIANLINK — PHASE 17: PRE-IMPLEMENTATION AUDIT REPORT

**Date:** November 13, 2026  
**Auditor / Engineer:** Antigravity (Google DeepMind)  
**Branch:** `goutam-devlopment`  
**Execution Phase:** Phase 17 — Data Integrity, Mock Data Elimination & Critical Security Fixes  
**Status:** AUDIT COMPLETED — PROCEEDING TO IMPLEMENTATION  

---

## 1. EXECUTIVE SUMMARY

Following the completion of the Phase 16 audit, Phase 17 initiates the active implementation of data integrity guarantees, runtime mock data elimination, guardian privacy protections, Nginx security header corrections, and seed script environment protections.

The current codebase maintains working core engines for InsightFace facial embeddings, Qdrant vector indexing, Mongoose schemas, RBAC middleware, and Socket.IO real-time channels. However, several frontend context providers and components contain hardcoded fallback mock arrays, synthetic CCTV candidates, simulated timers, and hardcoded analytics values that masquerade as live data. Additionally, a critical flaw in `client/nginx.conf` (`Permissions-Policy: camera=(), geolocation=()`) blocks legitimate camera and GPS capabilities in production, and `MissingCase.methods.toPublicResponse` concatenates street-level addresses into public views.

This pre-implementation audit documents the exact baseline state of all affected files, inventories all discovered mock artifacts and privacy vulnerabilities, outlines the planned remediations, and analyzes potential regression risks.

---

## 2. EXISTING IMPLEMENTATION BASELINE

| Component / Layer | File Path | Existing Baseline State |
|---|---|---|
| **Citizen Context** | `client/src/context/CitizenContext.jsx` | Initializes `foundReports` with 3 hardcoded mock sightings ("Kabir Mehta", etc.). `requestGuardianContact` runs a 3-second `setTimeout` simulating "John Mehta" phone acceptance. `submitFoundReport` modifies local state with `Math.random()`. |
| **Police Context** | `client/src/context/PoliceContext.jsx` | Initializes `officers` with 4 hardcoded fake officers (`off-101` through `off-104`). Synthesizes 3 fake CCTV AI candidate leads (`pm-ai-...` with fake 94.8% score) when MongoDB has zero reviews. Hardcodes `avgResponseTime: "4.2 mins"` and `avgRecoveryTime: "2.8 hours"`. |
| **Nearby Responders Card** | `client/src/components/citizen/NearbyHelpCard.jsx` | Renders hardcoded police stations, NGO shelters, and hospitals with fake phone numbers, distances, and `"Mock Location Data"` disclaimer. |
| **Guardian Contact Modal** | `client/src/components/citizen/GuardianContactModal.jsx` | Features simulated 3-second demo timer claiming "Guardian John Mehta accepted contact" and reveals fake direct emergency bridge `+91 98110 00100`. |
| **NGO Context** | `client/src/context/NgoContext.jsx` | Initializes `currentNgo` with fake "Helping Hands Child Foundation", registration `NGO-DL-2024-9841`, fake phone, and hardcoded 4-facility array. Hardcodes `avgTimeInCare: "3.4 Days"`. |
| **Case Controller Analytics** | `server/controllers/caseController.js` | `getPoliceDashboardStats` hardcodes `avgResponseTime: "4.2 mins"` and `avgRecoveryTime: "2.8 hours"`. |
| **NGO Service Analytics** | `server/services/ngoService.js` | `getDashboardStats` hardcodes `avgTimeInCare: "3.2 Days"`. |
| **Nginx Reverse Proxy** | `client/nginx.conf` | Line 13: `Permissions-Policy "camera=(), microphone=(), geolocation=()"` completely disables camera and geolocation for browsers in production. |
| **Missing Case Serialization** | `server/models/MissingCase.js` | `toPublicResponse()` concatenates `lastSeenLocation.address` into public output string, exposing residential addresses. |
| **Test / Seed Scripts** | `server/scripts/test_*.js` | Scripts perform test operations and `deleteMany` on specific IDs without fail-closed non-production environment checks. |

---

## 3. MOCK DATA & SYNTHETIC LOGIC INVENTORY

### 3.1 `client/src/context/CitizenContext.jsx`
1. **Mock Sighting Reports (Lines 22–94):** Array of 3 fake sighting records (`CR-2026-9041`, `CR-2026-3180`, `CR-2026-1120`) containing Unsplash images and fake children ("Kabir Mehta", "Ananya Sharma").
2. **Failure Disguise (Lines 294–326):** In `loadCitizenSightings()`, if `getMySightings()` returns an empty array or fails, `setFoundReports` is never invoked, leaving the 3 mock records visible.
3. **Simulated Parent Contact (Lines 263–284):** `requestGuardianContact()` triggers a 3-second `setTimeout` claiming "Guardian Accepted Contact Request" and dispatches a fake in-memory notification.
4. **Local Mutation Bypass (Lines 401–424):** `submitFoundReport()` uses `Math.random()` to generate `CR-2026-...` and appends to local React state without calling `POST /api/sightings`.
5. **Hardcoded Fallback Locations (Lines 120–123, 147–150):** `locationName: "Sector 14 Public Kiosk, Delhi"`, `latitude: "28.6139"`, `longitude: "77.2090"`.

### 3.2 `client/src/context/PoliceContext.jsx`
1. **Hardcoded Squad Roster (Lines 33–78):** 4 fabricated officer objects:
   - Insp. Vikram Rathore (`off-101`, `DL-POL-9482`)
   - Sub-Insp. M. K. Verma (`off-102`, `DL-POL-3321`)
   - Insp. V. K. Sharma (`off-103`, `DL-POL-7720`)
   - Officer Neha Singh (`off-104`, `DL-POL-4410`)
2. **Synthetic CCTV Match Generator (Lines 174–192):** When database has 0 match reviews, synthesizes up to 3 candidate leads labeled `CCTV Camera #10`, `CCTV Camera #11` with fake confidence scores (`94.8%`, `89.5%`, `81.2%`).
3. **Fake Station Metrics (Lines 94–95):** Hardcoded `avgResponseTime: "4.2 mins"` and `avgRecoveryTime: "2.8 hours"`.

### 3.3 `client/src/components/citizen/NearbyHelpCard.jsx`
1. **Fabricated Emergency Responders (Lines 7–35):** 3 fake stations:
   - "Sector 14 Police Protection Post" (`0.4 km away`, `+91 11 2301 0000`)
   - "Bachpan Bachao Verified Shelter Kiosk" (`1.2 km away`, `+91 11 2617 2000`)
   - "City Civil Emergency Hospital" (`1.8 km away`, `+91 11 2578 3000`)
2. Explicit disclaimer: `<span className="text-[11px] text-gray-400">Mock Location Data</span>`.

### 3.4 `client/src/components/citizen/GuardianContactModal.jsx`
1. **Demo Timer & Phone Bridge (Lines 68–101):**
   - `Status: Pending Confirmation (3s demo timer)`
   - Claims "Guardian John Mehta confirmed the match"
   - Exposes fake phone bridge: `+91 98110 00100`

### 3.5 `client/src/context/NgoContext.jsx`
1. **Fake NGO Profile (Lines 21–29):** "Helping Hands Child Foundation", registration `NGO-DL-2024-9841`, fake phone `+91 11 2617 2000`, fake email `contact@helpinghands.org`.
2. **Fake Facilities & Staff Count (Lines 37–43):** `staffCount: 12`, and 4 hardcoded facility objects.
3. **Fake Metrics (Line 55):** `avgTimeInCare: "3.4 Days"`.

---

## 4. API DEPENDENCIES & AUTHORIZATION MATRIX

| Frontend Requirement | Target Backend Route | Controller / Method | Required Role | State Machine / Rules |
|---|---|---|---|---|
| **Citizen Sighting Logs** | `GET /api/sightings/mine` | `sightingController.getMySightings` | Authenticated | Scoped strictly to `reportedBy: req.user._id` |
| **Sighting Details** | `GET /api/sightings/:id` | `sightingController.getSightingById` | Reporter / Police / Admin | IDOR protected; hides exact GPS coordinates if unauthorized |
| **Sighting Submission** | `POST /api/sightings` | `sightingController.submitSighting` | Authenticated | Mandatory `safetyConfirmed: true`; dispatches real alerts |
| **Police Officer Directory** | `GET /api/cases/police/officers` | `caseController.getPoliceOfficers` *(To Add)* | Police / Admin | Returns approved police personnel from same department/HQ |
| **Police Case Assignment** | `PATCH /api/cases/:caseId/assign` | `caseController.assignOfficer` | Police (Approved) / Admin | Validates officer ID against approved MongoDB `User` records |
| **Police Station Analytics** | `GET /api/cases/police/dashboard-stats` | `caseController.getPoliceDashboardStats` | Police (Approved) / Admin | Dynamically aggregates active cases, recoveries, and unreviewed sightings |
| **NGO Dashboard Stats** | `GET /api/ngo/dashboard-stats` | `ngoController.getDashboardStats` | NGO (Approved) / Admin | Scoped to `ngoId`; aggregates live bed capacity and care records |
| **NGO Shelters** | `GET /api/ngo/shelters` | `ngoController.getShelters` | NGO (Approved) / Admin | Returns real registered shelters with actual facilities and staff counts |

---

## 5. PRIVACY RISKS & GUARDIAN PII AUDIT

### 5.1 Vulnerability Points Identified
1. **Public Incident Location (`MissingCase.methods.toPublicResponse`):**
   - Lines 309–311:
     ```javascript
     const loc = this.lastSeenLocation || {};
     const locationParts = [loc.address, loc.city, loc.state, loc.pinCode].filter(Boolean);
     const locationString = locationParts.join(", ") || loc.city || "";
     ```
   - *Risk:* If a child goes missing from their home, the guardian's private residential street address (`loc.address`) and `loc.pinCode` are formatted directly into `last_seen_location` in public search responses.
   - *Fix:* Redact `loc.address` and `loc.pinCode` from public responses. Format public location strictly as `[loc.landmark, loc.city, loc.state].filter(Boolean).join(", ") || loc.city || "Location on record"`.
2. **Missing Case Listing Population for NGOs (`caseController.getCases`):**
   - Line 253: `.populate("reportedBy", "name email phone city state")`.
   - *Risk:* NGO users browsing general missing case listings could receive guardian phone numbers and emails before any placement or care relationship is established.
   - *Fix:* Sanitize `reportedBy` based on requester role. For NGO general listings, strip private guardian contact details (`phone`, `email`).
3. **Citizen Contact Direct Dial Simulation:**
   - *Risk:* Encourages citizen vigilantism and bypassing of official law enforcement verification.
   - *Fix:* Refactor `GuardianContactModal.jsx` into an official "Notify Law Enforcement & File Sighting" workflow.

---

## 6. NGINX CONFIGURATION AUDIT

### 6.1 Finding in `client/nginx.conf`
- **Location:** Line 13:
  ```nginx
  add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
  ```
- **Evaluation:** `camera=()` and `geolocation=()` completely disable camera and geolocation features for the application in any browser.
- **Impact:** Breaks `CitizenPhotoSearch.jsx` camera capture, found child photo capture, citizen sighting GPS capture, and parent incident location capture in production Docker deployments.
- **Remediation:** Update to:
  ```nginx
  add_header Permissions-Policy "camera=(self), microphone=(), geolocation=(self)" always;
  ```
- **Preserved Security:** Disallows microphone access (`microphone=()`), forbids third-party origin embedding, and retains all existing headers (`X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`).

---

## 7. SEED SCRIPT & DESTRUCTIVE OPERATION INVENTORY

### 7.1 Scripts Inspected in `server/scripts/`
- `test_phase0.js` through `test_phase10_realtime_notifications.js`
- `test_phase1_verification.js`
- `test_phase2_children.js`, `test_phase2_e2e.js`, `test_phase2_matrix.js`
- `test_phase3_images.js`
- `test_phase4_cases.js`
- `test_phase5_parent_real_data.js`
- `test_phase6_*.js`
- `test_phase7_citizen_response.js`
- `test_phase8_police_module.js`
- `test_phase9_ngo_module.js`

### 7.2 Safety Assessment
- All `server/scripts/test_*.js` scripts target specific test IDs during cleanup (e.g. `User.deleteMany({ _id: { $in: createdUserIds } })`).
- None of the scripts invoke `db.dropDatabase()` or unconditional `deleteMany({})`.
- **Precaution Required:** Add a shared execution guard `server/utils/scriptGuard.js` that checks `process.env.NODE_ENV !== "production"` and aborts execution immediately if invoked in production mode.

---

## 8. TEST COVERAGE BASELINE

- **Client Tests (`client/tests/*.test.js`):** 64 tests across 7 suites — all PASS.
- **Server Production Tests (`server/tests/phase14_*.js`, `phase15_*.js`):** 35 passed, 4 skipped (Docker daemon unavailable) — all PASS.
- **Target New Test Suite:** `server/tests/phase17_data_integrity.test.js` to systematically test mock elimination, guardian address privacy, Nginx headers, and seed environment guards.

---

## 9. STEP-BY-STEP IMPLEMENTATION PLAN

1. **Step 1:** Create `server/utils/scriptGuard.js` and enforce non-production safeguards on scripts.
2. **Step 2:** Update `client/nginx.conf` (`Permissions-Policy: camera=(self), geolocation=(self)`).
3. **Step 3:** Sanitize guardian residential address in `MissingCase.methods.toPublicResponse` and case serializers.
4. **Step 4:** Implement `GET /api/cases/police/officers` in backend to serve approved police roster and dynamically calculate police/NGO analytics.
5. **Step 5:** Eliminate mock data from `client/src/context/CitizenContext.jsx` (empty state initialization, real API integration, remove fake timer).
6. **Step 6:** Eliminate mock data from `client/src/context/PoliceContext.jsx` (remove synthetic CCTV leads, integrate real officer roster, remove hardcoded metrics).
7. **Step 7:** Eliminate mock data from `client/src/context/NgoContext.jsx` (remove fake Helping Hands info, bind real shelter facilities).
8. **Step 8:** Refactor `NearbyHelpCard.jsx` to display real national emergency helplines and honest responder network status.
9. **Step 9:** Refactor `GuardianContactModal.jsx` to eliminate fake phone bridges and guide citizens to official sighting reporting.
10. **Step 10:** Create and execute `server/tests/phase17_data_integrity.test.js` and run regression test suites.
11. **Step 11:** Verify production client build (`npm run build`) and generate `PHASE_17_IMPLEMENTATION_REPORT.md`.

---

## 10. POTENTIAL REGRESSION RISKS & MITIGATION

| Risk | Mitigation |
|---|---|
| Frontend crashes when collections are empty | Enforce safe optional chaining (`?.`), array guards (`Array.isArray`), and explicit `<EmptyState>` components across all modified contexts and pages. |
| Officer assignment fails without fake IDs | Backend validates whether `officerId` is an approved police user; frontend dropdown dynamically populates real approved officers from `GET /api/cases/police/officers`. |
| Map components fail on empty coordinate defaults | Pre-fill with empty strings `""` and check coordinates validity before passing to location handlers. |
| Existing integration tests break on address sanitization | Ensure `toSafeObject()` for authorized parents and assigned police officers continues to provide full operational location details. |

---

*Pre-implementation audit complete. Now proceeding directly to Phase 17 implementation per execution guidelines.*

