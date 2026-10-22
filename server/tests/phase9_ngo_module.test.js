/**
 * GuardianLink — Phase 9: NGO Module Automated Test Suite
 *
 * Comprehensive validation of:
 * 1. Authentication & NGO Approval Gates (Anti-Bypass)
 * 2. Scoped Dashboard Statistics & Analytics
 * 3. Case Referral Eligibility & Child-Case Consistency
 * 4. Safe Intake Registration & Anti-Mass-Assignment
 * 5. Duplicate Active Intake Prevention
 * 6. Care Notes Audit Trails & Medical Status Validation
 * 7. Shelter Management & Atomic Capacity Bounds
 * 8. Organization-Level Tenant Isolation (IDOR Protection)
 * 9. Police-Coordinated Handover Workflow (Approval Gates & Safe Release)
 * 10. MissingCase Incident State Machine Preservation
 */

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const User = require("../models/User");
const Child = require("../models/Child");
const MissingCase = require("../models/MissingCase");
const Shelter = require("../models/Shelter");
const CareRecord = require("../models/CareRecord");
const Handover = require("../models/Handover");
const Notification = require("../models/Notification");

const ngoController = require("../controllers/ngoController");
const ngoService = require("../services/ngoService");

// Helper to mock Express res
const createMockRes = () => {
  return {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    }
  };
};

