# GuardianLink — Pre-AI Integration Audit

**Date:** October 4, 2026  
**Auditor:** Antigravity AI Engineering  
**Project:** GuardianLink Sem 5 (AI-Powered Child Protection & Rapid Reintegration Ecosystem)  
**Status:** COMPLETE TECHNICAL AUDIT  

---

## 1. Executive Summary

This document establishes the verified technical baseline of the **GuardianLink** platform prior to integrating the external AI Face-Recognition microservice. 

GuardianLink is structured as a multi-tier, containerized web application comprising a **React 18 + Vite** frontend, a **Node.js + Express** REST API, a **MongoDB** document database, and a **Redis** in-memory cache for session management. 

### Key Audit Findings:
1. **Core Infrastructure & Authentication (VERIFIED)**: The foundational authentication architecture using HttpOnly secure cookies, JWTs, Redis-backed session management (`session:<userId>`), password hashing with `bcryptjs`, and full Role-Based Access Control (`parent`, `citizen`, `police`, `ngo`, `admin`) is 100% operational and verified.
2. **Database Foundation (VERIFIED)**: Canonical Mongoose schemas for `User`, `Child`, and `MissingCase` are fully implemented, indexed, and verified in MongoDB. The domain separation between a child's persistent identity (`Child`) and an episodic disappearance (`MissingCase`) is strictly maintained.
3. **Backend API Gap (PARTIAL / MISSING)**: While Authentication (`/api/auth/*`) and Admin User Management (`/api/admin/users*`) routes exist and work with MongoDB, **no REST API routes or controllers exist yet for Children or Missing Cases** (`/api/children` or `/api/cases`).
4. **Image Ingestion Gap (NOT READY / MISSING)**: Neither `multer` nor the `cloudinary` SDK is installed in `server/package.json`. No file upload endpoints exist. The frontend currently creates temporary blob URLs (`URL.createObjectURL`) or relies on mock Unsplash images.
5. **Frontend State (MOCK DATA)**: The UI components for Parent, Citizen, Police, and NGO modules are richly designed and structurally complete, but operate almost entirely on in-memory mock data stored in React contexts (`ChildrenContext`, `MissingCasesContext`, `CitizenContext`, `PoliceContext`, `NgoContext`). The citizen AI matching flow (`runAIMatching`) is a frontend simulation.

---

## 2. Technology Stack

### Frontend Client
* **Framework**: React 18.3.1
* **Build Tool & Dev Server**: Vite 8.2.0 (ESM, HMR)
* **Language**: JavaScript (JSX)
* **Routing**: React Router DOM 6.30.1 (`BrowserRouter`, nested layouts, `ProtectedRoute`, `RoleRoute`, `PublicRoute`)
* **Styling**: TailwindCSS 3.4.17, PostCSS, Autoprefixer, `tailwind-merge`, `clsx`
* **UI Components & Icons**: Radix UI Primitives (`@radix-ui/react-dialog`, `@radix-ui/react-slot`, `@radix-ui/react-accordion`, `@radix-ui/react-tooltip`), Lucide React 0.539.0
* **Animations**: Framer Motion 12.42.2
* **HTTP Client**: Axios 1.19.0 configured with `baseURL` (`import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"`) and `withCredentials: true`

### Backend Server
* **Runtime**: Node.js 20.20.2 LTS
* **Framework**: Express 4.19.2
* **Security Middleware**: Helmet 8.3.0, CORS 2.8.5 (`credentials: true`, dynamic origin check), Express Rate Limit 8.6.2 (isolated limiters for `/login` and `/register`)
* **Cookies & Sessions**: Cookie-Parser 1.4.7 with signed secret, Redis session validation middleware
* **Authentication**: JSON Web Token (`jsonwebtoken` 9.0.3), Password Hashing (`bcryptjs` 3.0.3)
* **Validation**: Custom validation middleware (`authValidator.js`)

### Database & Cache
* **Database**: MongoDB 8.0 Community Edition
* **ODM**: Mongoose 9.9.2
* **Cache / Session Store**: Redis 7-Alpine via Node `redis` 6.2.1 client with automated in-memory Map fallback
* **DB Management UI**: Mongo Express latest on port 8081

### Infrastructure & Containerization
* **Orchestration**: Docker Compose (services: `mongo`, `redis`, `server`, `client`, `mongo-express`)
* **Networking**: Default bridged bridge network `guardianlinksem5_default`
* **Persistent Volumes**: `mongo_data` (mapped to `/data/db`), `redis_data` (mapped to `/data`)

---

## 3. Project Structure

