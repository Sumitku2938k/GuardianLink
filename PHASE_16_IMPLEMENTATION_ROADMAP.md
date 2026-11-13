# GUARDIANLINK — PHASE 16: SYSTEM INTEGRATION & FEATURE ROADMAP

**Date:** November 11, 2026  
**Author:** Antigravity (Google DeepMind - Advanced Agentic Coding)  
**Execution Strategy:** Dependency-Aware Phased Rollout  
**Mode:** ARCHITECTURAL SPECIFICATION & WORKSTREAM PLANNING  

---

## 1. STRATEGIC IMPLEMENTATION ORDER & DEPENDENCY RATIONALE

Before building high-level UI workflows or expanding portal capabilities, the platform's **data integrity foundation (Workstream A)** and **core evidence & location infrastructure (Workstreams B & C)** must be established. Without genuine schemas and real geospatial coordinates, the Citizen, Police, and NGO modules would continue falling back to mock fixtures.

```
       ┌────────────────────────────────────────────────────────┐
       │   WORKSTREAM A: Database & Mock Data Purge (P0)        │
       │   - Purge synthetic mock arrays from context providers │
       │   - Fix Nginx Permissions-Policy camera/geo lockout    │
       └───────────────────────────┬────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
       ┌────────────────────────┐    ┌────────────────────────┐
       │ WORKSTREAM B: FIR (P1) │    │ WORKSTREAM C: Loc (P1) │
       │ - Schema & Doc Upload  │    │ - Leaflet / OSM Map    │
       │ - Police Verification  │    │ - Privacy Coordinate   │
       └────────────┬───────────┘    └────────────┬───────────┘
                    │                             │
                    └──────────────┬──────────────┘
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │ WORKSTREAM D: Citizen Portal End-to-End Integration(P1)│
       │ - Real sighting history & true empty states            │
       │ - Remove fake guardian phone bridge simulation         │
       └───────────────────────────┬────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
       ┌────────────────────────┐    ┌────────────────────────┐
       │ WORKSTREAM E: Police   │    │ WORKSTREAM F: NGO      │
       │ - Real officer roster  │    │ - Live shelter details │
       │ - Real FIR review UI   │    │ - Dynamic analytics    │
       └────────────┬───────────┘    └────────────┬───────────┘
                    │                             │
                    └──────────────┬──────────────┘
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │ WORKSTREAM G: Final System Integration & E2E (P0)      │
       │ - Full multi-role lifecycle regression & verification  │
       └────────────────────────────────────────────────────────┘
```

### Why this sequence?
1. **Workstream A first:** The production Nginx header currently blocks camera and geolocation in production. Mock arrays in `CitizenContext` and `PoliceContext` inject fake data into every turn. Purging mock fallbacks ensures developers test against reality.
2. **Workstreams B & C next:** FIR and Location are foundational data primitives needed across Parent, Citizen, and Police workflows.
3. **Workstream D, E, F next:** Portal UIs can now consume real FIR documents, authentic maps, and real database entities.
4. **Workstream G last:** Full end-to-end multi-role verification across parent, citizen, police, NGO, and admin.

---

## WORKSTREAM A: DATABASE AND DATA INTEGRITY

### Task A.1: Production Nginx Permissions-Policy Remediate
- **Priority:** P0 (Critical Infrastructure Blocker)
- **Dependencies:** None
- **Affected Files:** `client/nginx.conf`
- **Backend Work:** None
- **Frontend / Infrastructure Work:** Update line 13 of `client/nginx.conf`:
  - *Current:* `add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;`
  - *Target:* `add_header Permissions-Policy "camera=(self), microphone=(), geolocation=(self)" always;`
- **Database Work:** None
- **Security Requirements:** Restrict camera and geolocation access to the app origin (`(self)`) while forbidding unauthorized third-party origins and microphone (`()`).
- **Tests Required:** Test in `client/tests/phase15_production_build.test.js` asserting `Permissions-Policy` permits `camera=(self)` and `geolocation=(self)`.
- **Acceptance Criteria:** Browsers running the production Docker container can invoke `navigator.mediaDevices.getUserMedia` and `navigator.geolocation.getCurrentPosition` without security policy exceptions.
- **Estimated Complexity:** LOW

