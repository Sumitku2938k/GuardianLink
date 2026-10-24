/**
 * GuardianLink — Phase 12: Comprehensive Cross-Module End-to-End Integration Suite
 *
 * Validates complete multi-actor real workflows:
 * 1. Workflow A: Parent Child Enrollment -> Missing Case Report -> Audit Trail Verification
 * 2. Workflow B: Citizen Sighting Submission -> Law Enforcement Review & Status Transition
 * 3. Workflow C: NGO Safe Intake -> Shelter Capacity Allocation -> Police-Coordinated Handover -> Capacity Release
 * 4. Workflow D: Notification Persistence, Unread Counter Tracking & Recipient Isolation
 */

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const User = require("../models/User");
const Child = require("../models/Child");
const MissingCase = require("../models/MissingCase");
const Sighting = require("../models/Sighting");
const CareRecord = require("../models/CareRecord");
const Shelter = require("../models/Shelter");
const Handover = require("../models/Handover");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");

const childController = require("../controllers/childController");
const caseController = require("../controllers/caseController");
const sightingController = require("../controllers/sightingController");
const ngoController = require("../controllers/ngoController");
const notificationService = require("../services/notificationService");

const TEST_DB_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/guardianlink_phase12_test";

const createMockReq = ({ body = {}, query = {}, params = {}, headers = {}, user = null } = {}) => ({
  body,
  query,
  params,
  headers: {
    "x-forwarded-for": "127.0.0.1",
    "user-agent": "GuardianLink-Phase12-IntegrationRunner/1.0",
    "x-request-id": "req-phase12-int-" + Math.random().toString(36).substring(7),
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

describe("Phase 12: Cross-Module End-to-End Integration Workflows", () => {
  const cleanupUserIds = [];
  const cleanupChildIds = [];
  const cleanupCaseIds = [];
  const cleanupSightingIds = [];
  const cleanupCareIds = [];
  const cleanupShelterIds = [];
  const cleanupHandoverIds = [];
  const cleanupNotifIds = [];

  let parentVikram;
  let parentOther;
  let citizenKaran;
  let policeOfficer;
  let ngoWorker;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI);
    }

    parentVikram = await User.create({
      name: "Parent Vikram Malhotra",
      email: `int_parent_${Date.now()}@test.local`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: "Pass123!",
      role: "parent",
      status: "active"
    });
    cleanupUserIds.push(parentVikram._id);

    parentOther = await User.create({
      name: "Parent Other",
      email: `int_parent_other_${Date.now()}@test.local`,
      phone: `92${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: "Pass123!",
      role: "parent",
      status: "active"
    });
    cleanupUserIds.push(parentOther._id);

    citizenKaran = await User.create({
      name: "Citizen Karan Verma",
      email: `int_cit_${Date.now()}@test.local`,
      phone: `93${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: "Pass123!",
      role: "citizen",
      status: "active"
    });
    cleanupUserIds.push(citizenKaran._id);

    policeOfficer = await User.create({
      name: "Inspector Rajesh Kumar",
      email: `int_police_${Date.now()}@dept.local`,
      phone: `94${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: "Pass123!",
      role: "police",
      status: "approved",
      organization: "Sector 18 Police Station"
    });
    cleanupUserIds.push(policeOfficer._id);

    ngoWorker = await User.create({
      name: "NGO Coordinator Meena",
      email: `int_ngo_${Date.now()}@ngo.local`,
      phone: `95${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: "Pass123!",
      role: "ngo",
      status: "approved",
      organization: "Helping Hands Child Foundation"
    });
    cleanupUserIds.push(ngoWorker._id);
  });

  after(async () => {
    if (cleanupNotifIds.length > 0) await Notification.deleteMany({ _id: { $in: cleanupNotifIds } });
    if (cleanupHandoverIds.length > 0) await Handover.deleteMany({ _id: { $in: cleanupHandoverIds } });
    if (cleanupShelterIds.length > 0) await Shelter.deleteMany({ _id: { $in: cleanupShelterIds } });
    if (cleanupCareIds.length > 0) await CareRecord.deleteMany({ _id: { $in: cleanupCareIds } });
    if (cleanupSightingIds.length > 0) await Sighting.deleteMany({ _id: { $in: cleanupSightingIds } });
    if (cleanupCaseIds.length > 0) await MissingCase.deleteMany({ _id: { $in: cleanupCaseIds } });
    if (cleanupChildIds.length > 0) await Child.deleteMany({ _id: { $in: cleanupChildIds } });
    if (cleanupUserIds.length > 0) await User.deleteMany({ _id: { $in: cleanupUserIds } });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  // =========================================================================
  // WORKFLOW A: Parent Reports Missing Child
  // =========================================================================
  describe("Workflow A: Parent Child Enrollment -> Missing Report -> Audit Trail", () => {
    let enrolledChild;
    let missingCaseId;

    it("A.1 Parent creates child record with derived ownership", async () => {
      const req = createMockReq({
        user: parentVikram,
        body: {
          fullName: "Dev Malhotra",
          dateOfBirth: "2018-06-15",
          gender: "male",
          description: "Wearing yellow t-shirt, blue cap",
          bloodGroup: "B+"
        }
      });
      const res = createMockRes();

      await childController.createChild(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 201);
      assert.ok(res.data.child);
      enrolledChild = res.data.child;
      cleanupChildIds.push(enrolledChild.id);

      const dbChild = await Child.findById(enrolledChild.id);
      assert.equal(dbChild.guardianId.toString(), parentVikram._id.toString());
    });

    it("A.2 Parent files emergency missing case for the registered child", async () => {
      const pastTime = new Date(Date.now() - 3600000).toISOString();
      const req = createMockReq({
        user: parentVikram,
        body: {
          childId: enrolledChild.id,
          missingDate: pastTime,
          lastSeenLocation: "Sector 18 Mall, Noida",
          lastSeenDescription: "Separated near entrance gate",
          priority: "high"
        }
      });
      const res = createMockRes();

      await caseController.createCase(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 201);
      assert.equal(res.data.success, true);
      assert.equal(res.data.case.status, "reported");
      missingCaseId = res.data.case.id || res.data.case._id;
      cleanupCaseIds.push(missingCaseId);
    });

    it("A.3 Verifies case correctly references Child and records CASE_REPORTED audit event", async () => {
      const dbCase = await MissingCase.findById(missingCaseId);
      assert.ok(dbCase);
      assert.equal(dbCase.childId.toString(), enrolledChild.id.toString());
      assert.equal(dbCase.reportedBy.toString(), parentVikram._id.toString());

      // Check audit log trail
      const auditLog = await AuditLog.findOne({
        action: "CASE_REPORTED",
        entityId: missingCaseId
      });
      assert.ok(auditLog);
      assert.equal(auditLog.outcome, "success");
      assert.equal(auditLog.actorRole, "parent");
    });

    it("A.4 Unrelated parent is blocked from accessing this private case report", async () => {
      const req = createMockReq({
        user: parentOther, // Unrelated parent
        params: { caseId: missingCaseId.toString() }
      });
      const res = createMockRes();

      await caseController.getCaseById(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 404);
      assert.equal(res.data.code, "CASE_NOT_FOUND");
    });
  });

  // =========================================================================
  // WORKFLOW B: Citizen Sighting & Police Verification
  // =========================================================================
  describe("Workflow B: Citizen Sighting Submission -> Police Law Enforcement Review", () => {
    let testChild;
    let testCase;
    let sightingId;

    before(async () => {
      testChild = await Child.create({
        guardianId: parentVikram._id,
        fullName: "Simran Malhotra",
        dateOfBirth: new Date("2017-09-10"),
        gender: "female",
        status: "active"
      });
      cleanupChildIds.push(testChild._id);

      testCase = await MissingCase.create({
        childId: testChild._id,
        reportedBy: parentVikram._id,
        status: "active",
        missingDate: new Date(Date.now() - 7200000),
        lastSeenLocation: { city: "Noida", state: "Uttar Pradesh", address: "Sector 18 Metro" }
      });
      cleanupCaseIds.push(testCase._id);
    });

    it("B.1 Citizen submits a sighting report with safety pledge", async () => {
      const req = createMockReq({
        user: citizenKaran,
        body: {
          caseId: testCase._id.toString(),
          description: "Spotted child matching description sitting near food court entrance",
          safetyConfirmed: true,
          safetyState: "safe_distance",
          location: {
            address: "Wave Mall Sector 18, Noida",
            city: "Noida",
            state: "Uttar Pradesh",
            coordinates: { latitude: 28.5708, longitude: 77.3261 }
          }
        }
      });
      const res = createMockRes();

      await sightingController.submitSighting(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 201);
      assert.equal(res.data.success, true);
      assert.ok(res.data.sighting);
      sightingId = res.data.sighting.id;
      cleanupSightingIds.push(sightingId);

      assert.equal(res.data.sighting.status, "submitted");
    });

    it("B.2 Case guardian query redacts exact GPS coordinates and unrelated user is forbidden", async () => {
      // 1. Case guardian can view report, but exact coordinates are redacted to prevent dangerous confrontation
      const guardianReq = createMockReq({
        user: parentVikram,
        params: { id: sightingId }
      });
      const guardianRes = createMockRes();

      await sightingController.getSightingById(guardianReq, guardianRes, (err) => { if (err) throw err; });

      assert.equal(guardianRes.statusCode, 200);
      assert.equal(guardianRes.data.success, true);
      assert.equal(guardianRes.data.sighting.location.latitude, undefined);
      assert.equal(guardianRes.data.sighting.location.longitude, undefined);

      // 2. Unrelated citizen receives 403 FORBIDDEN
      const unrelatedReq = createMockReq({
        user: parentOther,
        params: { id: sightingId }
      });
      const unrelatedRes = createMockRes();

      await sightingController.getSightingById(unrelatedReq, unrelatedRes, (err) => { if (err) throw err; });

      assert.equal(unrelatedRes.statusCode, 403);
      assert.equal(unrelatedRes.data.code, "FORBIDDEN");
    });

    it("B.3 Authorized police reviews sighting and marks it verified", async () => {
      const req = createMockReq({
        user: policeOfficer,
        params: { id: sightingId },
        body: {
          status: "verified",
          reviewNotes: "Squad 4 verified child with local security guards."
        }
      });
      const res = createMockRes();

      await sightingController.reviewSighting(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.sighting.status, "verified");

      const dbSighting = await Sighting.findById(sightingId);
      assert.equal(dbSighting.status, "verified");
      assert.equal(dbSighting.reviewedBy.toString(), policeOfficer._id.toString());
    });
  });

  // =========================================================================
  // WORKFLOW C: NGO Custody, Shelter Capacity & Handover
  // =========================================================================
  describe("Workflow C: NGO Safe Custody -> Shelter Capacity -> Handover", () => {
    let careChild;
    let foundCase;
    let shelter;
    let careRecordId;
    let handoverId;

    before(async () => {
      careChild = await Child.create({
        guardianId: parentVikram._id,
        fullName: "Manish Malhotra",
        dateOfBirth: new Date("2016-12-01"),
        gender: "male",
        status: "active"
      });
      cleanupChildIds.push(careChild._id);

      foundCase = await MissingCase.create({
        childId: careChild._id,
        reportedBy: parentVikram._id,
        status: "found", // Found child ready for safe shelter intake
        missingDate: new Date(Date.now() - 86400000)
      });
      cleanupCaseIds.push(foundCase._id);

      // Create a shelter with total capacity 1
      shelter = await Shelter.create({
        name: "Helping Hands Sector 12 Shelter",
        ngoId: ngoWorker._id,
        capacity: 1,
        activePlacements: 0,
        status: "active"
      });
      cleanupShelterIds.push(shelter._id);
    });

    it("C.1 NGO registers safe child intake and places child into shelter", async () => {
      const req = createMockReq({
        user: ngoWorker,
        body: {
          caseId: foundCase._id.toString(),
          childId: careChild._id.toString(),
          shelterId: shelter._id.toString(),
          intakeSource: "police",
          immediateNeeds: "Rest and hydration"
        }
      });
      const res = createMockRes();

      await ngoController.createCareRecord(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 201);
      assert.equal(res.data.success, true);
      assert.ok(res.data.careRecord);
      careRecordId = res.data.careRecord.id;
      cleanupCareIds.push(careRecordId);

      // Verify shelter active placements incremented atomically
      const updatedShelter = await Shelter.findById(shelter._id);
      assert.equal(updatedShelter.activePlacements, 1);
    });

    it("C.2 Rejects another placement when shelter capacity is full (overbooking prevention)", async () => {
      const secondChild = await Child.create({
        guardianId: parentVikram._id,
        fullName: "Another Child",
        dateOfBirth: new Date("2018-01-01"),
        gender: "female",
        status: "active"
      });
      cleanupChildIds.push(secondChild._id);

      const secondFoundCase = await MissingCase.create({
        childId: secondChild._id,
        reportedBy: parentVikram._id,
        status: "found",
        missingDate: new Date()
      });
      cleanupCaseIds.push(secondFoundCase._id);

      const req = createMockReq({
        user: ngoWorker,
        body: {
          caseId: secondFoundCase._id.toString(),
          childId: secondChild._id.toString(),
          shelterId: shelter._id.toString()
        }
      });
      const res = createMockRes();

      await ngoController.createCareRecord(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 409);
      assert.equal(res.data.code, "SHELTER_UNAVAILABLE");
    });

    it("C.3 NGO requests police-coordinated handover to parents", async () => {
      const req = createMockReq({
        user: ngoWorker,
        params: { careRecordId: careRecordId.toString() },
        body: {
          handoverType: "guardian_reunification",
          location: "Sector 18 Police Station",
          notes: "Formal Guardian Reunification",
          guardianName: "Vikram Malhotra",
          guardianPhone: "+919876543210"
        }
      });
      const res = createMockRes();

      await ngoController.requestHandover(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 201);
      assert.equal(res.data.success, true);
      assert.ok(res.data.handover);
      assert.equal(res.data.handover.status, "pending");

      handoverId = res.data.handover.id;
      cleanupHandoverIds.push(handoverId);
    });

    it("C.4 Authorized police officer approves handover request", async () => {
      const req = createMockReq({
        user: policeOfficer,
        params: { handoverId: handoverId.toString() }
      });
      const res = createMockRes();

      await ngoController.approveHandover(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.handover.status, "approved");
    });

    it("C.5 Completing approved handover marks record handed_over and releases shelter capacity", async () => {
      const req = createMockReq({
        user: ngoWorker,
        params: { handoverId: handoverId.toString() },
        body: { notes: "Child safely handed over to parents." }
      });
      const res = createMockRes();

      await ngoController.completeHandover(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);

      // Verify CareRecord transitioned to handed_over
      const dbCare = await CareRecord.findById(careRecordId);
      assert.equal(dbCare.status, "handed_over");

      // Verify shelter capacity was released
      const releasedShelter = await Shelter.findById(shelter._id);
      assert.equal(releasedShelter.activePlacements, 0);
    });
  });

  // =========================================================================
  // WORKFLOW D: Notification Persistence & Recipient Isolation
  // =========================================================================
  describe("Workflow D: Notification Persistence & Recipient Isolation", () => {
    let notifA;

    before(async () => {
      notifA = await notificationService.createNotification({
        recipientId: parentVikram._id,
        senderId: policeOfficer._id,
        recipientRole: "parent",
        type: "case_updated",
        title: "Case Status Updated",
        message: "Your child's case has been marked as found."
      });
      cleanupNotifIds.push(notifA.id);
    });

    it("D.1 Recipient user can view their notifications and unread count reflects it", async () => {
      const notifs = await notificationService.getUserNotifications(parentVikram._id);
      assert.ok(notifs.length > 0);
      assert.equal(notifs[0].id, notifA.id);

      const unread = await notificationService.getUnreadNotificationCount(parentVikram._id);
      assert.ok(unread >= 1);
    });

    it("D.2 Another user cannot mark or access User A's notification (Recipient Isolation)", async () => {
      await assert.rejects(
        async () => {
          // parentOther attempting to mark parentVikram's notification as read
          await notificationService.markNotificationAsRead(notifA.id, parentOther._id);
        },
        (err) => {
          assert.equal(err.code, "NOTIFICATION_NOT_FOUND");
          assert.equal(err.status, 404);
          return true;
        }
      );
    });

    it("D.3 Recipient user marks notification as read and unread count decrements", async () => {
      const initialUnread = await notificationService.getUnreadNotificationCount(parentVikram._id);

      const readNotif = await notificationService.markNotificationAsRead(notifA.id, parentVikram._id);
      assert.equal(readNotif.isRead, true);

      const newUnread = await notificationService.getUnreadNotificationCount(parentVikram._id);
      assert.equal(newUnread, initialUnread - 1);
    });
  });
});
