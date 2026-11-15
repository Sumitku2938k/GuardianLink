# GUARDIANLINK — PHASE 21 PRE-IMPLEMENTATION AUDIT REPORT
## POLICE PORTAL ARCHITECTURE, API INVENTORY, MOCK ELIMINATION & GAP ANALYSIS

**Date:** 2026-11-15  
**Branch:** `goutam-devlopment`  
**Phase:** 21 — Police Portal Completion  
**Audit Scope:** Full-Stack Architecture, Database Models, Controller Implementations, Frontend Pages, Components, Context, Services, Security & RBAC  

---

## 1. EXECUTIVE AUDIT SUMMARY

GuardianLink has established significant backend infrastructure in Phases 0–20, including missing case workflows, FIR verification (Phase 18), geospatial intelligence and interactive mapping (Phase 19), and citizen sightings management (Phase 20).

However, a comprehensive inspection of the **Police Portal** (`client/src/pages/police/`, `client/src/components/police/`, and `client/src/context/PoliceContext.jsx`) reveals several architectural, security, and data integrity gaps:
1. **Officer Roster Disconnect:** `PoliceContext.jsx` initializes `officers` state as `[]`, and `setOfficers` is never called. Consequently, `PoliceAssignments.jsx` and `AssignmentModal.jsx` display empty rosters.
2. **Backend Officer Directory Scoping Gap:** `caseController.getPoliceOfficers` does not enforce station/organization isolation for police users, does not filter by `isActive: true`, and does not compute real case workload distribution (`activeCases`, `criticalCases`, `completedCases`).
3. **Insecure Case Assignment:** `caseController.assignOfficer` currently accepts frontend-supplied `officerName` and `badgeNumber`, does not enforce cross-station assignment boundaries, fails to verify that the target officer is approved and active, and silently falls back to assigning `req.user` if `officerId` is invalid.
4. **Runtime Crash Bug in `PoliceCaseDetails.jsx`:** Line 91 invokes `useMemo()`, but `useMemo` is not imported from `"react"` on line 1, causing a runtime `ReferenceError` when viewing case details.
5. **Fabricated Analytics Metrics:** `PoliceAnalytics.jsx` contains static hardcoded response times (e.g. `1.2 mins`, `3.0 mins`, `2.5 mins`, `2.8 hours`), and `PoliceDashboard.jsx` contains hardcoded CSS progress bar percentages (`width: 35%`, `width: 45%`, `width: 20%`).
6. **Synthetic AI Match Confidence:** `PoliceContext.jsx` hardcodes `confidenceScore: "92.4%"` for all potential match reviews instead of reflecting actual similarity metrics or rating categories.
7. **Dashboard Scoping & Metric Incompleteness:** `getPoliceDashboardStats` counts global cases without station scoping for police officers, and lacks specific counts for unassigned cases, pending FIR reviews, and verified sightings.

---

## 2. FRONTEND COMPONENT INSPECTION

| Component / File | Current Implementation | API Integration Status | Hardcoded / Mock Data | Required Backend Integration | Security / RBAC Requirements | Proposed Phase 21 Changes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `PoliceDashboard.jsx` | Station overview with stat cards & case table | Connected to `getPoliceDashboardStats`, `getPoliceCases` | Hardcoded progress widths (`35%`, `45%`, `20%`) | Scoped `GET /api/cases/police/dashboard-stats` | Police (approved) or Admin | Calculate real priority percentages; display real station metrics (pending FIRs, unassigned cases). |
| `PoliceAssignments.jsx` | Squad roster & workload cards | Reads `officers` from context | None (renders empty because `officers` is `[]`) | `GET /api/cases/police/officers` | Police (approved) or Admin | Connect to real station roster; add search, rank filter, loading skeleton, empty state. |
| `AssignmentModal.jsx` | Modal to assign lead officer | Calls `assignOfficer(caseId, officerId)` | Relies on display names | `PATCH /api/cases/:caseId/assign` | Police or Admin (same station) | Submit only `officerId`; derive name and badge on backend; show validation errors. |
| `PoliceCaseDetails.jsx` | Master case dossier, timeline, notes, FIR | Calls `getCaseFIR`, `verifyFIR`, `rejectFIR`, map data | None (Real API integration present) | `GET /api/cases/:caseId`, `/api/firs/case/:caseId` | Police, Admin | Fix missing `useMemo` import bug; ensure seamless FIR review actions & map display. |
| `PoliceCaseInvestigation.jsx` | Workspace for notes & checklist tasks | Calls `addInvestigationNote`, `createTask`, `toggleTask` | None | `POST /notes`, `POST /tasks`, `PATCH /tasks/:id` | Police, Admin | Verified working; ensure robust error alerts and author identity resolution. |
| `PoliceCaseMatches.jsx` | AI facial candidate comparison | Reads `potentialMatches` from context | Inherited hardcoded `92.4%` confidence score | `POST /matches/:matchId/review` | Police, Admin | Display real AI confidence rating/score; maintain mandatory human verification disclaimer. |
| `PoliceCasesList.jsx` | Multi-view cases list (table, card, map) | Calls `getPoliceCases` | None | `GET /api/cases` | Police, Admin | Ensure map view renders `LocationDisplay` with real coordinates; add FIR filter. |
| `PoliceFoundReports.jsx` | Citizen sighting verification queue | Calls `getPoliceSightings`, `reviewSighting` | None | `GET /api/sightings`, `PATCH /api/sightings/:id/review` | Police, Admin | Verified working; ensure queue refresh and status badge consistency. |
| `PoliceAnalytics.jsx` | Performance benchmarks & incident map | Reads `stationAnalytics` | Hardcoded breakdown times (1.2m, 3.0m, etc.) | Dynamic aggregations from backend | Police, Admin | Remove synthetic response times; add real status, priority, and workload distribution charts. |
| `PoliceNotifications.jsx` | Alerts center for sightings & updates | Uses `useRealtime()` | None | `GET /api/notifications` | Police, Admin | Real-time and catch-up sync verified; add filter for unread alerts. |
| `PoliceProfile.jsx` | Officer credentials & assigned station | Reads `currentOfficer` from Auth/Context | None | Authenticated user session | Police | Verified working; display station and clearance level. |