describe("GuardianLink Phase 9: NGO Module Integration Suite", () => {
  let approvedNgo;
  let pendingNgo;
  let otherNgo;
  let approvedOfficer;
  let testChild;
  let testCase;
  let testShelter;

  const APPROVED_NGO_ID = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e22a01");
  const PENDING_NGO_ID = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e22a02");
  const OTHER_NGO_ID = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e22a03");
  const APPROVED_OFFICER_ID = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e22b01");

  const TEST_CHILD_ID = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e22c01");
  const TEST_CASE_ID = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e22d01");
  const TEST_SHELTER_ID = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e22e01");

  let originalCareSave;
  let originalCarePopulate;
  let originalShelterSave;
  let originalHandoverSave;
  let originalNotificationSave;
  let originalUserFind;

  beforeEach(() => {
    originalCareSave = CareRecord.prototype.save;
    originalCarePopulate = CareRecord.prototype.populate;
    originalShelterSave = Shelter.prototype.save;
    originalHandoverSave = Handover.prototype.save;
    originalNotificationSave = Notification.prototype.save;
    originalUserFind = User.find;

    CareRecord.prototype.save = async function () { return this; };
    CareRecord.prototype.populate = async function () { return this; };
    Shelter.prototype.save = async function () { return this; };
    Handover.prototype.save = async function () { return this; };
    Notification.prototype.save = async function () { return this; };
    User.find = () => ({ limit: async () => [] });

    approvedNgo = {
      _id: APPROVED_NGO_ID,
      name: "Helping Hands NGO",
      email: "contact@helpinghands.org",
      phone: "+91 11 2617 2000",
      role: "ngo",
      status: "approved",
      organization: "Helping Hands Child Foundation"
    };

    pendingNgo = {
      _id: PENDING_NGO_ID,
      name: "Pending Care NGO",
      email: "pending@ngo.org",
      phone: "+91 11 2617 3333",
      role: "ngo",
      status: "pending",
      organization: "Pending Child Care"
    };

    otherNgo = {
      _id: OTHER_NGO_ID,
      name: "Other Foundation",
      email: "other@foundation.org",
      phone: "+91 11 2617 4444",
      role: "ngo",
      status: "approved",
      organization: "Other Foundation"
    };

    approvedOfficer = {
      _id: APPROVED_OFFICER_ID,
      name: "Insp. Vikram Rathore",
      badgeNumber: "DL-POL-9482",
      role: "police",
      status: "approved",
      organization: "Delhi Central Metro Police Post"
    };

    testChild = {
      _id: TEST_CHILD_ID,
      fullName: "Kabir Mehta",
      age: 10,
      gender: "male",
      photoUrl: "https://example.com/kabir.jpg"
    };

    testCase = {
      _id: TEST_CASE_ID,
      caseNumber: "MC-2026-8821",
      childId: testChild,
      status: "active",
      assignedOfficer: {
        id: APPROVED_OFFICER_ID,
        name: "Insp. Vikram Rathore",
        badgeNumber: "DL-POL-9482"
      },
      lastSeenLocation: { city: "Delhi" },
      toSafeObject() {
        return {
          id: this._id.toString(),
          caseNumber: this.caseNumber,
          childId: this.childId,
          status: this.status
        };
      }
    };

    testShelter = {
      _id: TEST_SHELTER_ID,
      name: "Helping Hands Shelter Kiosk",
      ngoId: APPROVED_NGO_ID,
      capacity: 10,
      activePlacements: 2,
      status: "active",
      toSafeObject() {
        return {
          id: this._id.toString(),
          name: this.name,
          capacity: this.capacity,
          occupied: this.activePlacements,
          available: Math.max(0, this.capacity - this.activePlacements),
          occupancyPercentage: Math.round((this.activePlacements / this.capacity) * 100)
        };
      }
    };
  });

  afterEach(() => {
    CareRecord.prototype.save = originalCareSave;
    CareRecord.prototype.populate = originalCarePopulate;
    Shelter.prototype.save = originalShelterSave;
    Handover.prototype.save = originalHandoverSave;
    Notification.prototype.save = originalNotificationSave;
    User.find = originalUserFind;
  });

  // 1. Authentication & NGO Approval Gates
  describe("1. Authentication & NGO Approval Gates", () => {
    it("1.1 Denies unapproved NGO accounts with 403 ACCOUNT_VERIFICATION_PENDING", async () => {
      const req = { user: pendingNgo };
      const res = createMockRes();
      let nextCalled = false;

      await ngoController.getDashboardStats(req, res, () => { nextCalled = true; });

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.data.code, "ACCOUNT_VERIFICATION_PENDING");
      assert.strictEqual(nextCalled, false);
    });

    it("1.2 Denies unapproved NGO from creating care intake records", async () => {
      const req = { user: pendingNgo, body: { caseId: TEST_CASE_ID } };
      const res = createMockRes();

      await ngoController.createCareRecord(req, res, () => {});

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.data.code, "ACCOUNT_VERIFICATION_PENDING");
    });
  });

  // 2. Case Referral Eligibility & Safe Intake Registration
  describe("2. Case Referral Eligibility & Safe Intake Registration", () => {
    it("2.1 Rejects intake when case status is ineligible (e.g. reported)", async () => {
      const originalFindById = MissingCase.findById;
      MissingCase.findById = () => ({
        populate: async () => ({
          _id: TEST_CASE_ID,
          status: "reported",
          childId: testChild
        })
      });

      const req = {
        user: approvedNgo,
        body: { caseId: TEST_CASE_ID, childId: TEST_CHILD_ID }
      };
      const res = createMockRes();

      await ngoController.createCareRecord(req, res, () => {});

      assert.strictEqual(res.statusCode, 409);
      assert.strictEqual(res.data.code, "CASE_NOT_ELIGIBLE");

      MissingCase.findById = originalFindById;
    });

    it("2.2 Rejects intake when client childId mismatches the case's child", async () => {
      const originalFindById = MissingCase.findById;
      const mismatchedChildId = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e22c99");

      MissingCase.findById = () => ({
        populate: async () => ({
          _id: TEST_CASE_ID,
          status: "active",
          childId: testChild
        })
      });

      const req = {
        user: approvedNgo,
        body: { caseId: TEST_CASE_ID, childId: mismatchedChildId }
      };
      const res = createMockRes();

      await ngoController.createCareRecord(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.data.code, "CHILD_CASE_MISMATCH");

      MissingCase.findById = originalFindById;
    });

    it("2.3 Enforces duplicate active intake prevention rule (409 ACTIVE_CARE_RECORD_EXISTS)", async () => {
      const originalFindById = MissingCase.findById;
      const originalFindOne = CareRecord.findOne;

      MissingCase.findById = () => ({
        populate: async () => ({
          _id: TEST_CASE_ID,
          status: "active",
          childId: testChild
        })
      });

      CareRecord.findOne = async () => ({
        _id: new mongoose.Types.ObjectId(),
        status: "in_care"
      });

      const req = {
        user: approvedNgo,
        body: { caseId: TEST_CASE_ID, childId: TEST_CHILD_ID }
      };
      const res = createMockRes();

      await ngoController.createCareRecord(req, res, () => {});

      assert.strictEqual(res.statusCode, 409);
      assert.strictEqual(res.data.code, "ACTIVE_CARE_RECORD_EXISTS");

      MissingCase.findById = originalFindById;
      CareRecord.findOne = originalFindOne;
    });

    it("2.4 Derives ngoId and receivedBy from authenticated session, ignoring client spoofing", async () => {
      const spoofedNgoId = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e22a99");
      const originalFindById = MissingCase.findById;
      const originalFindOne = CareRecord.findOne;

      MissingCase.findById = () => ({
        populate: async () => ({
          _id: TEST_CASE_ID,
          caseNumber: "MC-2026-8821",
          status: "active",
          childId: testChild
        })
      });

      CareRecord.findOne = async () => null;

      let savedRecord = null;
      CareRecord.prototype.save = async function () {
        savedRecord = this;
        return this;
      };

      const result = await ngoService.createCareRecord(approvedNgo, {
        caseId: TEST_CASE_ID,
        ngoId: spoofedNgoId, // Malicious spoof attempt in body
        receivedBy: spoofedNgoId,
        visibleInjuries: "None",
        medicalNeeded: false
      });

      assert.ok(savedRecord);
      assert.strictEqual(savedRecord.ngoId.toString(), APPROVED_NGO_ID.toString());
      assert.strictEqual(savedRecord.receivedBy.toString(), APPROVED_NGO_ID.toString());

      MissingCase.findById = originalFindById;
      CareRecord.findOne = originalFindOne;
    });
  });

  // 3. Care Record Lifecycle & Notes Audit Trail
  describe("3. Care Record Lifecycle & Notes Audit Trail", () => {
    it("3.1 Appends structured care note with staff identity and timestamp", async () => {
      const mockRecord = {
        _id: new mongoose.Types.ObjectId(),
        ngoId: APPROVED_NGO_ID,
        careNotes: [],
        save: async function () { return this; }
      };

      const originalFindOne = CareRecord.findOne;
      CareRecord.findOne = async () => mockRecord;

      const note = await ngoService.addCareNote(approvedNgo, mockRecord._id, {
        text: "Provided warm meal and clean clothes.",
        category: "Nutrition"
      });

      assert.strictEqual(note.text, "Provided warm meal and clean clothes.");
      assert.strictEqual(note.category, "Nutrition");
      assert.strictEqual(note.staffId.toString(), APPROVED_NGO_ID.toString());
      assert.strictEqual(mockRecord.careNotes.length, 1);

      CareRecord.findOne = originalFindOne;
    });

    it("3.2 Rejects empty or whitespace care notes with 400 MISSING_NOTE_TEXT", async () => {
      const req = {
        user: approvedNgo,
        params: { careRecordId: new mongoose.Types.ObjectId() },
        body: { text: "   " }
      };
      const res = createMockRes();

      await ngoController.addCareNote(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.data.code, "MISSING_NOTE_TEXT");
    });

    it("3.3 Validates controlled medical status values and rejects arbitrary strings", async () => {
      const req = {
        user: approvedNgo,
        params: { careRecordId: new mongoose.Types.ObjectId() },
        body: { medicalStatus: "totally_cured" } // Invalid value
      };
      const res = createMockRes();

      await ngoController.updateMedicalStatus(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.data.code, "INVALID_MEDICAL_STATUS");
    });

    it("3.4 Enforces valid lifecycle transitions and rejects invalid state jumps", async () => {
      const mockRecord = {
        _id: new mongoose.Types.ObjectId(),
        ngoId: APPROVED_NGO_ID,
        status: "in_care",
        save: async function () { return this; },
        populate: async function () { return this; },
        toSafeObject: function () { return { id: this._id.toString(), status: this.status }; }
      };

      const originalFindOne = CareRecord.findOne;
      CareRecord.findOne = async () => mockRecord;

      // Cannot jump from in_care directly to handed_over without awaiting_handover
      let caughtError = null;
      try {
        await ngoService.updateCareRecordStatus(approvedNgo, mockRecord._id, "handed_over");
      } catch (err) {
        caughtError = err;
      }

      assert.ok(caughtError);
      assert.strictEqual(caughtError.code, "INVALID_STATUS_TRANSITION");

      CareRecord.findOne = originalFindOne;
    });
  });

  // 4. Shelter Capacity & Multi-Tenant Isolation
  describe("4. Shelter Capacity & Multi-Tenant Isolation", () => {
    it("4.1 Rejects shelter placement when shelter capacity is full", async () => {
      const originalFindOne = CareRecord.findOne;
      const originalFindOneAndUpdate = Shelter.findOneAndUpdate;

      CareRecord.findOne = async () => ({
        _id: new mongoose.Types.ObjectId(),
        ngoId: APPROVED_NGO_ID,
        status: "in_care",
        save: async function () { return this; },
        populate: async function () { return this; },
        toSafeObject: function () { return this; }
      });

      // Returns null when activePlacements >= capacity
      Shelter.findOneAndUpdate = async () => null;

      let caughtError = null;
      try {
        await ngoService.assignPlacement(approvedNgo, new mongoose.Types.ObjectId(), {
          shelterId: TEST_SHELTER_ID
        });
      } catch (err) {
        caughtError = err;
      }

      assert.ok(caughtError);
      assert.strictEqual(caughtError.code, "SHELTER_UNAVAILABLE");

      CareRecord.findOne = originalFindOne;
      Shelter.findOneAndUpdate = originalFindOneAndUpdate;
    });

    it("4.2 Prevents NGO A from accessing or mutating NGO B's care records (Tenant Isolation)", async () => {
      const recordOwnedByNgoA = {
        _id: new mongoose.Types.ObjectId(),
        ngoId: APPROVED_NGO_ID,
        toSafeObject: function () { return { id: this._id.toString() }; }
      };

      const originalFindById = CareRecord.findById;
      CareRecord.findById = () => ({
        populate: () => ({
          populate: () => ({
            populate: () => ({
              populate: () => ({
                populate: async () => recordOwnedByNgoA
              })
            })
          })
        })
      });

      // NGO B tries to fetch NGO A's record
      let caughtError = null;
      try {
        await ngoService.getCareRecordById(otherNgo, recordOwnedByNgoA._id);
      } catch (err) {
        caughtError = err;
      }

      assert.ok(caughtError);
      assert.strictEqual(caughtError.status, 403);
      assert.strictEqual(caughtError.code, "ACCESS_DENIED");

      CareRecord.findById = originalFindById;
    });
  });

  // 5. Police-Coordinated Handover Workflow
  describe("5. Police-Coordinated Handover Workflow", () => {
    it("5.1 Rejects non-police/admin user from approving handover requests", async () => {
      const req = {
        user: approvedNgo, // NGO role attempting to approve
        params: { handoverId: new mongoose.Types.ObjectId() }
      };
      const res = createMockRes();

      await ngoController.approveHandover(req, res, () => {});

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.data.code, "UNAUTHORIZED_APPROVER");
    });

    it("5.2 Prevents handover completion before formal police approval (HANDOVER_NOT_APPROVED)", async () => {
      const originalFindById = Handover.findById;
      Handover.findById = async () => ({
        _id: new mongoose.Types.ObjectId(),
        status: "pending", // Still pending, not approved!
        ngoId: APPROVED_NGO_ID
      });

      let caughtError = null;
      try {
        await ngoService.completeHandover(approvedNgo, new mongoose.Types.ObjectId());
      } catch (err) {
        caughtError = err;
      }

      assert.ok(caughtError);
      assert.strictEqual(caughtError.code, "HANDOVER_NOT_APPROVED");

      Handover.findById = originalFindById;
    });

    it("5.3 Allows authorized police officer to approve handover and sets verification status", async () => {
      const mockHandover = {
        _id: new mongoose.Types.ObjectId(),
        careRecordId: new mongoose.Types.ObjectId(),
        caseId: TEST_CASE_ID,
        childId: TEST_CHILD_ID,
        ngoId: APPROVED_NGO_ID,
        status: "pending",
        guardianDetails: { verifiedByPolice: false },
        receivingOfficer: {},
        save: async function () { return this; },
        toSafeObject: function () {
          return {
            id: this._id.toString(),
            status: this.status,
            guardianVerified: this.guardianDetails.verifiedByPolice
          };
        }
      };

      const originalFindById = Handover.findById;
      Handover.findById = async () => mockHandover;

      const result = await ngoService.approveHandover(approvedOfficer, mockHandover._id);

      assert.strictEqual(result.status, "approved");
      assert.strictEqual(result.guardianVerified, true);
      assert.strictEqual(mockHandover.approvedBy.toString(), APPROVED_OFFICER_ID.toString());

      Handover.findById = originalFindById;
    });

    it("5.4 Completing approved handover marks record handed_over and releases shelter capacity", async () => {
      const mockCareRecord = {
        _id: new mongoose.Types.ObjectId(),
        status: "awaiting_handover",
        shelterId: TEST_SHELTER_ID,
        save: async function () { return this; }
      };

      const mockHandover = {
        _id: new mongoose.Types.ObjectId(),
        careRecordId: mockCareRecord._id,
        ngoId: APPROVED_NGO_ID,
        status: "approved",
        save: async function () { return this; },
        toSafeObject: function () {
          return {
            id: this._id.toString(),
            status: this.status
          };
        }
      };

      const originalHandoverFindById = Handover.findById;
      const originalCareFindById = CareRecord.findById;
      let decrementedShelter = false;
      const originalShelterFindOneAndUpdate = Shelter.findOneAndUpdate;

      Handover.findById = async () => mockHandover;
      CareRecord.findById = async () => mockCareRecord;
      Shelter.findOneAndUpdate = async (query, update) => {
        if (update?.$inc?.activePlacements === -1) {
          decrementedShelter = true;
        }
        return testShelter;
      };

      const result = await ngoService.completeHandover(approvedNgo, mockHandover._id, {
        location: "Helping Hands Shelter Kiosk",
        notes: "Child released to verified guardian with officer present."
      });

      assert.strictEqual(result.status, "completed");
      assert.strictEqual(mockCareRecord.status, "handed_over");
      assert.strictEqual(decrementedShelter, true);

      Handover.findById = originalHandoverFindById;
      CareRecord.findById = originalCareFindById;
      Shelter.findOneAndUpdate = originalShelterFindOneAndUpdate;
    });
  });
});