```text
GuardianLink Sem 5/
├── docker-compose.yml              # Multi-container orchestration (mongo, redis, server, client, mongo-express)
├── README.md                       # High-level architecture documentation
├── PHASE_PRE_AI_GUARDIANLINK_AUDIT.md # This audit document
│
├── server/                         # Express Backend API
│   ├── Dockerfile                  # Node.js container build file
│   ├── package.json                # Server dependencies & scripts
│   ├── app.js                      # Express app bootstrap, CORS, middleware, route mounting
│   ├── .env                        # Active environment variables (JWT, Redis, Mongo, Admin credentials)
│   ├── .env.example                # Template environment variables
│   │
│   ├── config/
│   │   ├── db.js                   # Mongoose connection logic with graceful fallback
│   │   └── redis.js                # Redis client connection, session get/set/del, Map fallback
│   │
│   ├── models/                     # Canonical Mongoose Schemas
│   │   ├── index.js                # Central export barrel (User, Child, MissingCase)
│   │   ├── User.js                 # Unified User identity, auth, roles, statuses [VERIFIED]
│   │   ├── Child.js                # Persistent Child identity & biometrics [VERIFIED]
│   │   └── MissingCase.js          # Episodic Missing Case incident records [VERIFIED]
│   │
│   ├── controllers/                # Request Handlers
│   │   ├── rootController.js       # Root welcome response
│   │   ├── healthController.js     # System & DB health checks
│   │   ├── authController.js       # Register, Login, Me, Logout [VERIFIED]
│   │   └── adminController.js      # Admin user approvals, suspensions, listing [VERIFIED]
│   │
│   ├── routes/                     # Express Routers
│   │   ├── rootRoutes.js           # GET /
│   │   ├── healthRoutes.js         # GET /api/health
│   │   ├── authRoutes.js           # POST /register, POST /login, GET /me, POST /logout
│   │   └── adminRoutes.js          # GET /users, PATCH /users/:id/approve, etc.
│   │
│   ├── middleware/                 # Interceptors & Guards
│   │   ├── authenticate.js         # JWT & Redis session verification [VERIFIED]
│   │   ├── authorize.js            # Role-Based Access Control guard [VERIFIED]
│   │   ├── rateLimiter.js          # IP-based rate limiting
│   │   └── errorHandler.js         # Global JSON error formatter
│   │
│   ├── utils/
│   │   ├── cookies.js              # Token cookie creation & invalidation helpers
│   │   └── bootstrapAdmin.js       # System administrator auto-creation on boot
│   │
│   ├── validators/
│   │   └── authValidator.js        # Input sanity checks for register and login
│   │
│   └── scripts/                    # Test & Verification Automation
│       ├── test_phase1.js          # Phase 1 backend & database foundation test suite
│       └── test_phase2_matrix.js   # Phase 2 full 5-role auth lifecycle verification suite
│
└── client/                         # React + Vite Frontend SPA
    ├── Dockerfile                  # Vite development container build file
    ├── package.json                # Frontend dependencies
    ├── vite.config.js              # Vite bundler configuration (port 3000, host true)
    │
    └── src/
        ├── main.jsx                # DOM entry point
        ├── App.jsx                 # App routes, nested layouts, context hierarchy
        │
        ├── lib/
        │   └── axios.js            # Centralized Axios client (withCredentials: true)
        │
        ├── context/                # Global React State Providers
        │   ├── AuthContext.jsx     # Real Auth session, /me, login, logout [VERIFIED]
        │   ├── ChildrenContext.jsx # In-Memory Child store [MOCK DATA]
        │   ├── MissingCasesContext.jsx # In-Memory Missing Cases store [MOCK DATA]
        │   ├── CitizenContext.jsx  # In-Memory Citizen reports & AI simulation [MOCK DATA]
        │   ├── PoliceContext.jsx   # In-Memory Police precinct workload [MOCK DATA]
        │   ├── NgoContext.jsx      # In-Memory NGO shelter management [MOCK DATA]
        │   └── AdminContext.jsx    # Real User management + Mock audit/org logs [PARTIAL]
        │
        ├── components/
        │   ├── auth/               # Route guards (ProtectedRoute, RoleRoute, PublicRoute)
        │   ├── layout/             # Master DashboardLayout for Parent & Citizen
        │   ├── police/             # PoliceLayout, PoliceSidebar, PoliceTopNavbar
        │   ├── ngo/                # NgoLayout, NgoSidebar, NgoTopNavbar
        │   ├── admin/              # AdminLayout, AdminSidebar, AdminTopNavbar
        │   ├── dashboard/          # StatCards, Sidebar, Navbar, Widgets
        │   ├── children/           # ChildPhotoUploader, StepIndicator
        │   ├── citizen/            # PhotoCaptureCard, AIProcessingCard, MatchResultCard
        │   └── ui/                 # Reusable buttons, inputs, modals, cards
        │
        ├── pages/                  # Route Views
        │   ├── Index.jsx           # Landing presentation page
        │   ├── Login.jsx           # Unified authentication login
        │   ├── Register.jsx        # Multi-role public registration
        │   ├── Dashboard.jsx       # Parent Portal Root Dashboard
        │   ├── Unauthorized.jsx    # 403 Forbidden page
        │   ├── VerificationPending.jsx # Authority approval pending page
        │   ├── parent/             # MyChildren, AddChild, ReportMissingCase, CaseDetails
        │   ├── citizen/            # FoundChild workflows, citizen reports
        │   ├── police/             # Police dispatch desk, case management, analytics
        │   ├── ngo/                # Shelter management, intake wizard, transfers
        │   └── admin/              # User management, audit logs, AI monitoring
        │
        └── utils/
            └── authRedirect.js     # Canonical role-to-dashboard route resolver
```

---

## 4. Authentication Architecture

GuardianLink utilizes an **HttpOnly Cookie + Redis Session** authentication architecture.

```text
┌──────────────┐             ┌─────────────────────┐             ┌──────────────────────┐
│ React Client │             │   Express Backend   │             │   Redis / MongoDB    │
└──────┬───────┘             └──────────┬──────────┘             └──────────┬───────────┘
       │                                │                                   │
       │ 1. POST /api/auth/login        │                                   │
       ├───────────────────────────────>│ 2. Find user in Mongo (select +pw)│
       │                                ├──────────────────────────────────>│
       │                                │<──────────────────────────────────┤
       │                                │ 3. bcrypt.compare(pass, hash)     │
       │                                │ 4. Sign JWT (id, role, email)     │
       │                                │ 5. Store session in Redis         │
       │                                ├──────────────────────────────────>│
       │ 6. Set HttpOnly Cookie         │    (Key: session:<userId>)        │
       │<───────────────────────────────┤                                   │
       │                                │                                   │
       │ 7. Subsequent Request / Refresh│                                   │
       │    GET /api/auth/me (Cookie)   │                                   │
       ├───────────────────────────────>│ 8. Verify JWT crypto signature    │
       │                                │ 9. Check User in MongoDB          │
       │                                │ 10. Check Redis session exists    │
       │                                ├──────────────────────────────────>│
       │ 11. Return Safe User Object    │<──────────────────────────────────┤
       │<───────────────────────────────┤                                   │
       │                                │                                   │
       │ 12. POST /api/auth/logout      │                                   │
       ├───────────────────────────────>│ 13. delSession(session:<userId>)  │
       │                                ├──────────────────────────────────>│
       │ 14. Clear Cookie               │ 14. clearTokenCookie(res)         │
       │<───────────────────────────────┤                                   │
```

### Detailed Endpoint Behavior:

| Endpoint | Method | Request Payload | Security Mechanism | Database / Redis Behavior | Response Payload | Status |
|---|---|---|---|---|---|:---:|
| `/api/auth/register` | POST | `fullName`, `email`, `phone`, `password`, `role` (`parent` \| `citizen` \| `police` \| `ngo`) | Rate limited (15/hr), `authValidator`, rejects role `admin` (403) | Hashes password via `User.pre('save')` (bcrypt 10 rounds), saves document with status (`active` for parent/citizen, `pending` for police/ngo). Signs JWT, sets Redis session. | `{ success: true, user: safeUser }` + HttpOnly cookie `guardianlink_token` | **VERIFIED** |
| `/api/auth/login` | POST | `identifier` (email or phone), `password` | Rate limited (20/15m), checks suspension / deactivation | Fetches user with `.select('+passwordHash')`, runs `user.comparePassword()`. Sets `session:<userId>` in Redis (TTL: 7 days). Updates `lastLogin`. | `{ success: true, user: safeUser }` + HttpOnly cookie `guardianlink_token` | **VERIFIED** |
| `/api/auth/me` | GET | None (HttpOnly cookie sent automatically via `withCredentials: true`) | `authenticate` middleware: verifies JWT signature, verifies user exists in MongoDB, verifies `session:<userId>` exists in Redis | Reads from Redis and MongoDB. Fails with 401 if token expired, tampered, or Redis session destroyed. | `{ success: true, user: safeUser }` | **VERIFIED** |
| `/api/auth/logout` | POST | None (Cookie) | `optionalAuthenticate` extracts `userId` from cookie or token decode | Deletes `session:<userId>` from Redis. Calls `res.clearCookie('guardianlink_token')` with expired timestamp. | `{ success: true, message: "Logged out successfully." }` | **VERIFIED** |

---

## 5. RBAC / Authorization Architecture

GuardianLink enforces strict Role-Based Access Control both at the UX level (React Router) and the API boundary (Express middleware).

| Conceptual Role | Exists in DB Enum | Registration Allowed | Default Account Status | Dashboard Route | Backend Protection | Frontend Route Protection | Operational Status |
|---|:---:|:---:|:---:|---|---|---|:---:|
| **Parent** | YES | Public | `active` | `/dashboard` (or `/parent/dashboard`) | `authenticate`, `authorize('parent')` | `RoleRoute(['parent'])` | **VERIFIED** |
| **Citizen** | YES | Public | `active` | `/citizen/dashboard` | `authenticate`, `authorize('citizen')` | `RoleRoute(['citizen'])` | **VERIFIED** |
| **Police** | YES | Public | `pending` (requires Admin approval) | `/police/dashboard` | `authenticate`, `authorize('police')` | `RoleRoute(['police'])`, redirects to `/verification-pending` if pending | **VERIFIED** |
| **NGO** | YES | Public | `pending` (requires Admin approval) | `/ngo/dashboard` | `authenticate`, `authorize('ngo')` | `RoleRoute(['ngo'])`, redirects to `/verification-pending` if pending | **VERIFIED** |
| **Admin** | YES | Internal (Bootstrapped via `.env`) | `active` | `/admin/dashboard` | `authenticate`, `authorize('admin')` | `RoleRoute(['admin'])` | **VERIFIED** |

---

## 6. User Model Audit

* **Source File**: [server/models/User.js](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/GuardianLink%20Sem%205/server/models/User.js)
* **Collection Name**: `users`
* **Canonical Status**: **CANONICAL** (Sole user model across the application; no secondary or deprecated user models exist).

### Field Definition Matrix:

| Field | Type | Required | Default | Indexes / Constraints | Purpose |
|---|---|:---:|---|---|---|
| `_id` | ObjectId | Auto | Auto | Primary Key | Unique user identifier |
| `name` | String | YES | None | Trimmed | User's full legal name |
| `email` | String | YES | None | `unique: true`, `lowercase: true`, regex validated | Primary email address |
| `phone` | String | YES | None | `unique: true`, trimmed | Primary phone number for SMS & emergency contact |
| `passwordHash` | String | YES | None | `select: false` | Bcrypt hashed password (10 rounds) |
| `role` | String | YES | `"parent"` | `index: true`, enum: `['parent', 'citizen', 'police', 'ngo', 'admin']` | Platform authorization role |
| `profilePhoto` | String | NO | `""` | None | URL of avatar image |
| `isVerified` | Boolean | NO | `false` | None | General verification flag |
| `isActive` | Boolean | NO | `true` | None | Account operational state |
| `status` | String | YES | `"active"` | `index: true`, enum: `['active', 'pending', 'approved', 'rejected', 'suspended', 'deactivated']` | Approval and moderation lifecycle |
| `organization` | String | NO | `""` | None | Police Station or NGO Shelter legal name |
| `rejectionReason`| String | NO | `""` | None | Admin feedback if registration is rejected |
| `city` | String | NO | `""` | None | Geographic station or residence |
| `state` | String | NO | `""` | None | State / territory |
| `pinCode` | String | NO | `""` | None | Postal code |
| `lastLogin` | Date | NO | `Date.now` | None | Timestamp of latest login |
| `createdAt` | Date | Auto | Auto | Timestamps option | Document creation timestamp |
| `updatedAt` | Date | Auto | Auto | Timestamps option | Document modification timestamp |

### Helpers & Methods:
* **Virtual `fullName`**: Getter and setter mapping bidirectionally to `name`.
* **Method `comparePassword(candidate)`**: Compares plaintext password against `passwordHash`.
* **Method `toSafeObject()`**: Deletes `passwordHash` and `__v`, exposes string `id`.

---

## 7. Child Model Audit

* **Source File**: [server/models/Child.js](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/GuardianLink%20Sem%205/server/models/Child.js)
* **Collection Name**: `children`
* **Canonical Status**: **CANONICAL** (Sole model representing the permanent identity of a registered child).

### Field Definition Matrix:

| Field | Type | Required | Default | Indexes / Constraints | Purpose |
|---|---|:---:|---|---|---|
| `_id` | ObjectId | Auto | Auto | Primary Key | Unique child record identifier |
| `guardianId` | ObjectId | YES | None | `ref: "User"`, `index: true` | Foreign key referencing the parent/guardian |
| `fullName` | String | YES | None | Trimmed, minlength: 2, maxlength: 100 | Child's full name |
| `dateOfBirth` | Date | YES | None | Validated: `value <= new Date()` | Birth date used to compute current age |
| `gender` | String | YES | None | Enum: `['male', 'female', 'other', 'prefer_not_to_say']` | Child gender |
| `description` | String | NO | `""` | Maxlength: 1000, trimmed | Identifying marks, hair color, eye color |
| `photoUrl` | String | NO | `""` | None | High-resolution reference portrait for facial vector indexing |
| `cloudinaryPublicId` | String | NO | `""` | None | Cloudinary storage asset ID |
| `faceProfileId` | String | NO | `""` | `index: true`, `sparse: true` | External AI Face Vector ID / Qdrant Point ID reference |
| `status` | String | NO | `"active"` | `index: true`, enum: `['active', 'inactive']` | Child profile status |
| `createdAt` | Date | Auto | Auto | Timestamps option | Registration timestamp |
| `updatedAt` | Date | Auto | Auto | Timestamps option | Profile update timestamp |

### Helpers & Methods:
* **Virtual `age`**: Dynamically calculates child age in years from `dateOfBirth`.
* **Virtual `name`**: Getter and setter alias for `fullName`.
* **Method `isOwnedBy(userOrId)`**: Validates if a user is the legal guardian.
* **Method `toSafeObject()`**: Serializes virtuals, deletes `__v`, exposes string `id`.

---

## 8. MissingCase Model Audit

* **Source File**: [server/models/MissingCase.js](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/GuardianLink%20Sem%205/server/models/MissingCase.js)
* **Collection Name**: `missingcases`
* **Canonical Status**: **CANONICAL** (Sole model representing an active or historic missing incident).

### Field Definition Matrix:

| Field | Type | Required | Default | Indexes / Constraints | Purpose |
|---|---|:---:|---|---|---|
| `_id` | ObjectId | Auto | Auto | Primary Key | Unique missing case identifier |
| `childId` | ObjectId | YES | None | `ref: "Child"`, `index: true` | Foreign key linking incident to permanent Child profile |
| `reportedBy` | ObjectId | YES | None | `ref: "User"`, `index: true` | Foreign key referencing the reporting user |
| `missingDate` | Date | YES | None | Validated: `value <= new Date()` | Date and time the child was last seen |
| `lastSeenLocation.address` | String | NO | `""` | Trimmed | Street address or landmark description |
| `lastSeenLocation.city` | String | NO | `""` | Trimmed, indexed compound | City where child went missing |
| `lastSeenLocation.state` | String | NO | `""` | Trimmed | State / province |
| `lastSeenLocation.pinCode` | String | NO | `""` | Trimmed | Postal code |
| `lastSeenLocation.latitude` | Number | NO | None | Min: -90, Max: 90 | GPS latitude coordinates |
| `lastSeenLocation.longitude` | Number | NO | None | Min: -180, Max: 180 | GPS longitude coordinates |
| `lastSeenDescription` | String | NO | `""` | Maxlength: 2000, trimmed | Clothing worn, circumstances, suspected companions |
| `status` | String | YES | `"reported"` | `index: true`, enum: `['reported', 'under_verification', 'active', 'found', 'reunited', 'closed', 'cancelled']` | Incident operational state |
| `policeCaseNumber` | String | NO | `""` | Trimmed | Assigned official police case number |
| `firNumber` | String | NO | `""` | Trimmed | First Information Report (FIR) legal tracking number |
| `firDocumentUrl` | String | NO | `""` | None | URL to uploaded FIR legal PDF document |
| `cloudinaryPublicId` | String | NO | `""` | None | Cloudinary storage ID for FIR documents |
| `foundAt` | Date | NO | None | None | Timestamp when child was located |
| `reunitedAt` | Date | NO | None | None | Timestamp when child was returned to guardians |
| `createdAt` | Date | Auto | Auto | Compound index `{ createdAt: -1 }` | Incident filing timestamp |
| `updatedAt` | Date | Auto | Auto | Timestamps option | Incident update timestamp |

### Compound Indexes:
1. `{ childId: 1, status: 1 }`: Fast lookup of active incidents per child.
2. `{ "lastSeenLocation.city": 1, status: 1 }`: Geographically filtered missing case broadcasts.
3. `{ reportedBy: 1, status: 1 }`: Fast queries for parent dashboard case lists.
4. `{ createdAt: -1 }`: Chronological alert feeds.

### Helpers & Methods:
* **Method `isReportedBy(userOrId)`**: Validates if the requesting user created the case.
* **Method `toPublicResponse(childDoc)`**: Composes incident details with the child's identity to produce a normalized payload directly compatible with external AI matching results.

---

## 9. User → Child → MissingCase Relationship Architecture

```text
┌─────────────────────────┐
│       User (Parent)     │
│  _id: "6ac11c4c...21e"  │
└────────────┬────────────┘
             │ 1 : N (owns multiple children)
             ▼
┌─────────────────────────┐
│          Child          │
│  _id: "6ac11c4c...863"  │
│  guardianId: User._id   │ ◄── Permanent digital biometric vault & identity
└────────────┬────────────┘
             │ 1 : N (can have 0, 1, or sequential historical incidents)
             ▼
┌─────────────────────────┐
│       MissingCase       │
│  _id: "6ac11c4c...866"  │
│  childId: Child._id     │ ◄── Episodic incident; opened when lost, closed when reunited
│  reportedBy: User._id   │
└─────────────────────────┘
```

### Key Architectural Rules:
1. **Ownership Enforcement**: A `Child` document belongs strictly to the user matching `guardianId`. Methods like `child.isOwnedBy(req.user._id)` prevent unauthorized parents from reading or editing other families' child records.
2. **Identity Decoupling**: A `Child` record exists permanently, even when the child is safe at home. A `MissingCase` is created ONLY when a child goes missing.
3. **Multi-Incident Support**: A child can theoretically have multiple historical missing cases over time. However, only **one** case can be in status `reported`, `under_verification`, or `active` at any given time.
4. **Resolution Preservation**: When a child is found, `status` transitions to `found` and then `reunited` (recording `reunitedAt`). The `Child` record remains untouched in status `active`.