---

### Task A.2: Purge Hardcoded Frontend Mock Arrays & Instate True Empty States
- **Priority:** P0 (Data Integrity Blocker)
- **Dependencies:** None
- **Affected Files:**
  - `client/src/context/CitizenContext.jsx`
  - `client/src/context/PoliceContext.jsx`
  - `client/src/context/NgoContext.jsx`
  - `client/src/components/citizen/NearbyHelpCard.jsx`
- **Backend Work:** None
- **Frontend Work:**
  - `CitizenContext.jsx`: Initialize `foundReports` as `[]`. Do NOT fallback to "Kabir Mehta" or "CR-2026-9041" when `getMySightings` returns 0 items. Render genuine `<EmptyState>` components.
  - `PoliceContext.jsx`: Remove synthetic CCTV match generation lines 174–192 (`pm-ai-...` with fake 94.8% scores). If zero reviews exist, set `potentialMatches` to `[]`.
  - `NearbyHelpCard.jsx`: Replace hardcoded mock police stations and NGO shelters with dynamic backend query or clear placeholder until registered stations are indexed.
- **Database Work:** None
- **Security Requirements:** Prevent presentation of fabricated leads or fake incident reports to users.
- **Tests Required:** Unit tests asserting `useCitizen` with empty API response returns 0 records and displays clean empty state.
- **Acceptance Criteria:** Zero mock sightings or fake CCTV leads appear when launching the app on a fresh database.
- **Estimated Complexity:** MEDIUM

---

### Task A.3: Production & Development Data Isolation Strategy
- **Priority:** P1 (Architecture)
- **Dependencies:** None
- **Affected Files:**
  - `server/scripts/seedDevData.js` (NEW)
  - `server/package.json`
- **Backend Work:** Create an explicit, isolated seed script `server/scripts/seedDevData.js` protected by `if (process.env.NODE_ENV === 'production') throw new Error("Cannot seed production database!");`.
- **Frontend Work:** None
- **Database Work:** Clearly separate seed fixtures from core schemas.
- **Security Requirements:** Prevent automated seed scripts from accidentally running against production MongoDB clusters.
- **Tests Required:** Script execution test verifying exit with code 1 if `NODE_ENV=production`.
- **Acceptance Criteria:** `npm run seed` operates exclusively in `development` or `test` environments.
- **Estimated Complexity:** LOW

---

## WORKSTREAM B: FIR MODULE (FIRST INFORMATION REPORT)

### Task B.1: FIR Data Model & Schema Definition
- **Priority:** P1 (Core Functionality)
- **Dependencies:** None
- **Affected Files:**
  - `server/models/FIR.js` (NEW)
  - `server/models/MissingCase.js`
  - `server/models/index.js`
- **Backend Work:** Create dedicated `FIR` Mongoose schema with:
  - `caseId`: ObjectId (ref: `MissingCase`, required, unique)
  - `childId`: ObjectId (ref: `Child`, required)
  - `firNumber`: String (required, trimmed, uppercase index)
  - `policeStation`: { name: String, district: String, state: String, code: String }
  - `filingDate`: Date (required, max: now)
  - `complainantName`: String (trimmed)
  - `investigatingOfficer`: { name: String, badgeNumber: String, phone: String }
  - `sectionsOfLaw`: [String] (e.g. `["Section 137 BNS / 363 IPC"]`)
  - `document`: {
      url: String,
      cloudinaryPublicId: String,
      fileName: String,
      fileSize: Number,
      mimeType: String,
      uploadedAt: Date,
      uploadedBy: ObjectId (ref: `User`)
    }
  - `verificationStatus`: Enum (`pending_verification`, `verified`, `rejected`, `amended`), default: `pending_verification`
  - `verificationNotes`: String
  - `verifiedBy`: ObjectId (ref: `User`)
  - `verifiedAt`: Date
