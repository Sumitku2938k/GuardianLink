/**
 * GuardianLink — Phase 21: Police Portal Completion Test Suite
 *
 * Comprehensive validation of:
 * 1. Verified Officer Directory & Station Roster Scoping (GET /api/cases/police/officers)
 * 2. Workload Aggregation (activeCases, criticalCases, completedCases)
 * 3. Strict Case Assignment Validation & Forgery Prevention (PATCH /api/cases/:caseId/assign)
 * 4. Cross-Station Assignment Prevention (CROSS_STATION_ASSIGNMENT_DENIED)
 * 5. Closed/Cancelled Case Assignment Guard (CASE_NOT_ELIGIBLE)
 * 6. Police Dashboard Aggregated Analytics (GET /api/cases/police/dashboard-stats)
 * 7. FIR Verification and Rejection Validation (Phase 18 Integration)
 * 8. Investigation Notes & Tasks Author Identity Derivation
 * 9. RBAC & Administrative Approval Enforcement
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const MissingCase = require("../models/MissingCase");
const Child = require("../models/Child");
const User = require("../models/User");
const FIR = require("../models/FIR");
const Sighting = require("../models/Sighting");
const caseController = require("../controllers/caseController");
const firService = require("../services/firService");
const notificationService = require("../services/notificationService");

describe("GuardianLink Phase 21: Police Portal Completion", () => {
  // Stub notification dispatching to avoid DB buffering in unit tests
  notificationService.createNotification = async () => ({ id: "mock-notif-1" });
  const STATION_A = "Central Delhi Police Post";
  const STATION_B = "South Delhi Police Post";

  const OFFICER_A_ID = new mongoose.Types.ObjectId();
  const OFFICER_B_ID = new mongoose.Types.ObjectId();
  const OFFICER_OTHER_STATION_ID = new mongoose.Types.ObjectId();
  const UNAPPROVED_OFFICER_ID = new mongoose.Types.ObjectId();
  const INACTIVE_OFFICER_ID = new mongoose.Types.ObjectId();
  const CASE_ID_1 = new mongoose.Types.ObjectId();
  const CASE_ID_CLOSED = new mongoose.Types.ObjectId();
  const CHILD_ID = new mongoose.Types.ObjectId();

  const policeUserSession = {
    _id: OFFICER_A_ID,
    id: OFFICER_A_ID.toString(),
    name: "Inspector Vikram Sharma",
    role: "police",
    phone: "+919876543210",
    organization: STATION_A,
    status: "approved",
    isActive: true
  };

  const pendingPoliceUser = {
    _id: UNAPPROVED_OFFICER_ID,
    id: UNAPPROVED_OFFICER_ID.toString(),
    name: "Officer Pending",
    role: "police",
    organization: STATION_A,
    status: "pending",
    isActive: true
  };

  // Helper to create mock Express response
  const createMockRes = () => {
    const res = {
      statusCode: 200,
      jsonData: null,
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (data) {
        this.jsonData = data;
        return this;
      }
    };
    return res;
  };

  // =========================================================================
  // 1. Officer Directory & Station Roster Scoping (GET /api/cases/police/officers)
  // =========================================================================
  describe("1. Officer Directory & Workload Roster (GET /api/cases/police/officers)", () => {
    it("denies access to unapproved police accounts with ACCOUNT_VERIFICATION_PENDING", async () => {
      const req = {
        user: pendingPoliceUser,
        query: {}
      };
      const res = createMockRes();

      await caseController.getPoliceOfficers(req, res, () => {});

      assert.equal(res.statusCode, 403);
      assert.equal(res.jsonData.success, false);
      assert.equal(res.jsonData.code, "ACCOUNT_VERIFICATION_PENDING");
    });

    it("scopes officer directory to caller station and computes active workload", async () => {
      const originalFind = User.find;
      const originalAggregate = MissingCase.aggregate;

      try {
        let capturedQuery = null;
        User.find = (q) => {
          capturedQuery = q;
          return {
            select: () => ({
              sort: () =>
                Promise.resolve([
                  {
                    _id: OFFICER_A_ID,
                    name: "Inspector Vikram Sharma",
                    email: "vikram@police.gov.in",
                    phone: "+919876543210",
                    organization: STATION_A,
                    status: "approved",
                    isActive: true,
                    profilePhoto: ""
                  },
                  {
                    _id: OFFICER_B_ID,
                    name: "Sub-Inspector Anita Roy",
                    email: "anita@police.gov.in",
                    phone: "+919876543211",
                    organization: STATION_A,
                    status: "approved",
                    isActive: true,
                    profilePhoto: "https://example.com/anita.jpg"
                  }
                ])
            })
          };
        };

        MissingCase.aggregate = (pipeline) => {
          return Promise.resolve([
            {
              _id: OFFICER_A_ID,
              activeCases: 3,
              criticalCases: 1,
              completedCases: 5
            },
            {
              _id: OFFICER_B_ID,
              activeCases: 2,
              criticalCases: 0,
              completedCases: 2
            }
          ]);
        };

        const req = {
          user: policeUserSession,
          query: {}
        };
        const res = createMockRes();

        await caseController.getPoliceOfficers(req, res, () => {});

        assert.equal(res.statusCode, 200);
        assert.equal(res.jsonData.success, true);
        assert.equal(capturedQuery.organization, STATION_A);
        assert.equal(capturedQuery.status, "approved");
        assert.deepEqual(capturedQuery.isActive, { $ne: false });

        assert.equal(res.jsonData.count, 2);
        const officerA = res.jsonData.officers.find((o) => o.id === OFFICER_A_ID.toString());
        assert.ok(officerA);
        assert.equal(officerA.badgeNumber, "DL-POL-3210");
        assert.equal(officerA.activeCases, 3);
        assert.equal(officerA.criticalCases, 1);
        assert.equal(officerA.completedCases, 5);
        assert.equal(officerA.availability, "Active Duty");
        assert.ok(officerA.avatar.includes("ui-avatars.com"));

        const officerB = res.jsonData.officers.find((o) => o.id === OFFICER_B_ID.toString());
        assert.ok(officerB);
        assert.equal(officerB.avatar, "https://example.com/anita.jpg");
        assert.equal(officerB.activeCases, 2);
      } finally {
        User.find = originalFind;
        MissingCase.aggregate = originalAggregate;
      }
    });
  });

  // =========================================================================
  // 2. Case Squad Assignment (PATCH /api/cases/:caseId/assign)
  // =========================================================================
  describe("2. Case Squad Assignment Security & Validation (PATCH /api/cases/:caseId/assign)", () => {
    it("fails with INVALID_OFFICER_ID when officerId is missing or invalid", async () => {
      const req = {
        params: { caseId: CASE_ID_1.toString() },
        body: { officerId: "not-a-valid-id" },
        user: policeUserSession
      };
      const res = createMockRes();

      await caseController.assignOfficer(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.equal(res.jsonData.code, "INVALID_OFFICER_ID");
    });

    it("fails with CASE_NOT_FOUND when case record does not exist", async () => {
      const originalFindById = MissingCase.findById;
      const originalFindOne = MissingCase.findOne;

      try {
        MissingCase.findById = () => ({ populate: () => Promise.resolve(null) });
        MissingCase.findOne = () => ({ populate: () => Promise.resolve(null) });

        const req = {
          params: { caseId: new mongoose.Types.ObjectId().toString() },
          body: { officerId: OFFICER_B_ID.toString() },
          user: policeUserSession
        };
        const res = createMockRes();

        await caseController.assignOfficer(req, res, () => {});

        assert.equal(res.statusCode, 404);
        assert.equal(res.jsonData.code, "CASE_NOT_FOUND");
      } finally {
        MissingCase.findById = originalFindById;
        MissingCase.findOne = originalFindOne;
      }
    });

    it("fails with CASE_NOT_ELIGIBLE when trying to assign a closed or cancelled case", async () => {
      const originalFindById = MissingCase.findById;

      try {
        MissingCase.findById = () => ({
          populate: () =>
            Promise.resolve({
              _id: CASE_ID_CLOSED,
              status: "closed",
              caseNumber: "MC-2026-0099"
            })
        });

        const req = {
          params: { caseId: CASE_ID_CLOSED.toString() },
          body: { officerId: OFFICER_B_ID.toString() },
          user: policeUserSession
        };
        const res = createMockRes();

        await caseController.assignOfficer(req, res, () => {});

        assert.equal(res.statusCode, 400);
        assert.equal(res.jsonData.code, "CASE_NOT_ELIGIBLE");
      } finally {
        MissingCase.findById = originalFindById;
      }
    });

    it("fails with OFFICER_NOT_FOUND when target officer does not exist or is not a police role", async () => {
      const originalFindById = MissingCase.findById;
      const originalUserFindById = User.findById;

      try {
        MissingCase.findById = () => ({
          populate: () =>
            Promise.resolve({
              _id: CASE_ID_1,
              status: "reported",
              caseNumber: "MC-2026-1001"
            })
        });

        User.findById = () => Promise.resolve(null);

        const req = {
          params: { caseId: CASE_ID_1.toString() },
          body: { officerId: new mongoose.Types.ObjectId().toString() },
          user: policeUserSession
        };
        const res = createMockRes();

        await caseController.assignOfficer(req, res, () => {});

        assert.equal(res.statusCode, 404);
        assert.equal(res.jsonData.code, "OFFICER_NOT_FOUND");
      } finally {
        MissingCase.findById = originalFindById;
        User.findById = originalUserFindById;
      }
    });

    it("fails with OFFICER_NOT_VERIFIED when target officer is not approved", async () => {
      const originalFindById = MissingCase.findById;
      const originalUserFindById = User.findById;

      try {
        MissingCase.findById = () => ({
          populate: () =>
            Promise.resolve({
              _id: CASE_ID_1,
              status: "reported",
              caseNumber: "MC-2026-1001"
            })
        });

        User.findById = () =>
          Promise.resolve({
            _id: UNAPPROVED_OFFICER_ID,
            name: "Officer Unapproved",
            role: "police",
            status: "pending",
            isActive: true,
            organization: STATION_A
          });

        const req = {
          params: { caseId: CASE_ID_1.toString() },
          body: { officerId: UNAPPROVED_OFFICER_ID.toString() },
          user: policeUserSession
        };
        const res = createMockRes();

        await caseController.assignOfficer(req, res, () => {});

        assert.equal(res.statusCode, 400);
        assert.equal(res.jsonData.code, "OFFICER_NOT_VERIFIED");
      } finally {
        MissingCase.findById = originalFindById;
        User.findById = originalUserFindById;
      }
    });

    it("fails with OFFICER_INACTIVE when target officer account is inactive", async () => {
      const originalFindById = MissingCase.findById;
      const originalUserFindById = User.findById;

      try {
        MissingCase.findById = () => ({
          populate: () =>
            Promise.resolve({
              _id: CASE_ID_1,
              status: "reported",
              caseNumber: "MC-2026-1001"
            })
        });

        User.findById = () =>
          Promise.resolve({
            _id: INACTIVE_OFFICER_ID,
            name: "Officer Inactive",
            role: "police",
            status: "approved",
            isActive: false,
            organization: STATION_A
          });

        const req = {
          params: { caseId: CASE_ID_1.toString() },
          body: { officerId: INACTIVE_OFFICER_ID.toString() },
          user: policeUserSession
        };
        const res = createMockRes();

        await caseController.assignOfficer(req, res, () => {});

        assert.equal(res.statusCode, 400);
        assert.equal(res.jsonData.code, "OFFICER_INACTIVE");
      } finally {
        MissingCase.findById = originalFindById;
        User.findById = originalUserFindById;
      }
    });

    it("fails with CROSS_STATION_ASSIGNMENT_DENIED when assigning an officer from another station", async () => {
      const originalFindById = MissingCase.findById;
      const originalUserFindById = User.findById;

      try {
        MissingCase.findById = () => ({
          populate: () =>
            Promise.resolve({
              _id: CASE_ID_1,
              status: "reported",
              caseNumber: "MC-2026-1001"
            })
        });

        User.findById = () =>
          Promise.resolve({
            _id: OFFICER_OTHER_STATION_ID,
            name: "Officer South",
            role: "police",
            status: "approved",
            isActive: true,
            organization: STATION_B // Different station from caller
          });

        const req = {
          params: { caseId: CASE_ID_1.toString() },
          body: { officerId: OFFICER_OTHER_STATION_ID.toString() },
          user: policeUserSession // STATION_A
        };
        const res = createMockRes();

        await caseController.assignOfficer(req, res, () => {});

        assert.equal(res.statusCode, 403);
        assert.equal(res.jsonData.code, "CROSS_STATION_ASSIGNMENT_DENIED");
      } finally {
        MissingCase.findById = originalFindById;
        User.findById = originalUserFindById;
      }
    });

    it("successfully assigns officer, derives badge authoritatively, and transitions status to active", async () => {
      const originalFindById = MissingCase.findById;
      const originalUserFindById = User.findById;

      const mockCase = {
        _id: CASE_ID_1,
        caseNumber: "MC-2026-1001",
        status: "reported",
        priority: "high",
        assignedOfficer: null,
        investigationNotes: [],
        markModified: () => {},
        save: () => Promise.resolve(mockCase),
        toSafeObject: function () {
          return {
            id: this._id.toString(),
            caseNumber: this.caseNumber,
            status: this.status,
            assignedOfficerId: this.assignedOfficer.id.toString(),
            assignedOfficerName: this.assignedOfficer.name,
            assignedOfficerBadge: this.assignedOfficer.badgeNumber,
            investigationNotes: this.investigationNotes
          };
        }
      };

      try {
        MissingCase.findById = () => ({
          populate: () => Promise.resolve(mockCase)
        });

        User.findById = () =>
          Promise.resolve({
            _id: OFFICER_B_ID,
            name: "Sub-Inspector Anita Roy",
            role: "police",
            phone: "+919876543211",
            status: "approved",
            isActive: true,
            organization: STATION_A
          });

        const req = {
          params: { caseId: CASE_ID_1.toString() },
          body: {
            officerId: OFFICER_B_ID.toString(),
            officerName: "FORGED_NAME", // Should be ignored
            badgeNumber: "FORGED_BADGE" // Should be ignored
          },
          user: policeUserSession
        };
        const res = createMockRes();

        await caseController.assignOfficer(req, res, () => {});

        assert.equal(res.statusCode, 200);
        assert.equal(res.jsonData.success, true);
        assert.equal(mockCase.status, "active"); // Auto-transitioned from 'reported' to 'active'
        assert.equal(mockCase.assignedOfficer.name, "Sub-Inspector Anita Roy");
        assert.equal(mockCase.assignedOfficer.badgeNumber, "DL-POL-3211"); // Authoritative badge
        assert.notEqual(mockCase.assignedOfficer.badgeNumber, "FORGED_BADGE");
        assert.notEqual(mockCase.assignedOfficer.name, "FORGED_NAME");

        // Verify investigation note recorded
        assert.equal(mockCase.investigationNotes.length, 1);
        assert.ok(mockCase.investigationNotes[0].text.includes("Assigned case squad lead"));
        assert.equal(mockCase.investigationNotes[0].badge, "DL-POL-3210"); // Caller badge
      } finally {
        MissingCase.findById = originalFindById;
        User.findById = originalUserFindById;
      }
    });
  });

  // =========================================================================
  // 3. Police Station Dashboard Stats (GET /api/cases/police/dashboard-stats)
  // =========================================================================
  describe("3. Station Dashboard Analytics (GET /api/cases/police/dashboard-stats)", () => {
    it("returns dynamic station stats including unassignedCases and pendingFIRReviews", async () => {
      const originalCountDocs = MissingCase.countDocuments;
      const originalFind = MissingCase.find;
      const originalSightingCount = Sighting.countDocuments;
      const originalSightingFind = Sighting.find;
      const originalFIRCount = FIR.countDocuments;

      try {
        MissingCase.countDocuments = (q) => {
          if (q.$or) return Promise.resolve(4); // unassignedCases
          if (q.status === "closed") return Promise.resolve(10);
          if (q.priority === "critical") return Promise.resolve(3);
          if (q.status && Array.isArray(q.status.$in) && !q.status.$in.includes("closed")) return Promise.resolve(15); // activeCases
          return Promise.resolve(25); // totalMissing
        };

        MissingCase.find = () => ({
          select: () => Promise.resolve([])
        });
        Sighting.countDocuments = (q) => {
          if (q.status === "verified") return Promise.resolve(7);
          return Promise.resolve(2); // unreviewed
        };
        Sighting.find = () => ({
          select: () => Promise.resolve([])
        });
        FIR.countDocuments = () => Promise.resolve(5); // pendingFIRReviews

        const req = {
          user: policeUserSession,
          query: {}
        };
        const res = createMockRes();

        await caseController.getPoliceDashboardStats(req, res, () => {});

        assert.equal(res.statusCode, 200);
        assert.equal(res.jsonData.success, true);
        assert.equal(res.jsonData.stats.totalMissing, 25);
        assert.equal(res.jsonData.stats.activeCases, 15);
        assert.equal(res.jsonData.stats.criticalCases, 3);
        assert.equal(res.jsonData.stats.unassignedCases, 4);
        assert.equal(res.jsonData.stats.pendingFIRReviews, 5);
        assert.equal(res.jsonData.stats.verifiedSightings, 7);
      } finally {
        MissingCase.countDocuments = originalCountDocs;
        MissingCase.find = originalFind;
        Sighting.countDocuments = originalSightingCount;
        Sighting.find = originalSightingFind;
        FIR.countDocuments = originalFIRCount;
      }
    });
  });

  // =========================================================================
  // 4. FIR Verification & Rejection Police Workflow (Phase 18 Integration)
  // =========================================================================
  describe("4. FIR Review Security (Phase 18 Integration)", () => {
    it("fails with NOTES_REQUIRED when officer review note is under 5 characters", async () => {
      await assert.rejects(
        async () => {
          await firService.verifyFIR({
            firId: new mongoose.Types.ObjectId().toString(),
            officerUser: policeUserSession,
            reviewNotes: "Ok"
          });
        },
        (err) => {
          assert.equal(err.code, "NOTES_REQUIRED");
          assert.equal(err.statusCode, 400);
          return true;
        }
      );
    });

    it("fails with REJECTION_REASON_REQUIRED when rejection reason is under 5 characters", async () => {
      await assert.rejects(
        async () => {
          await firService.rejectFIR({
            firId: new mongoose.Types.ObjectId().toString(),
            officerUser: policeUserSession,
            rejectionReason: "Bad",
            reviewNotes: "Detailed review note here"
          });
        },
        (err) => {
          assert.equal(err.code, "REJECTION_REASON_REQUIRED");
          assert.equal(err.statusCode, 400);
          return true;
        }
      );
    });

    it("fails with UNAUTHORIZED_ROLE when non-police role attempts to verify FIR", async () => {
      await assert.rejects(
        async () => {
          await firService.verifyFIR({
            firId: new mongoose.Types.ObjectId().toString(),
            officerUser: { role: "citizen", _id: new mongoose.Types.ObjectId() },
            reviewNotes: "Valid review notes here"
          });
        },
        (err) => {
          assert.equal(err.code, "UNAUTHORIZED_ROLE");
          assert.equal(err.statusCode, 403);
          return true;
        }
      );
    });
  });

  // =========================================================================
  // 5. Investigation Notes & Tasks Security
  // =========================================================================
  describe("5. Investigation Notes & Tasks Author Derivation", () => {
    it("fails with MISSING_NOTE_TEXT when note text is empty", async () => {
      const req = {
        params: { caseId: CASE_ID_1.toString() },
        body: { text: "   " },
        user: policeUserSession
      };
      const res = createMockRes();

      await caseController.addInvestigationNote(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.equal(res.jsonData.code, "MISSING_NOTE_TEXT");
    });

    it("fails with NOTE_TOO_LONG when note exceeds 2000 characters", async () => {
      const req = {
        params: { caseId: CASE_ID_1.toString() },
        body: { text: "A".repeat(2001) },
        user: policeUserSession
      };
      const res = createMockRes();

      await caseController.addInvestigationNote(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.equal(res.jsonData.code, "NOTE_TOO_LONG");
    });

    it("derives author badge and officerName strictly from session when adding note", async () => {
      const originalFindById = MissingCase.findById;

      const mockCase = {
        _id: CASE_ID_1,
        caseNumber: "MC-2026-1001",
        investigationNotes: [],
        markModified: () => {},
        save: () => Promise.resolve(mockCase),
        toSafeObject: function () {
          return {
            id: this._id.toString(),
            investigationNotes: this.investigationNotes
          };
        }
      };

      try {
        MissingCase.findById = () => ({
          populate: () => Promise.resolve(mockCase)
        });

        const req = {
          params: { caseId: CASE_ID_1.toString() },
          body: {
            text: "Checked CCTV footage at platform 4.",
            officerName: "FORGED_OFFICER",
            badge: "FORGED_BADGE"
          },
          user: policeUserSession
        };
        const res = createMockRes();

        await caseController.addInvestigationNote(req, res, () => {});

        assert.equal(res.statusCode, 201);
        assert.equal(res.jsonData.success, true);
        assert.equal(mockCase.investigationNotes.length, 1);
        const note = mockCase.investigationNotes[0];
        assert.equal(note.officerName, "Inspector Vikram Sharma");
        assert.equal(note.badge, "DL-POL-3210");
        assert.equal(note.text, "Checked CCTV footage at platform 4.");
        assert.notEqual(note.officerName, "FORGED_OFFICER");
        assert.notEqual(note.badge, "FORGED_BADGE");
      } finally {
        MissingCase.findById = originalFindById;
      }
    });

    it("fails with MISSING_TASK_LABEL when task label is empty", async () => {
      const req = {
        params: { caseId: CASE_ID_1.toString() },
        body: { label: "" },
        user: policeUserSession
      };
      const res = createMockRes();

      await caseController.createTask(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.equal(res.jsonData.code, "MISSING_TASK_LABEL");
    });
  });
});
