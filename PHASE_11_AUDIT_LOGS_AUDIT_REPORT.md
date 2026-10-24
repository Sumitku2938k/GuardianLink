# GUARDIANLINK — PHASE 11: AUDIT LOGS & SECURITY ACTIVITY TRAIL
## Comprehensive Architecture & Security Audit Report

**Audit Date:** 2026-10-23  
**Status:** COMPLETE — Ready for Implementation  
**Auditor:** Senior Backend & Security Engineering (Antigravity)  
**Corpus / Workspace:** `c:\Users\Sumit\Desktop\College Sem Projects\GuardianLink Sem 5`

---

## 1. Executive Summary

Phase 11 introduces a tamper-evident, append-only security audit activity trail for the GuardianLink platform. GuardianLink handles sensitive child-safety data, child photographs, law enforcement investigations, parent reports, citizen sightings, biometric AI leads, and temporary NGO custody records.

Currently, while operational business operations succeed across Phases 0–10, security and administrative actions lack structured, immutable database audit logging. Instead, activities are either logged ephemerally to `stdout` (e.g. `console.info([Audit:CitizenPhotoSearch]...)` in `citizenController.js`) or only emit transient notifications to users without an immutable audit trail. Furthermore, the existing frontend admin screen (`client/src/pages/admin/AdminAuditLogs.jsx`) renders hardcoded mock entries (`AUD-9901` ... `AUD-9904`) from client state in `AdminContext.jsx`.

This audit establishes:
1. Complete inventory of reusable components, gaps, and sensitive data boundaries.
2. Architecture for `AuditLog` Mongoose schema and `auditLogService.js`.
3. Event taxonomy covering Auth, Admin, Child, Case, Sighting, AI Search, and NGO workflows.
4. Security & privacy allowlist to prevent leakage of credentials, biometrics, raw GPS coordinates, and medical notes.
5. Implementation roadmap for backend persistence, admin API (`GET /api/admin/audit-logs`), and real admin UI.

---

## 2. Inventory of Existing Components & Architectural Status

| Component | Path | Current State | Classification | Phase 11 Role |
| :--- | :--- | :--- | :--- | :--- |
| **AuditLog Model** | `server/models/AuditLog.js` | Non-existent | **MISSING** | Create append-only Mongoose schema with controlled action enums, indexes, and immutability guards. |
| **Audit Service** | `server/services/auditLogService.js` | Non-existent | **MISSING** | Centralized, privacy-safe event recorder with metadata allowlisting and failure policy. |
| **Admin Route** | `server/routes/adminRoutes.js` | Routes for `/users`, `/users/:id/*` guarded by `authenticate, authorize("admin")` | **EXISTING / REUSABLE** | Mount `GET /api/admin/audit-logs` on existing admin router. |
| **Admin Controller** | `server/controllers/adminController.js` | Handles user verification, approval, rejection, role changes, suspension | **EXISTING / REUSABLE** | Add `getAuditLogs` handler with filtering, sorting, and pagination. Instrument admin mutations. |
| **Auth Controller** | `server/controllers/authController.js` | Handles `register`, `login`, `logout`, `getMe` | **INCOMPLETE** | Instrument `USER_REGISTRATION_COMPLETED`, `USER_LOGIN_SUCCESS`, `USER_LOGIN_FAILED`, `USER_LOGOUT`. |
| **Child Controller** | `server/controllers/childController.js` | Handles `createChild`, `updateChild`, `updateChildPhoto`, `deleteChildPhoto` | **INCOMPLETE** | Instrument `CHILD_CREATED`, `CHILD_UPDATED`, `CHILD_PHOTO_UPLOADED`, `CHILD_PHOTO_DELETED`. |
| **Case Controller** | `server/controllers/caseController.js` | Handles case lifecycle, status changes, assignment, notes, tasks, AI match review | **INCOMPLETE** | Instrument `CASE_REPORTED`, `CASE_STATUS_CHANGED`, `CASE_ASSIGNED`, `CASE_INVESTIGATION_UPDATED`, `CASE_NOTE_ADDED`, `AI_MATCH_REVIEWED`. |
| **Sighting Service & Controller** | `server/controllers/sightingController.js`, `server/services/sightingService.js` | Handles submission, review, alerts | **INCOMPLETE** | Instrument `SIGHTING_CREATED`, `SIGHTING_REVIEWED`, `SIGHTING_STATUS_CHANGED`. |
| **Citizen Photo Search** | `server/controllers/citizenController.js` | Runs similarity search; logs to `console.info` | **INCOMPLETE** | Replace ephemeral console logging with persistent `AI_MATCH_REQUESTED` and `AI_MATCH_RETURNED` (zero raw biometric data). |
| **NGO Service & Controller** | `server/controllers/ngoController.js`, `server/services/ngoService.js` | Care records, medical status, shelters, handovers | **INCOMPLETE** | Instrument `CARE_RECORD_CREATED`, `CARE_STATUS_CHANGED`, `SHELTER_CREATED`, `HANDOVER_REQUESTED`, `HANDOVER_APPROVED`, `HANDOVER_COMPLETED`. |
| **Admin Audit UI** | `client/src/pages/admin/AdminAuditLogs.jsx` | Renders mock entries from `AdminContext` | **INCOMPLETE** | Refactor to query `GET /api/admin/audit-logs` via `client/src/services/auditLogService.js` with server-side pagination and filters. |
| **Admin Context** | `client/src/context/AdminContext.jsx` | Contains hardcoded mock audit dataset | **INCOMPLETE** | Remove hardcoded mock array and wire to live API service. |
| **Admin Layout & Navigation** | `client/src/components/admin/AdminSidebar.jsx`, `client/src/App.jsx` | Route `/admin/audit-logs` already mounted | **EXISTING / REUSABLE** | Seamlessly connects with no routing rewrites. |