- **Database Work:** Create compound indexes `{ caseId: 1 }` and `{ firNumber: 1 }`.
- **Security Requirements:** Access restricted to verified parent of case, assigned police officers, and platform administrators.
- **Tests Required:** Model validation unit tests verifying required fields, future-date rejection, and status enums.
- **Acceptance Criteria:** Schema successfully persists FIR metadata with linked case reference.
- **Estimated Complexity:** MEDIUM

---

### Task B.2: FIR Document Upload & Verification Backend APIs
- **Priority:** P1 (Core Backend)
- **Dependencies:** Task B.1
- **Affected Files:**
  - `server/routes/caseRoutes.js`
  - `server/controllers/caseController.js`
  - `server/services/firService.js` (NEW)
  - `server/middleware/upload.js`
- **Backend Work:**
  - Add `uploadFirDocument` middleware in `upload.js` validating PDF, JPEG, PNG <= 10MB.
  - Implement `POST /api/cases/:caseId/fir` (Parent & Police): Uploads certified copy to Cloudinary (`guardianlink/fir_documents`) and persists FIR record.
  - Implement `GET /api/cases/:caseId/fir` (Parent, Police, Admin, NGO): Retrieves verified FIR details and secure signed document URL.
  - Implement `PATCH /api/cases/:caseId/fir/verify` (Police & Admin only): Updates status to `verified` or `rejected` with mandatory officer review notes and records `FIR_VERIFIED` in `AuditLog`.
- **Security Requirements:** IDOR protection (parent can upload only to their reported case; police can verify only within assigned jurisdiction). Enforce magic-byte file signature validation.
- **Tests Required:** Integration tests covering file upload, parent permission, police verification, and audit logging.
- **Acceptance Criteria:** Parent uploads certified FIR PDF; assigned officer verifies it; audit event is recorded.
- **Estimated Complexity:** HIGH

---

### Task B.3: FIR Frontend Parent & Police UI Integration
- **Priority:** P1 (Core Frontend)
- **Dependencies:** Task B.2
- **Affected Files:**
  - `client/src/pages/parent/ReportMissingCase.jsx`
  - `client/src/pages/parent/CaseDetails.jsx`
  - `client/src/pages/police/PoliceCaseDetails.jsx`
  - `client/src/services/caseService.js` (NEW/EXTENDED)
  - `client/src/services/policeService.js`
- **Frontend Work:**
  - `ReportMissingCase.jsx`: Replace `"Mock upload mode"` with real file upload dropzone. Accept PDF/JPG/PNG. Collect `firNumber`, `policeStation`, `filingDate`.
  - `CaseDetails.jsx`: Display FIR status badge (`Verified`, `Pending Police Verification`, `Rejected`) and provide download link to certified document.
  - `PoliceCaseDetails.jsx`: Add FIR Document Review Card with embedded document viewer (modal/iframe), "Verify FIR" and "Reject FIR" action buttons, and review notes modal.
- **Security Requirements:** Never render untrusted URLs. Sanitize document links.
- **Tests Required:** Component tests for parent upload form and police verification modal.
- **Acceptance Criteria:** Parent uploads FIR document; police inspects document and marks it verified; badge updates across both parent and police dashboards.
- **Estimated Complexity:** HIGH

---

## WORKSTREAM C: LOCATION MODULE

### Task C.1: Integrate Lightweight Geospatial Mapping (Leaflet + OpenStreetMap)
- **Priority:** P1 (Core Capability)
- **Dependencies:** None
- **Affected Files:**
  - `client/package.json`
  - `client/src/components/common/InteractiveMap.jsx` (NEW)
  - `client/src/components/missing/MapPlaceholder.jsx` (REPLACE/REFACTOR)
- **Backend Work:** None
- **Frontend Work:**
  - Install `leaflet` and `react-leaflet` in `client/package.json` (open-source, zero API-key dependencies, works offline in local containers).
  - Create `InteractiveMap.jsx`:
    - Renders OpenStreetMap tiles with custom SVG pins for Last Known Location, Sighting Markers, and Shelter Facilities.
    - Draggable pin option for manual location adjustment when reporting.
    - Accuracy circle rendering based on GPS error radius.
    - Graceful offline fallback when tile server is unreachable.
