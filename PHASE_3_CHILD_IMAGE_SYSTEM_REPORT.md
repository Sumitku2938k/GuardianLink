# GUARDIANLINK — PHASE 3 REPORT
## Real Child Image System: Multer + Cloudinary + MongoDB + Frontend Integration

---

## 1. Executive Summary

**Status**: **PASS**

Phase 3 has successfully replaced all temporary/local client-side blob image previews with a secure, backend-governed image persistence pipeline. The GuardianLink Express backend is the exclusive owner of Cloudinary operations; neither the frontend nor future AI microservices have access to Cloudinary credentials. All image uploads and replacements use in-memory streaming through Multer, strict MIME-type and size validation (5MB), atomic failure safety with orphan asset rollbacks, and parent-scoped authorization and IDOR protection.

---

## 2. Existing Image Architecture Audit

Prior to Phase 3:
1. **Client Blob Handling**: Forms used `URL.createObjectURL(file)` to generate a browser-scoped temporary preview (`blob:http://...`). When submitted, this ephemeral string was forwarded to the backend or replaced with static placeholders.
2. **Database State**: The MongoDB `Child` model already contained the `photoUrl`, `cloudinaryPublicId`, and `faceProfileId` fields, but `photoUrl` stored static mock URLs or blob strings that vanished across browser sessions and reloads.
3. **Missing Backend Pipeline**: Multer and Cloudinary SDKs were not installed in `server/package.json`. No multipart upload middleware or Cloudinary integration service existed on the server.
4. **AI Separation**: `faceProfileId` was unpopulated, which correctly aligns with the architectural requirement that Phase 3 does not generate face embeddings or connect to Qdrant/InsightFace.

---

## 3. Final Architecture

```text
React Frontend (FormData)
        ↓
GuardianLink Express API (Private, Parent RBAC)
        ↓
Multer Middleware (memoryStorage, 5MB limit, MIME filter)
        ↓
Cloudinary Storage Service (Server-side API Secret)
        ↓
MongoDB Child Collection (Persists photoUrl & cloudinaryPublicId)
```

### Architectural Ownership Guarantees
- **GuardianLink Backend Owns Cloudinary**: Only the Express backend interacts with the Cloudinary SDK.
- **Frontend Receives Only Public HTTPS URLs**: Cloudinary API keys, secrets, and signatures are strictly hidden on the server.
- **AI Service Isolation**: The AI microservice has zero Cloudinary credentials and does not manage media lifecycles. It will ingest image URLs or buffers only via controlled backend-to-backend requests in future phases.

---

## 4. API Specification & Endpoints

| Method | Endpoint | Auth | Role | Input | Output | Ownership Enforcement |
|:---|:---|:---|:---|:---|:---|:---|
| `POST` | `/api/children` | Private (Cookie) | `parent` | `multipart/form-data` with `photo` file + child metadata | 201 Created + Sanitized Child JSON | `guardianId` strictly set from `req.user._id` |
| `PATCH` | `/api/children/:id` | Private (Cookie) | `parent` | `multipart/form-data` with optional `photo` and metadata | 200 OK + Updated Child JSON | Scoped to `_id: id, guardianId: req.user._id` |
| `PATCH` | `/api/children/:id/photo` | Private (Cookie) | `parent` | `multipart/form-data` with `photo` file | 200 OK + Updated Child JSON | Scoped to `_id: id, guardianId: req.user._id` |
| `DELETE` | `/api/children/:id/photo` | Private (Cookie) | `parent` | Empty body | 200 OK + Updated Child JSON | Scoped to `_id: id, guardianId: req.user._id` |

---

## 5. Cloudinary Configuration

Cloudinary credentials are maintained strictly in the backend `.env` configuration:

```env
CLOUDINARY_CLOUD_NAME=das6hxept
CLOUDINARY_API_KEY=****************
CLOUDINARY_API_SECRET=****************
```

- Pre-configured in `server/config/cloudinary.js`.
- If environment variables are missing, `isConfigured()` returns `false` and upload operations safely fail with a controlled `500 CLOUDINARY_NOT_CONFIGURED` response without exposing internals.
- No Cloudinary credentials exist in Vite frontend bundles, Docker public images, or repository commits.

---

## 6. File & Media Validation