---

## 3. Privacy & Sensitive Data Boundaries (Allowlist vs Prohibited)

Because GuardianLink is a missing-child protection platform, audit logs must NEVER be a secondary vector for data leakage.

### Prohibited Data in Audit Logs
- **Authentication Secrets:** Passwords, password hashes (`passwordHash`), plain text passwords, JWT tokens, session cookies (`guardianlink_token`), Redis session keys.
- **Biometric Vectors:** 512-dimensional ArcFace vectors, Qdrant payload embeddings, raw image base64/buffers.
- **Guardian PII:** Phone numbers, home addresses, government KYC identifiers, national IDs.
- **Exact Coordinates:** Raw GPS `[longitude, latitude]` arrays from citizen sightings or child's last known location.
- **Confidential Care Narratives:** Full medical diagnosis notes, doctor contact numbers, psychotherapy narratives, internal police squad tactics notes.

### Allowlisted Metadata Properties
- **Identifiers:** Target `userId`, `childId`, `caseId`, `sightingId`, `careRecordId`, `shelterId`, `handoverId`.
- **Business Codes:** `caseNumber` (e.g. `MC-8812`), `sightingNumber` (e.g. `SR-4412`), `badgeNumber` (e.g. `DL-POL-4412`).
- **State Machine Transitions:** `previousStatus`, `newStatus`, `previousRole`, `newRole`, `rejectionReason`.
- **Search Metadata:** `thresholdApplied`, `candidatesCount`, `matchFound` (boolean), `modelEndpoint`.
- **Request Metadata:** `ipAddress` (sanitized/hashed or standard IPv4/IPv6), `userAgent` (truncated to 200 chars), `requestId` (correlation UUID).

---

## 4. Reliability, Storage & Failure Strategy

1. **Authoritative Persistence:**
   Audit records are stored in MongoDB in an append-only collection (`audit_logs`).
2. **Reliability Policy:**
   - **Critical Security/Admin Actions:** Actions such as account approvals, role demotions, case closures, and handover completion must guarantee durable audit logging. If database connectivity fails, the operation returns an error (`500 AUDIT_PERSISTENCE_FAILED`) rather than quietly mutating state without accountability.
   - **Non-Critical Reads / Informational Queries:** Read-level tracking (e.g. `CASE_VIEWED`) logs asynchronously and gracefully degrades without failing the underlying query if MongoDB audit writes fail.
3. **No Ordinary Edit / Delete:**
   The `AuditLog` schema will block update and delete middleware at the Mongoose layer. No Express route will expose `PUT`, `PATCH`, or `DELETE` for audit records.
4. **Standalone / Replica Set Considerations:**
   In local development / standalone Docker containers, MongoDB replica sets are not configured by default, which prevents multi-document MongoDB transactions (`session.withTransaction()`). The audit service must therefore execute reliable atomic writes using Mongoose documents while catching operational errors cleanly.

---

## 5. Event Taxonomy Specification

The following 32 machine-readable actions are established for the platform:

