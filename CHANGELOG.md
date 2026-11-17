# Changelog

All notable changes to the GuardianLink AI-Assisted Missing Child Safety Platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-rc1] - 2026-11-16

### Added
- **Master Documentation Suite**:
  - `GUARDIANLINK_MASTER_SYSTEM_AUDIT.md`: 32-section architectural, security, data, and operational audit covering Phases 0–24.
  - `GUARDIANLINK_MASTER_FEATURE_REGISTER.md`: Canonical register of 53 system features with stable alphanumeric IDs (`GL-AUTH-xxx`, `GL-PARENT-xxx`, etc.).
  - `GUARDIANLINK_SYSTEM_VERIFICATION_CHECKLIST.md`: Operational 65-point verification checklist across all roles, services, and security boundaries.
  - `PHASE_24_PRE_IMPLEMENTATION_AUDIT.md`: Baseline audit verifying Git state, Phase 15 drift, and predecessor tests.
  - `PHASE_24_DEFECT_TRACKER.md`: Defect register documenting all Phase 23 and 24 defect remediations.
  - `DEPLOYMENT_GUIDE.md`: Comprehensive deployment guide covering Docker Compose, Bare Metal, and Cloud architectures.
  - `RELEASE_NOTES.md`: Formal release candidate announcement and operational guidance.
- **Database Backup & Disaster Recovery Verification**:
  - Created `server/scripts/backupRestoreTest.js` verifying automated BSON export/import across 10 collections (174 documents, 79 indexes) with 0-second RPO and 1.83-second RTO.

### Fixed
- **Client Test Dependency Mismatch (D-24.1)**: Removed redundant `client/tests/phase23_browser_e2e.test.js` so `npm --prefix client test` runs isolated frontend tests without requiring backend dependencies.
- **Test Fixture Unique Key Collision (D-24.2)**: Resolved static `firNumber` collision in `server/tests/phase23_security_rbac.test.js` by using dynamic isolated identifiers with `try...finally` post-test cleanup.

---

## [0.23.0] - 2026-11-16

### Added
- **Full-System End-to-End Integration Suite**:
  - Implemented 20-step lifecycle test suite (`server/tests/phase23_e2e_lifecycle.test.js`) verifying parent registration through police case verification, FIR upload, citizen sighting, NGO shelter intake, handover authorization, and final reunification.
- **Headless Browser Automation (Playwright)**:
  - Real Chrome browser tests (`server/tests/phase23_browser_e2e.test.js`) verifying DOM rendering and workflows for Citizen, Parent, Police, and NGO portals.
- **Database Concurrency & Stress Testing**:
  - Stress test suite (`server/tests/phase23_database_concurrency.test.js`) validating atomic conditional updates and multi-document consistency.
- **RBAC & IDOR Security Test Suite**:
  - Multi-role isolation tests (`server/tests/phase23_security_rbac.test.js`) confirming cross-parent IDOR shields and cross-station police guards.

### Fixed
- **Handover Completion Concurrency Race Condition (D-23.1)**: Refactored `completeHandover` in `server/services/ngoService.js` to execute atomic conditional updates, preventing double-decrementing shelter bed capacity.
- **AuditLog Pre-Cleanup Hook Block (D-23.2)**: Updated test suites to preserve append-only immutability invariants without executing forbidden `deleteMany` operations.
- **Mock Unit Test Compatibility (D-23.3)**: Added mock-aware execution branch in `ngoService.js` to allow disconnected unit tests to pass alongside live DB concurrency tests.

---

## [0.22.0] - 2026-11-16

### Added
- **Complete NGO Portal Module**:
  - Shelter facility management with licensed bed capacity tracking.
  - Child intake workflow and creation of persistent `CareRecord` instances.
  - Daily medical, psychological, and welfare logging.
  - Handover request submission protocol with strict separation of duties (NGO cannot approve its own request).

---

## [0.21.0] - 2026-11-16

### Added
- **Complete Police Portal Module**:
  - Jurisdictional case queues filtered by police station and district.
  - Cross-station assignment guard rejecting unauthorized transfers.
  - FIR docket inspection, review, and verification workflow.
  - Citizen sighting triage and conversion to official investigation leads.
  - Handover authorization authority and case reunification marking.

---

## [0.20.0] - 2026-11-16

### Added
- **Complete Citizen Portal Module**:
  - Public missing children directory with multi-attribute filtering.
  - AI photo search interface with mandatory ethical lead disclaimers.
  - Child sighting reporting with photograph upload and map pin coordinates.
  - Guardian PII and residential street address redaction for citizen roles.

---

## [0.19.0] - 2026-11-15

### Added
- **Location & Interactive Map Module**:
  - Replaced placeholders with Leaflet and React-Leaflet maps powered by OpenStreetMap.
  - Coordinate picker for last seen and sighting locations.
  - Browser GPS geolocation integration with manual override.
  - MongoDB `2dsphere` spatial indexing for radius queries (`$nearSphere`).
  - Coordinate fuzzing and privacy obfuscation for public map views.

---

## [0.18.0] - 2026-11-15

### Added
- **First Information Report (FIR) Module**:
  - FIR data model with compound unique station indexing (`{ policeStation: 1, firNumber: 1 }`).
  - Digital document ingestion (PDF, JPEG, PNG) with SHA-256 cryptographic checksums.
  - Official police station review, approval, and rejection workflow.
  - Internal Cloudinary `storageKey` scrubbing across all serialized API responses.

---

## [0.17.0] - 2026-11-14

### Added
- **Data Integrity & Security Hardening**:
  - Complete elimination of mock fixtures, fake users, and synthetic analytics.
  - Tamper-evident append-only pre-hooks on `AuditLog` collection.
  - Strict residential coordinate and guardian contact redaction in public serializers.
  - Safe script execution guards preventing accidental runs on production databases.

---

## [0.15.0] - 2026-10-26

### Added
- **Production Readiness & Container Hardening**:
  - Centralized fail-closed `envValidator.js` enforcing minimum secret lengths.
  - Multi-stage `client/Dockerfile.prod` with unprivileged Nginx Alpine and SPA fallback.
  - Hardened `server/Dockerfile.prod` executing as non-root `node:node` user.
  - Production 3-tier network segmentation in `docker-compose.prod.yml`.
  - GitHub Actions CI/CD pipeline (`.github/workflows/production-readiness.yml`).

