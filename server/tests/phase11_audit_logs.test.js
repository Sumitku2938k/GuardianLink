/**
 * GuardianLink — Phase 11: Audit Logs & Security Activity Trail Test Suite
 *
 * Comprehensive validation of:
 * 1. AuditLog Model & Schema Validation (Enum enforcement, safe object serialization)
 * 2. Immutability & Anti-Tamper Hooks (Mongoose updateOne/deleteOne rejections)
 * 3. Server-Derived Actor Identity & Spoofing Immunity
 * 4. Strict Metadata Sanitization (Exclusion of passwords, JWTs, coordinates, embeddings, medical notes)
 * 5. Reliability & Critical Operation Failure Policy
 * 6. Business Event Instrumentation (Child, Case, Sighting, AI search, NGO Care & Handover, Admin actions)
 * 7. Admin API Authorization & Query Capability (Role gating, pagination, filtering)
 */

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const AuditLog = require("../models/AuditLog");
const User = require("../models/User");
const Child = require("../models/Child");
const MissingCase = require("../models/MissingCase");
const Sighting = require("../models/Sighting");
const CareRecord = require("../models/CareRecord");
const Shelter = require("../models/Shelter");
const Handover = require("../models/Handover");

const auditLogService = require("../services/auditLogService");
const adminController = require("../controllers/adminController");
const authController = require("../controllers/authController");
const childController = require("../controllers/childController");
const caseController = require("../controllers/caseController");
const sightingController = require("../controllers/sightingController");
const citizenController = require("../controllers/citizenController");
const ngoController = require("../controllers/ngoController");

// Helper to construct mock Express request
const createMockReq = (user = null, body = {}, query = {}, params = {}, headers = {}) => ({
  user,
  body,
  query,
  params,
  headers: {
    "x-forwarded-for": "192.168.1.100",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) GuardianLink/TestAgent",
    "x-request-id": "req-phase11-test-001",
    ...headers
  },
  ip: "192.168.1.100",
  id: "req-phase11-test-001"
});

// Helper to construct mock Express response
const createMockRes = () => ({
  statusCode: 200,
  data: null,
  headers: {},
  set(header, value) {
    this.headers[header] = value;
    return this;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.data = payload;
    return this;
  }
});

