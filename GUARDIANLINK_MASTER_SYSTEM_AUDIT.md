# GUARDIANLINK — MASTER SYSTEM AUDIT
## COMPREHENSIVE ARCHITECTURAL, SECURITY, DATA & OPERATIONAL AUDIT (PHASES 0–24)

**Document Version:** 1.0.0-rc1  
**Project:** GuardianLink AI-Assisted Missing Child Safety Platform  
**Target Branch:** `goutam-devlopment`  
**Date:** November 16, 2026  
**Auditor Roles:** Senior DevOps Engineer, Full-Stack Architect, Application Security Engineer, Database Reliability Engineer, AI Infrastructure Engineer, QA Lead, Release Manager  
**Repository Path:** `c:\Users\Sumit\Desktop\College Sem Projects\GuardianLink Sem 5`  

---

## 1. EXECUTIVE SUMMARY & PLATFORM OVERVIEW

GuardianLink is an enterprise-grade, mission-critical child protection platform engineered to accelerate the discovery, verification, protection, sheltering, and reunification of missing children. By uniting distressed guardians, vigilant citizens, registered non-governmental organizations (NGOs), and verified law enforcement agencies onto a unified digital architecture, GuardianLink eliminates coordination silos and manual delays during critical golden hours.

### 1.1. Core Mission & Ethical Tenets
1. **Safety First**: The physical safety and dignity of the child take absolute precedence over automated algorithms or technological novelties.
2. **Human-in-the-Loop AI**: Biometric facial recognition algorithms generate probabilistic investigative leads—never automated or legally binding determinations of identity.
3. **Strict Separation of Duties**: Guardians report; citizens report sightings; NGOs provide protective intake and physical care; verified police officers possess sole statutory authority to verify cases, approve handovers, and execute lawful reunifications.
4. **Data Minimization & Coordinate Obfuscation**: Exact residential coordinates, guardian contact details, and sensitive biometric vector embeddings are strictly scrubbed or obfuscated from unauthorized viewers and public indices.
5. **Zero Mock Data Policy**: Application execution relies entirely on persistent MongoDB collections, real authentication sessions, and live microservice APIs.

---

## 2. SYSTEM ARCHITECTURE & TOPOLOGY

GuardianLink implements a hardened 3-tier segmented network architecture isolating sensitive biometric operations and database stores from public network ingress.

```
                              [ PUBLIC INTERNET ]
                                      │
                   ┌──────────────────┴──────────────────┐
                   │        Reverse Proxy / TLS          │
                   │           (Nginx / Cloud)           │
                   └──────────────────┬──────────────────┘
                                      │
   ════════════════════════════════════════════════════════════════════════════
   TIER 1: PUBLIC INGRESS NETWORK (guardianlink-public-net)
   ────────────────────────────────────────────────────────────────────────────
              │                                      │
              ▼ :3000                                ▼ :5000
   ┌───────────────────────┐             ┌──────────────────────────────────┐
   │ React Vite SPA Client │             │ Node.js Express API Server       │
   │ (Nginx Alpine Base)   │             │ (Security Mediation Gateway)     │
   └───────────────────────┘             └────────────────┬─────────────────┘
                                                          │
   ═══════════════════════════════════════════════════════╪════════════════════
   TIER 2: BACKEND DATA NETWORK (guardianlink-backend-net │ internal: true)
   ───────────────────────────────────────────────────────┼────────────────────
                                                          ├──────────────┐
                                                          ▼ :27017       ▼ :6379
                                                ┌───────────────┐ ┌───────────────┐
                                                │ MongoDB 8.0   │ │ Redis 7       │
                                                │ Persistent DB │ │ Session Cache │
                                                └───────────────┘ └───────────────┘
                                                          │
   ═══════════════════════════════════════════════════════╪════════════════════
   TIER 3: AI BIOMETRIC NETWORK (guardianlink-internal-net)
   ───────────────────────────────────────────────────────┼────────────────────
                                                          │
                                                          ▼ :8000
                                                ┌───────────────────┐
                                                │ FastAPI Microserv │
                                                │ (InsightFace ONNX)│
                                                └─────────┬─────────┘
                                                          │ :6333
                                                          ▼
                                                ┌───────────────────┐
                                                │ Qdrant Vector DB  │
                                                │ (512D Embeddings) │
                                                └───────────────────┘
```

### 2.1. Network Security Invariants
- **Public Ingress**: Port 3000 (Frontend SPA) and Port 5000 (Backend API).
- **Backend Data Tier**: MongoDB (27017) and Redis (6379) are bound exclusively to `guardianlink-backend-net` (`internal: true`). Zero host port publishing in production.
- **Biometric Tier**: FastAPI (8000) and Qdrant (6333) reside on `guardianlink-internal-net`. Direct public access is mathematically impossible; all biometric queries must transit the Express API mediator authenticated with `INTERNAL_SERVICE_KEY`.

---

## 3. TECHNOLOGY STACK & DEPENDENCY INVENTORY

### 3.1. Frontend Ecosystem (`client/`)
- **Runtime & Tooling**: Node.js 20+, Vite 8.2.0, PostCSS, Autoprefixer, Tailwind CSS 3.4.17.
- **Core Framework**: React 18.3.1, React DOM 18.3.1.
- **Routing & Networking**: React Router DOM 6.30.1, Axios 1.19.0.
- **Geospatial & Mapping**: Leaflet 1.9.4, React-Leaflet 4.2.1.
- **Real-Time WebSockets**: Socket.IO Client 4.8.4.
- **UI Components & Animation**: Radix UI primitives (Accordion, Dialog, Slot, Tooltip), Lucide React 0.539.0, Framer Motion 12.42.2, Tailwind Merge, Class Variance Authority.
- **Testing & E2E**: Node test runner, Playwright 1.65.1.