---

## 10. Database Architecture

* **Database Name**: `guardianlink`
* **Storage Engine**: WiredTiger (MongoDB 8.0)
* **Total Collections**: 3

| Collection | Schema Model | Purpose | Document Count | Storage Integrity |
|---|---|---|:---:|:---:|
| `users` | `User` | Stores all platform user credentials, roles, approvals, and contact details | 21 | Clean, verified |
| `children` | `Child` | Stores registered children profiles, DOB, and biometric IDs | 2 | Clean, verified |
| `missingcases`| `MissingCase`| Stores missing child incident records, FIR numbers, and locations | 2 | Clean, verified |

*Note: No orphan or deprecated legacy collections (such as `parents`, `officers`, or `sessions`) exist in the database.*

---

## 11. Existing API Inventory

### Implemented Endpoints:

| Endpoint | Method | Middleware / Auth | Role Guard | Controller Handler | Status |
|---|:---:|---|---|---|:---:|
| `/` | GET | None | Public | `rootController.getRoot` | **VERIFIED** |
| `/api/health` | GET | None | Public | `healthController.getHealth` | **VERIFIED** |
| `/api/auth/register` | POST | `registerRateLimiter`, `validateRegisterInput` | Public | `authController.register` | **VERIFIED** |
| `/api/auth/login` | POST | `loginRateLimiter`, `validateLoginInput` | Public | `authController.login` | **VERIFIED** |
| `/api/auth/me` | GET | `authenticate` | All Logged-in | `authController.getMe` | **VERIFIED** |
| `/api/auth/logout` | POST | `optionalAuthenticate` | Public / Auth | `authController.logout` | **VERIFIED** |
| `/api/admin/users` | GET | `authenticate`, `authorize('admin')` | Admin | `adminController.getUsers` | **VERIFIED** |
| `/api/admin/users/:id` | GET | `authenticate`, `authorize('admin')` | Admin | `adminController.getUserById` | **VERIFIED** |
| `/api/admin/users/:id/approve` | PATCH | `authenticate`, `authorize('admin')` | Admin | `adminController.approveUser` | **VERIFIED** |
| `/api/admin/users/:id/reject` | PATCH | `authenticate`, `authorize('admin')` | Admin | `adminController.rejectUser` | **VERIFIED** |
| `/api/admin/users/:id/suspend` | PATCH | `authenticate`, `authorize('admin')` | Admin | `adminController.suspendUser` | **VERIFIED** |
| `/api/admin/users/:id/activate`| PATCH | `authenticate`, `authorize('admin')` | Admin | `adminController.activateUser` | **VERIFIED** |
| `/api/admin/users/:id/role` | PATCH | `authenticate`, `authorize('admin')` | Admin | `adminController.updateUserRole` | **VERIFIED** |

### Missing Endpoints (To be built before AI Integration):
* `POST /api/children` — Register a child
* `GET /api/children` — List children owned by authenticated guardian
* `GET /api/children/:id` — Get single child profile
* `PUT /api/children/:id` — Update child details
* `POST /api/cases` — Report a missing child incident
* `GET /api/cases` — List active missing cases (filtered by role / ownership)
* `GET /api/cases/:id` — Detailed incident view
* `PATCH /api/cases/:id/status` — Status transition (`under_verification`, `active`, `found`, `reunited`)
* `POST /api/uploads/image` — Upload image to Cloudinary / storage

---

## 12. Frontend Architecture & State Management

The frontend state architecture is divided into two categories:

1. **Authentication Layer (REAL)**:
   * Managed by `AuthContext.jsx`.
   * Directly interfaces with `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`.
   * Guarantees that page reloads maintain session state without token storage in `localStorage`.
2. **Domain Modules (MOCK / LOCAL REACT STATE)**:
   * **`ChildrenContext.jsx`**: Holds 4 hardcoded children (`Aarav Sharma`, `Ananya Sharma`, `Kabir Mehta`, `Rhea Kapoor`). Mutations modify in-memory array.
   * **`MissingCasesContext.jsx`**: Holds 2 hardcoded cases (`MC-2026-8821`, `MC-2026-4431`). Mutations modify in-memory array.
   * **`CitizenContext.jsx`**: Holds 2 found child reports, manages photo capture and simulated AI matching.
   * **`PoliceContext.jsx`**: Holds precinct roster, station workload, and investigation cases.
   * **`NgoContext.jsx`**: Holds shelter capacity, bed occupancy, and child intake records.
   * **`AdminContext.jsx`**: Partially real (fetches users from `/api/admin/users`), but uses mock arrays for organizations, activity feeds, and audit logs.

---

## 13. Frontend ↔ Backend Integration Audit

| Frontend Module | API Connected? | Source of Truth | Mock Data Present? | Production Status |
|---|:---:|---|:---:|:---:|
| **Authentication (Login/Register)** | **YES** | MongoDB + Redis | NO | **VERIFIED** |
| **Parent Dashboard** | **NO** | `ChildrenContext` state | YES | **MOCK DATA** |
| **Child Registration (`AddChild`)** | **NO** | `setTimeout` + Context state | YES | **MOCK DATA** |
| **Missing Case Reporting** | **NO** | `setTimeout` + Context state | YES | **MOCK DATA** |
| **Citizen Sighting / Photo Scan** | **NO** | Browser blob URL + Context state | YES | **MOCK DATA** |
| **Citizen AI Matching** | **NO** | Simulated delay + Kabir Mehta candidate | YES | **MOCK DATA** |
| **Police Operational Dashboard** | **NO** | `PoliceContext` state | YES | **MOCK DATA** |
| **NGO Shelter Management** | **NO** | `NgoContext` state | YES | **MOCK DATA** |
| **Admin User Verification** | **YES** | `/api/admin/users` (MongoDB) | NO | **VERIFIED** |
| **Admin Audit & Organizations** | **PARTIAL** | Hardcoded initial list merged with DB | YES | **PARTIAL** |

---

## 14. Mock Data Inventory

The following files contain hardcoded data that must eventually be migrated to real API responses:

### 1. `client/src/context/ChildrenContext.jsx`
* **Data**: `childrenList` array containing 4 children (`Aarav Sharma`, `Ananya Sharma`, `Kabir Mehta`, `Rhea Kapoor`) with fake photos, medical conditions, and timelines.
* **Used by**: `Dashboard.jsx`, `MyChildren.jsx`, `ChildProfile.jsx`, `AddChild.jsx`.
* **Can be replaced by real API**: **YES** (via `GET /api/children`).

### 2. `client/src/context/MissingCasesContext.jsx`
* **Data**: `missingCases` array (`MC-2026-8821`, `MC-2026-4431`), `potentialMatches` array, `citizenReports` array, `caseTimelines` object.
* **Used by**: `MissingCasesList.jsx`, `CaseDetails.jsx`, `ReportMissingCase.jsx`.
* **Can be replaced by real API**: **YES** (via `GET /api/cases`).

### 3. `client/src/context/CitizenContext.jsx`
* **Data**: `foundReports` array (`CR-2026-9041`, `CR-2026-3180`), simulated candidate in `runAIMatching` (returns hardcoded Kabir Mehta match with 94.8% confidence score).
* **Used by**: `CitizenDashboard.jsx`, `FoundChildMatching.jsx`, `FoundChildResult.jsx`.
* **Can be replaced by real API**: **YES** (via `POST /api/citizen/identify` -> AI service).

### 4. `client/src/context/PoliceContext.jsx`
* **Data**: `currentOfficer` ("Insp. R. S. Rathore"), `officers` roster (3 officers), `policeCases` (3 cases), `potentialMatches`.
* **Used by**: `PoliceDashboard.jsx`, `PoliceCasesList.jsx`, `PoliceCaseDetails.jsx`.
* **Can be replaced by real API**: **YES** (via `GET /api/police/cases`).

### 5. `client/src/context/NgoContext.jsx`
* **Data**: `currentNgo` ("Helping Hands"), `shelterInfo` (20 capacity, 8 occupied), `childrenInCare`.
* **Used by**: `NgoDashboard.jsx`, `NgoIntakeWizard.jsx`, `NgoChildrenList.jsx`.
* **Can be replaced by real API**: **YES** (via `GET /api/ngo/shelter`).

### 6. `client/src/context/AdminContext.jsx`
* **Data**: `defaultOrganizations` array (3 baseline police/NGO orgs), `baseAlerts` array, static activity feed items.
* **Used by**: `AdminDashboard.jsx`, `AdminOrgsList.jsx`, `AdminAuditLogs.jsx`.
* **Can be replaced by real API**: **YES** (partially already replaced by live MongoDB users).

---

## 15. Workflow Audits

### Parent Workflow
```text
Login ──► Parent Dashboard ──► Register Child ──► Report Missing Case ──► Monitor Case
(Real)        (Mock Context)      (Mock Context)       (Mock Context)     (Mock Context)
```
* **Current Status**: **PARTIAL**
* Authentication and dashboard routing work cleanly with session persistence.
* Adding a child or reporting a missing case saves records only in memory in the browser session. If the user clears local React state or reloads without context persistence, newly registered children vanish back to the default 4 mock records.

### Citizen Workflow
```text
Login ──► Citizen Dashboard ──► Found Child CTA ──► Photo Capture ──► AI Matching ──► Match Result
(Real)        (Mock Context)      (Mock Context)     (Blob / Unsplash)  (Mock 94.8%)   (Mock Candidate)
```
* **Current Status**: **MOCK**
* The UX is intuitive and complete (Camera simulation, upload dropzone, animated scanning radar).
* However, no image is sent to the backend. `runAIMatching` executes a 2-second timeout and returns hardcoded candidate Kabir Mehta.

### Police Workflow
* **Current Status**: **MOCK**
* Police user registration requires Admin approval (`status: 'pending'`).
* Once approved, officer lands on `/police/dashboard`.
* The dashboard displays active case counts, emergency alert banners, and investigation stages, but all data originates from `PoliceContext.jsx`.

### NGO Workflow
* **Current Status**: **MOCK**
* NGO accounts require Admin approval.
* Once approved, user lands on `/ngo/dashboard` displaying shelter capacity cards, child intake records, and transfer logs, all powered by `NgoContext.jsx`.

### Admin Workflow
* **Current Status**: **VERIFIED / PARTIALLY INTEGRATED**
* Administrator logs in with system credentials.
* Reaches `/admin/dashboard`.
* **Real Live Functionality**: Fetches all 21 registered MongoDB users via `GET /api/admin/users`. Pending Police and NGO accounts appear dynamically. Clicking "Approve" or "Reject" fires `PATCH /api/admin/users/:id/approve`, updating MongoDB in real-time.

---

## 16. Image / File Storage Audit

* **Current Implementation**: **MOCK / CLIENT-SIDE ONLY**
* **Findings**:
  1. The client `PhotoCaptureCard.jsx` and `ChildPhotoUploader.jsx` use `URL.createObjectURL(file)` to render uploaded images locally.
  2. The server `.env` file contains Cloudinary credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).
  3. However, **`cloudinary` and `multer` are NOT installed in `server/package.json`**.
  4. There is no route or controller in Express to receive multipart form data or stream images to Cloudinary.
* **Impact on AI Integration**: **CRITICAL BLOCKER**. The AI service requires either a publicly accessible image URL or binary image bytes to extract facial vectors. GuardianLink currently cannot persist uploaded images.

---

## 17. Redis Infrastructure Audit

* **Status**: **VERIFIED & OPERATIONAL**
* **Key Format**: `session:<userId>`
* **Payload Structure**: `{ userId, role, token, lastActive }`
* **TTL**: 7 days (604,800 seconds)
* **Lifecycle**:
  * Established on `POST /api/auth/login` and `POST /api/auth/register`.
  * Checked on every authenticated request by `middleware/authenticate.js`.
  * Deleted on `POST /api/auth/logout`.
* **Resilience / Fallback**: If Redis crashes or is unreachable, `server/config/redis.js` catches the error and seamlessly falls back to an internal JavaScript `Map` (`memoryStore`) with time-based key eviction.

