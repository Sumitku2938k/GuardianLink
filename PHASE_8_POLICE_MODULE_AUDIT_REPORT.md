# GUARDIANLINK — PHASE 8 POLICE MODULE AUDIT REPORT
**Pre-Implementation Audit of Police Module, Investigation Workflows, Sighting Review & Case Resolution**

**Audit Date:** October 20, 2026  
**Auditor:** GuardianLink Senior Full-Stack & Security Engineering Pair  
**Status:** Audit Completed — Implementation Roadmap Ready  

---

## 1. EXECUTIVE SUMMARY

GuardianLink has established real, verified capabilities across previous phases:
- **Phase 0–3:** User authentication, RBAC, Redis sessions, child registration, and Cloudinary media pipelines.
- **Phase 4:** Controlled MissingCase state machine (`reported` -> `under_verification` -> `active` -> `found` -> `reunited` -> `closed` -> `cancelled`), parent case management, and data isolation.
- **Phase 5–6:** FastAPI AI microservice with InsightFace SCRFD + ArcFace (`buffalo_l`), Qdrant vector retrieval, secure Node.js client, biometric enrollment, and privacy-preserving citizen photo search.
- **Phase 7:** Citizen Response System with persistent `Sighting` records, location capture, mandatory safety confirmation, and persistent in-app notifications.

However, the **Police Module** (`client/src/context/PoliceContext.jsx` and related police pages) currently operates almost entirely on **in-memory mock fixtures and client-side mutations**. When a police officer opens `/police/cases`, `/police/cases/:caseId`, or `/police/dashboard`, the application relies on hardcoded state arrays. Refreshing a case detail page loses all mutated state, investigation notes, tasks, and verification decisions.

The purpose of this audit is to catalogue every mock fixture, identify missing backend endpoints and schema fields, define the police authorization model, and establish the exact implementation plan to connect the existing Police UI to authoritative MongoDB and Node.js Express endpoints without breaking previous phase contracts.

---

## 2. FRONTEND AUDIT FINDINGS

### 2.1 `client/src/context/PoliceContext.jsx`
- **State Audit:**
  - `officers`: Hardcoded array of 4 mock officers (`off-101` Insp. R. S. Rathore, `off-102`, `off-103`, `off-104`).
  - `policeCases`: Hardcoded array of 3 sample cases (`MC-2026-8821`, `MC-2026-4431`, `MC-2026-1092`) with embedded mock child profiles, fake medical data, and fake guardian contact cards.
  - `investigationNotes`: Local dictionary mapped by case ID containing mock log entries.
  - `investigationTasks`: Local dictionary mapped by case ID containing mock squad checklists.
  - `potentialMatches`: Hardcoded array of 3 mock AI vector match records.
  - `foundReports`: Hardcoded array of 2 mock citizen sighting reports.
  - `stationAnalytics`: Hardcoded static metrics (`totalMissing: 48, activeCases: 12, criticalCases: 3...`).
  - `policeNotifications`: Hardcoded array of 3 mock notification items.
- **Method Audit:**
  - `assignOfficer`: Only modifies local React `policeCases` state and prepends an entry to local `investigationNotes`. No API call.
  - `updateCaseStatus`: Only mutates local `policeCases` state and local `investigationNotes`. No API call.
  - `addInvestigationNote`: Appends note to local React state only. No API call.
  - `verifyMatchDecision`: Updates local `potentialMatches` state, sets status to "Found", and appends a local note. No API call.
  - `toggleTask` / `createTask`: Modifies local React state only. No API call.
  - `refreshData`: Simulates network fetch via `setTimeout(resolve, 300)`.
  - `getCaseById`: Performs client-side `find` on the local `policeCases` array. Fails on direct refresh if state isn't pre-populated or if case ID is not in mock array.

### 2.2 Police Pages
1. **`PoliceDashboard.jsx`**:
   - Computes counts from mock `policeCases`, `potentialMatches`, `foundReports`, and displays static `stationAnalytics`.
   - Filters cases in the browser only.
2. **`PoliceCasesList.jsx`**:
   - Renders `PoliceCaseTable` or card view directly from mock `policeCases`.
3. **`PoliceCaseDetails.jsx`**:
   - Calls `getCaseById(caseId)` synchronously from context. If a user refreshes the browser on `/police/cases/:caseId`, it can only find the case if it exists in the mock array.
   - Shows child photo, medical info, guardian phone, and investigation notes log.
4. **`PoliceCaseInvestigation.jsx`**:
   - Checklist and notes rely strictly on context dictionaries `investigationTasks[caseId]` and `investigationNotes[caseId]`.
5. **`PoliceCaseMatches.jsx`**:
   - Filters `potentialMatches` by case ID.
   - Verification modal triggers `verifyMatchDecision` with a 1-second `setTimeout` mock.
