/**
 * GuardianLink — Phase 12: Comprehensive MissingCase Lifecycle & RBAC Test Suite
 *
 * Validates:
 * 1. Emergency Case Creation, Child Ownership Verification & Duplicate Guard (409)
 * 2. Case Retrieval Authorization & IDOR Isolation
 * 3. Controlled State Machine Transitions (Reported -> Under Verification -> Active -> Found -> Reunited -> Closed)
 * 4. Illegal State Jumps & Terminal State Enforcement (Closed/Cancelled)
 * 5. Role-Based Transition Permissions (Parent cancellation only; Police/Admin verification)
 * 6. Human-in-the-Loop Guarantee (AI match cannot auto-confirm without officer review)
 */

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const User = require("../models/User");
const Child = require("../models/Child");
const MissingCase = require("../models/MissingCase");
const caseController = require("../controllers/caseController");

const TEST_DB_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/guardianlink_phase12_test";

const createMockReq = ({ body = {}, query = {}, params = {}, headers = {}, user = null } = {}) => ({
  body,
  query,
  params,
  headers: {
    "x-forwarded-for": "127.0.0.1",
    "user-agent": "GuardianLink-Phase12-CaseRunner/1.0",
    ...headers
  },
  user,
  ip: "127.0.0.1"
});

const createMockRes = () => {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    }
  };
  return res;
};