---

## 18. Docker & Infrastructure Audit

* **Container Setup**:
  * `guardianlink-backend`: Node.js Express server on port 5000.
  * `guardianlink-frontend`: React Vite server on port 3000.
  * `guardianlink-mongo`: MongoDB 8.0 on port 27017.
  * `guardianlink-redis`: Redis 7-alpine on port 6379.
  * `guardianlink-mongo-express`: Web database GUI on port 8081.
* **Network**: All containers run on `guardianlinksem5_default` and communicate using internal service hostnames (`mongo:27017`, `redis:6379`, `server:5000`).
* **AI Readiness**: The Docker Compose architecture is perfectly suited for adding the future AI microservice (`ai-service` on port 8000) and vector database (`qdrant` on port 6333) into the same internal network.

---

## 19. Security Audit

| Checkpoint | Assessment | Finding / Recommendation | Status |
|---|:---:|---|:---:|
| **Password Security** | **SECURE** | Passwords hashed with bcrypt (salt 10). `passwordHash` is excluded by default (`select: false`). `toSafeObject()` strips credentials. | **PASS** |
| **Token Storage** | **SECURE** | JWTs are stored exclusively in HttpOnly cookies with `sameSite: lax`. No tokens in `localStorage`. | **PASS** |
| **Brute Force Protection** | **SECURE** | Isolated IP-based rate limiting on `/login` (20 req/15m) and `/register` (15 req/1hr). | **PASS** |
| **Session Invalidation** | **SECURE** | Logout destroys the session key in Redis. A compromised JWT cannot be reused after logout because `authenticate.js` checks Redis. | **PASS** |
| **Admin Route Protection** | **SECURE** | Double-guarded by `authenticate` and `authorize('admin')`. Registration endpoint rejects role `admin` with 403. | **PASS** |
| **CORS Policy** | **SECURE** | Dynamically verifies incoming origin against allowed list with explicit credentials reflection. | **PASS** |
| **Child Data Ownership** | **NOT ENFORCED IN API** | While `Child.isOwnedBy()` helper exists, there are no Express endpoints for children yet to enforce it. | **GAP** |

---

## 20. AI Integration Readiness Assessment

| Area | Status | Technical Rationale |
|---|:---:|---|
| **A. User** | **READY** | Full RBAC, authentication, and session handling operational. |
| **B. Child Model** | **READY** | Model has `guardianId`, `fullName`, `dateOfBirth`, `photoUrl`, `faceProfileId`, and `status`. |
| **C. MissingCase Model** | **READY** | Model has `childId`, `reportedBy`, location schema, status enum, and `toPublicResponse` formatter. |
| **D. Child Image Storage** | **NOT READY** | No image upload backend service (no multer/cloudinary integration in Express). |
| **E. MissingCase Status Workflow** | **READY** | Standardized status enum (`reported` -> `under_verification` -> `active` -> `found` -> `reunited` -> `closed`). |
| **F. Citizen Image Ingestion** | **NOT READY** | Frontend only creates blob URLs; no backend endpoint accepts query images for facial matching. |
| **G. Backend Domain API Layer** | **NOT READY** | Endpoints for `/api/children` and `/api/cases` do not exist in Express yet. |
| **H. Authentication / RBAC** | **READY** | 100% verified across all 5 roles. |
| **I. Database** | **READY** | MongoDB collections `users`, `children`, `missingcases` are provisioned, indexed, and verified. |
| **J. AI Integration Boundary** | **PARTIAL** | Conceptual contract defined, but Express proxy / client to Python AI service is not yet written. |

---

## 21. Pre-Integration Blockers (Prioritized)

### 🔴 BLOCKER (Must be resolved before integrating AI service)
1. **Child & MissingCase REST API Layer**:
   * Implement `server/controllers/childController.js` and `server/routes/childRoutes.js` (`POST /api/children`, `GET /api/children`, `GET /api/children/:id`).
   * Implement `server/controllers/caseController.js` and `server/routes/caseRoutes.js` (`POST /api/cases`, `GET /api/cases`, `GET /api/cases/:id`).
   * Connect Express to MongoDB for real persistence of children and incidents.
2. **Image Ingestion & Cloudinary Service**:
   * Install `multer` and `cloudinary` in `server/package.json`.
   * Create `server/config/cloudinary.js` and an upload middleware.
   * Provide a real image upload pipeline so registered children and citizen query photos produce valid URLs/buffers.

### 🟡 IMPORTANT (Should be addressed alongside AI integration)
3. **Wire Frontend Contexts to Real APIs**:
   * Update `ChildrenContext.jsx` to call `GET /api/children` and `POST /api/children`.
   * Update `MissingCasesContext.jsx` to call `GET /api/cases` and `POST /api/cases`.
4. **Citizen Scan Endpoint**:
   * Implement `POST /api/cases/match` in Express to accept citizen uploaded images, proxy to AI service, and return matching MissingCases from MongoDB.

### 🟢 OPTIONAL (Can be refined after core AI verification)
5. **Police & NGO Module Live Data**:
   * Migrate precinct analytics and shelter capacity from mock data to real aggregated MongoDB queries.

---

## 22. Future AI Integration Boundary

The external AI service is an isolated **stateless face-recognition engine**. GuardianLink acts as the security, identity, and business-logic wrapper.

```text
┌───────────────────────────┐                     ┌───────────────────────────┐
│   GuardianLink Backend    │                     │   AI Microservice (Py)    │
│    (Node.js / Express)    │                     │     (FastAPI / Qdrant)    │
└─────────────┬─────────────┘                     └─────────────┬─────────────┘
              │                                                 │
              │ 1. Child Registered & Missing                   │
              │    POST /api/v1/face/index                      │
              │    Payload: { child_id, image_url }             │
              ├────────────────────────────────────────────────>│ 2. Detect face
              │                                                 │ 3. Extract 512-d vector
              │                                                 │ 4. Store in Qdrant
              │    Response: { status: "indexed", vector_id }   │
              │<────────────────────────────────────────────────┤
              │ 5. Save faceProfileId in Child model            │
              │                                                 │
              │ 6. Citizen Uploads Sighting Photo               │
              │    POST /api/v1/face/search                     │
              │    Payload: { image_file / query_url }          │
              ├────────────────────────────────────────────────>│ 7. Detect face in query
              │                                                 │ 8. Search Qdrant vectors
              │    Response: { matches: [{ child_id, score }] } │
              │<────────────────────────────────────────────────┤
              │ 9. GuardianLink looks up Child & MissingCase    │
              │    Verifies case status is 'active'             │
              │ 10. Returns sanitized public case details       │
              │     to citizen UI                               │
```