6. **`PoliceFoundReports.jsx`**:
   - Renders `foundReports` from context.
   - Linking a report to a case invokes `alert()` and updates local state only.
7. **`PoliceNotifications.jsx`**:
   - Displays hardcoded notification cards; does not consume `GET /api/notifications`.
8. **`PoliceAssignments.jsx` & `PoliceAnalytics.jsx`**:
   - Rely on mock `officers` and `stationAnalytics`.

---

## 3. BACKEND AUDIT FINDINGS

### 3.1 Existing Data Models
1. **`User.js`**:
   - Roles: `"parent"`, `"citizen"`, `"police"`, `"ngo"`, `"admin"`.
   - Status: `"active"`, `"pending"`, `"approved"`, `"rejected"`, `"suspended"`, `"deactivated"`.
   - Fields: `name`, `email`, `phone`, `organization`, `city`, `state`, `pinCode`.
   - Police accounts are required to have `status: "approved"` to access operational case records.
2. **`MissingCase.js`**:
   - Fields: `childId`, `reportedBy`, `missingDate`, `lastSeenLocation` (`address`, `city`, `state`, `pinCode`, `latitude`, `longitude`), `lastSeenDescription`, `status`, `priority`, `policeCaseNumber`, `firNumber`, `firDocumentUrl`, `cloudinaryPublicId`, `foundAt`, `reunitedAt`.
   - **Gaps for Phase 8:**
     - Missing `assignedOfficer`: `{ id: ObjectId, name: String, badgeNumber: String, assignedAt: Date }`.
     - Missing `investigationNotes`: `[{ officerId: ObjectId, officerName: String, badge: String, text: String, createdAt: Date }]`.
     - Missing `investigationTasks`: `[{ label: String, completed: Boolean, assignedTo: String, completedAt: Date, createdAt: Date }]`.
     - Missing `potentialMatchReviews`: `[{ matchId: String, candidateId: String, decision: String, verificationStatus: String, notes: String, reviewedBy: ObjectId, reviewedAt: Date }]`.
3. **`Sighting.js` (Phase 7)**:
   - Already fully implemented with `caseId`, `childId`, `reportedBy`, `sightingNumber`, `observedAt`, `location`, `description`, `appearance`, `safetyState`, `safetyConfirmed`, `status` (`submitted`, `under_review`, `verified`, `dismissed`), `reviewedBy`, `reviewedAt`, `reviewNotes`.
   - `toSafeObject()` already protects exact coordinates from unauthorized users.
4. **`Notification.js` (Phase 7)**:
   - Already fully implemented with `recipientId`, `senderId`, `recipientRole`, `type`, `title`, `message`, `data`, `isRead`, `readAt`, `deliveryStatus`.

### 3.2 Existing Routes & Controllers
1. **`caseRoutes.js` / `caseController.js`**:
   - `POST /api/cases`: Parent creates missing case.
   - `GET /api/cases`: Lists cases scoped by role (Police with `status === "approved"` see operational cases).
   - `GET /api/cases/:caseId`: Scoped detail lookup (Police verified check enforced).
   - `PATCH /api/cases/:caseId/status`: Controlled state machine transition (`reported`, `under_verification`, `active`, `found`, `reunited`, `closed`).
   - **Gaps for Phase 8:**
     - No endpoint for police dashboard summary counts (`GET /api/cases/police/dashboard-stats`).
     - No endpoint to update FIR and police case numbers (`PATCH /api/cases/:caseId/investigation`).
     - No endpoint to assign an officer to a case (`PATCH /api/cases/:caseId/assign`).
     - No endpoint to append investigation notes (`POST /api/cases/:caseId/notes`).
     - No endpoint to manage investigation tasks (`POST /api/cases/:caseId/tasks`, `PATCH /api/cases/:caseId/tasks/:taskId`).
     - No endpoint to submit human review of an AI candidate match (`POST /api/cases/:caseId/matches/:matchId/review`).
2. **`sightingRoutes.js` / `sightingController.js`**:
   - `POST /api/sightings`: Submit sighting (citizen/all).
   - `GET /api/sightings/mine`: Reporter's sightings.
   - `GET /api/sightings/:id`: Single sighting details with coordinate protection.
   - `PATCH /api/sightings/:id/review`: Police/admin review (`under_review`, `verified`, `dismissed`).
   - `GET /api/sightings/case/:caseId`: All sightings for a case.
   - **Gaps for Phase 8:**
     - Needs `GET /api/sightings` (restricted to `police`, `admin`, `ngo`) so officers can retrieve the full queue of citizen sightings for the station desk.

---

## 4. FEATURE CLASSIFICATION MATRIX