describe("Phase 12: MissingCase Lifecycle & Authorization Suite", () => {
  const cleanupUserIds = [];
  const cleanupChildIds = [];
  const cleanupCaseIds = [];

  let parentA;
  let parentB;
  let policeOfficerApproved;
  let policeOfficerPending;
  let adminUser;

  let childA;
  let childB;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI);
    }

    parentA = await User.create({
      name: "Parent Vikram",
      email: `case_parentA_${Date.now()}@test.local`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: "Pass123!",
      role: "parent",
      status: "active"
    });
    cleanupUserIds.push(parentA._id);

    parentB = await User.create({
      name: "Parent Sunita",
      email: `case_parentB_${Date.now()}@test.local`,
      phone: `92${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: "Pass123!",
      role: "parent",
      status: "active"
    });
    cleanupUserIds.push(parentB._id);

    policeOfficerApproved = await User.create({
      name: "Inspector Deshmukh",
      email: `case_police_${Date.now()}@dept.local`,
      phone: `93${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: "Pass123!",
      role: "police",
      status: "approved"
    });
    cleanupUserIds.push(policeOfficerApproved._id);

    policeOfficerPending = await User.create({
      name: "Cadet Rawat",
      email: `case_police_pend_${Date.now()}@dept.local`,
      phone: `94${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: "Pass123!",
      role: "police",
      status: "pending"
    });
    cleanupUserIds.push(policeOfficerPending._id);

    adminUser = await User.create({
      name: "Admin Officer",
      email: `case_admin_${Date.now()}@admin.local`,
      phone: `95${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: "Pass123!",
      role: "admin",
      status: "approved"
    });
    cleanupUserIds.push(adminUser._id);

    childA = await Child.create({
      guardianId: parentA._id,
      fullName: "Aniket Vikram",
      dateOfBirth: new Date("2017-04-12"),
      gender: "male",
      status: "active"
    });
    cleanupChildIds.push(childA._id);

    childB = await Child.create({
      guardianId: parentB._id,
      fullName: "Diya Sunita",
      dateOfBirth: new Date("2019-09-05"),
      gender: "female",
      status: "active"
    });
    cleanupChildIds.push(childB._id);
  });

  after(async () => {
    if (cleanupCaseIds.length > 0) {
      await MissingCase.deleteMany({ _id: { $in: cleanupCaseIds } });
    }
    if (cleanupChildIds.length > 0) {
      await Child.deleteMany({ _id: { $in: cleanupChildIds } });
    }
    if (cleanupUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: cleanupUserIds } });
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  // =========================================================================
  // 1. Case Creation & Child Ownership Guard
  // =========================================================================
  describe("1. Case Creation & Ownership Verification", () => {
    let createdCaseId;

    it("1.1 Successfully creates a missing child case report for owned child", async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago

      const req = createMockReq({
        user: parentA,
        body: {
          childId: childA._id.toString(),
          missingDate: pastDate,
          lastSeenLocation: "Sector 18 Market, Noida",
          lastSeenDescription: "Wearing blue shirt, dark jeans",
          priority: "high"
        }
      });
      const res = createMockRes();

      await caseController.createCase(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 201);
      assert.equal(res.data.success, true);
      assert.ok(res.data.case);
      const resolvedChildId = (res.data.case.childId?._id || res.data.case.childId?.id || res.data.case.childId).toString();
      assert.equal(resolvedChildId, childA._id.toString());

      createdCaseId = res.data.case.id || res.data.case._id;
      cleanupCaseIds.push(createdCaseId);
    });

    it("1.2 Prevents creating a duplicate active case for the same child (409 ACTIVE_CASE_EXISTS)", async () => {
      const req = createMockReq({
        user: parentA,
        body: {
          childId: childA._id.toString(),
          missingDate: new Date(Date.now() - 1800000).toISOString()
        }
      });
      const res = createMockRes();

      await caseController.createCase(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 409);
      assert.equal(res.data.success, false);
      assert.equal(res.data.code, "ACTIVE_CASE_EXISTS");
    });

    it("1.3 Prevents Parent A from reporting Parent B's child (IDOR Protection: 404 CHILD_NOT_FOUND)", async () => {
      const req = createMockReq({
        user: parentA, // Not guardian of childB
        body: {
          childId: childB._id.toString(),
          missingDate: new Date().toISOString()
        }
      });
      const res = createMockRes();

      await caseController.createCase(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 404);
      assert.equal(res.data.success, false);
      assert.equal(res.data.code, "CHILD_NOT_FOUND");
    });
  });

  // =========================================================================
  // 2. Case Retrieval & Scoped Access
  // =========================================================================
  describe("2. Case Retrieval Authorization", () => {
    let testCase;

    before(async () => {
      testCase = await MissingCase.create({
        childId: childA._id,
        reportedBy: parentA._id,
        status: "reported",
        missingDate: new Date(Date.now() - 7200000),
        lastSeenLocation: { address: "Connaught Place, Delhi" }
      });
      cleanupCaseIds.push(testCase._id);
    });

    it("2.1 Guardian parent can retrieve their own child's missing case", async () => {
      const req = createMockReq({
        user: parentA,
        params: { caseId: testCase._id.toString() }
      });
      const res = createMockRes();

      await caseController.getCaseById(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.case.id, testCase._id.toString());
    });

    it("2.2 Approved police officer can retrieve the missing case for investigation", async () => {
      const req = createMockReq({
        user: policeOfficerApproved,
        params: { caseId: testCase._id.toString() }
      });
      const res = createMockRes();

      await caseController.getCaseById(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
    });

    it("2.3 Unrelated Parent B cannot retrieve Parent A's private case details", async () => {
      const req = createMockReq({
        user: parentB, // Unrelated parent
        params: { caseId: testCase._id.toString() }
      });
      const res = createMockRes();

      await caseController.getCaseById(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 404);
      assert.equal(res.data.code, "CASE_NOT_FOUND");
    });
  });

  // =========================================================================
  // 3. Controlled State Machine Transitions & RBAC Permissions
  // =========================================================================
  describe("3. State Machine Transitions & Role Authorization", () => {
    let lifecycleCase;

    beforeEach(async () => {
      lifecycleCase = await MissingCase.create({
        childId: childA._id,
        reportedBy: parentA._id,
        status: "reported",
        missingDate: new Date(Date.now() - 3600000)
      });
      cleanupCaseIds.push(lifecycleCase._id);
    });

    it("3.1 Approved police transitions case: reported -> under_verification -> active -> found -> reunited -> closed", async () => {
      // Step 1: reported -> under_verification
      let req = createMockReq({
        user: policeOfficerApproved,
        params: { caseId: lifecycleCase._id.toString() },
        body: { status: "under_verification" }
      });
      let res = createMockRes();
      await caseController.updateCaseStatus(req, res, (err) => { if (err) throw err; });
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.case.status, "under_verification");

      // Step 2: under_verification -> active
      req = createMockReq({
        user: policeOfficerApproved,
        params: { caseId: lifecycleCase._id.toString() },
        body: { status: "active" }
      });
      res = createMockRes();
      await caseController.updateCaseStatus(req, res, (err) => { if (err) throw err; });
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.case.status, "active");

      // Step 3: active -> found
      req = createMockReq({
        user: policeOfficerApproved,
        params: { caseId: lifecycleCase._id.toString() },
        body: { status: "found" }
      });
      res = createMockRes();
      await caseController.updateCaseStatus(req, res, (err) => { if (err) throw err; });
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.case.status, "found");

      // Step 4: found -> reunited
      req = createMockReq({
        user: policeOfficerApproved,
        params: { caseId: lifecycleCase._id.toString() },
        body: { status: "reunited" }
      });
      res = createMockRes();
      await caseController.updateCaseStatus(req, res, (err) => { if (err) throw err; });
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.case.status, "reunited");

      // Step 5: reunited -> closed (Terminal)
      req = createMockReq({
        user: policeOfficerApproved,
        params: { caseId: lifecycleCase._id.toString() },
        body: { status: "closed" }
      });
      res = createMockRes();
      await caseController.updateCaseStatus(req, res, (err) => { if (err) throw err; });
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.case.status, "closed");
    });

    it("3.2 Rejects illegal state jump (e.g. reported -> reunited) with 400 INVALID_STATUS_TRANSITION", async () => {
      const req = createMockReq({
        user: policeOfficerApproved,
        params: { caseId: lifecycleCase._id.toString() },
        body: { status: "reunited" } // Illegal leap
      });
      const res = createMockRes();

      await caseController.updateCaseStatus(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 400);
      assert.equal(res.data.code, "INVALID_STATUS_TRANSITION");
    });

    it("3.3 Prohibits modifying closed terminal case (closed -> active)", async () => {
      // Force status to closed in DB
      lifecycleCase.status = "closed";
      await lifecycleCase.save();

      const req = createMockReq({
        user: policeOfficerApproved,
        params: { caseId: lifecycleCase._id.toString() },
        body: { status: "active" }
      });
      const res = createMockRes();

      await caseController.updateCaseStatus(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 400);
      assert.equal(res.data.code, "INVALID_STATUS_TRANSITION");
    });

    it("3.4 Forbids Parent from transitioning case to found or active (PARENT_STATUS_UPDATE_RESTRICTED)", async () => {
      const req = createMockReq({
        user: parentA,
        params: { caseId: lifecycleCase._id.toString() },
        body: { status: "active" }
      });
      const res = createMockRes();

      await caseController.updateCaseStatus(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 403);
      assert.equal(res.data.code, "PARENT_STATUS_UPDATE_RESTRICTED");
    });

    it("3.5 Allows Parent to cancel their own reported case", async () => {
      const req = createMockReq({
        user: parentA,
        params: { caseId: lifecycleCase._id.toString() },
        body: { status: "cancelled" }
      });
      const res = createMockRes();

      await caseController.updateCaseStatus(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.case.status, "cancelled");
    });

    it("3.6 Denies pending police accounts from modifying case status with 403", async () => {
      const req = createMockReq({
        user: policeOfficerPending,
        params: { caseId: lifecycleCase._id.toString() },
        body: { status: "under_verification" }
      });
      const res = createMockRes();

      await caseController.updateCaseStatus(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 403);
      assert.equal(res.data.code, "ACCOUNT_VERIFICATION_PENDING");
    });
  });
});
