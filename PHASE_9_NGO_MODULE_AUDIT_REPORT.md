# GUARDIANLINK — PHASE 9 NGO MODULE AUDIT REPORT
**System:** GuardianLink AI-Assisted Child Safety Platform  
**Phase:** Phase 9 — NGO Operational Module  
**Date:** October 2026  
**Auditor:** Antigravity Senior Engineering Pair  

---

## 1. Executive Summary

A comprehensive architectural and codebase audit was conducted across the GuardianLink repository (`server/` and `client/`) prior to implementing Phase 9 (NGO Module). The primary objective is to replace all NGO mock data, static placeholders, and `setTimeout`-based simulated mutations with a secure, persistent, real-data NGO operational care workflow:

$$\text{Authorized Referral / Found Case} \longrightarrow \text{Safe NGO Intake} \longrightarrow \text{Shelter Placement} \longrightarrow \text{Care \& Wellbeing Logs} \longrightarrow \text{Police Coordination} \longrightarrow \text{Authorized Handover} \longrightarrow \text{Closure of Care Record}$$

### Non-Negotiable Boundary Enforcement:
- **No Direct AI Microservice, InsightFace, or Qdrant Access:** The NGO frontend and backend do not invoke AI candidate matching, vector searches, or biometric face-enrollment pipelines. Operational referral and case authorization are strictly decoupled from AI inference.
- **No Independent Verification / Reunification:** An NGO does not treat an AI similarity score as identity proof and cannot unilaterally verify legal identity or mark a `MissingCase` as `reunited` or `closed`. Handover approvals and case lifecycle status transitions remain under the exclusive authority of verified law enforcement officers.

---

## 2. Inventory & Classification of Components

Each architectural component is audited and classified into four categories:
1. **Already implemented and reusable**
2. **Partially implemented and needing changes**
3. **Missing and requiring implementation**
4. **Blocked by a missing prerequisite**

### 2.1 Backend Models & Data Layer

| Component | Status | Existing Location / Contract | Notes & Findings |
| :--- | :--- | :--- | :--- |
| `User` Model & Roles | **Already implemented and reusable** | `server/models/User.js` | Supports `role: "ngo"`, `status: "approved" \| "pending" \| "suspended"`, and `organization: String`. Existing approval gate `ACCOUNT_VERIFICATION_PENDING` functions properly. |
| `MissingCase` Model | **Already implemented and reusable** | `server/models/MissingCase.js` | Authoritative incident entity with state machine (`reported`, `under_verification`, `active`, `found`, `reunited`, `closed`, `cancelled`). |
| `Child` Model | **Already implemented and reusable** | `server/models/Child.js` | Core child demographics, physical descriptions, and guardian ownership references. PII protected. |
| `Notification` Model | **Partially implemented and needing changes** | `server/models/Notification.js` | Already includes `recipientRole: "ngo"`. Currently enum `type` includes `sighting_reported`, `sighting_reviewed`, `case_updated`, `match_flagged`, `system_alert`. Needs non-breaking addition of NGO care lifecycle types (`care_intake`, `care_status_updated`, `handover_requested`, `handover_approved`, `handover_completed`, `handover_rejected`) and reference fields in `data`. |
| `CareRecord` Model | **Missing and requiring implementation** | Needs `server/models/CareRecord.js` | Must track `caseId`, `childId`, `ngoId`, `shelterId`, `intakeNumber`, `status` (`pending_intake`, `in_care`, `awaiting_handover`, `handed_over`, `closed`), `receivedAt`, `receivedBy`, `initialCondition`, `careNotes`, `medicalStatus`, `policeCoordination`, and `handoverId`. |
| `Shelter` Model | **Missing and requiring implementation** | Needs `server/models/Shelter.js` | Must track `name`, `ngoId`, `address`, `capacity`, `activePlacements`, `status` (`active`, `inactive`), `facilities`, and `staffCount`. Must enforce atomic concurrency checks to prevent overbooking. |
| `Handover` Model | **Missing and requiring implementation** | Needs `server/models/Handover.js` | Must track `careRecordId`, `caseId`, `childId`, `ngoId`, `handoverType`, `status` (`pending`, `approved`, `completed`, `rejected`), `requestedBy`, `approvedBy`, `receivingOfficer`, `guardianDetails`, timestamps, and audit notes. |

### 2.2 Backend Authorization & Controllers