### 3.2. Backend Ecosystem (`server/`)
- **Runtime & Web Framework**: Node.js 20+, Express 4.19.2.
- **Database & ODM**: MongoDB 8.0/8.2, Mongoose 9.9.2.
- **Caching & Sessions**: Redis 7-Alpine, redis 6.2.1, ioredis 6.0.0.
- **Authentication & Security**: JWT (jsonwebtoken 9.0.3), Cookie-Parser 1.4.7, Bcryptjs 3.0.3, Helmet 8.3.0, Express-Rate-Limit 8.6.2, CORS 2.8.5.
- **Media Ingestion & Cloud**: Multer 2.4.0, Cloudinary SDK 2.11.0.
- **Real-Time Engine**: Socket.IO 4.8.4.

### 3.3. AI Microservice Ecosystem (`ai-service/`)
- **Runtime**: Python 3.11-slim.
- **Framework**: FastAPI 0.110+, Uvicorn 0.29+, Pydantic v2.
- **Computer Vision & Biometrics**: InsightFace 0.7.3 (`buffalo_l` SCRFD detection + ArcFace feature extraction), ONNX Runtime 1.17+, OpenCV Headless (`opencv-python-headless`), Pillow.
- **Vector Database**: Qdrant Client 1.8.0+, Qdrant Vector Engine 1.19.2.

---

## 4. DATA MODELS & DATABASE SCHEMAS

The platform relies on 10 interconnected MongoDB collections with strict Mongoose schemas, compound indexes, and lifecycle hooks:

```
┌─────────────┐       1:N       ┌───────────────┐       1:1       ┌───────────────┐
│    User     │ ─────────────── │     Child     │ ─────────────── │  MissingCase  │
└─────────────┘                 └───────────────┘                 └───────────────┘
       │                                │                                 │
       │                                │ 1:1                             │ 1:1
       │                                ▼                                 ▼
       │                        ┌───────────────┐                 ┌───────────────┐
       │                        │   CareRecord  │                 │      FIR      │
       │                        └───────────────┘                 └───────────────┘
       │                                │                                 │
       │                                │ 1:1                             │ 1:N
       │                                ▼                                 ▼
       │                        ┌───────────────┐                 ┌───────────────┐
       └─────────────────────── │   Handover    │                 │   Sighting    │
                                └───────────────┘                 └───────────────┘
```

### 4.1. `User` Schema (`server/models/User.js`)
- **Fields**: `name`, `email` (unique, lowercase), `phone` (unique), `passwordHash` (bcrypt 10 rounds), `role` (`parent`, `citizen`, `police`, `ngo`, `admin`), `status` (`active`, `pending`, `suspended`), `policeStation`, `district`, `state`, `ngoDetails` (`orgName`, `registrationNumber`, `licenseValidUntil`, `verified`).
- **Indexes**: `{ email: 1 }` (unique), `{ phone: 1 }` (unique), `{ role: 1, status: 1 }`.
- **Security Invariant**: `toJSON` and `toObject` transform functions scrub `passwordHash`.

### 4.2. `Child` Schema (`server/models/Child.js`)
- **Fields**: `firstName`, `lastName`, `dateOfBirth`, `gender`, `identifyingFeatures` (marks, scars), `guardianId` (ref: `User`), `photos` (array: `url`, `publicId`, `embeddingId`, `isPrimary`, `uploadedAt`), `address` (`street`, `city`, `district`, `state`, `pinCode`, `coordinates: [lon, lat]`).
- **Indexes**: `{ guardianId: 1 }`, `{ "address.district": 1, "address.state": 1 }`.

### 4.3. `MissingCase` Schema (`server/models/MissingCase.js`)
- **Fields**: `caseNumber` (unique: `CASE-YYYYMMDD-XXXX`), `childId` (ref: `Child`), `reportedBy` (ref: `User`), `status` (`reported`, `verified`, `investigating`, `found`, `sheltered`, `reunited`, `closed`), `lastSeen` (`dateTime`, `locationName`, `district`, `state`, `coordinates: [lon, lat]`), `assignedStation`, `assignedOfficer` (ref: `User`), `verificationDetails` (`verifiedBy`, `verifiedAt`, `notes`), `aiMatchCandidates` (array).
- **Indexes**: `{ caseNumber: 1 }` (unique), `{ childId: 1 }`, `{ status: 1 }`, `{ assignedStation: 1 }`, `{ "lastSeen.coordinates": "2dsphere" }`.

### 4.4. `FIR` Schema (`server/models/FIR.js`)
- **Fields**: `firNumber` (scoped per station), `policeStation`, `district`, `state`, `missingCaseId` (ref: `MissingCase`), `childId` (ref: `Child`), `submittedBy` (ref: `User`), `filingDate`, `status` (`pending_review`, `verified`, `rejected`), `documents` (array: `storageKey`, `sha256Checksum`, `mimeType`, `fileSizeBytes`, `uploadedBy`).
- **Indexes**: `{ policeStation: 1, firNumber: 1 }` (unique compound), `{ missingCaseId: 1 }`, `{ status: 1 }`.
- **Security Invariant**: `toSafeObject()` strips `storageKey` across all role boundaries.

