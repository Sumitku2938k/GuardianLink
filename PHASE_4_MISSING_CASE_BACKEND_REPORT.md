# GUARDIANLINK — PHASE 4 IMPLEMENTATION REPORT
## Missing Case Management Backend — Audit, Implementation, Security & Frontend Migration

---

### 1. EXECUTIVE SUMMARY

In **Phase 4**, GuardianLink's **Missing Case Management system** has been completely migrated from frontend/mock arrays into a hardened, production-ready, backend-backed MongoDB architecture.

- **Canonical Incident Model:** The separation of concerns between `Child` (persistent person identity) and `MissingCase` (specific missing incident event) is strictly maintained. A child can have multiple chronological missing case incident records over time, while `Child.status` remains independent.
- **Strict Server-Side Ownership & IDOR Protection:** Parents can only report missing cases for children they own (`child.guardianId === req.user._id`). Parents can only view or query cases belonging to their own children.
- **One Active Case Policy (Conflict 409):** A child cannot have more than one open/active incident report concurrently (`status ∈ {reported, under_verification, active, found}`). Subsequent reports while active are rejected with `409 ACTIVE_CASE_EXISTS`. Historical cases with resolved/terminal status (`reunited`, `closed`, `cancelled`) permit opening new incidents.
- **Controlled Lifecycle State Machine:** Case statuses follow a strictly validated state transition pipeline with role-scoped authority. Parents can only cancel newly filed drafts; Police and Admin manage verification and investigation lifecycle; NGOs assist with found and reunification milestones.
- **Frontend Real-API Migration:** `MissingCasesContext.jsx` and parent views (`ReportMissingCase.jsx`, `MissingCasesList.jsx`, `CaseDetails.jsx`) now interact directly with `/api/cases` endpoints with real async loading, error handling, and state synchronization.
- **Test Suite & Regression Verification:** Automated test suite `server/scripts/test_phase4_cases.js` verified **39/39 tests passing (100%)**. Regression tests across Phase 0, 1, 2, and 3 all passed with 0 failures, and the React Vite client built with 0 errors.

---

### 2. CANONICAL MODEL & SCHEMA DESIGN

#### `server/models/MissingCase.js`
The model establishes the canonical reference to `Child` and `User`:
```javascript
const missingCaseSchema = new mongoose.Schema(
  {
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: [true, "Missing case must be linked to a registered Child identity."],
      index: true
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Missing case must identify the reporting user."],
      index: true
    },
    status: {
      type: String,
      enum: ["reported", "under_verification", "active", "found", "reunited", "closed", "cancelled"],
      default: "reported",
      index: true
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "high",
      index: true
    },
    missingDate: {
      type: Date,
      required: [true, "Missing date and time is required."],
      validate: {
        validator: function (value) {
          return !value || value <= new Date();
        },
        message: "Missing date cannot be in the future."
      }
    },
    lastSeenLocation: {
      address: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "" },
      state: { type: String, trim: true, default: "" },
      pinCode: { type: String, trim: true, default: "" },
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 }
    },
    lastSeenDescription: { type: String, trim: true, default: "" },
    policeCaseNumber: { type: String, trim: true, default: "", index: true },
    firNumber: { type: String, trim: true, default: "" },
    foundAt: { type: Date, default: null },
    reunitedAt: { type: Date, default: null }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);
```

#### Compound Indexes & Virtuals
- Compound Index: `{ childId: 1, status: 1 }` enables $O(1)$ active case validation.
- Index: `{ reportedBy: 1, createdAt: -1 }` accelerates parent case history queries.
- Canonical Virtual: `caseNumber` provides formatted representation (`MC-YYYY-XXXX` or `MC-<id>`).
- Safe Sanitization: `toSafeObject()` strips `__v` and returns formatted incident representations.

---

### 3. API ENDPOINTS SPECIFICATION