| Feature | Audit Classification | Current State & Notes |
|---|---|---|
| Police Role & Approval Gate | **Already Implemented and Verified** | `requireApproved` check in `caseController.js` verifies `req.user.status === "approved"`. `RoleRoute.jsx` redirects pending accounts to `/verification-pending`. |
| Operational Cases Retrieval | **Already Implemented and Verified** | `GET /api/cases` returns operational cases for approved police officers. |
| Case Details Authorization | **Already Implemented and Verified** | `GET /api/cases/:caseId` allows approved police to view case details. |
| Sighting Report Review API | **Already Implemented and Verified** | `PATCH /api/sightings/:id/review` records `reviewedBy`, `reviewedAt`, `reviewNotes`, and transitions status. |
| Single & Case Sighting Queries | **Already Implemented and Verified** | `GET /api/sightings/:id` and `GET /api/sightings/case/:caseId` already exist and enforce coordinate protection. |
| Notification Infrastructure | **Already Implemented and Verified** | `GET /api/notifications`, `PATCH /api/notifications/:id/read` exist and persist in-app alerts. |
| Police Sighting Queue Endpoint | **Missing from Backend** | `GET /api/sightings` is required for the Police Found Reports / Sightings desk queue. |
| Police Dashboard Scoped Aggregation | **Missing from Backend** | Needs `GET /api/cases/police/dashboard-stats` to aggregate real counts without client-side heavy computation. |
| FIR & Police Case Number Update | **Missing from Backend** | Needs `PATCH /api/cases/:caseId/investigation` to persist official FIR numbers. |
| Case Officer Assignment | **Missing from Backend** | Needs `PATCH /api/cases/:caseId/assign` to store assigned officer and append assignment note. |
| Investigation Notes Persistence | **Missing from Backend** | Needs `POST /api/cases/:caseId/notes` with append-only session-derived officer identity. |
| Squad Action Checklist (Tasks) | **Missing from Backend** | Needs `POST /api/cases/:caseId/tasks` and `PATCH /api/cases/:caseId/tasks/:taskId`. |
| Human AI Match Review Persistence | **Missing from Backend** | Needs `POST /api/cases/:caseId/matches/:matchId/review` to record officer decision and rationale. |
| Police Frontend API Integration | **Mock-Only** | `PoliceContext.jsx` and all police pages currently operate on mock state arrays and `setTimeout`. Must be re-wired to real backend APIs. |
| Direct Refresh Support | **Partially Implemented** | Direct navigation to `/police/cases/:caseId` fails if not in mock state; must fetch from real backend on mount. |

---

## 5. SECURITY & ARCHITECTURAL REQUIREMENTS

1. **Strict Session Identity (No Client Identity Spoofing):**
   - The backend must derive `officerId`, `officerName`, and `badgeNumber` from `req.user`. It must never accept client-supplied `updatedBy`, `reviewedBy`, or `officerId`.
2. **Account Approval Enforcement:**
   - Unapproved police accounts (`status: "pending"` or `"rejected"`) must receive `403 ACCOUNT_VERIFICATION_PENDING` on all operational endpoints.
3. **Sensitive PII Protection:**
   - Guardian contact info and exact sighting coordinates must be protected and returned only to authorized roles.
4. **AI Match Verification Principle:**
   - AI similarity scores are leads, never proof of identity.
   - An AI candidate must never be automatically verified.
   - Moving a case to `found` requires an explicit, authenticated human officer decision.
5. **Controlled State Machine Integrity:**
   - Status transitions must adhere to Phase 4 rules. Arbitrary status jumping is rejected.

---

## 6. IMPLEMENTATION ROADMAP

1. **Step 1:** Extend `MissingCase.js` model with `assignedOfficer`, `investigationNotes`, `investigationTasks`, and `potentialMatchReviews`.
2. **Step 2:** Add missing backend endpoints to `caseController.js` and `caseRoutes.js` (`getPoliceDashboardStats`, `assignOfficer`, `addInvestigationNote`, `createTask`, `toggleTask`, `updateInvestigationDetails`, `reviewAIMatch`).
3. **Step 3:** Add `getAllSightings` (`GET /api/sightings`) to `sightingController.js` and `sightingRoutes.js`.
4. **Step 4:** Create `client/src/services/policeService.js` using the configured Axios client.
5. **Step 5:** Rewrite `PoliceContext.jsx` to eliminate mock data, integrate real API operations, and handle direct refresh and error states.
6. **Step 6:** Update police views (`PoliceDashboard`, `PoliceCasesList`, `PoliceCaseDetails`, `PoliceCaseInvestigation`, `PoliceCaseMatches`, `PoliceFoundReports`, `PoliceNotifications`) to consume real data and mutations.
7. **Step 7:** Write comprehensive backend tests in `server/scripts/test_phase8_police_module.js` and `server/tests/phase8_police_module.test.js`.
8. **Step 8:** Run full test suite, regression tests, and client build.
9. **Step 9:** Generate final implementation report (`PHASE_8_POLICE_MODULE_IMPLEMENTATION_REPORT.md`).