| Route / Controller | Status | Existing Location | Notes & Findings |
| :--- | :--- | :--- | :--- |
| `authMiddleware` & `requireRole` | **Already implemented and reusable** | `server/middleware/auth.js`, `server/middleware/role.js` | Reusable JWT/cookie authentication and role verification. |
| `caseController.js` (NGO Scoping) | **Already implemented and reusable** | `server/controllers/caseController.js` | `getCases` already scopes cases for approved NGO users to `{ status: { $in: ["active", "found", "reunited"] } }` and rejects unapproved NGO accounts with `403 ACCOUNT_VERIFICATION_PENDING`. `getCaseById` enforces approval checks. |
| NGO Routes & Controller | **Missing and requiring implementation** | Needs `server/routes/ngoRoutes.js`, `server/controllers/ngoController.js`, `server/services/ngoService.js` | Required endpoints: `GET /api/ngo/dashboard-stats`, `GET /api/ngo/referrals`, `GET /api/ngo/care-records`, `POST /api/ngo/care-records`, `GET /api/ngo/care-records/:id`, `PATCH /api/ngo/care-records/:id/status`, `POST /api/ngo/care-records/:id/notes`, `PATCH /api/ngo/care-records/:id/medical-status`, `GET /api/ngo/shelters`, `POST /api/ngo/shelters`, `PATCH /api/ngo/shelters/:id`, `POST /api/ngo/care-records/:id/placement`, `POST /api/ngo/care-records/:id/handovers`, `GET /api/ngo/handovers`, `GET /api/ngo/handovers/:id`, `PATCH /api/ngo/handovers/:id/approve`, `PATCH /api/ngo/handovers/:id/complete`, `PATCH /api/ngo/handovers/:id/reject`. |

### 2.3 Frontend Context, Services & UI Pages

| Component / File | Status | Existing State | Gap / Planned Remediation |
| :--- | :--- | :--- | :--- |
| `client/src/services/ngoService.js` | **Missing and requiring implementation** | Does not exist | Create Axios service matching pattern established in `policeService.js` and `citizenService.js`. |
| `client/src/context/NgoContext.jsx` | **Partially implemented and needing changes** | Hardcoded mock arrays (`childrenInCare`, `shelterInfo`, `transfers`, `careLogs`, `ngoNotifications`, `ngoAnalytics`) and synchronous fake state changes. | Overhaul to integrate with `ngoService.js`, fetch live dashboard stats, care records, shelters, handovers, and notifications; remove fake fallbacks. |
| `client/src/pages/ngo/NgoDashboard.jsx` | **Partially implemented and needing changes** | Uses mock data from context | Wire to live `stats`, `shelterInfo`, `childrenInCare`, and real-time state with loading & error handling. |
| `client/src/pages/ngo/NgoIntakeWizard.jsx` | **Partially implemented and needing changes** | Hardcoded fake intake numbers, uses `setTimeout` / context fake submission | Connect Step 1 to live authorized case referrals (`GET /api/cases`), and submit to `POST /api/ngo/care-records`. |
| `client/src/pages/ngo/NgoChildrenList.jsx` | **Partially implemented and needing changes** | Uses mock array | Connect to live care records with search, filter, and pagination. |
| `client/src/pages/ngo/NgoChildProfile.jsx` | **Partially implemented and needing changes** | Uses mock array & fake IDs | Connect to `GET /api/ngo/care-records/:id`, real care notes, live medical updates, and handover modals. |
| `client/src/pages/ngo/NgoShelterManagement.jsx` | **Partially implemented and needing changes** | Displays static facilities & capacity | Connect to live `GET /api/ngo/shelters` and capacity metrics. |
| `client/src/pages/ngo/NgoTransfers.jsx` | **Partially implemented and needing changes** | Mock transfer array | Connect to real handover records and placement transfers. |
| `client/src/pages/ngo/NgoCasesList.jsx` | **Partially implemented and needing changes** | Mock array | Connect to live operational cases under care. |
| `client/src/pages/ngo/NgoCaseDetails.jsx` | **Partially implemented and needing changes** | Mock array | Connect to live case details and handover integration. |
| `client/src/pages/ngo/NgoNotifications.jsx` | **Partially implemented and needing changes** | Hardcoded notifications | Connect to `GET /api/notifications` scoped to authenticated NGO user. |
| `client/src/pages/ngo/NgoAnalytics.jsx` | **Partially implemented and needing changes** | Static numbers | Connect to `GET /api/ngo/dashboard-stats`. |
| `client/src/pages/ngo/NgoProfile.jsx` | **Partially implemented and needing changes** | Static organization object | Bind to authenticated `user.organization`, license, and shelter profile. |
| Modals: `HandoverConfirmationModal.jsx`, `CareUpdateFormModal.jsx` | **Partially implemented and needing changes** | Uses `setTimeout` | Connect to real API calls with loading states and error notifications. |

---

## 3. Security, Authorization & Privacy Findings