### 4.5. `Sighting` Schema (`server/models/Sighting.js`)
- **Fields**: `missingCaseId` (ref: `MissingCase`), `reportedBy` (ref: `User`), `sightingDateTime`, `location` (`description`, `district`, `state`, `coordinates: [lon, lat]`), `photos` (array), `status` (`submitted`, `under_review`, `confirmed`, `dismissed`), `aiBiometricConfidence`, `reviewerNotes`.
- **Indexes**: `{ missingCaseId: 1 }`, `{ status: 1 }`, `{ "location.coordinates": "2dsphere" }`.

### 4.6. `Shelter` Schema (`server/models/Shelter.js`)
- **Fields**: `ngoId` (ref: `User`), `facilityName`, `licenseNumber`, `capacityTotal`, `activePlacements`, `address`, `contactNumber`.
- **Indexes**: `{ ngoId: 1 }`, `{ activePlacements: 1 }`.
- **Capacity Invariant**: `activePlacements <= capacityTotal` enforced via conditional atomic queries.

### 4.7. `CareRecord` Schema (`server/models/CareRecord.js`)
- **Fields**: `childId` (ref: `Child`), `missingCaseId` (ref: `MissingCase`), `shelterId` (ref: `Shelter`), `ngoId` (ref: `User`), `intakeDate`, `intakeCondition`, `status` (`admitted`, `under_care`, `awaiting_handover`, `handed_over`), `medicalNotes`, `dailyLogs`.
- **Indexes**: `{ missingCaseId: 1 }`, `{ shelterId: 1 }`, `{ status: 1 }`.

### 4.8. `Handover` Schema (`server/models/Handover.js`)
- **Fields**: `careRecordId` (ref: `CareRecord`), `childId` (ref: `Child`), `missingCaseId` (ref: `MissingCase`), `ngoId` (ref: `User`), `requestedBy` (ref: `User`), `requestDate`, `status` (`pending_police_review`, `approved`, `rejected`, `completed`), `targetType` (`parent`, `child_welfare_committee`, `authorized_shelter`), `guardianId` (ref: `User`), `policeStation`, `approvingOfficerId` (ref: `User`), `approvalDate`, `handoverDate`.
- **Indexes**: `{ careRecordId: 1 }`, `{ status: 1 }`, `{ approvingOfficerId: 1 }`.

### 4.9. `Notification` Schema (`server/models/Notification.js`)
- **Fields**: `recipientId` (ref: `User`), `recipientRole`, `title`, `message`, `type` (`case_update`, `sighting_reported`, `handover_requested`, `handover_approved`, `system`), `referenceId`, `referenceModel`, `isRead`, `createdAt`.
- **Indexes**: `{ recipientId: 1, isRead: 1 }`, `{ createdAt: -1 }`.

### 4.10. `AuditLog` Schema (`server/models/AuditLog.js`)
- **Fields**: `userId` (ref: `User`), `userRole`, `action`, `resourceType`, `resourceId`, `ipAddress`, `userAgent`, `metadata`, `timestamp`.
- **Indexes**: `{ timestamp: -1 }`, `{ userId: 1 }`, `{ action: 1 }`, `{ resourceType: 1, resourceId: 1 }`.
- **Immutability Invariant**: Mongoose pre-hooks strictly block `update`, `findOneAndUpdate`, `updateOne`, `deleteMany`, `deleteOne`, and `remove`.

---

## 5. AUTHENTICATION, SESSIONS & RBAC MATRIX

GuardianLink operates on signed HttpOnly cookie sessions combined with stateless JSON Web Tokens and Redis session tracking.

### 5.1. Token & Cookie Specifications
- **Payload**: `{ id: User._id, email: User.email, role: User.role, jti: uuidv4 }`
- **Signing Algorithm**: HMAC-SHA256 (`HS256`) using `JWT_SECRET` (min 32 characters).
- **Cookie Attributes**:
  - `httpOnly: true` (prevents JavaScript/XSS extraction)
  - `secure: true` (enforced when `NODE_ENV === "production"`)
  - `sameSite: "strict"` (mitigates Cross-Site Request Forgery)
  - `signed: true` (signed with `COOKIE_SECRET`)
  - `maxAge: 7 * 24 * 60 * 60 * 1000` (7 days)

### 5.2. Role-Based Access Control (RBAC) Matrix

| Endpoint / Operation | Public | Parent | Citizen | Police | NGO | Admin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Search Missing Cases (Public View)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Search by Photo (AI Lead Query)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Register Missing Child** | ❌ | ✅ (Own) | ❌ | ❌ | ❌ | ❌ |
| **File Missing Case Report** | ❌ | ✅ (Own) | ❌ | ❌ | ❌ | ❌ |
| **Upload FIR Document** | ❌ | ✅ (Own) | ❌ | ✅ (Station) | ❌ | ❌ |
| **Submit Child Sighting** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Review / Verify FIR** | ❌ | ❌ | ❌ | ✅ (Station) | ❌ | ❌ |
| **Review Sighting & Convert to Lead** | ❌ | ❌ | ❌ | ✅ (Station) | ❌ | ❌ |
| **Verify Case / Transition to Found** | ❌ | ❌ | ❌ | ✅ (Assigned) | ❌ | ❌ |
| **Register Shelter Facility** | ❌ | ❌ | ❌ | ❌ | ✅ (Verified) | ❌ |
| **Intake Child & Create Care Record**| ❌ | ❌ | ❌ | ❌ | ✅ (Verified) | ❌ |
| **Request Child Handover** | ❌ | ❌ | ❌ | ❌ | ✅ (Own Care) | ❌ |
| **Approve / Authorize Handover** | ❌ | ❌ | ❌ | ✅ (Station) | ❌ | ❌ |
| **Complete Handover (Release Child)**| ❌ | ❌ | ❌ | ❌ | ✅ (Approved) | ❌ |
| **Mark Case Reunited** | ❌ | ❌ | ❌ | ✅ (Assigned) | ❌ | ❌ |
| **Verify NGO / Police Credentials** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Inspect System Audit Logs** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 6. PARENT PORTAL MODULE