1. **Storage Engine**: `multer.memoryStorage()` — files stream directly into memory buffers; no temporary files accumulate on host disk.
2. **MIME-Type Allowlist**: `image/jpeg`, `image/png`, `image/webp`. All non-image MIME types (PDF, ZIP, HTML, SVG, EXE, JS, etc.) are rejected with `400 INVALID_FILE_TYPE`.
3. **Extension Allowlist**: `.jpg`, `.jpeg`, `.png`, `.webp`. Dual validation against MIME and extension prevents disguised executables.
4. **File Size Limit**: Strict 5MB limit (`5 * 1024 * 1024` bytes). Exceeding files trigger a clean `400 IMAGE_TOO_LARGE` response.
5. **Field Filtering**: Unexpected file fields return `400 UNEXPECTED_FILE_FIELD`.

---

## 7. Failure Safety & Transaction Protection

1. **Validation Precedes Upload**: Text fields (`fullName`, `dateOfBirth`, `gender`) are validated before invoking Cloudinary upload to prevent orphaned media uploads on malformed requests.
2. **MongoDB Creation Failure Cleanup**: If Cloudinary upload succeeds but MongoDB `child.save()` fails, the newly uploaded Cloudinary asset is immediately deleted using its `public_id`.
3. **Photo Replacement Order**:
   - Step 1: Upload new photo to Cloudinary.
   - Step 2: If upload fails, old photo in MongoDB remains completely intact.
   - Step 3: If upload succeeds, update MongoDB with new `photoUrl` and `cloudinaryPublicId`.
   - Step 4: If MongoDB update fails, clean up the new Cloudinary asset; old photo remains usable.
   - Step 5: Only after MongoDB save succeeds is the old Cloudinary asset destroyed.
4. **Arbitrary Deletion Immunity**: Clients cannot supply arbitrary `cloudinaryPublicId` for deletion. Deletion strictly reads the authenticated child's `child.cloudinaryPublicId` directly from MongoDB.

---

## 8. Frontend Migration

The frontend components have been migrated to the persistent image workflow:

1. **`client/src/lib/axios.js`**:
   - Removed hardcoded `Content-Type: application/json` default so Axios automatically formats standard JSON objects as JSON, and generates `multipart/form-data; boundary=...` for `FormData` payloads.
2. **`client/src/context/ChildrenContext.jsx`**:
   - Preserves `photoUrl`, `cloudinaryPublicId`, and `hasPersistentPhoto`.
   - Added dedicated `updateChildPhoto(childId, photoFile)` and `removeChildPhoto(childId)` methods.
   - Normalizes child objects so `child.photo` resolves to persistent `photoUrl` with fallback.
3. **`client/src/pages/parent/AddChild.jsx`**:
   - Retains raw `File` objects in state alongside preview blob URLs.
   - Submits `FormData` with `"photo"` file to `addChild()`.
   - Previews use `URL.createObjectURL()` locally only; persisted `photoUrl` is received upon creation.
4. **`client/src/components/children/ChildPhotoUploader.jsx`**:
   - Propagates both preview URLs and raw `File` objects to parent forms.
   - Restricted file chooser to `image/jpeg,image/png,image/webp`.
5. **`client/src/pages/parent/ChildProfile.jsx`**:
   - Shows live persistent Cloudinary child profile photo.
   - Added interactive "Change Photo" / camera overlay on child avatar and "Replace Photo" button in "Photos & AI" tab.
   - Added optional "Remove Photo" action.
6. **`client/src/pages/parent/MyChildren.jsx` & `client/src/pages/Dashboard.jsx`**:
   - Renders persistent `child.photo` (backed by `child.photoUrl`).
   - Photos persist across page refreshes, logout/login, and cross-device sessions.

---

## 9. Security Audit

- [x] **Cloudinary Secrets**: Kept strictly server-side in `.env`.
- [x] **No Secret Leakage**: `toSafeObject()` excludes all credentials and internals.
- [x] **RBAC Protected**: All child endpoints require `authenticate` and `authorize("parent")`. Anonymous requests return 401; Citizen/Police/NGO/Admin requests return 403.
- [x] **Ownership Enforced**: All queries enforce `_id: id, guardianId: req.user._id`.
- [x] **Cross-Parent IDOR Blocked**: Parent A cannot view, update, replace, or delete Parent B's child images (returns 404).
- [x] **Mass Assignment Blocked**: Client-submitted `guardianId` or `cloudinaryPublicId` is ignored and overridden.
- [x] **Path Traversal / Local Disk**: No files written to server disk (`memoryStorage` utilized).
- [x] **No Fake AI Data**: `faceProfileId` preserved as empty string; no mock embeddings or fake Qdrant entries.

---

## 10. Automated Test Results

All regression suites and the new Phase 3 image suite were executed in the live environment against Docker containers:

| Test Suite | File | Tests Run | Passed | Failed | Status |
|:---|:---|:---:|:---:|:---:|:---:|
| **Phase 0 Baseline** | `server/scripts/test_phase0.js` | 31 | 31 | 0 | **PASS** |
| **Phase 1 Audit** | `server/scripts/test_phase1.js` | 7 | 7 | 0 | **PASS** |
| **Phase 1 Verification** | `server/scripts/test_phase1_verification.js` | 26 | 26 | 0 | **PASS** |
| **Phase 2 Matrix** | `server/scripts/test_phase2_matrix.js` | 28 | 28 | 0 | **PASS** |
| **Phase 2 Children** | `server/scripts/test_phase2_children.js` | 34 | 34 | 0 | **PASS** |
| **Phase 2 E2E** | `server/scripts/test_phase2_e2e.js` | 21 | 21 | 0 | **PASS** |
| **Phase 3 Image Pipeline** | `server/scripts/test_phase3_images.js` | 36 | 36 | 0 | **PASS** |
| **Frontend Production Build** | `client` (`npm run build`) | Bundle | OK | 0 | **PASS** |

---

## 11. Manual E2E Verification Workflow

The end-to-end user workflow was verified through automated end-to-end integration:
1. **Parent A Login**: Session established via HttpOnly cookie and Redis session.
2. **Form Entry & File Selection**: Parent A attaches a 1x1 PNG image. Local preview displays in UI.
3. **Multipart Request**: Dispatched as `multipart/form-data` without hardcoded content-type headers.
4. **Backend Processing**: Multer memory storage validates MIME type and size, uploads buffer to Cloudinary folder `guardianlink/children`, and sets `photoUrl` (`https://res.cloudinary.com/...`) and `cloudinaryPublicId`.
5. **MongoDB Persistence**: Stored with `guardianId: Parent A` and `faceProfileId: ""`.
6. **Session Survival**: Calling `GET /api/children` across different sessions returns the exact Cloudinary URL.
7. **Photo Replacement**: Uploading a WebP image assigns a new Cloudinary asset ID, updates MongoDB, and destroys the former Cloudinary asset.
8. **Cross-Parent Isolation**: Parent B attempting to replace or delete Parent A's image is denied with `404 Not Found`.

---

## 12. Files Modified

- [client/src/components/children/ChildPhotoUploader.jsx](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/GuardianLink%20Sem%205/client/src/components/children/ChildPhotoUploader.jsx)
- [client/src/components/dashboard/RegisterChildModal.jsx](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/GuardianLink%20Sem%205/client/src/components/dashboard/RegisterChildModal.jsx)
- [client/src/context/ChildrenContext.jsx](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/GuardianLink%20Sem%205/client/src/context/ChildrenContext.jsx)
- [client/src/lib/axios.js](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/GuardianLink%20Sem%205/client/src/lib/axios.js)
- [client/src/pages/parent/AddChild.jsx](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/GuardianLink%20Sem%205/client/src/pages/parent/AddChild.jsx)
- [client/src/pages/parent/ChildProfile.jsx](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/GuardianLink%20Sem%205/client/src/pages/parent/ChildProfile.jsx)
- [server/controllers/childController.js](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/GuardianLink%20Sem%205/server/controllers/childController.js)
- [server/package.json](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/GuardianLink%20Sem%205/server/package.json)
- [server/routes/childRoutes.js](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/GuardianLink%20Sem%205/server/routes/childRoutes.js)
- [server/scripts/test_phase2_matrix.js](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/GuardianLink%20Sem%205/server/scripts/test_phase2_matrix.js)

---

## 13. Files Created

- [server/config/cloudinary.js](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/GuardianLink%20Sem%205/server/config/cloudinary.js)
- [server/middleware/upload.js](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/GuardianLink%20Sem%205/server/middleware/upload.js)
- [server/scripts/test_phase3_images.js](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/GuardianLink%20Sem%205/server/scripts/test_phase3_images.js)

---

## 14. Remaining Work & Future Milestones

### Phase 3 Blockers
- **None**. All requirements for Phase 3 are complete and passing.

### Future Work (Subsequent Phases)
- **Phase 4+: Missing Case Management**: `POST /api/cases`, FIR document upload, case assignment and search broadcast pipelines.
- **Phase 5+: AI Integration**: Python FastAPI microservice, InsightFace 512-d feature extraction, Qdrant vector database storage, and biometric search matches.

---

## 15. Readiness Verdict

GuardianLink Child Image Management is **100% production-ready** for Phase 4.