### A. Authentication & Account Security
1. `USER_REGISTRATION_COMPLETED`: User successfully registered (parent, citizen, police, ngo).
2. `USER_LOGIN_SUCCESS`: Authenticated with valid credentials.
3. `USER_LOGIN_FAILED`: Failed credentials or suspended account rejection.
4. `USER_LOGOUT`: Session destroyed and cookie cleared.
5. `USER_ACCOUNT_SUSPENDED`: Account suspended by admin.
6. `USER_ACCOUNT_ACTIVATED`: Account reactivated by admin.

### B. Administrative Actions
7. `ADMIN_APPROVED_USER`: Police or NGO verified and approved.
8. `ADMIN_REJECTED_USER`: Registration rejected with formal reason.
9. `ADMIN_ROLE_UPDATED`: User role changed by admin.

### C. Child & Missing Case Management
10. `CHILD_CREATED`: New child profile enrolled by guardian.
11. `CHILD_UPDATED`: Child demographics or medical flags updated.
12. `CHILD_PHOTO_UPLOADED`: Photograph uploaded/enrolled.
13. `CHILD_PHOTO_DELETED`: Photograph deleted.
14. `CASE_REPORTED`: Missing case filed by guardian or officer.
15. `CASE_STATUS_CHANGED`: Case state transition (`under_verification`, `active`, `found`, `reunited`, `closed`, `cancelled`).
16. `CASE_ASSIGNED`: Case assigned to lead investigating officer.
17. `CASE_INVESTIGATION_UPDATED`: Police case number, FIR number, or priority updated.
18. `CASE_NOTE_ADDED`: Formal investigation note recorded.
19. `CASE_TASK_UPDATED`: Squad checklist task created or toggled.

### D. Citizen Sightings
20. `SIGHTING_CREATED`: Citizen submitted sighting report.
21. `SIGHTING_REVIEWED`: Police reviewed report (`verified`, `dismissed`, `under_review`).
22. `SIGHTING_ACCESS_DENIED`: Unauthorized party attempted to view restricted report details.

### E. AI Photo Search & Biometric Leads
23. `AI_MATCH_REQUESTED`: Similarity search executed against vector database.
24. `AI_MATCH_RETURNED`: AI returned ranked candidates (or zero matches).
25. `AI_MATCH_REVIEWED`: Investigating officer verified, rejected, or requested evidence for an AI lead.

### F. NGO Care, Shelters & Handovers
26. `CARE_RECORD_CREATED`: Temporary custody intake registered by NGO.
27. `CARE_STATUS_CHANGED`: Child wellbeing or medical status updated.
28. `SHELTER_CREATED`: New shelter capacity registered.
29. `SHELTER_UPDATED`: Shelter capacity or address updated.
30. `CHILD_PLACEMENT_CREATED`: Child placed in authorized shelter bed.
31. `HANDOVER_REQUESTED`: Formal custody handover requested.
32. `HANDOVER_APPROVED`: Police approved custody handover.
33. `HANDOVER_COMPLETED`: Handover executed, shelter bed freed, record closed.

### G. Security Access Events
34. `CASE_VIEWED`: Authorized officer or admin viewed restricted case details.
35. `AUDIT_LOG_ACCESS_DENIED`: Non-admin attempted to access audit API.

---

## 6. Implementation Plan & Execution Order

1. **Step 1:** Complete audit report (`PHASE_11_AUDIT_LOGS_AUDIT_REPORT.md`).
2. **Step 2:** Implement `server/models/AuditLog.js` with indexes and immutability hooks.
3. **Step 3:** Implement `server/services/auditLogService.js` with metadata allowlisting and request context extraction.
4. **Step 4:** Integrate audit logging into business controllers:
   - `authController.js`
   - `adminController.js`
   - `childController.js`
   - `caseController.js`
   - `sightingController.js`
   - `citizenController.js`
   - `ngoController.js`
5. **Step 5:** Implement Admin API `GET /api/admin/audit-logs` in `adminRoutes.js` and `adminController.js`.
6. **Step 6:** Implement Client Audit Log Service (`client/src/services/auditLogService.js`) and wire real data to `client/src/pages/admin/AdminAuditLogs.jsx`.
7. **Step 7:** Write automated tests:
   - `server/tests/phase11_audit_logs.test.js`
   - `client/tests/auditLogUI.test.js`
8. **Step 8:** Run test suites, regression tests for Phases 7–10, and client production build.
9. **Step 9:** Generate final implementation report `PHASE_11_AUDIT_LOGS_IMPLEMENTATION_REPORT.md`.

---
*End of Phase 11 Audit Report.*