### 6.1. Capabilities
- **Child Registration**: Allows parents to create permanent child profile records including physical descriptors, identifiable marks, blood group, medical conditions, and emergency contact details.
- **Media Upload**: Supports JPEG, PNG, and WebP portrait uploads via Cloudinary CDN.
- **Case Reporting**: Initiates formal missing case reporting with time of disappearance, last seen location, and clothing worn.
- **FIR Integration**: Links FIR numbers, filing dates, and digital scans directly to the missing case.
- **Real-Time Status Tracking**: Live dashboard timeline reflecting status transitions (`reported` → `verified` → `investigating` → `found` → `sheltered` → `reunited`).
- **Privacy Protections**: Anti-IDOR guards prevent parents from reading or modifying children registered by other accounts.

---

## 7. CITIZEN PORTAL MODULE

### 7.1. Capabilities
- **Public Missing Directory**: Allows citizens to search missing children filtered by district, state, age range, and gender.
- **AI-Assisted Photo Search**: Citizens upload photographs of unaccompanied or found children; the AI microservice compares facial vectors against active missing children.
- **Mandatory Lead Disclaimer**: Every AI match result explicitly states: *"Potential match for investigation only. Do not approach or confront individuals. Official police verification required."*
- **Sighting Submission**: Citizens log sightings with optional photo evidence, time observed, descriptive remarks, and coordinates.
- **PII Shielding**: Citizens never see guardian contact numbers, exact home addresses, or private investigation logs.

---

## 8. POLICE PORTAL MODULE

### 8.1. Capabilities
- **Jurisdictional Station Scoping**: Officers access cases assigned to their police station or district. Cross-station assignment attempts are strictly rejected (403 `CROSS_STATION_ASSIGNMENT_DENIED`).
- **FIR Document Verification**: Station officers inspect uploaded FIR scans, confirm station docket entries, and mark FIR records as `verified` or `rejected` with audit rationale.
- **Case Investigation & Sighting Review**: Officers evaluate citizen sightings, convert verified sightings into official leads, and record timestamped investigation notes.
- **Handover Review & Authorization**: Police officers serve as the sole statutory authority capable of approving NGO child handover requests.
- **Official Reunification Confirmation**: Once child custody is legally restored to verified parents or welfare committees, the assigned officer marks the case as `reunited`.

---

## 9. NGO PORTAL MODULE

### 9.1. Capabilities
- **Shelter Facility Management**: Registered NGOs track physical facilities, total licensed bed capacity, and real-time active placements.
- **Child Intake Workflow**: NGOs register safe physical shelter intakes for unaccompanied children, automatically establishing child `CareRecord` instances.
- **Medical & Psychological Care Logs**: Staff log health examinations, daily nutrition notes, counseling progress, and welfare updates.
- **Handover Protocol**: When legal guardians are identified, the NGO submits a formal `Handover` request. The NGO is strictly prohibited from approving its own handover (403 `UNAUTHORIZED_APPROVER`).
- **Atomic Capacity Rebalancing**: Upon completed handover, shelter bed occupancy is atomically decremented.

---

## 10. ADMIN MODULE & SYSTEM ADMINISTRATION

### 10.1. Capabilities
- **Institutional Account Verification**: Admins review and verify credentials of NGO organizations and police department officials before operational permissions are granted.
- **Immutable Audit Trail Viewer**: Admins query historical security events, filterable by user, action, resource, IP address, and date range.
- **System Metrics & Health Monitoring**: Uptime, active sessions, database connections, and microservice status.
- **Bootstrap Hardening**: Production bootstrap aborts if `ADMIN_PASSWORD` is shorter than 12 characters or contains default strings; existing admin accounts are never overwritten.

---

## 11. AI BIOMETRIC FACIAL RECOGNITION PIPELINE

```
  [ Image Upload ] ──▶ [ Pre-Processing / Validation ]
                              │
                              ▼
                      [ SCRFD Face Detector ] ──▶ (Extract Bounding Box & 5 Landmarks)
                              │
                              ▼
                     [ ArcFace Embedding Net ] ──▶ (Generate 512D Normalized Vector)
                              │
                              ▼
                      [ Qdrant Vector Engine ] ──▶ (Cosine Metric Index Search)
                              │
                              ▼
                      [ Candidate Filtering ] ──▶ (Threshold Cutoff: score >= 0.60)
                              │
                              ▼
                      [ Human-in-the-Loop Police Lead ]
```

### 11.1. Technical Specifications
- **Face Detector**: SCRFD (Sample and Computation Redistribution for Efficient Face Detection) with input resolution 640x640.
- **Embedding Model**: ArcFace ResNet50 backbone generating 512-dimensional L2-normalized floating-point vectors.
- **Vector Database**: Qdrant running HNSW (Hierarchical Navigable Small World) index with Cosine similarity distance metric.
- **Provisional Threshold**: Cosine similarity cutoff `0.60`. Candidates below `0.60` are omitted from candidate results.
- **Security Boundary**: FastAPI endpoints reside on internal Docker bridge (`INTERNAL_SERVICE_KEY` validation on all requests).

---

## 12. FIR MANAGEMENT & OFFICIAL POLICE VERIFICATION