---

## 3. BACKEND INSPECTION & SCHEMAS

### 3.1 Case Management (`server/controllers/caseController.js` & `server/models/MissingCase.js`)
- **MissingCase Model:** Contains `caseNumber`, `status` (`reported`, `under_verification`, `active`, `found`, `reunited`, `closed`, `cancelled`), `priority` (`low`, `medium`, `high`, `critical`), `assignedOfficer` (`id`, `name`, `badgeNumber`, `assignedAt`), `assignedPoliceStation`, `investigationNotes` array, `investigationTasks` array, `potentialMatchReviews` array, `lastSeenLocation`.
- **Assignment Logic (`assignOfficer`):**
  - Vulnerability: Accepts `badgeNumber` and `officerName` in request body.
  - Vulnerability: If `officerId` not found, falls back to assigning `req.user`.
  - Missing: Station-level isolation check (officer must belong to same station as requester/case).
  - Missing: Target officer verification check (`status === "approved"`, `isActive === true`).
- **Officer Roster (`getPoliceOfficers`):**
  - Vulnerability: Unscoped query `{ role: "police", status: "approved" }` returns officers from all stations nationwide.
  - Missing: Workload aggregation (`activeCases`, `criticalCases`, `completedCases`).
  - Missing: Inactive officer exclusion (`isActive: true`).

### 3.2 FIR Module (`server/controllers/firController.js` & `server/models/FIR.js`)
- Fully implemented in Phase 18:
  - `GET /api/firs/pending`: List FIRs awaiting review.
  - `GET /api/firs/case/:caseId`: Case-scoped FIR lookup.
  - `PATCH /api/firs/:firId/verify`: Requires officer review notes (>= 5 chars).
  - `PATCH /api/firs/:firId/reject`: Requires rejection reason and review notes.
  - `GET /api/firs/:firId/documents/:version/preview`: Secure preview blob stream.
  - `GET /api/firs/:firId/documents/:version/download`: Secure download stream.
  - Strict document security validation (magic bytes, PDF script neutralization, no public URLs).

### 3.3 Sightings Module (`server/controllers/sightingController.js` & `server/models/Sighting.js`)
- Fully verified in Phase 20:
  - `GET /api/sightings`: Police desk queue.
  - `PATCH /api/sightings/:id/review`: Updates sighting status (`verified`, `dismissed`, `under_review`).
  - Auto-dispatches citizen receipt and responder notifications.

### 3.4 Notifications Module (`server/services/notificationService.js`)
- Persistent in-app notifications tied to `User` and `recipientRole: "police"`.
- Real-time Socket.IO emission to room `user:${recipientId}`.

---

## 4. API CONTRACT INVENTORY