- **Database Work:** None
- **Security Requirements:** Coordinates must render client-side without transmitting GPS traces to external telemetry services.
- **Tests Required:** Component unit tests verifying component mount, coordinates props, and marker placement.
- **Acceptance Criteria:** Real interactive zoomable map replaces CSS placeholder across Parent, Citizen, and Police pages.
- **Estimated Complexity:** MEDIUM

---

### Task C.2: Privacy-Conscious Location Scrubbing & API Redaction
- **Priority:** P0 (Security & Privacy Blocker)
- **Dependencies:** None
- **Affected Files:**
  - `server/models/MissingCase.js`
  - `server/controllers/citizenController.js`
  - `server/controllers/caseController.js`
- **Backend Work:**
  - Update `MissingCase.methods.toPublicResponse()`:
    - Never include street-level residential `address` in public responses.
    - Include only general district/landmark: `[loc.landmark, loc.city, loc.state].filter(Boolean).join(", ")`.
    - Exact street address and coordinates are visible ONLY to the reporting parent, assigned police officers, and verified care NGOs.
  - Review `citizenController.searchMissingChild`: Ensure resolved candidates strip exact guardian residential location before returning to citizen helper.
- **Security Requirements:** Prevent exposure of guardian home addresses or victim sensitive coordinates to the public.
- **Tests Required:** Test asserting public case search does NOT return guardian street address or exact residential coordinates.
- **Acceptance Criteria:** Public searches return general city/district; authorized police calls return exact coordinates.
- **Estimated Complexity:** LOW

---

## WORKSTREAM D: CITIZEN MODULE

### Task D.1: Dynamic Citizen Sighting History & Real Sighting Details
- **Priority:** P1 (Core Functional)
- **Dependencies:** Workstream A (Mock Purge)
- **Affected Files:**
  - `client/src/context/CitizenContext.jsx`
  - `client/src/pages/citizen/CitizenReportsList.jsx`
  - `client/src/pages/citizen/CitizenReportDetails.jsx`
  - `client/src/services/citizenService.js`
- **Backend Work:** Ensure `GET /api/sightings/:id` enforces authorization: allowed if user is reporting citizen, assigned officer, case guardian, or admin.
- **Frontend Work:**
  - `CitizenReportsList.jsx`: Consume dynamic records from `GET /api/sightings/mine`. Render empty state when length is 0.
  - `CitizenReportDetails.jsx`: Fetch live record via `citizenService.getSightingDetails(reportId)` on page mount so direct links work on refresh.
- **Security Requirements:** Citizen can view only their own submitted sighting reports (IDOR prevention).
- **Tests Required:** UI tests verifying dynamic list render, error handling, and detail page fetching.
- **Acceptance Criteria:** Submitting a sighting updates the citizen list immediately; opening details fetches directly from backend.
- **Estimated Complexity:** MEDIUM

---

### Task D.2: Replace Simulated Guardian Contact with Official Dispatch Notice
- **Priority:** P1 (Security / Usability)
- **Dependencies:** None
- **Affected Files:**
  - `client/src/components/citizen/GuardianContactModal.jsx`
  - `client/src/pages/citizen/FoundChildResult.jsx`
- **Frontend Work:**
  - Remove hardcoded 3-second demo timer simulating "John Mehta".
  - Replace modal with **"Notify Responders & File Sighting"**:
    - Explains that the potential AI lead is queued for immediate police and NGO desk verification.
    - Citizen submits formal sighting report directly from the match result.
    - Removes fake phone bridge (`+91 98110 00100`).
- **Backend Work:** Sighting submission already notifies verified parents and police via Socket.IO and MongoDB notifications.
- **Security Requirements:** Civilians must NOT be encouraged to bypass police and conduct unverified private meetups.
- **Tests Required:** UI test asserting clicking contact triggers verified notification without fake parent phone dialog.
- **Acceptance Criteria:** Zero demo timers or hardcoded phone numbers in the citizen identification workflow.
- **Estimated Complexity:** LOW