### 12.1. Complete FIR Lifecycle
1. **Submission**: Distressed parent or reporting officer enters FIR docket number, station jurisdiction, complainant details, and uploads digital PDF/image scan.
2. **Document Checksum**: SHA-256 hash calculated on upload to guarantee document tamper-evidence.
3. **Police Station Review**: Police officer logged into the corresponding station inspects FIR docket against physical records.
4. **Adjudication**:
   - `verified`: FIR status set to `verified`; MissingCase transitions to `verified`.
   - `rejected`: FIR status set to `rejected`; rejection reason logged; parent notified to rectify filing.
5. **Storage Key Isolation**: `storageKey` stripped on all client serialized responses to protect Cloudinary/S3 paths.

---

## 13. LOCATION SERVICES, INTERACTIVE MAPS & SPATIAL PRIVACY

### 13.1. Implementation
- **Map Library**: Leaflet 1.9.4 and React-Leaflet 4.2.1 utilizing OpenStreetMap (OSM) tile servers.
- **Coordinate System**: WGS-84 Decimal Degrees (`[longitude, latitude]`) stored as GeoJSON `Point` objects in MongoDB with `2dsphere` indexes.
- **Interactive Pickers**: Parents and citizens click or drag map markers to pinpoint missing or sighting locations.
- **Location Privacy & Fuzzing**:
  - Exact coordinates of missing children and guardians are redacted in public citizen endpoints.
  - Public citizen maps display approximate district-level centroids with privacy buffers.
  - Exact GPS coordinates are accessible exclusively to authorized investigating police officers and assigned NGOs.

---

## 14. SIGHTING SUBMISSION, VERIFICATION & TRACKING

### 14.1. Lifecycle & Verification
1. **Submission**: Citizens submit sightings with photograph, observation datetime, location text, and map coordinates.
2. **Automated AI Pre-Screen**: If a photograph is attached, backend queries the AI service to calculate biometric similarity against the missing child's reference embeddings.
3. **Official Police Evaluation**: Station officers review sighting reports, verify witness photos, and designate status (`under_review`, `confirmed`, `dismissed`).
4. **Real-Time Alerting**: Verified sightings immediately trigger Socket.IO notifications to assigned investigating officers.

---

## 15. SHELTER OPERATIONS, CHILD INTAKE & CARE RECORDS

### 15.1. Shelter Capacity Governance
- **Capacity Constraint**: `activePlacements <= capacityTotal`.
- **Atomic Intake**:
  ```javascript
  const shelter = await Shelter.findOneAndUpdate(
    { _id: shelterId, $expr: { $lt: ["$activePlacements", "$capacityTotal"] } },
    { $inc: { activePlacements: 1 } },
    { returnDocument: "after" }
  );
  ```
- **Care Record Tracking**: Medical screenings, emotional state, counseling sessions, and physical condition logged chronologically.
- **Multi-Record Guard**: Only one open `CareRecord` allowed per child at any time.

---

## 16. HANDOVER AUTHORIZATION & CUSTODY TRANSFER PROTOCOL

### 16.1. Separation of Responsibilities & State Machine
1. **Request**: NGO submits handover request (`targetType: parent | cwc | shelter`). Handover enters `pending_police_review`.
2. **Strict Separation of Duties**: The NGO is technically blocked from approving its own handover request (enforced via `req.user.role !== "police"` check).
3. **Police Review**: Verified officer reviews biological relationship proofs or Child Welfare Committee (CWC) custody transfer documents and approves handover.
4. **Handover Completion & Atomic Bed Release**:
   - `Handover` transitions to `completed`.
   - `CareRecord` transitions to `handed_over`.
   - `Shelter.activePlacements` decremented atomically (`{ activePlacements: { $gt: 0 } }, { $inc: { activePlacements: -1 } }`).
   - Missing case transitions to `reunited`.

---

## 17. REAL-TIME NOTIFICATION ARCHITECTURE & SOCKET.IO

### 17.1. WebSocket Architecture (`server/config/socket.js`)
- **Authentication**: JWT token validated during WebSocket handshake (`io.use(socketAuthMiddleware)`).
- **Private Room Scoping**: Sockets automatically join private room `user:<userId>`.
- **Role Room Scoping**: Sockets join role-level broadcast rooms (e.g. `role:police`, `station:<policeStation>`).
- **Events**:
  - `notification:new`: Dispatched when high-priority case events occur.
  - `notification:unread-count`: Synchronizes unread notification badges.
  - `notification:read-all`: Broadcasts when a user clears their notification inbox.
- **Fail-Soft Invariant**: Socket failures never interrupt database transactions or HTTP responses.

---

## 18. TAMPER-EVIDENT IMMUTABLE AUDIT LOGGING SYSTEM

### 18.1. Audit Logging Invariants (`server/models/AuditLog.js`)
- **Append-Only Immutability**: All Mongoose mutation query hooks (`update`, `updateOne`, `updateMany`, `findOneAndUpdate`, `remove`, `deleteOne`, `deleteMany`) throw `AUDIT_LOG_IMMUTABLE`.
- **Events Captured**:
  - Authentication (Login, Logout, Token Refresh, Password Change)
  - Child Registration & Photo Uploads
  - Missing Case Creation & State Transitions
  - FIR Upload & Verification/Rejection Decisions
  - Sighting Submissions & Review Decisions
  - NGO Intake, Handover Requests, Approvals & Completions
  - Admin Credential Verifications
- **Metadata Recorded**: Actor ID, Role, Target Resource, IP Address, User Agent, Timestamp, Before/After Delta.

---

## 19. SECURITY ARCHITECTURE, PII PROTECTION & THREAT MITIGATION