| Feature | Existing Endpoint | Controller / Service | Actual Response Structure | Frontend Status | Action Required |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Officer Roster** | `GET /api/cases/police/officers` | `caseController.getPoliceOfficers` | `{ success: true, count, officers: [{ id, name, badgeNumber, station, status, activeCases, criticalCases, completedCases }] }` | Uncalled in Context | Scope query by station; compute real workload; call in `PoliceContext.refreshData`. |
| **Case Assignment** | `PATCH /api/cases/:caseId/assign` | `caseController.assignOfficer` | `{ success: true, message, case: SafeMissingCase }` | Partially connected (passes forged body) | Secure backend: validate target officer, check station, reject invalid IDs; clean modal. |
| **Dashboard Stats** | `GET /api/cases/police/dashboard-stats` | `caseController.getPoliceDashboardStats` | `{ success: true, stats: { totalMissing, activeCases, criticalCases, unassignedCases, pendingFIRReviews, potentialMatches, foundReports, recoveredCases, recoveryRate, avgResponseTime, avgRecoveryTime } }` | Connected | Add station scoping, unassigned cases count, pending FIR count; remove fake widths. |
| **Case Details** | `GET /api/cases/:caseId` | `caseController.getCaseById` | `{ success: true, case: SafeMissingCase }` | Connected | Fix `useMemo` import bug; display real FIR status. |
| **Investigation Map** | `GET /api/cases/:caseId/investigation-map` | `caseController.getInvestigationMapData` | `{ success: true, case: {...}, sightings: [...] }` | Connected | Verify multi-marker rendering and coordinate scrubbing. |
| **Investigation Notes** | `POST /api/cases/:caseId/notes` | `caseController.addInvestigationNote` | `{ success: true, message, notes: [...], case: SafeMissingCase }` | Connected | Author resolved on backend (`req.user`); add validation tests. |
| **Investigation Tasks** | `POST /api/cases/:caseId/tasks`, `PATCH /tasks/:id` | `caseController.createTask`, `toggleTask` | `{ success: true, tasks: [...], case: SafeMissingCase }` | Connected | Author resolved on backend; support checklist toggle. |
| **FIR Review** | `PATCH /api/firs/:firId/verify`, `PATCH /reject` | `firController.verifyFIR`, `rejectFIR` | `{ success: true, message, data: SafeFIR }` | Connected in `PoliceCaseDetails` | Verify notes validation (>= 5 chars); add pending FIR count to dashboard. |
| **Sighting Review** | `PATCH /api/sightings/:id/review` | `sightingController.reviewSighting` | `{ success: true, message, sighting: SafeSighting }` | Connected in `PoliceFoundReports` | Verify status transitions (`verified`, `dismissed`, `under_review`). |
| **AI Match Review** | `POST /api/cases/:caseId/matches/:matchId/review` | `caseController.reviewAIMatch` | `{ success: true, message, case: SafeMissingCase }` | Connected in `PoliceCaseMatches` | Remove hardcoded `92.4%` confidence score; display real rating/score. |
| **Police Notifications** | `GET /api/notifications` | `notificationController.getUserNotifications` | `{ success: true, count, unreadCount, notifications: [...] }` | Connected in `RealtimeContext` | Verified real-time delivery and unread badge. |

---

## 5. PLANNED STEP-BY-STEP IMPLEMENTATION ROADMAP

1. **Step 5.1: Backend Officer Directory & Station Scoping (`caseController.js`):**
   - In `getPoliceOfficers`, scope to `req.user.organization` if role is `police`.
   - Filter by `{ role: "police", status: "approved", isActive: true }`.
   - Aggregate actual case counts per officer (`activeCases`, `criticalCases`, `completedCases`).
   - Return sanitized, authorized officer objects.

2. **Step 5.2: Secure Case Assignment (`caseController.js`):**
   - Enforce mandatory validation: target officer exists, approved, active, belongs to same station.
   - Reject cross-station assignments.
   - Authoritatively resolve name and badge from database; do NOT trust request body display strings.
   - Never fall back silently to `req.user`.

3. **Step 5.3: Hydrate Officers in `PoliceContext.jsx`:**
   - Call `policeService.getStationOfficers()` in `refreshData()` and set `officers` state.
   - Clean `assignOfficer` method to send only `officerId`.
   - Remove hardcoded `confidenceScore: "92.4%"`.

4. **Step 5.4: Modernize `PoliceAssignments.jsx` & `AssignmentModal.jsx`:**
   - Display real officer workload cards with search and rank/status filters.
   - Add loading skeleton and empty state.
   - Prevent submission without selecting an officer.

5. **Step 5.5: Fix `PoliceCaseDetails.jsx` Runtime Bug & Polish FIR Review:**
   - Fix missing `useMemo` import from `"react"`.
   - Ensure clean display of FIR status, review notes, document preview, and download.

6. **Step 5.6: Dynamic Police Dashboard & Analytics (`PoliceDashboard.jsx` & `PoliceAnalytics.jsx`):**
   - Calculate dynamic case priority percentages.
   - Add real station metrics (Pending FIR Reviews, Unassigned Cases).
   - In `PoliceAnalytics.jsx`, remove synthetic response times; render real status and priority distribution charts.

7. **Step 5.7: AI Match Queue & Investigation Workspace Polish:**
   - In `PoliceCaseMatches.jsx`, render real candidate scores/ratings without fabrication.
   - Verify investigation notes and tasks work seamlessly with backend persistence.

8. **Step 5.8: Automated Test Suite (`server/tests/phase21_police.test.js`) & Regression:**
   - Write comprehensive tests for officer directory, station scoping, assignment security, FIR review, notes, tasks, sightings, and RBAC.
   - Run regression test suites: Phase 17, 18, 19, 20.
   - Execute clean Vite production build.

9. **Step 5.9: Final Implementation Report (`PHASE_21_IMPLEMENTATION_REPORT.md`):**
   - Document completion evidence, test results, and status against all acceptance criteria AC-21.1 through AC-21.26.

