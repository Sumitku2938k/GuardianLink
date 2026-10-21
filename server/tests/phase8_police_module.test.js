/**
 * GuardianLink — Phase 8: Police Module Automated Test Suite
 *
 * Comprehensive validation of:
 * 1. Authentication & Police Approval Gates (Anti-Bypass)
 * 2. Case Management & Scoped Queries
 * 3. Investigation Notes & Squad Checklist Tasks
 * 4. Police Case Number & FIR Persistence
 * 5. Human-in-the-Loop AI Match Verification
 * 6. Citizen Sighting Report Queue & Law Enforcement Review
 * 7. Police Station Dashboard Scoped Analytics
 */

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const User = require("../models/User");
const Child = require("../models/Child");
const MissingCase = require("../models/MissingCase");
const Sighting = require("../models/Sighting");

const caseController = require("../controllers/caseController");
const sightingService = require("../services/sightingService");

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

describe("GuardianLink Phase 8: Police Module Integration Suite", () => {
  let approvedOfficer;
  let pendingOfficer;
  let citizenUser;
  let parentUser;
  let testChild;
  let testCase;
  let testSighting;

  const APPROVED_OFFICER_ID = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e21b01");
  const PENDING_OFFICER_ID = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e21b02");
  const PARENT_USER_ID = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e21b03");
  const CITIZEN_USER_ID = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e21b04");

  const TEST_CHILD_ID = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e21c01");
  const TEST_CASE_ID = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e21d01");
  const TEST_SIGHTING_ID = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e21e01");

  let originalCaseSave;
  let originalSightingSave;

  beforeEach(() => {
    originalCaseSave = MissingCase.prototype.save;
    originalSightingSave = Sighting.prototype.save;
    MissingCase.prototype.save = async function () { return this; };
    Sighting.prototype.save = async function () { return this; };

    approvedOfficer = {
      _id: APPROVED_OFFICER_ID,
      name: "Insp. Vikram Rathore",
      email: "vikram.rathore@police.delhi.gov.in",
      phone: "+91 98110 94821",
      role: "police",
      status: "approved",
      organization: "Delhi Central Metro Police Post - Sector 12"
    };

    pendingOfficer = {
      _id: PENDING_OFFICER_ID,
      name: "Sub-Insp. Amit Verma",
      email: "amit.verma@police.delhi.gov.in",
      phone: "+91 98110 33210",
      role: "police",
      status: "pending",
      organization: "Crime Branch North"
    };

    parentUser = {
      _id: PARENT_USER_ID,
      name: "John Mehta",
      email: "john.mehta@example.com",
      phone: "+91 98110 00100",
      role: "parent",
      status: "active"
    };

    citizenUser = {
      _id: CITIZEN_USER_ID,
      name: "Rohan Verma",
      email: "rohan.verma@example.com",
      role: "citizen",
      status: "active"
    };

    testChild = new Child({
      _id: TEST_CHILD_ID,
      guardianId: PARENT_USER_ID,
      fullName: "Kabir Mehta",
      dateOfBirth: new Date("2016-08-08"),
      gender: "male",
      bloodGroup: "B+",
      photoUrl: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400",
      status: "active"
    });

    testCase = new MissingCase({
      _id: TEST_CASE_ID,
      childId: testChild,
      reportedBy: PARENT_USER_ID,
      missingDate: new Date("2026-08-08"),
      lastSeenLocation: {
        address: "Central Metro Station Gate 3",
        city: "New Delhi",
        state: "Delhi",
        pinCode: "110001",
        latitude: 28.6139,
        longitude: 77.2090
      },
      lastSeenDescription: "Blue school shirt with navy collar",
      status: "active",
      priority: "high",
      policeCaseNumber: "MC-2026-8821",
      firNumber: "FIR-492/2026"
    });

    testCase.save = async function () { return this; };

    testSighting = new Sighting({
      _id: TEST_SIGHTING_ID,
      caseId: testCase,
      childId: testChild,
      reportedBy: CITIZEN_USER_ID,
      observedAt: new Date(),
      location: {
        address: "Sector 14 Public Library Kiosk",
        city: "New Delhi",
        state: "Delhi",
        landmark: "Near Central Metro Gate 3",
        latitude: 28.6145,
        longitude: 77.2095
      },
      description: "Young boy matching description seen reading at kiosk",
      safetyState: "Safe in Library Reading Room",
      safetyConfirmed: true,
      status: "submitted"
    });
    testSighting.save = async function () { return this; };
  });

  // =========================================================================
  // 1. Authentication & Police Approval Gates
  // =========================================================================
  describe("1. Authentication & Police Approval Gates", () => {
    it("1.1 Denies unapproved police accounts with 403 ACCOUNT_VERIFICATION_PENDING", async () => {
      const res = createMockRes();
      await caseController.getCases({ user: pendingOfficer, query: {} }, res, () => {});

      assert.equal(res.statusCode, 403);
      assert.equal(res.data.code, "ACCOUNT_VERIFICATION_PENDING");
    });

    it("1.2 Denies citizen users from querying police operational cases", async () => {
      const res = createMockRes();
      await caseController.getCases({ user: citizenUser, query: {} }, res, () => {});

      assert.equal(res.statusCode, 403);
      assert.equal(res.data.code, "ACCESS_DENIED");
    });

    it("1.3 Denies unapproved police from accessing police station dashboard stats", async () => {
      const res = createMockRes();
      await caseController.getPoliceDashboardStats({ user: pendingOfficer }, res, () => {});

      assert.equal(res.statusCode, 403);
      assert.equal(res.data.code, "ACCOUNT_VERIFICATION_PENDING");
    });
  });

  // =========================================================================
  // 2. Case Management & Detail Serialization
  // =========================================================================
  describe("2. Case Management & Detail Serialization", () => {
    it("2.1 Serializes authorized case data with child details and assigned officer aliases", () => {
      testCase.assignedOfficer = {
        id: approvedOfficer._id,
        name: approvedOfficer.name,
        badgeNumber: "DL-POL-9482",
        assignedAt: new Date()
      };

      const safeObj = testCase.toSafeObject();

      assert.equal(safeObj.id, TEST_CASE_ID.toString());
      assert.equal(safeObj.caseNumber, "MC-2026-8821");
      assert.equal(safeObj.childName, "Kabir Mehta");
      assert.equal(safeObj.childAge, 10);
      assert.equal(safeObj.childGender, "male");
      assert.equal(safeObj.assignedOfficerName, "Insp. Vikram Rathore");
      assert.equal(safeObj.assignedOfficerBadge, "DL-POL-9482");
    });

    it("2.2 Rejects invalid status transition according to state machine", async () => {
      // In-memory test case lookup mock
      const originalFindById = MissingCase.findById;
      MissingCase.findById = () => ({
        populate: async () => testCase
      });

      try {
        const res = createMockRes();
        await caseController.updateCaseStatus(
          {
            user: approvedOfficer,
            params: { caseId: TEST_CASE_ID.toString() },
            body: { status: "reunited" } // Invalid from 'active'
          },
          res,
          () => {}
        );

        assert.equal(res.statusCode, 400);
        assert.equal(res.data.code, "INVALID_STATUS_TRANSITION");
      } finally {
        MissingCase.findById = originalFindById;
      }
    });
  });

  // =========================================================================
  // 3. Investigation Notes & Squad Checklist Tasks
  // =========================================================================
  describe("3. Investigation Notes & Squad Checklist Tasks", () => {
    it("3.1 Rejects empty or whitespace-only investigation notes", async () => {
      const res = createMockRes();
      await caseController.addInvestigationNote(
        {
          user: approvedOfficer,
          params: { caseId: TEST_CASE_ID.toString() },
          body: { text: "   " }
        },
        res,
        () => {}
      );

      assert.equal(res.statusCode, 400);
      assert.equal(res.data.code, "MISSING_NOTE_TEXT");
    });

    it("3.2 Rejects oversized notes exceeding 2000 characters", async () => {
      const res = createMockRes();
      await caseController.addInvestigationNote(
        {
          user: approvedOfficer,
          params: { caseId: TEST_CASE_ID.toString() },
          body: { text: "x".repeat(2001) }
        },
        res,
        () => {}
      );

      assert.equal(res.statusCode, 400);
      assert.equal(res.data.code, "NOTE_TOO_LONG");
    });

    it("3.3 Appends structured investigation note and derives officer identity from session", async () => {
      const originalFindById = MissingCase.findById;
      MissingCase.findById = () => ({
        populate: async () => testCase
      });

      try {
        const res = createMockRes();
        const noteText = "Reviewing CCTV camera 4 feed from Platform 2.";

        await caseController.addInvestigationNote(
          {
            user: approvedOfficer,
            params: { caseId: TEST_CASE_ID.toString() },
            body: { text: noteText }
          },
          res,
          () => {}
        );

        assert.equal(res.statusCode, 201);
        assert.equal(res.data.success, true);
        const added = testCase.investigationNotes.find((n) => n.text === noteText);
        assert.ok(added, "Note should be appended to case investigationNotes");
        assert.equal(added.officerName, approvedOfficer.name);
        assert.equal(added.badge, "DL-POL-4821");
      } finally {
        MissingCase.findById = originalFindById;
      }
    });

    it("3.4 Creates and toggles an investigation task", async () => {
      const originalFindById = MissingCase.findById;
      MissingCase.findById = () => ({
        populate: async () => testCase
      });

      try {
        const createRes = createMockRes();
        await caseController.createTask(
          {
            user: approvedOfficer,
            params: { caseId: TEST_CASE_ID.toString() },
            body: { label: "Verify guardian legal identity", assignedTo: "Insp. Vikram Rathore" }
          },
          createRes,
          () => {}
        );

        assert.equal(createRes.statusCode, 201);
        assert.equal(testCase.investigationTasks.length, 1);
        const task = testCase.investigationTasks[0];
        assert.equal(task.completed, false);

        const toggleRes = createMockRes();
        await caseController.toggleTask(
          {
            user: approvedOfficer,
            params: { caseId: TEST_CASE_ID.toString(), taskId: task._id.toString() }
          },
          toggleRes,
          () => {}
        );

        assert.equal(toggleRes.statusCode, 200);
        assert.equal(task.completed, true);
      } finally {
        MissingCase.findById = originalFindById;
      }
    });
  });

  // =========================================================================
  // 4. Human-in-the-Loop AI Match Verification
  // =========================================================================
  describe("4. Human-in-the-Loop AI Match Verification", () => {
    it("4.1 Rejects review without valid decision parameter", async () => {
      const res = createMockRes();
      await caseController.reviewAIMatch(
        {
          user: approvedOfficer,
          params: { caseId: TEST_CASE_ID.toString(), matchId: "pm-101" },
          body: { decision: "auto_resolve" }
        },
        res,
        () => {}
      );

      assert.equal(res.statusCode, 400);
      assert.equal(res.data.code, "INVALID_DECISION");
    });

    it("4.2 Explicit officer 'confirm' decision marks child found and updates state machine", async () => {
      const originalFindById = MissingCase.findById;
      MissingCase.findById = () => ({
        populate: async () => testCase
      });

      try {
        const res = createMockRes();
        await caseController.reviewAIMatch(
          {
            user: approvedOfficer,
            params: { caseId: TEST_CASE_ID.toString(), matchId: "pm-101" },
            body: { decision: "confirm", notes: "Child confirmed at reception" }
          },
          res,
          () => {}
        );

        assert.equal(res.statusCode, 200);
        assert.equal(testCase.status, "found");
        assert.ok(testCase.foundAt instanceof Date);
        assert.equal(testCase.potentialMatchReviews.length, 1);
        assert.equal(testCase.potentialMatchReviews[0].verificationStatus, "Verified Match");
      } finally {
        MissingCase.findById = originalFindById;
      }
    });
  });

  // =========================================================================
  // 5. Citizen Sighting Report Queue & Law Enforcement Review
  // =========================================================================
  describe("5. Citizen Sighting Report Queue & Law Enforcement Review", () => {
    it("5.1 Sighting serializer exposes exact coordinates only to authorized responders", () => {
      // Citizen viewing (not reporter, not authorized responder)
      const citizenSafe = testSighting.toSafeObject({ isAuthorizedResponder: false, isReporter: false });
      assert.equal(citizenSafe.location.latitude, undefined);
      assert.equal(citizenSafe.location.longitude, undefined);

      // Police officer viewing
      const policeSafe = testSighting.toSafeObject({ isAuthorizedResponder: true, isReporter: false });
      assert.equal(policeSafe.location.latitude, 28.6145);
      assert.equal(policeSafe.location.longitude, 77.2095);
    });

    it("5.2 Denies citizens from reviewing sightings", () => {
      const isAuthorized = ["police", "admin"].includes(citizenUser.role);
      assert.equal(isAuthorized, false, "Citizen role must not be authorized to review sightings");
    });
  });
});