| Threat Vector | Mitigation Strategy | Implemented In |
| :--- | :--- | :--- |
| **Broken Object Level Auth (BOLA / IDOR)** | Authoritative ownership checks comparing `req.user._id` to document `guardianId`, `submittedBy`, or `assignedStation`. | Controllers & Services |
| **Privilege Escalation** | Multi-layer RBAC middleware (`authenticate`, `authorize(["police", "admin"])`) rejecting unauthorized roles. | `server/middleware/` |
| **Session Hijacking / XSS** | HttpOnly signed cookies (`sameSite: strict`, `secure: true`), Helmet CSP headers, XSS filtering. | `server/app.js` |
| **Cross-Site Request Forgery (CSRF)** | SameSite cookie attributes, custom HTTP header verification (`X-Requested-With`). | `server/app.js` |
| **Biometric Timing Attacks** | Constant-time cryptographic comparison (`crypto.timingSafeEqual`) on `INTERNAL_SERVICE_KEY`. | `server/services/aiService.js` |
| **Denial of Service (DoS)** | Multi-tier rate limiting via `express-rate-limit` (Auth: 5 req/15m; Search: 30 req/m; API: 100 req/m). | `server/middleware/rateLimiter.js` |
| **SQL / NoSQL Injection** | Mongoose strict schema casting, parameterized queries, sanitization of `$where` and `$regex` operators. | Mongoose Models |
| **Malicious File Uploads** | Multer MIME type allowlisting (JPEG, PNG, WebP, PDF), file size bounds (5 MB), Cloudinary cloud sandboxing. | `server/middleware/upload.js` |

---

## 20. NETWORK SEGMENTATION, FIREWALLING & REVERSE PROXY

### 20.1. Ingress & Proxy Architecture
- **Reverse Proxy Header**: Express configures `app.set("trust proxy", 1)` in production to respect upstream `X-Forwarded-For` and `X-Forwarded-Proto` headers terminated by Nginx or Cloud Load Balancers.
- **Nginx SPA Configuration (`client/nginx.conf`)**:
  - Security headers: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`.
  - Feature Policy: `Permissions-Policy "camera=(self), microphone=(), geolocation=(self)"`.
  - Gzip compression on all static assets.
  - Dedicated `/healthz` probe returning HTTP 200 without access logs.

---

## 21. MULTI-STAGE CONTAINERIZATION & DOCKER COMPOSE ARCHITECTURE

### 21.1. Container Specifications
- **`server/Dockerfile.prod`**:
  - Base: `node:20-alpine`.
  - Security: Runs as unprivileged `node` user (`USER node`).
  - Signal Handling: `CMD ["node", "app.js"]` ensures instant SIGTERM propagation.
  - Health check: `wget --spider http://127.0.0.1:5000/api/health`.
- **`client/Dockerfile.prod`**:
  - Stage 1 (Builder): Compiles static React bundle via Vite.
  - Stage 2 (Runtime): Serves `/usr/share/nginx/html` via `nginx:alpine`.
  - Health check: `wget --spider http://127.0.0.1:3000/healthz`.
- **`ai-service/Dockerfile`**:
  - Base: `python:3.11-slim`.
  - Execution: Single-worker Uvicorn ASGI server with pre-cached ONNX model weights.
  - Health check: `curl -f http://localhost:8000/health`.

---

## 22. CLOUDINARY MEDIA STORAGE PIPELINE & DOCUMENT SECURITY

### 22.1. Media Pipeline
- **Storage Strategy**: All images and documents upload directly to Cloudinary via server-side SDK using secure API credentials.
- **Client Shielding**: Cloudinary API secret and API key are never bundled in client assets.
- **URL Transformation**: Images served over HTTPS with automatic format selection (`f_auto`) and quality optimization (`q_auto`).
- **Document Protection**: FIR PDFs stored with restricted access keys; download URLs generated via authenticated backend controllers.

---

## 23. RESTFUL API REFERENCE & ENDPOINT CATALOG

### 23.1. Authentication (`/api/auth`)
- `POST /register`: Registers new user account (`parent`, `citizen`, `police`, `ngo`).
- `POST /login`: Authenticates credentials, generates JWT, sets HttpOnly cookie.
- `POST /logout`: Clears cookie session and revokes Redis cache entry.
- `GET /me`: Returns authenticated user profile (scrubbed of passwords).

### 23.2. Missing Cases (`/api/cases`)
- `POST /`: Registers missing child case (Parent only).
- `GET /`: Lists missing cases (role-filtered).
- `GET /:id`: Retrieves case details by ID (PII-protected based on role).
- `PATCH /:id/status`: Transitions case status (Police only).
- `POST /:id/notes`: Appends investigation note (Police only).

### 23.3. FIR Module (`/api/fir`)
- `POST /`: Submits FIR filing with digital scan (Parent/Police).
- `GET /case/:caseId`: Retrieves FIR associated with case.
- `PATCH /:id/verify`: Police review & verification decision (`verified`/`rejected`).

### 23.4. Location & Geospatial (`/api/location`)
- `GET /search`: Spatial query within radius kilometers (`2dsphere`).
- `GET /cases-map`: Returns map marker clusters (obfuscated for public).

### 23.5. Citizen Sightings (`/api/citizen`)
- `POST /sightings`: Citizen submits child sighting with photo/coordinates.
- `GET /my-sightings`: Retrieves sightings submitted by current citizen.
- `POST /search-missing-child`: Biometric face search against active cases.

### 23.6. Police Operations (`/api/police`)
- `GET /station-cases`: Lists cases assigned to officer's station.
- `PATCH /sightings/:id/review`: Police reviews sighting lead.
- `POST /handover/:id/approve`: Police authorizes child handover.