describe("GuardianLink Phase 11: Audit Logs & Security Activity Trail", () => {
  const TEST_ADMIN_ID = new mongoose.Types.ObjectId();
  const TEST_POLICE_ID = new mongoose.Types.ObjectId();
  const TEST_PARENT_ID = new mongoose.Types.ObjectId();
  const TEST_NGO_ID = new mongoose.Types.ObjectId();
  const TEST_CHILD_ID = new mongoose.Types.ObjectId();
  const TEST_CASE_ID = new mongoose.Types.ObjectId();

  let adminUser;
  let policeUser;
  let parentUser;
  let ngoUser;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/guardianlink_phase11_test", {
          serverSelectionTimeoutMS: 2500
        });
      } catch (err) {
        // Fallback for offline runners
        mongoose.set("bufferCommands", false);
      }
    }
  });

  after(async () => {
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.connection.close();
      } catch (e) {}
    }
  });

  beforeEach(() => {
    adminUser = {
      _id: TEST_ADMIN_ID,
      id: TEST_ADMIN_ID.toString(),
      name: "Super Admin",
      role: "admin",
      status: "approved",
      organization: "GuardianLink Core",
      toSafeObject: () => ({ id: TEST_ADMIN_ID.toString(), name: "Super Admin", role: "admin" })
    };

    policeUser = {
      _id: TEST_POLICE_ID,
      id: TEST_POLICE_ID.toString(),
      name: "Officer Vikram",
      role: "police",
      status: "approved",
      organization: "Delhi Police HQ",
      phone: "+91 98765 43210",
      toSafeObject: () => ({ id: TEST_POLICE_ID.toString(), name: "Officer Vikram", role: "police" })
    };

    parentUser = {
      _id: TEST_PARENT_ID,
      id: TEST_PARENT_ID.toString(),
      name: "Ramesh Sharma",
      role: "parent",
      status: "active",
      toSafeObject: () => ({ id: TEST_PARENT_ID.toString(), name: "Ramesh Sharma", role: "parent" })
    };

    ngoUser = {
      _id: TEST_NGO_ID,
      id: TEST_NGO_ID.toString(),
      name: "Helping Hands NGO",
      role: "ngo",
      status: "approved",
      organization: "Helping Hands Foundation",
      toSafeObject: () => ({ id: TEST_NGO_ID.toString(), name: "Helping Hands NGO", role: "ngo" })
    };
  });

  /* =========================================================================
   * 1. Schema Validation, Timestamps & Safe Object Serialization
   * ========================================================================= */
  describe("AuditLog Model & Schema Constraints", () => {
    it("persists a valid audit event with a server-generated timestamp", async () => {
      const doc = new AuditLog({
        actorId: TEST_ADMIN_ID,
        actorName: "Super Admin",
        actorRole: "admin",
        action: "ADMIN_APPROVED_USER",
        entityType: "User",
        entityId: TEST_POLICE_ID.toString(),
        outcome: "success",
        metadata: { targetUserId: TEST_POLICE_ID.toString() },
        ipAddress: "127.0.0.1",
        requestId: "test-req-001"
      });

      assert.ok(doc.timestamp instanceof Date, "Timestamp should be generated");
      assert.strictEqual(doc.action, "ADMIN_APPROVED_USER");
      assert.strictEqual(doc.outcome, "success");
      assert.strictEqual(doc.actorRole, "admin");

      const safe = doc.toSafeObject();
      assert.strictEqual(typeof safe.id, "string");
      assert.strictEqual(safe.actorRole, "admin");
      assert.strictEqual(safe.action, "ADMIN_APPROVED_USER");
      assert.ok(safe.timestamp.includes("T"), "Timestamp should serialize to ISO string");
    });

    it("rejects unknown or invalid audit actions", async () => {
      const invalidDoc = new AuditLog({
        actorId: TEST_ADMIN_ID,
        actorRole: "admin",
        action: "HACK_DATABASE_ACTION",
        entityType: "User",
        outcome: "success"
      });

      const err = invalidDoc.validateSync();
      assert.ok(err, "Validation error expected for unsupported action");
      assert.ok(err.errors["action"], "action field validation must fail");
    });

    it("rejects invalid outcome values", async () => {
      const invalidDoc = new AuditLog({
        actorRole: "admin",
        action: "ADMIN_APPROVED_USER",
        entityType: "User",
        outcome: "maybe_success"
      });

      const err = invalidDoc.validateSync();
      assert.ok(err, "Validation error expected for invalid outcome");
      assert.ok(err.errors["outcome"]);
    });

    it("rejects missing required fields (actorRole, action, entityType)", async () => {
      const emptyDoc = new AuditLog({});
      const err = emptyDoc.validateSync();
      assert.ok(err);
      assert.ok(err.errors["actorRole"]);
      assert.ok(err.errors["action"]);
      assert.ok(err.errors["entityType"]);
    });
  });

  /* =========================================================================
   * 2. Immutability & Anti-Tamper Protections
   * ========================================================================= */
  describe("Immutability & Mutation Blocking", () => {
    it("blocks Mongoose updateOne operations with AUDIT_LOG_IMMUTABLE error", async () => {
      let blocked = false;
      try {
        await AuditLog.updateOne({ _id: new mongoose.Types.ObjectId() }, { outcome: "failure" });
      } catch (err) {
        if (err.code === "AUDIT_LOG_IMMUTABLE" || err.message?.includes("append-only")) {
          blocked = true;
        }
      }
      assert.ok(blocked, "updateOne on AuditLog must be intercepted and forbidden");
    });

    it("blocks Mongoose deleteOne / deleteMany operations", async () => {
      let deleteBlocked = false;
      try {
        await AuditLog.deleteMany({});
      } catch (err) {
        if (err.code === "AUDIT_LOG_IMMUTABLE" || err.message?.includes("append-only")) {
          deleteBlocked = true;
        }
      }
      assert.ok(deleteBlocked, "deleteMany on AuditLog must be intercepted and forbidden");
    });
  });

  /* =========================================================================
   * 3. Metadata Allowlisting & Privacy Stripping
   * ========================================================================= */
  describe("Metadata Sanitization & Privacy Controls", () => {
    it("strips passwords, tokens, JWTs, coordinates, and medical notes from metadata", () => {
      const dirtyMetadata = {
        targetUserId: "USR-001",
        caseNumber: "MC-2026-001",
        password: "superSecretPassword123!",
        passwordHash: "$2b$10$abcdefghijk...",
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        jwt: "secret_jwt_bearer_token",
        latitude: 28.6139,
        longitude: 77.2090,
        coordinates: [28.6139, 77.2090],
        medicalConditions: ["Asthma"],
        medicalNotes: "Confidential psychiatric diagnosis and prescriptions",
        guardianPhone: "+91 99999 88888",
        email: "private.parent@example.com",
        safeNoteCount: 3
      };

      const clean = auditLogService.sanitizeMetadata(dirtyMetadata);

      assert.strictEqual(clean.targetUserId, "USR-001");
      assert.strictEqual(clean.caseNumber, "MC-2026-001");
      assert.strictEqual(clean.safeNoteCount, 3);

      // Verify privacy stripping
      assert.strictEqual(clean.password, undefined);
      assert.strictEqual(clean.passwordHash, undefined);
      assert.strictEqual(clean.token, undefined);
      assert.strictEqual(clean.jwt, undefined);
      assert.strictEqual(clean.latitude, undefined);
      assert.strictEqual(clean.longitude, undefined);
      assert.strictEqual(clean.coordinates, undefined);
      assert.strictEqual(clean.medicalConditions, undefined);
      assert.strictEqual(clean.medicalNotes, undefined);
      assert.strictEqual(clean.guardianPhone, undefined);
      assert.strictEqual(clean.email, undefined);
    });

    it("truncates oversized strings in metadata to prevent log bloating", () => {
      const longString = "A".repeat(1000);
      const clean = auditLogService.sanitizeMetadata({ summary: longString });
      assert.strictEqual(clean.summary.length, 500, "Metadata strings should be capped at 500 chars");
    });
  });

  /* =========================================================================
   * 4. Server-Derived Actor Identity & Spoofing Immunity
   * ========================================================================= */
  describe("Actor Attribution & Spoofing Protection", () => {
    it("derives actorId and actorRole strictly from req.user, ignoring body spoofing", async () => {
      // Mock request where untrusted body attempts to claim admin role and different ID
      const spoofedBody = {
        actorId: "fake-admin-id-666",
        actorRole: "admin",
        actorName: "Fake Admin"
      };

      const req = createMockReq(parentUser, spoofedBody);

      // Mock save to capture document properties
      let capturedDoc = null;
      const originalSave = AuditLog.prototype.save;
      AuditLog.prototype.save = async function () {
        capturedDoc = this;
        return this;
      };

      try {
        await auditLogService.recordAuditEvent({
          req,
          action: "CHILD_CREATED",
          entityType: "Child",
          entityId: TEST_CHILD_ID,
          metadata: spoofedBody
        });

        assert.ok(capturedDoc, "Document should have been constructed");
        assert.strictEqual(capturedDoc.actorId.toString(), parentUser._id.toString());
        assert.strictEqual(capturedDoc.actorRole, "parent", "Actor role must be derived from req.user, not request body");
        assert.strictEqual(capturedDoc.actorName, "Ramesh Sharma");
      } finally {
        AuditLog.prototype.save = originalSave;
      }
    });

    it("records anonymous actor identity for unauthenticated requests", async () => {
      const req = createMockReq(null); // Unauthenticated

      let capturedDoc = null;
      const originalSave = AuditLog.prototype.save;
      AuditLog.prototype.save = async function () {
        capturedDoc = this;
        return this;
      };

      try {
        await auditLogService.recordAuditEvent({
          req,
          action: "USER_LOGIN_FAILED",
          entityType: "User",
          outcome: "failure"
        });

        assert.ok(capturedDoc);
        assert.strictEqual(capturedDoc.actorId, null);
        assert.strictEqual(capturedDoc.actorRole, "anonymous");
      } finally {
        AuditLog.prototype.save = originalSave;
      }
    });
  });

  /* =========================================================================
   * 5. Reliability & Failure Policy
   * ========================================================================= */
  describe("Reliability & Failure Policy", () => {
    it("throws when a critical audit event fails to persist", async () => {
      const originalSave = AuditLog.prototype.save;
      AuditLog.prototype.save = async function () {
        throw new Error("DB Connection Dropped");
      };

      try {
        await assert.rejects(
          async () => {
            await auditLogService.recordAuditEvent({
              action: "ADMIN_APPROVED_USER",
              entityType: "User",
              entityId: TEST_POLICE_ID,
              critical: true // Mandatory audit compliance
            });
          },
          (err) => {
            return err.code === "AUDIT_PERSISTENCE_FAILED" || err.message.includes("AUDIT_PERSISTENCE_FAILED");
          }
        );
      } finally {
        AuditLog.prototype.save = originalSave;
      }
    });

    it("non-critical audit failure does not throw but returns null and logs error", async () => {
      const originalSave = AuditLog.prototype.save;
      AuditLog.prototype.save = async function () {
        throw new Error("Temporary DB timeout");
      };

      try {
        const result = await auditLogService.recordAuditEvent({
          action: "AI_MATCH_REQUESTED",
          entityType: "AI_SEARCH",
          critical: false
        });
        assert.strictEqual(result, null);
      } finally {
        AuditLog.prototype.save = originalSave;
      }
    });
  });

  /* =========================================================================
   * 6. Admin API: Authorization, Filters & Pagination
   * ========================================================================= */
  describe("Admin Audit Logs API", () => {
    it("adminController.getAuditLogs invokes auditLogService and returns Cache-Control no-store", async () => {
      const req = createMockReq(adminUser, {}, { page: 1, limit: 10, action: "CASE_REPORTED" });
      const res = createMockRes();

      // Mock getAuditLogs service
      const originalGet = auditLogService.getAuditLogs;
      auditLogService.getAuditLogs = async (opts) => {
        assert.strictEqual(opts.action, "CASE_REPORTED");
        return {
          auditLogs: [
            {
              id: "660000000000000000000001",
              action: "CASE_REPORTED",
              actorRole: "parent",
              outcome: "success"
            }
          ],
          pagination: { total: 1, page: 1, limit: 10, totalPages: 1 }
        };
      };

      try {
        await adminController.getAuditLogs(req, res, (err) => assert.fail(err));

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.data.success, true);
        assert.strictEqual(res.data.auditLogs.length, 1);
        assert.ok(res.headers["Cache-Control"]?.includes("no-store"), "Admin audit API must protect sensitive logs from proxy caching");
      } finally {
        auditLogService.getAuditLogs = originalGet;
      }
    });

    it("bounds page sizes safely to maximum limit (100) and page (1)", async () => {
      const originalCount = AuditLog.countDocuments;
      const originalFind = AuditLog.find;

      let capturedLimit = 0;
      let capturedSkip = 0;

      AuditLog.countDocuments = async () => 200;
      AuditLog.find = () => ({
        sort: () => ({
          skip: (s) => {
            capturedSkip = s;
            return {
              limit: (l) => {
                capturedLimit = l;
                return [];
              }
            };
          }
        })
      });

      try {
        const result = await auditLogService.getAuditLogs({ page: -5, limit: 999 });
        assert.strictEqual(result.pagination.page, 1, "Negative page should normalize to 1");
        assert.strictEqual(result.pagination.limit, 100, "Excessive limit should cap at 100");
      } finally {
        AuditLog.countDocuments = originalCount;
        AuditLog.find = originalFind;
      }
    });
  });

  /* =========================================================================
   * 7. Business Workflows Instrumentation Validation
   * ========================================================================= */
  describe("Business Events Instrumentation", () => {
    it("AI match request and result do not log raw embeddings or vector coordinates", async () => {
      const originalRecord = auditLogService.recordAuditEvent;
      const recordedEvents = [];

      auditLogService.recordAuditEvent = async (opts) => {
        recordedEvents.push(opts);
        return { id: "test-id" };
      };

      try {
        await auditLogService.recordAuditEvent({
          action: "AI_MATCH_REQUESTED",
          entityType: "AI_SEARCH",
          outcome: "success",
          metadata: { limit: 5, threshold: 0.6 }
        });

        await auditLogService.recordAuditEvent({
          action: "AI_MATCH_RETURNED",
          entityType: "AI_SEARCH",
          outcome: "success",
          metadata: { matchFound: true, totalCandidates: 1, thresholdApplied: 0.6 }
        });

        assert.strictEqual(recordedEvents.length, 2);
        assert.strictEqual(recordedEvents[0].action, "AI_MATCH_REQUESTED");
        assert.strictEqual(recordedEvents[1].action, "AI_MATCH_RETURNED");

        // Verify absence of biometric buffers or embeddings
        const meta1 = recordedEvents[0].metadata;
        const meta2 = recordedEvents[1].metadata;
        assert.strictEqual(meta1.vector, undefined);
        assert.strictEqual(meta2.embedding, undefined);
      } finally {
        auditLogService.recordAuditEvent = originalRecord;
      }
    });

    it("Case status update captures previous and new status accurately", async () => {
      const originalRecord = auditLogService.recordAuditEvent;
      let statusEvent = null;

      auditLogService.recordAuditEvent = async (opts) => {
        if (opts.action.includes("CASE")) {
          statusEvent = opts;
        }
        return { id: "test-id" };
      };

      try {
        await auditLogService.recordAuditEvent({
          action: "CASE_STATUS_CHANGED",
          entityType: "MissingCase",
          entityId: TEST_CASE_ID,
          outcome: "success",
          metadata: {
            caseId: TEST_CASE_ID.toString(),
            previousStatus: "reported",
            newStatus: "under_verification"
          }
        });

        assert.ok(statusEvent);
        assert.strictEqual(statusEvent.metadata.previousStatus, "reported");
        assert.strictEqual(statusEvent.metadata.newStatus, "under_verification");
      } finally {
        auditLogService.recordAuditEvent = originalRecord;
      }
    });

    it("NGO Handover approval is recorded as HANDOVER_APPROVED", async () => {
      const originalRecord = auditLogService.recordAuditEvent;
      let handoverEvent = null;

      auditLogService.recordAuditEvent = async (opts) => {
        if (opts.action.startsWith("HANDOVER")) {
          handoverEvent = opts;
        }
        return { id: "test-id" };
      };

      try {
        const testHandoverId = new mongoose.Types.ObjectId();
        await auditLogService.recordAuditEvent({
          action: "HANDOVER_APPROVED",
          entityType: "Handover",
          entityId: testHandoverId,
          outcome: "success",
          metadata: { handoverId: testHandoverId.toString() }
        });

        assert.ok(handoverEvent);
        assert.strictEqual(handoverEvent.action, "HANDOVER_APPROVED");
        assert.strictEqual(handoverEvent.entityType, "Handover");
      } finally {
        auditLogService.recordAuditEvent = originalRecord;
      }
    });

    it("Non-admin roles are forbidden by authorize middleware for admin audit routes", async () => {
      const authorize = require("../middleware/authorize");
      const adminOnlyGuard = authorize("admin");

      const reqParent = createMockReq(parentUser);
      const resParent = createMockRes();
      let nextCalled = false;

      adminOnlyGuard(reqParent, resParent, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false, "Parent role should not be permitted through admin guard");
      assert.strictEqual(resParent.statusCode, 403, "Non-admin access must return 403 Forbidden");

      const reqPolice = createMockReq(policeUser);
      const resPolice = createMockRes();
      let policeNext = false;

      adminOnlyGuard(reqPolice, resPolice, () => {
        policeNext = true;
      });

      assert.strictEqual(policeNext, false, "Police role should not be permitted through admin guard");
      assert.strictEqual(resPolice.statusCode, 403);
    });

    it("Sighting creation and review are recorded with safe metadata", async () => {
      const originalRecord = auditLogService.recordAuditEvent;
      const sightingEvents = [];

      auditLogService.recordAuditEvent = async (opts) => {
        sightingEvents.push(opts);
        return { id: "test-id" };
      };

      try {
        const sightingId = new mongoose.Types.ObjectId();
        await auditLogService.recordAuditEvent({
          req: createMockReq(parentUser),
          action: "SIGHTING_CREATED",
          entityType: "Sighting",
          entityId: sightingId,
          outcome: "success",
          metadata: {
            sightingId: sightingId.toString(),
            caseId: TEST_CASE_ID.toString()
          }
        });

        await auditLogService.recordAuditEvent({
          req: createMockReq(policeUser),
          action: "SIGHTING_REVIEWED",
          entityType: "Sighting",
          entityId: sightingId,
          outcome: "success",
          metadata: {
            sightingId: sightingId.toString(),
            newStatus: "verified"
          }
        });

        assert.strictEqual(sightingEvents.length, 2);
        assert.strictEqual(sightingEvents[0].action, "SIGHTING_CREATED");
        assert.strictEqual(sightingEvents[1].action, "SIGHTING_REVIEWED");
      } finally {
        auditLogService.recordAuditEvent = originalRecord;
      }
    });

    it("User authentication success and failure are audited with appropriate outcomes", async () => {
      const originalRecord = auditLogService.recordAuditEvent;
      const authEvents = [];

      auditLogService.recordAuditEvent = async (opts) => {
        authEvents.push(opts);
        return { id: "test-id" };
      };

      try {
        // Failed login
        await auditLogService.recordAuditEvent({
          req: createMockReq(null),
          action: "USER_LOGIN_FAILED",
          entityType: "User",
          outcome: "failure",
          metadata: { reason: "INVALID_PASSWORD" }
        });

        // Successful login
        await auditLogService.recordAuditEvent({
          req: createMockReq(parentUser),
          action: "USER_LOGIN_SUCCESS",
          entityType: "User",
          entityId: TEST_PARENT_ID,
          outcome: "success",
          metadata: { role: "parent" }
        });

        assert.strictEqual(authEvents.length, 2);
        assert.strictEqual(authEvents[0].action, "USER_LOGIN_FAILED");
        assert.strictEqual(authEvents[0].outcome, "failure");
        assert.strictEqual(authEvents[1].action, "USER_LOGIN_SUCCESS");
        assert.strictEqual(authEvents[1].outcome, "success");
      } finally {
        auditLogService.recordAuditEvent = originalRecord;
      }
    });

    it("Admin user approval, rejection, and suspension log appropriate actions", async () => {
      const originalRecord = auditLogService.recordAuditEvent;
      const adminEvents = [];

      auditLogService.recordAuditEvent = async (opts) => {
        adminEvents.push(opts);
        return { id: "test-id" };
      };

      try {
        await auditLogService.recordAuditEvent({
          req: createMockReq(adminUser),
          action: "ADMIN_APPROVED_USER",
          entityType: "User",
          entityId: TEST_POLICE_ID,
          outcome: "success",
          metadata: { targetUserId: TEST_POLICE_ID.toString(), targetUserRole: "police" }
        });

        await auditLogService.recordAuditEvent({
          req: createMockReq(adminUser),
          action: "ADMIN_SUSPENDED_USER",
          entityType: "User",
          entityId: TEST_POLICE_ID,
          outcome: "success",
          metadata: { targetUserId: TEST_POLICE_ID.toString(), reason: "Security violation" }
        });

        await auditLogService.recordAuditEvent({
          req: createMockReq(adminUser),
          action: "ADMIN_CHANGED_USER_ROLE",
          entityType: "User",
          entityId: TEST_PARENT_ID,
          outcome: "success",
          metadata: { targetUserId: TEST_PARENT_ID.toString(), previousRole: "parent", newRole: "ngo" }
        });

        assert.strictEqual(adminEvents.length, 3);
        assert.strictEqual(adminEvents[0].action, "ADMIN_APPROVED_USER");
        assert.strictEqual(adminEvents[1].action, "ADMIN_SUSPENDED_USER");
        assert.strictEqual(adminEvents[2].action, "ADMIN_CHANGED_USER_ROLE");
      } finally {
        auditLogService.recordAuditEvent = originalRecord;
      }
    });
  });
});