---

## WORKSTREAM E: POLICE MODULE

### Task E.1: Real Police Station Officer Squad Directory API
- **Priority:** P1 (Core Backend & Integration)
- **Dependencies:** None
- **Affected Files:**
  - `server/routes/caseRoutes.js`
  - `server/controllers/caseController.js`
  - `client/src/context/PoliceContext.jsx`
  - `client/src/components/police/AssignmentModal.jsx`
  - `client/src/services/policeService.js`
- **Backend Work:**
  - Implement `GET /api/cases/police/officers`: Returns approved police officers registered under the same police station / organization.
  - Update `PATCH /api/cases/:caseId/assign`: Validate that `officerId` is an approved police user in MongoDB.
- **Frontend Work:**
  - `PoliceContext.jsx`: Fetch dynamic officer roster via `policeService.getStationOfficers()`. Remove fake roster (`off-101` through `off-104`).
  - `AssignmentModal.jsx`: Render dynamic list of real active officers with real badge numbers.
- **Security Requirements:** Case reassignment restricted to verified officers within the authorized department.
- **Tests Required:** Integration tests for squad directory listing and assignment validation.
- **Acceptance Criteria:** Real police users registered in the database appear in squad assignment dropdowns.
- **Estimated Complexity:** MEDIUM

---

### Task E.2: Dynamic Station Command Analytics
- **Priority:** P2 (Analytics & UI)
- **Dependencies:** None
- **Affected Files:**
  - `server/controllers/caseController.js`
  - `client/src/pages/police/PoliceDashboard.jsx`
  - `client/src/pages/police/PoliceAnalytics.jsx`
- **Backend Work:** Extend `getPoliceDashboardStats` to compute dynamic recovery metrics, active squad case distribution, and monthly trends using MongoDB aggregation pipelines.
- **Frontend Work:** Bind `PoliceDashboard.jsx` and `PoliceAnalytics.jsx` to live analytics payload. Remove hardcoded strings `"4.2 mins"` and `"2.8 hours"`.
- **Tests Required:** Controller aggregation pipeline unit tests.
- **Acceptance Criteria:** Dashboard statistics update dynamically as cases change status.
- **Estimated Complexity:** LOW

---

## WORKSTREAM F: NGO MODULE

### Task F.1: Dynamic NGO Profile, Shelter Facilities & Live Occupancy
- **Priority:** P2 (UI & Data Sync)
- **Dependencies:** None
- **Affected Files:**
  - `server/models/Shelter.js`
  - `server/controllers/ngoController.js`
  - `client/src/context/NgoContext.jsx`
  - `client/src/pages/ngo/NgoDashboard.jsx`
  - `client/src/pages/ngo/NgoProfile.jsx`
- **Backend Work:** Ensure `Shelter.facilities` array is updated upon shelter edit (`PATCH /api/ngo/shelters/:id`).
- **Frontend Work:**
  - `NgoContext.jsx`: Populate facilities from active shelter document instead of hardcoded 4-facility array.
  - `NgoProfile.jsx`: Display real registration number and contact information from authenticated user session.
- **Tests Required:** Shelter facility update integration test.
- **Acceptance Criteria:** Shelter facilities reflect live database state.
- **Estimated Complexity:** LOW

---

### Task F.2: NGO Intake Biometric Pre-Check
- **Priority:** P1 (Biometric Integration)
- **Dependencies:** Workstream C
- **Affected Files:**
  - `client/src/pages/ngo/NgoIntakeWizard.jsx`
  - `server/controllers/ngoController.js`
- **Backend Work:** Support optional `photo` upload during `POST /api/ngo/care-records` to perform automatic background biometric search against active missing cases.
- **Frontend Work:** In `NgoIntakeWizard.jsx`, provide a photo capture step. If biometric search flags a match with an active missing case, auto-link `caseId` and notify the investigating police officer.
- **Security Requirements:** NGO staff can view candidate match only as a lead; police retains authority over verified reunification.
- **Tests Required:** Intake photo match notification test.
- **Acceptance Criteria:** Ingesting an unidentified child with a photograph immediately alerts the assigned officer if an active case exists.
- **Estimated Complexity:** MEDIUM