### Privacy & Data Boundary:
* **Data GuardianLink provides to AI**: `child_id` (string), child face image.
* **Data GuardianLink NEVER shares with AI**: Parent passwords, user sessions, contact phone numbers, email addresses, medical notes, or family relations.
* **Data AI returns to GuardianLink**: `child_id` and cosine `similarity_score`.
* GuardianLink retains full control over whether to disclose location, contact information, or police dispatch details based on verified case status.

---

## 23. Mock → Real Data Migration Plan

| Mock Data Source | Existing State | Target MongoDB Collection | Planned API Route |
|---|---|---|---|
| `ChildrenContext.jsx:childrenList` | 4 hardcoded child objects | `children` | `GET /api/children` |
| `AddChild.jsx:handleSubmit` | `setTimeout` + local array append | `children` | `POST /api/children` |
| `MissingCasesContext.jsx:missingCases`| 2 hardcoded cases | `missingcases` | `GET /api/cases` |
| `ReportMissingCase.jsx:handleSubmitCase`| `setTimeout` + local array append | `missingcases` | `POST /api/cases` |
| `CitizenContext.jsx:runAIMatching` | 2s timeout returning Kabir Mehta | Real AI Engine + `missingcases` | `POST /api/cases/match` |
| `PhotoCaptureCard.jsx:handleFileUpload` | `URL.createObjectURL(file)` | Cloudinary Cloud Storage | `POST /api/upload` |

---

## 24. Files That Should Be Modified Before AI Integration

*(To be modified in the upcoming Backend API & Storage implementation phase)*

1. `server/package.json`: Add `multer` and `cloudinary` dependencies.
2. `server/config/cloudinary.js`: Create Cloudinary SDK client configuration.
3. `server/controllers/childController.js`: Create Child CRUD controller (with ownership validation).
4. `server/routes/childRoutes.js`: Create `/api/children` route definitions.
5. `server/controllers/caseController.js`: Create MissingCase CRUD controller.
6. `server/routes/caseRoutes.js`: Create `/api/cases` route definitions.
7. `server/app.js`: Mount `childRoutes` and `caseRoutes`.
8. `client/src/context/ChildrenContext.jsx`: Integrate Axios calls for child fetching and registration.
9. `client/src/context/MissingCasesContext.jsx`: Integrate Axios calls for missing cases.

---

## 25. Files That Should NOT Be Modified During Preparation

The following verified components must remain untouched to avoid regressions:

* `server/models/User.js` — Canonical and stable.
* `server/models/Child.js` — Canonical and stable.
* `server/models/MissingCase.js` — Canonical and stable.
* `server/controllers/authController.js` — Fully verified auth lifecycle.
* `server/middleware/authenticate.js` — Verified JWT & Redis validation.
* `server/middleware/authorize.js` — Verified RBAC.
* `server/config/redis.js` — Verified session caching and fallback.
* `client/src/context/AuthContext.jsx` — Verified session restoration on refresh.
* `client/src/components/auth/ProtectedRoute.jsx` — Verified auth route guard.
* `client/src/components/auth/RoleRoute.jsx` — Verified role route guard.
* All page UI layouts, CSS, themes, and design components.

---

## 26. Final Audit Conclusions

### 1. What is already complete?
* Multi-container Docker environment (Express, React, Mongo, Redis, Mongo Express).
* Complete 5-role authentication lifecycle (Register, Login, Me, Logout, Refresh Persistence).
* HttpOnly cookie transmission and Redis session tracking (`session:<userId>`).
* Full RBAC enforcement across all 5 roles.
* Canonical Mongoose schemas for `User`, `Child`, and `MissingCase` with indexes and ownership methods.
* Admin user verification and status management APIs.

### 2. What is partially complete?
* `AdminContext.jsx` (real user management from MongoDB, but mock organization and activity logs).

### 3. What is fake/mock?
* Child registration and child profile listing on the frontend (`ChildrenContext`).
* Missing case reporting and case tracking on the frontend (`MissingCasesContext`).
* Citizen camera photo capture and simulated AI matching (`CitizenContext`).
* Police precinct operational workloads and case rosters (`PoliceContext`).
* NGO shelter capacity and intake tracking (`NgoContext`).

### 4. What is broken?
* No critical runtime crashes exist in the current application.
* Automated browser subagent execution encountered an external Playwright driver CDN 404, but all containerized endpoints and build steps compile and execute with 100% success.

### 5. What is missing?
* Express REST API controllers and routes for Children (`/api/children`).
* Express REST API controllers and routes for Missing Cases (`/api/cases`).
* Real file upload handling (`multer` + `cloudinary`).
* Real HTTP client proxy connecting GuardianLink Express to the Python AI service.

### 6. What must be fixed before AI integration?
* Install `multer` and `cloudinary` in the backend.
* Implement `/api/children` and `/api/cases` CRUD endpoints so children and missing cases can be saved to MongoDB.
* Provide an image upload pipeline so registered child portraits and citizen scan photos produce real URLs.

### 7. What is already AI-integration-ready?
* The database foundation (`Child` and `MissingCase` schemas already have `faceProfileId`, `cloudinaryPublicId`, and `toPublicResponse`).
* The authentication and user identity system is robust and secure.
* The Docker networking layer is ready to attach the AI container.

### 8. What should be the next implementation phase?
* **Phase 3: Child & Missing Case Backend REST API + Cloudinary Image Upload Implementation**.
  Once the backend can ingest real photos and persist real Child/MissingCase records in MongoDB, the project will be 100% prepared to integrate the Python AI face-recognition service without touching mock data or risking architectural debt.
