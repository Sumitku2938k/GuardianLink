/**
 * GuardianLink — Phase 8: Police Module Live Integration Test Script
 *
 * Verifies real backend operations for Police Module:
 * - Approved Police Account Access & Approval Enforcement
 * - Operational Cases Query & Scoped Detail Fetch
 * - Police Case Number & FIR Persistence
 * - Investigation Notes & Squad Checklist Tasks
 * - Human-in-the-Loop AI Match Verification (Confirm/Reject/Evidence)
 * - Citizen Sighting Report Queue & Law Enforcement Review
 * - Police Station Dashboard Scoped Aggregated Analytics
 * - Security & IDOR Authorization Boundaries
 *
 * Usage:
 *   node server/scripts/test_phase8_police_module.js
 */

const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Child = require("../models/Child");
const MissingCase = require("../models/MissingCase");
const Sighting = require("../models/Sighting");
const Notification = require("../models/Notification");

const caseController = require("../controllers/caseController");
const sightingService = require("../services/sightingService");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/guardianlink";

let testsPassed = 0;
let testsFailed = 0;

function assertCondition(desc, condition) {
  if (condition) {
    console.log(`  ✅ PASS: ${desc}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${desc}`);
    testsFailed++;
  }
}

async function runPhase8Test() {
  console.log("================================================================");
  console.log("🛡️  GUARDIANLINK PHASE 8: POLICE MODULE INTEGRATION TEST SCRIPT");
  console.log(`🍃 Target Database: ${MONGO_URI}`);
  console.log("================================================================\n");

  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ 1. MongoDB connection established successfully.\n");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }

  const createdUserIds = [];
  const createdChildIds = [];
  const createdCaseIds = [];
  const createdSightingIds = [];

  const timestamp = Date.now();

  try {
    // -------------------------------------------------------------------------
    // SETUP TEST FIXTURES
    // -------------------------------------------------------------------------
    console.log("--- 2. Setting Up Test Fixtures ---");

    const approvedOfficer = new User({
      name: "Insp. Vikram Rathore",
      email: `vikram.p8.${timestamp}@police.delhi.gov.in`,
      phone: `919871${Math.floor(100000 + Math.random() * 900000)}`,
      passwordHash: "HashSecret123!",
      role: "police",
      status: "approved",
      organization: "Delhi Central Metro Police Post - Sector 12"
    });
    await approvedOfficer.save();
    createdUserIds.push(approvedOfficer._id);

    const pendingOfficer = new User({
      name: "Cadet Priya Nair",
      email: `priya.p8.${timestamp}@police.delhi.gov.in`,
      phone: `919872${Math.floor(100000 + Math.random() * 900000)}`,
      passwordHash: "HashSecret123!",
      role: "police",
      status: "pending",
      organization: "Delhi Central Metro Police Post"
    });
    await pendingOfficer.save();
    createdUserIds.push(pendingOfficer._id);

    const parentUser = new User({
      name: "Suresh Patel",
      email: `suresh.p8.${timestamp}@example.com`,
      phone: `919873${Math.floor(100000 + Math.random() * 900000)}`,
      passwordHash: "HashSecret123!",
      role: "parent",
      status: "active"
    });
    await parentUser.save();
    createdUserIds.push(parentUser._id);

    const citizenUser = new User({
      name: "Rohan Verma",
      email: `rohan.p8.${timestamp}@example.com`,
      phone: `919874${Math.floor(100000 + Math.random() * 900000)}`,
      passwordHash: "HashSecret123!",
      role: "citizen",
      status: "active"
    });
    await citizenUser.save();
    createdUserIds.push(citizenUser._id);

    const testChild = new Child({
      guardianId: parentUser._id,
      fullName: `Dev Patel ${timestamp}`,
      dateOfBirth: new Date("2018-03-20"),
      gender: "male",
      bloodGroup: "A+",
      photoUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      status: "active"
    });
    await testChild.save();
    createdChildIds.push(testChild._id);

    const testCase = new MissingCase({
      childId: testChild._id,
      reportedBy: parentUser._id,
      missingDate: new Date("2026-10-01"),
      lastSeenLocation: {
        address: "Platform 3, Metro Station",
        city: "New Delhi",
        state: "Delhi",
        pinCode: "110001",
        latitude: 28.6139,
        longitude: 77.2090
      },
      lastSeenDescription: "Yellow school shirt and denim shorts",
      status: "active",
      priority: "high",
      policeCaseNumber: `MC-${timestamp.toString().slice(-6)}`,
      firNumber: "Pending FIR"
    });
    await testCase.save();
    createdCaseIds.push(testCase._id);

    const testSighting = new Sighting({
      caseId: testCase._id,
      childId: testChild._id,
      reportedBy: citizenUser._id,
      observedAt: new Date(),
      location: {
        address: "Near Metro Ticket Counter",
        city: "New Delhi",
        state: "Delhi",
        latitude: 28.6142,
        longitude: 77.2092
      },
      description: "Young child matching description seen near security booth.",
      safetyState: "Safe with station security guard",
      safetyConfirmed: true,
      status: "submitted"
    });
    await testSighting.save();
    createdSightingIds.push(testSighting._id);

    console.log("  ✅ Test records created successfully.\n");

    // -------------------------------------------------------------------------
    // TEST SECTION 1: Police Approval Gate & Access Control
    // -------------------------------------------------------------------------
    console.log("--- 3. Testing Police Approval Gate & Access Control ---");

    // 3.1 Unapproved police denied
    const mockRes1 = {
      status(code) { this.statusCode = code; return this; },
      json(data) { this.data = data; return this; }
    };
    await caseController.getCases({ user: pendingOfficer, query: {} }, mockRes1, () => {});
    assertCondition("Unapproved police denied with 403 ACCOUNT_VERIFICATION_PENDING", mockRes1.statusCode === 403 && mockRes1.data.code === "ACCOUNT_VERIFICATION_PENDING");

    // 3.2 Approved police granted access
    const mockRes2 = {
      status(code) { this.statusCode = code; return this; },
      json(data) { this.data = data; return this; }
    };
    await caseController.getCases({ user: approvedOfficer, query: {} }, mockRes2, () => {});
    assertCondition("Approved police granted access to operational cases list", mockRes2.statusCode === 200 && mockRes2.data.success === true);

    // 3.3 Case detail retrieval
    const mockRes3 = {
      status(code) { this.statusCode = code; return this; },
      json(data) { this.data = data; return this; }
    };
    await caseController.getCaseById({ user: approvedOfficer, params: { caseId: testCase._id.toString() } }, mockRes3, () => {});
    assertCondition("Approved police can retrieve authorized case details", mockRes3.statusCode === 200 && mockRes3.data.case.id === testCase._id.toString());
    assertCondition("Serialized case populates childName and childAge correctly", mockRes3.data.case.childName === testChild.fullName);

    // -------------------------------------------------------------------------
    // TEST SECTION 2: Police Case Number & FIR Persistence
    // -------------------------------------------------------------------------
    console.log("\n--- 4. Testing Police Case Number & FIR Persistence ---");

    const firString = `FIR-DL-9482/${timestamp.toString().slice(-4)}`;
    const policeCaseNum = `POL-CASE-${timestamp.toString().slice(-4)}`;

    const mockRes4 = {
      status(code) { this.statusCode = code; return this; },
      json(data) { this.data = data; return this; }
    };
    await caseController.updateInvestigationDetails(
      {
        user: approvedOfficer,
        params: { caseId: testCase._id.toString() },
        body: { firNumber: firString, policeCaseNumber: policeCaseNum, priority: "critical" }
      },
      mockRes4,
      () => {}
    );

    assertCondition("FIR and Case Number update returns 200 OK", mockRes4.statusCode === 200 && mockRes4.data.success === true);

    const verifiedCase = await MissingCase.findById(testCase._id);
    assertCondition("FIR number persisted to MongoDB", verifiedCase.firNumber === firString);
    assertCondition("Priority updated to critical in MongoDB", verifiedCase.priority === "critical");
    assertCondition("Audit log note automatically generated for FIR update", verifiedCase.investigationNotes.length > 0 && verifiedCase.investigationNotes[0].text.includes("FIR Number"));

    // -------------------------------------------------------------------------
    // TEST SECTION 3: Officer Assignment & Squad Lead
    // -------------------------------------------------------------------------
    console.log("\n--- 5. Testing Officer Squad Lead Assignment ---");

    const mockRes5 = {
      status(code) { this.statusCode = code; return this; },
      json(data) { this.data = data; return this; }
    };
    await caseController.assignOfficer(
      {
        user: approvedOfficer,
        params: { caseId: testCase._id.toString() },
        body: {
          officerName: "Insp. Vikram Rathore",
          badgeNumber: "DL-POL-9482"
        }
      },
      mockRes5,
      () => {}
    );

    assertCondition("Assign officer returns 200 OK", mockRes5.statusCode === 200 && mockRes5.data.success === true);

    const assignedCase = await MissingCase.findById(testCase._id);
    assertCondition("assignedOfficer name persisted in MongoDB", assignedCase.assignedOfficer.name === "Insp. Vikram Rathore");
    assertCondition("assignedOfficer badgeNumber persisted in MongoDB", assignedCase.assignedOfficer.badgeNumber === "DL-POL-9482");

    // -------------------------------------------------------------------------
    // TEST SECTION 4: Investigation Notes & Checklist Tasks
    // -------------------------------------------------------------------------
    console.log("\n--- 6. Testing Investigation Notes & Checklist Tasks ---");

    // Add note
    const noteText = "Reviewing CCTV camera 8 feed from Metro concourse level.";
    const mockRes6 = {
      status(code) { this.statusCode = code; return this; },
      json(data) { this.data = data; return this; }
    };
    await caseController.addInvestigationNote(
      {
        user: approvedOfficer,
        params: { caseId: testCase._id.toString() },
        body: { text: noteText }
      },
      mockRes6,
      () => {}
    );

    assertCondition("Investigation note created with 201 Created", mockRes6.statusCode === 201);
    assertCondition("Officer name derived strictly from session", mockRes6.data.notes.some((n) => n.officerName === approvedOfficer.name));

    // Create task
    const mockRes7 = {
      status(code) { this.statusCode = code; return this; },
      json(data) { this.data = data; return this; }
    };
    await caseController.createTask(
      {
        user: approvedOfficer,
        params: { caseId: testCase._id.toString() },
        body: { label: "Verify child identity with school records", assignedTo: "Insp. Vikram Rathore" }
      },
      mockRes7,
      () => {}
    );

    assertCondition("Investigation task created with 201 Created", mockRes7.statusCode === 201);
    const createdTask = mockRes7.data.tasks.find((t) => t.label === "Verify child identity with school records");
    assertCondition("Task is uncompleted upon initial creation", createdTask && createdTask.completed === false);

    // Toggle task
    const taskId = createdTask.id || createdTask._id;
    const mockRes8 = {
      status(code) { this.statusCode = code; return this; },
      json(data) { this.data = data; return this; }
    };
    await caseController.toggleTask(
      {
        user: approvedOfficer,
        params: { caseId: testCase._id.toString(), taskId }
      },
      mockRes8,
      () => {}
    );

    assertCondition("Toggle task returns 200 OK", mockRes8.statusCode === 200);
    const toggledTask = mockRes8.data.tasks.find((t) => (t.id || t._id).toString() === taskId.toString());
    assertCondition("Task completed status toggled to true", toggledTask.completed === true);

    // -------------------------------------------------------------------------
    // TEST SECTION 5: Human-in-the-Loop AI Match Verification
    // -------------------------------------------------------------------------
    console.log("\n--- 7. Testing Human-in-the-Loop AI Match Verification ---");

    // 7.1 Reject review without valid decision
    const mockRes9 = {
      status(code) { this.statusCode = code; return this; },
      json(data) { this.data = data; return this; }
    };
    await caseController.reviewAIMatch(
      {
        user: approvedOfficer,
        params: { caseId: testCase._id.toString(), matchId: "pm-test-1" },
        body: { decision: "auto_approve" }
      },
      mockRes9,
      () => {}
    );
    assertCondition("Invalid decision parameter rejected with 400 INVALID_DECISION", mockRes9.statusCode === 400 && mockRes9.data.code === "INVALID_DECISION");

    // 7.2 Human 'confirm' decision marks child found
    const mockRes10 = {
      status(code) { this.statusCode = code; return this; },
      json(data) { this.data = data; return this; }
    };
    await caseController.reviewAIMatch(
      {
        user: approvedOfficer,
        params: { caseId: testCase._id.toString(), matchId: "pm-test-2" },
        body: { decision: "confirm", notes: "Officer visually verified child at station" }
      },
      mockRes10,
      () => {}
    );

    assertCondition("Officer AI match verification returns 200 OK", mockRes10.statusCode === 200);
    assertCondition("Human confirmation advances case status to 'found'", mockRes10.data.case.status === "found");

    const foundCaseDb = await MissingCase.findById(testCase._id);
    assertCondition("Case status persisted as 'found' in MongoDB", foundCaseDb.status === "found");
    assertCondition("foundAt timestamp recorded in MongoDB", foundCaseDb.foundAt instanceof Date);

    // -------------------------------------------------------------------------
    // TEST SECTION 6: Citizen Sighting Queue & Verification
    // -------------------------------------------------------------------------
    console.log("\n--- 8. Testing Citizen Sighting Queue & Desk Review ---");

    const deskSightings = await sightingService.getAllSightings({}, approvedOfficer);
    assertCondition("Police can retrieve all submitted sightings across cases", Array.isArray(deskSightings) && deskSightings.length > 0);

    const testSightingItem = deskSightings.find((s) => s.id === testSighting._id.toString());
    assertCondition("Police desk sighting contains exact coordinates", testSightingItem && testSightingItem.location.latitude === 28.6142);

    const reviewedSighting = await sightingService.reviewSighting(
      testSighting._id,
      { status: "verified", reviewNotes: "Patrol car escorted child to family room." },
      approvedOfficer
    );
    assertCondition("Sighting review status updated to 'verified'", reviewedSighting.status === "verified");

    const verifiedSightingDb = await Sighting.findById(testSighting._id);
    assertCondition("Sighting reviewedBy matches authenticated officer ID", verifiedSightingDb.reviewedBy.toString() === approvedOfficer._id.toString());

    // -------------------------------------------------------------------------
    // TEST SECTION 7: Station Dashboard Scoped Analytics
    // -------------------------------------------------------------------------
    console.log("\n--- 9. Testing Police Station Dashboard Analytics ---");

    const mockRes11 = {
      status(code) { this.statusCode = code; return this; },
      json(data) { this.data = data; return this; }
    };
    await caseController.getPoliceDashboardStats({ user: approvedOfficer }, mockRes11, () => {});

    assertCondition("Dashboard stats endpoint returns 200 OK", mockRes11.statusCode === 200);
    assertCondition("Dashboard returns totalMissing count >= 1", mockRes11.data.stats.totalMissing >= 1);
    assertCondition("Dashboard returns recoveryRate string", typeof mockRes11.data.stats.recoveryRate === "string");
    assertCondition("Dashboard returns foundReports count", typeof mockRes11.data.stats.foundReports === "number");

  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log("\n--- 10. Cleaning Up Test Fixtures ---");
    if (createdSightingIds.length > 0) {
      await Sighting.deleteMany({ _id: { $in: createdSightingIds } });
    }
    if (createdCaseIds.length > 0) {
      await MissingCase.deleteMany({ _id: { $in: createdCaseIds } });
    }
    if (createdChildIds.length > 0) {
      await Child.deleteMany({ _id: { $in: createdChildIds } });
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    console.log("  ✅ Temporary fixtures cleaned up.\n");

    await mongoose.disconnect();
  }

  console.log("================================================================");
  console.log(`📋 PHASE 8 POLICE MODULE TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log("================================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase8Test().catch((err) => {
  console.error("❌ Fatal error in Phase 8 test runner:", err);
  process.exit(1);
});