---

## WORKSTREAM G: FINAL SYSTEM INTEGRATION & VERIFICATION

### Task G.1: Cross-Module End-to-End Regression Test Suite
- **Priority:** P0 (Quality & Security Gate)
- **Dependencies:** Workstreams A, B, C, D, E, F
- **Affected Files:**
  - `server/tests/phase16_e2e_full_lifecycle.test.js` (NEW)
  - `client/tests/phase16_integration.test.js` (NEW)
- **Scope:**
  1. Parent registers child with photo (InsightFace embeds to Qdrant).
  2. Parent reports missing incident with FIR document and GPS location.
  3. Citizen uploads photograph via `/api/citizen/search-missing-child` (Qdrant finds candidate).
  4. Citizen submits sighting with safety pledge and GPS coordinates.
  5. Police officer reviews sighting and reviews AI match lead (`confirm`). Case transitions to `found`.
  6. Police assigns shelter bed; NGO creates care intake.
  7. NGO initiates handover to parent; Police verifies and approves; Handover completes and shelter capacity is freed.
  8. Full audit log trail is verified for every step.
- **Acceptance Criteria:** Complete end-to-end multi-role test suite passes with 0 failures.
- **Estimated Complexity:** HIGH

---

### Task G.2: Production Docker & Phase 15 Compatibility Revalidation
- **Priority:** P0 (Deployment Gate)
- **Dependencies:** Task A.1, Task G.1
- **Affected Files:**
  - `client/nginx.conf`
  - `docker-compose.prod.yml`
  - `.github/workflows/production-readiness.yml`
- **Scope:**
  - Execute full production build in Docker containers.
  - Verify Nginx serves React SPA with corrected `Permissions-Policy`.
  - Validate camera and geolocation APIs in production container.
  - Verify zero backend secrets leaked in client bundle.
- **Acceptance Criteria:** Production Docker containers boot cleanly, pass healthchecks, and pass all CI checks.
- **Estimated Complexity:** LOW

---

## 3. SUMMARY MATRIX OF WORKSTREAMS & PRIORITIES

| Workstream | Name | P0 Tasks | P1 Tasks | P2 Tasks | P3 Tasks | Total Tasks | Est. Effort |
|---|---|---|---|---|---|---|---|
| **A** | Database & Data Integrity | 2 | 1 | 0 | 0 | 3 | Small |
| **B** | FIR Module | 0 | 3 | 0 | 0 | 3 | Medium |
| **C** | Location Module | 1 | 1 | 0 | 0 | 2 | Medium |
| **D** | Citizen Module | 0 | 2 | 0 | 0 | 2 | Small |
| **E** | Police Module | 0 | 1 | 1 | 0 | 2 | Small |
| **F** | NGO Module | 0 | 1 | 1 | 0 | 2 | Small |
| **G** | Final System Integration | 2 | 0 | 0 | 0 | 2 | Medium |
| **TOTAL** | **All Streams** | **5** | **9** | **2** | **0** | **16 Tasks** | **Complete** |

---

## 4. IMMEDIATE NEXT STEPS (POST-PHASE 16)

When authorized to begin implementation in Phase 17:
1. **First Action:** Fix `client/nginx.conf` line 13 (`Permissions-Policy`) so camera and geolocation work in production.
2. **Second Action:** Remove mock fallback arrays from `CitizenContext.jsx` and synthetic CCTV leads from `PoliceContext.jsx`.
3. **Third Action:** Implement dedicated `FIR` schema, Cloudinary document upload route, and police verification endpoints (Workstream B).
4. **Fourth Action:** Install `leaflet` and replace `MapPlaceholder.jsx` with `InteractiveMap.jsx` (Workstream C).
5. **Fifth Action:** Proceed sequentially through Workstreams D, E, F, and close with Workstream G end-to-end regression.