1. **Authentication & Role Guards:**
   - Every NGO route must enforce `authenticate` and `requireRole(["ngo", "police", "admin"])`.
   - Accounts with status !== `"approved"` must be blocked with `403 ACCOUNT_VERIFICATION_PENDING`.
2. **Organization-Level Isolation (IDOR Protection):**
   - An NGO user can only view, update, place, or request handovers for care records and shelters owned by their authenticated organization (`ngoId: req.user._id`).
   - Cross-tenant data leakage is strictly prohibited. NGO A cannot access NGO B's records by guessing IDs.
3. **Session-Derived Identity (Anti-Mass-Assignment):**
   - Fields such as `ngoId`, `receivedBy`, `approvedBy`, `completedBy`, and `staffId` are derived strictly from `req.user._id`, never trusted from the client payload.
4. **Police Authority Separation:**
   - Approving and completing handovers requires authorized police officers or admins assigned to the case or jurisdiction.
   - An NGO cannot approve its own handover or unilaterally alter `MissingCase.status`.
5. **PII and Child Medical Privacy:**
   - Public search endpoints never disclose private care notes, shelter addresses, staff rosters, or medical status.
   - Medical status fields are restricted to controlled categories (`stable`, `monitoring`, `attention_required`, `emergency`) without logging sensitive child diagnoses.

---

## 4. Concurrency & Data Consistency Architecture

1. **Shelter Capacity Safe Accounting:**
   - Direct manual decrements/increments risk race conditions and overbooking.
   - Placements must utilize atomic MongoDB queries:
     ```javascript
     Shelter.findOneAndUpdate(
       { _id: shelterId, ngoId, status: "active", activePlacements: { $lt: capacity } },
       { $inc: { activePlacements: 1 } },
       { new: true }
     );
     ```
   - If the update returns `null`, the shelter is either full, inactive, or not owned by the requesting NGO, triggering a clean `409 SHELTER_CAPACITY_EXCEEDED` or `404 SHELTER_NOT_FOUND`.
   - Transfers and discharges atomically decrement `activePlacements` with `{ activePlacements: { $gt: 0 } }`.
2. **Referral and Intake Consistency:**
   - Before creating a `CareRecord`, verify that the referenced `caseId` exists and is eligible (`status` in `["active", "found", "reunited"]`).
   - Verify that `childId` strictly matches `MissingCase.childId`.
   - Check that no other active `CareRecord` is already in progress (`status: { $in: ["pending_intake", "in_care", "awaiting_handover"] }`) for this case.

---

## 5. Proposed Implementation Plan

1. **Step 1: Models & Schema Definitions**
   - Create `server/models/Shelter.js`.
   - Create `server/models/CareRecord.js`.
   - Create `server/models/Handover.js`.
   - Update `server/models/Notification.js` with NGO care event types.
   - Export new models in `server/models/index.js`.
2. **Step 2: Backend Logic, Services & Routes**
   - Create `server/services/ngoService.js` handling intake, atomic placement, care notes, medical status updates, handovers, and dashboard analytics.
   - Create `server/controllers/ngoController.js` enforcing role validation, approval checks, IDOR isolation, and input sanitization.
   - Create `server/routes/ngoRoutes.js` and mount under `/api/ngo` in `server/app.js`.
3. **Step 3: Frontend API Service & State Management**
   - Create `client/src/services/ngoService.js` with comprehensive API methods and response normalizers.
   - Refactor `client/src/context/NgoContext.jsx` to eliminate all static mocks, fake timers, and simulated mutations.
   - Update `NgoDashboard.jsx`, `NgoIntakeWizard.jsx`, `NgoChildrenList.jsx`, `NgoChildProfile.jsx`, `NgoShelterManagement.jsx`, `NgoTransfers.jsx`, `NgoCasesList.jsx`, `NgoCaseDetails.jsx`, `NgoNotifications.jsx`, `NgoAnalytics.jsx`, and `NgoProfile.jsx`.
   - Update `HandoverConfirmationModal.jsx` and `CareUpdateFormModal.jsx` to call real API methods.
4. **Step 4: Automated Testing & Validation**
   - Create `server/tests/phase9_ngo_module.test.js` validating authentication gates, shelter capacity concurrency, care notes audit trails, handover authorization, and regression boundaries.
   - Create `server/scripts/test_phase9_ngo_module.js` validating end-to-end database operations.
   - Create `client/tests/ngoModuleUI.test.js` validating client normalizers and frontend contracts.
   - Run server test suite, client test suite, and Vite client build.
5. **Step 5: Implementation Report**
   - Compile `PHASE_9_NGO_MODULE_IMPLEMENTATION_REPORT.md` documenting verified execution results, test coverage, and architectural compliance.