| Method | Route | Access / Roles | Description | Security Controls |
|---|---|---|---|---|
| `POST` | `/api/cases` | Private (`parent`) | Reports a new missing child emergency | IDOR validation (`child.guardianId === req.user._id`), 409 active case conflict check, non-future date check, mass-assignment protection |
| `GET` | `/api/cases` | Private (`parent`, `police`, `ngo`, `admin`) | Retrieves missing cases | Scoped by role: Parent sees only own children's cases; Police sees operational cases; NGO sees active/found; Admin sees all; Citizen blocked (403) |
| `GET` | `/api/cases/:caseId` | Private (`parent`, `police`, `ngo`, `admin`) | Retrieves specific case details | IDOR isolation (Parent B gets 404 viewing Parent A's case); Citizen blocked (403) |
| `PATCH` | `/api/cases/:caseId/status` | Private (`parent`, `police`, `ngo`, `admin`) | Updates case lifecycle status | Controlled state machine validation (400 if invalid transition); Role permissions enforced; milestone timestamps recorded |

---

### 4. CONTROLLED STATUS LIFECYCLE STATE MACHINE

The case status transitions strictly enforce the following state graph:

```text
               ┌──────────────┐
               │   reported   │
               └──────┬───────┘
           ┌──────────┴──────────┐
           ▼                     ▼
┌────────────────────┐    ┌─────────────┐
│ under_verification │    │  cancelled  │ (Terminal)
└──────────┬─────────┘    └─────────────┘
     ┌─────┴─────┐
     ▼           ▼
┌─────────┐ ┌─────────┐
│ active  │ │ closed  │ (Terminal)
└───┬─────┘ └─────────┘
    ▼
┌─────────┐
│  found  │ (Sets foundAt timestamp)
└───┬─────┘
    ▼
┌─────────┐
│ reunited│ (Sets reunitedAt timestamp)
└───┬─────┘
    ▼
┌─────────┐
│ closed  │ (Terminal)
└─────────┘
```

#### Role Transition Permissions
- **Parent:** Can only transition own newly filed case (`reported` -> `cancelled`) if filed by mistake. Arbitrary status updates to `active` or `closed` are blocked with `403 PARENT_STATUS_UPDATE_RESTRICTED`.
- **Police:** Authorized to progress `reported` -> `under_verification` -> `active` -> `closed` (operational law enforcement verification).
- **NGO:** Authorized to progress `active` -> `found` and `found` -> `reunited` (child welfare coordination).
- **Admin:** Platform-wide lifecycle authority.
- **Citizen:** Blocked from all status mutations with `403 ACCESS_DENIED`.

---

### 5. ONE ACTIVE CASE POLICY & INCIDENT HISTORY

1. **Active State Conflict (409):**
   When `POST /api/cases` is called, the server queries for an existing case where `status ∈ ["reported", "under_verification", "active", "found"]`. If detected:
   ```json
   {
     "success": false,
     "message": "An active missing case is already open for this child. The existing case must be resolved before filing a new incident report.",
     "code": "ACTIVE_CASE_EXISTS",
     "existingCaseId": "6ac646c16566d2593bf90fc2"
   }
   ```
2. **Multiple Incident History:**
   When a prior case reaches a resolved status (`reunited`, `closed`, or `cancelled`), the child record remains in MongoDB and the parent can file a subsequent missing incident. Both cases are preserved in MongoDB with distinct timestamps, locations, and police tracking numbers.

---

### 6. FRONTEND MIGRATION & USER EXPERIENCE

- **`MissingCasesContext.jsx`:**
  - Replaced hardcoded state with asynchronous Axios calls to `/api/cases`.
  - Added `normalizeCaseForUi` to cleanly map MongoDB documents into frontend properties (`caseNumber`, `childName`, `childPhoto`, `childAge`, `lastSeenLocation`, `stageIndex`, `firNumber`).
  - Added `createCase`, `getCaseById`, `updateCaseStatus`, and `getActiveCaseForChild`.
  - Preserved secondary match/sighting models for seamless UI presentation.
- **`ReportMissingCase.jsx`:**
  - Integrated 5-step wizard with real asynchronous `createCase(payload)`.
  - Replaced fake timer with real submission handling and inline error banners for conflict or network errors.
  - Success view navigates to real case ID.
- **`MissingCasesList.jsx`:**
  - Removed simulated timer loading; connected to live `fetchCases()`.
  - Added real skeleton loaders, retry handlers, and dynamic status badges.
- **`CaseDetails.jsx`:**
  - Added asynchronous lookup with fallback `GET /api/cases/:caseId` API fetch.
  - Page refreshes and direct URLs load case details cleanly without 404 flash.
- **`CaseStatusBadge.jsx` & `CasePriorityBadge.jsx`:**
  - Upgraded to support both canonical lowercase values (`reported`, `under_verification`, `active`, `found`, `reunited`, `closed`, `cancelled`) and legacy capitalized strings.

---

### 7. VERIFICATION & TEST SUITE RESULTS

#### Phase 4 Test Suite (`server/scripts/test_phase4_cases.js`)
All 39 security and functional assertions executed against live Docker containers:

```text
==================================================================
PHASE 4 TEST SUMMARY: Total: 39 | Passed: 39 | Failed: 0
==================================================================
  ✓ Anonymous POST /api/cases -> 401
  ✓ Anonymous GET /api/cases -> 401
  ✓ Anonymous GET /api/cases/:id -> 401
  ✓ Anonymous PATCH /api/cases/:id/status -> 401
  ✓ Citizen POST /api/cases -> 403 Forbidden
  ✓ Police POST /api/cases -> 403 Forbidden (Only Parent can report)
  ✓ Citizen GET /api/cases -> 403 Forbidden
  ✓ Parent A Child A registered
  ✓ Parent B Child B registered
  ✓ Parent B reporting Parent A's child -> 404 Denied (IDOR Defense)
  ✓ Invalid Child ID format -> 400 Bad Request
  ✓ Future Missing Date -> 400 Bad Request
  ✓ Missing Date omitted -> 400 Bad Request
  ✓ Parent A reports Child A missing -> 201 Created
  ✓ Status initializes strictly to 'reported'
  ✓ ReportedBy strictly derived from session (Mass assignment prevented)
  ✓ Canonical caseNumber generated (MC-YYYY-XXXX)
  ✓ Duplicate active case for Child A -> 409 Conflict (ACTIVE_CASE_EXISTS)
  ✓ Parent A queries /api/cases -> Sees Child A case
  ✓ Parent B queries /api/cases -> Isolated (0 cases from Parent A)
  ✓ Police queries /api/cases -> Sees operational case
  ✓ Admin queries /api/cases -> Sees all cases
  ✓ Parent A views own case detail -> 200 OK
  ✓ Parent B views Parent A's case detail -> 404 IDOR Protected
  ✓ Police views case detail -> 200 OK
  ✓ Citizen views case detail -> 403 Forbidden
  ✓ Parent arbitrary status update to 'active' -> 403 Restricted
  ✓ Invalid transition 'reported' -> 'reunited' -> 400 Bad Request
  ✓ Police transitions 'reported' -> 'under_verification' -> 200 OK
  ✓ Police transitions 'under_verification' -> 'active' -> 200 OK
  ✓ NGO transitions 'active' -> 'found' -> 200 OK
  ✓ Milestone foundAt timestamp persisted
  ✓ NGO transitions 'found' -> 'reunited' -> 200 OK
  ✓ Milestone reunitedAt timestamp persisted
  ✓ Police transitions 'reunited' -> 'closed' -> 200 OK (Terminal state)
  ✓ Attempt transition out of terminal state 'closed' -> 400 Bad Request
  ✓ Parent reports new incident after first case closed -> 201 Created
  ✓ Child A has multiple historical case records in DB
  ✓ Parent cancels newly reported draft incident -> 200 OK
```

#### Full Regression Matrix
| Test Suite | Tests Run | Result | Notes |
|---|---|---|---|
| Phase 0 (`test_phase0.js`) | 31 | **31 / 31 PASS** | Authentication, JWT, Redis sessions, RBAC |
| Phase 1 (`test_phase1.js`) | 7 sections | **100% PASS** | User lifecycle, Admin approval, verification |
| Phase 2 (`test_phase2_children.js`) | 34 | **34 / 34 PASS** | Child management CRUD, IDOR isolation |
| Phase 3 (`test_phase3_images.js`) | 36 | **36 / 36 PASS** | Multer, Cloudinary, image sanitization |
| Phase 4 (`test_phase4_cases.js`) | 39 | **39 / 39 PASS** | Missing Case Management, state machine, IDOR |
| Frontend Build (`vite build`) | 2,270 modules | **SUCCESS (0 errors)** | Production bundle generated in 28.79s |

---

### 8. BOUNDARIES & DEFERRED FEATURES CONFIRMATION

In accordance with Phase 4 system constraints:
- **No AI / Facial Search Integration:** Facial feature vector extraction, InsightFace pipelines, and Qdrant vector databases remain unintegrated. `faceProfileId` remains unpopulated.
- **No Citizen Matching Workflows:** Citizen public matching and volunteer sighting workflows remain deferred to dedicated phases.
- **No Real-Time Sockets / SMS:** WebSockets, Socket.IO, push notifications, and SMS alerts were not added.
- **Clean Police Jurisdiction Model:** Police case viewing is scoped to approved officers (`status === 'approved'`) with optional city filters, avoiding complex precinct/station organizational structures.

---
*Report Certified: GuardianLink Phase 4 Implementation & Audit Complete.*