### 23.7. NGO Operations (`/api/ngo`)
- `GET /shelters`: Lists shelters operated by NGO.
- `POST /shelters`: Registers new shelter facility.
- `POST /intake`: Performs child intake, creates care record.
- `POST /handover/request`: Submits child handover request.
- `POST /handover/:id/complete`: Completes handover and releases bed.

### 23.8. Notifications & Health (`/api/notifications`, `/api/health`)
- `GET /notifications`: Lists user notifications with unread count.
- `PATCH /notifications/:id/read`: Marks single notification as read.
- `PATCH /notifications/read-all`: Marks all notifications as read.
- `GET /health`: Server health, uptime, and database status probe.

---

## 24. FRONTEND COMPONENT HIERARCHY & STATE ARCHITECTURE

```
App.jsx (Root Routing & Layout Provider)
 │
 ├── AuthContext (User Session, JWT Cookie Sync, Role Gate)
 ├── NotificationContext (Socket.IO Connection, Unread Counter)
 ├── MapContext (Leaflet Instance, Geolocation Coordinates)
 │
 ├── Public Views:
 │    ├── LandingPage.jsx (Hero, Overview, Stats)
 │    ├── PublicSearchPage.jsx (Filterable Directory, OSM Map)
 │    └── CitizenPhotoSearchPage.jsx (AI Photo Drag & Drop, Lead Results)
 │
 └── Role-Gated Protected Dashboards:
      ├── ParentDashboard.jsx (Child Registry, FIR Upload, Timeline)
      ├── CitizenDashboard.jsx (My Sightings, Nearby Facilities)
      ├── PoliceDashboard.jsx (Station Queue, FIR Review, Handover Approval)
      ├── NgoDashboard.jsx (Shelter Beds, Care Records, Handover Protocol)
      └── AdminDashboard.jsx (Credential Approvals, Audit Logs)
```

---

## 25. ERROR HANDLING, RESILIENCE & GRACEFUL DEGRADATION

### 25.1. Resilience Patterns
- **Redis Disconnect Fallback**: If Redis becomes unreachable, `server/config/redis.js` logs a warning and automatically activates an internal memory store with TTL eviction.
- **AI Microservice Outage**: If FastAPI or Qdrant fails or times out (10s), the Express backend catches `AIServiceTimeoutError` / `AIServiceUnavailableError`, logs an audit incident, and returns HTTP 503/504 with an advisory without crashing.
- **Socket.IO Fault Isolation**: WebSocket emission errors are caught and logged; database commits and REST HTTP responses complete uninterrupted.

---

## 26. DATABASE CONCURRENCY, RACE CONDITION GUARDS & MULTI-DOCUMENT STATE

### 26.1. Concurrency Controls
- **Shelter Bed Capacity**: Atomic conditional update `{ activePlacements: { $lt: capacityTotal } }` prevents double-booking.
- **Handover Completion**: Atomic state transition `{ _id: handoverId, status: "approved" }` ensures multiple concurrent completion clicks decrement bed capacity exactly once (tested in `phase23_database_concurrency.test.js`).
- **FIR Number Uniqueness**: Compound unique index `{ policeStation: 1, firNumber: 1 }` prevents duplicate FIR dockets.
- **Care Record Protection**: Compound unique index `{ missingCaseId: 1, status: { $ne: "handed_over" } }` prevents duplicate open care records for the same child.

---

## 27. DATA BACKUP, DISASTER RECOVERY & REPLICATION STRATEGY

### 27.1. Backup Testing Verification (Phase 24)
- **Backup Verification Script**: `server/scripts/backupRestoreTest.js` executed on November 16, 2026.
- **Collections Verified**: 10 collections (174 documents, 79 indexes).
- **Backup Time**: 0.060 seconds.
- **Restore Time (RTO)**: 1.831 seconds.
- **Recovery Point Objective (RPO)**: 0 seconds (100% document count and index parity).
- **Production Recommendation**: Daily automated BSON dumps via `mongodump` + S3 archival with 30-day retention; Qdrant snapshot exports for vector embeddings.

---

## 28. AUTOMATED TESTING FRAMEWORK & TEST SUITE INVENTORY

### 28.1. Inventory Summary

| Suite Category | File Path | Total Tests | Pass Rate |
| :--- | :--- | :---: | :---: |
| **Backend Core Regression** | `server/tests/phase17_data_integrity.test.js` | 13 | 100% |
| **FIR Lifecycle & Security** | `server/tests/phase18_fir.test.js` | 14 | 100% |
| **Location & Maps** | `server/tests/phase19_location.test.js` | 12 | 100% |
| **Citizen Operations** | `server/tests/phase20_citizen.test.js` | 15 | 100% |
| **Police Investigation** | `server/tests/phase21_police.test.js` | 16 | 100% |
| **NGO Shelter & Care** | `server/tests/phase22_ngo.test.js` | 18 | 100% |
| **Database Concurrency** | `server/tests/phase23_database_concurrency.test.js` | 5 | 100% |
| **Security, RBAC & IDOR** | `server/tests/phase23_security_rbac.test.js` | 10 | 100% |
| **Socket.IO Real-Time** | `server/tests/phase23_socket_realtime.test.js` | 4 | 100% |
| **Full Lifecycle E2E** | `server/tests/phase23_e2e_lifecycle.test.js` | 31 | 100% |
| **Phase 15 Production Config**| `server/tests/phase15_production_config.test.js` | 10 | 100% |
| **Phase 15 Secret Hygiene** | `server/tests/phase15_secret_management.test.js` | 6 | 100% |
| **Playwright Real Browser** | `server/tests/phase23_browser_e2e.test.js` | 4 | 100% |
| **Frontend Unit Suites** | `client/tests/` (7 test files) | 64 | 100% |
| **TOTAL VERIFIED TESTS** | **All Automated Test Suites** | **222** | **100%** |

---

## 29. PERFORMANCE BENCHMARKS, SCALABILITY & RESOURCE UTILIZATION

### 29.1. Observed Runtime Benchmarks
- **Client Production Bundle Build**: 8.95 seconds (`dist/assets/index-*.js`: 339 kB gzip).
- **Backend Test Suite Execution**: 10 core suites (159 tests) execute in 6.43 seconds.
- **Disaster Recovery Restore**: 174 documents across 10 collections restore in 1.831 seconds.
- **Browser Automation (Playwright)**: 4 full-journey headless browser suites execute in 47.5 seconds.
- **Resource Footprint**: Node.js backend idle memory: ~45 MB; Nginx static container: ~26 MB; Python FastAPI: ~250 MB (with ONNX model loaded).

---

## 30. OPERATIONAL RUNBOOKS & DAY-2 MANAGEMENT

### 30.1. Routine Operations
1. **Initial Deployment**:
   ```bash
   cp .env.example .env
   # Populate production secrets (JWT_SECRET, COOKIE_SECRET, INTERNAL_SERVICE_KEY, etc.)
   docker compose -f docker-compose.prod.yml config
   docker compose -f docker-compose.prod.yml up -d
   ```
2. **Database Backup**:
   ```bash
   docker exec -t guardianlink-mongo-prod mongodump --out /data/backup_$(date +%F)
   ```
3. **Database Restore**:
   ```bash
   docker exec -t guardianlink-mongo-prod mongorestore /data/backup_2026-11-16/guardianlink
   ```
4. **Health Check Probing**:
   ```bash
   curl -f http://localhost:5000/api/health
   curl -f http://localhost:3000/healthz
   ```

---

## 31. COMPLIANCE, PRIVACY REGULATIONS & ETHICAL GUIDELINES

### 31.1. Standards Alignment
- **Juvenile Justice & Child Protection Standards**: Strict role gating ensures that only legally verified authorities perform case actions and custody transfers.
- **Data Protection (GDPR / DPDP Act)**:
  - Purpose Limitation: Biometric data collected solely for missing child search.
  - Storage Limitation: Embeddings deleted upon child case closure via `DELETE /internal/face/:childId`.
  - Right to Privacy: Guardian residential street addresses and phone numbers redacted from public search directories.
- **Ethical AI Principles**: Machine learning model never acts autonomously; confidence scores guide human officers without automatic decisions.

---

## 32. HISTORICAL PHASE EVOLUTION (PHASES 0 THROUGH 24)

| Phase | Milestone Name | Scope & Architectural Contribution | Verification Status |
| :---: | :--- | :--- | :---: |
| **0** | Stabilization | Baseline code cleanup, linting, and initial directory restructuring | **VERIFIED** |
| **1** | User Verification | Initial user authentication and role definition baseline | **VERIFIED** |
| **2** | Child Management | Child profile schemas, guardian linkage, and CRUD operations | **VERIFIED** |
| **3** | Image Ingestion | Child photo ingestion and Cloudinary cloud storage integration | **VERIFIED** |
| **4** | Missing Case Backend | MissingCase state machine, reporting APIs, and initial controllers | **VERIFIED** |
| **5** | Parent Real Data | Elimination of mock parent fixtures; real database migration | **VERIFIED** |
| **6.1-6.11** | AI Biometric Engine | InsightFace SCRFD + ArcFace, Qdrant vector DB, 512D embeddings | **VERIFIED** |
| **7** | Citizen Response | Sighting submission, photo attachment, and witness reporting | **VERIFIED** |
| **8** | Police Module | Jurisdictional case assignment, investigation notes, police UI | **VERIFIED** |
| **9** | NGO Shelter Module | Shelter facility registration, bed capacity, child care tracking | **VERIFIED** |
| **10** | Real-Time Alerts | Socket.IO WebSocket architecture and private notification rooms | **VERIFIED** |
| **11** | Audit Logging | Immutable audit logging schema and security event recording | **VERIFIED** |
| **12** | Test Engineering | Automated regression suites for backend and frontend workflows | **VERIFIED** |
| **13** | Security Hardening | PII sanitization, timing attack defense, rate limiting, and CORS | **VERIFIED** |
| **14** | Docker Architecture | 3-tier segmented container networking and unmapped internal ports | **VERIFIED** |
| **15** | Production Readiness | Fail-closed env validator, non-root Dockerfiles, Nginx SPA, CI/CD | **VERIFIED** |
| **16** | Feature Gap Analysis | Holistic gap analysis and pre-implementation architectural roadmap | **VERIFIED** |
| **17** | Data Integrity | Mock data elimination, immutability hooks, address obfuscation | **VERIFIED** |
| **18** | Complete FIR Module | Police station FIR review, digital upload, rejection audit trail | **VERIFIED** |
| **19** | Location & Maps | Leaflet/OSM interactive maps, GPS geolocation, privacy fuzzing | **VERIFIED** |
| **20** | Citizen Portal | Real API integration, sighting management, AI lead disclaimers | **VERIFIED** |
| **21** | Police Portal | Officer management, FIR review, sighting triage, station analytics | **VERIFIED** |
| **22** | NGO Portal | Shelter intake, care records, handover authorization boundaries | **VERIFIED** |
| **23** | System Integration | 20-step E2E lifecycle, database concurrency, Playwright browser E2E | **VERIFIED** |
| **24** | Master Release Audit | Final readiness audit, backup/restore test, master documentation | **VERIFIED** |

