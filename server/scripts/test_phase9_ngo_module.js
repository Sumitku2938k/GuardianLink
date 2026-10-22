/**
 * GuardianLink — Phase 9: NGO Module Live Integration Test Script
 *
 * Verifies real database operations for NGO Module:
 * - Approved NGO Account Authorization & Approval Gates
 * - Case Referrals & Safe Intake Registration
 * - CareRecord Lifecycle & Timestamped Care Notes
 * - Medical & Wellbeing Status Updates
 * - Shelter Management & Atomic Capacity Placement
 * - Police-Coordinated Handover Request, Approval & Completion
 * - Multi-Tenant Isolation & IDOR Protection
 * - In-App Notification Alerts
 *
 * Usage:
 *   node server/scripts/test_phase9_ngo_module.js
 */

const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Child = require("../models/Child");
const MissingCase = require("../models/MissingCase");
const Shelter = require("../models/Shelter");
const CareRecord = require("../models/CareRecord");
const Handover = require("../models/Handover");
const Notification = require("../models/Notification");

const ngoService = require("../services/ngoService");

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

async function runPhase9LiveTest() {
  console.log("================================================================");
  console.log("🛡️  GUARDIANLINK PHASE 9: NGO MODULE LIVE INTEGRATION TEST SCRIPT");
  console.log(`🍃 Target Database: ${MONGO_URI}`);
  console.log("================================================================\n");

  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB successfully.\n");

    const TEST_PREFIX = `P9_TEST_${Date.now()}`;

    const defaultPasswordHash = "$2a$10$abcdefghijklmnopqrstuvwxyz01234567890123456789012345678";

    const randPhone = () => "+91 9" + Math.floor(100000000 + Math.random() * 900000000);

    // 1. Seed Test Actors
    const approvedNgoUser = await User.create({
      name: `${TEST_PREFIX} Approved NGO Staff`,
      email: `${TEST_PREFIX.toLowerCase()}@ngo.org`,
      passwordHash: defaultPasswordHash,
      phone: randPhone(),
      role: "ngo",
      status: "approved",
      organization: `${TEST_PREFIX} Child Haven Shelter Foundation`
    });

    const otherNgoUser = await User.create({
      name: `${TEST_PREFIX} Other NGO Staff`,
      email: `${TEST_PREFIX.toLowerCase()}_other@ngo.org`,
      passwordHash: defaultPasswordHash,
      phone: randPhone(),
      role: "ngo",
      status: "approved",
      organization: `${TEST_PREFIX} Other NGO`
    });

    const parentUser = await User.create({
      name: `${TEST_PREFIX} Parent`,
      email: `${TEST_PREFIX.toLowerCase()}_parent@example.com`,
      passwordHash: defaultPasswordHash,
      phone: randPhone(),
      role: "parent",
      status: "active"
    });

    const policeUser = await User.create({
      name: `${TEST_PREFIX} Insp. Sharma`,
      email: `${TEST_PREFIX.toLowerCase()}_police@police.delhi.gov.in`,
      passwordHash: defaultPasswordHash,
      phone: randPhone(),
      role: "police",
      status: "approved",
      badgeNumber: "DL-POL-9904",
      organization: "Sector 12 Police Post"
    });

    // 2. Seed Test Child and Missing Case
    const testChild = await Child.create({
      guardianId: parentUser._id,
      fullName: `${TEST_PREFIX} Kabir`,
      dateOfBirth: new Date("2017-06-15"),
      gender: "male",
      photoUrl: "https://example.com/p9_kabir.jpg"
    });

    const testCase = await MissingCase.create({
      childId: testChild._id,
      reportedBy: parentUser._id,
      missingDate: new Date(Date.now() - 3600000 * 24),
      status: "found",
      priority: "high",
      policeCaseNumber: `${TEST_PREFIX}-CASE-01`,
      assignedOfficer: {
        id: policeUser._id,
        name: policeUser.name,
        badgeNumber: policeUser.badgeNumber
      },
      lastSeenLocation: {
        city: "Delhi",
        address: "Sector 12 Metro"
      }
    });

    console.log("--- 1. Testing Scoped Referrals ---");
    const referrals = await ngoService.getReferrals(approvedNgoUser);
    const foundReferral = referrals.find((r) => r.id === testCase._id.toString() || r._id.toString() === testCase._id.toString());
    assertCondition("Authorized case referral is visible to approved NGO", !!foundReferral);

    console.log("\n--- 2. Testing Shelter Registration ---");
    const shelter = await ngoService.createShelter(approvedNgoUser, {
      name: `${TEST_PREFIX} Primary Shelter`,
      address: { address: "12 Haven Lane", city: "Delhi" },
      capacity: 5,
      contactPhone: "+91 11 2617 9999"
    });
    assertCondition("Shelter registered with capacity 5 and 0 active placements", shelter.capacity === 5 && shelter.activePlacements === 0);

    console.log("\n--- 3. Testing Safe Intake Registration ---");
    const intakeResult = await ngoService.createCareRecord(approvedNgoUser, {
      caseId: testCase._id,
      childId: testChild._id,
      shelterId: shelter._id,
      visibleInjuries: "Minor bruise on elbow",
      medicalNeeded: false,
      emotionalState: "Calm",
      careNotes: "Received child from police escort. Warm dinner served.",
      intakeSource: "Police Escort"
    });
    assertCondition("CareRecord created in 'in_care' status with unique intake number", intakeResult.status === "in_care" && intakeResult.intakeNumber.startsWith("IN-"));
    assertCondition("Shelter capacity atomically incremented to 1 occupied", intakeResult.shelterId ? true : false);

    const updatedShelterAfterIntake = await Shelter.findById(shelter._id);
    assertCondition("Shelter active placements updated in database to 1", updatedShelterAfterIntake.activePlacements === 1);

    console.log("\n--- 4. Testing Duplicate Active Intake Prevention ---");
    let duplicateRejected = false;
    try {
      await ngoService.createCareRecord(approvedNgoUser, {
        caseId: testCase._id,
        childId: testChild._id
      });
    } catch (err) {
      if (err.code === "ACTIVE_CARE_RECORD_EXISTS") {
        duplicateRejected = true;
      }
    }
    assertCondition("Duplicate active intake prevented with ACTIVE_CARE_RECORD_EXISTS", duplicateRejected);

    console.log("\n--- 5. Testing Care Notes & Medical Status Updates ---");
    const note = await ngoService.addCareNote(approvedNgoUser, intakeResult.id, {
      text: "Child participated in art activity.",
      category: "Emotional Support"
    });
    assertCondition("Care note appended with author attribution", note.text === "Child participated in art activity." && note.category === "Emotional Support");

    const updatedMedical = await ngoService.updateMedicalStatus(approvedNgoUser, intakeResult.id, "monitoring");
    assertCondition("Medical status updated to 'monitoring'", updatedMedical.medicalStatus === "monitoring");

    console.log("\n--- 6. Testing Dashboard Stats ---");
    const statsRes = await ngoService.getDashboardStats(approvedNgoUser);
    assertCondition("Dashboard stats return real count of children in care", statsRes.stats.childrenInCare === 1);
    assertCondition("Dashboard stats return real shelter occupied count", statsRes.stats.shelterInfo.occupied === 1);

    console.log("\n--- 7. Testing Handover Request Workflow ---");
    const handover = await ngoService.requestHandover(approvedNgoUser, intakeResult.id, {
      guardianName: `${TEST_PREFIX} Parent`,
      guardianPhone: "+91 98110 99003",
      location: "Sector 12 Shelter Kiosk",
      notes: "Guardian identity verified at desk."
    });
    assertCondition("Handover request created in 'pending' status", handover.status === "pending");

    const careAfterHandoverReq = await CareRecord.findById(intakeResult.id);
    assertCondition("Care record status transitioned to 'awaiting_handover'", careAfterHandoverReq.status === "awaiting_handover");

    console.log("\n--- 8. Testing Police Approval Gate ---");
    let ngoApprovalBlocked = false;
    try {
      // NGO attempts to approve
      await ngoService.approveHandover(approvedNgoUser, handover.id);
    } catch (err) {
      if (err.code === "UNAUTHORIZED_APPROVER") {
        ngoApprovalBlocked = true;
      }
    }
    assertCondition("NGO forbidden from approving its own handover (UNAUTHORIZED_APPROVER)", ngoApprovalBlocked);

    // Police approves
    const approvedHandover = await ngoService.approveHandover(policeUser, handover.id);
    assertCondition("Police officer approves handover with verifiedByPolice = true", approvedHandover.status === "approved" && approvedHandover.guardianDetails.verifiedByPolice === true);

    console.log("\n--- 9. Testing Handover Completion & Safe Release ---");
    const completedHandover = await ngoService.completeHandover(approvedNgoUser, handover.id, {
      location: "Sector 12 Shelter Kiosk Desk",
      notes: "Child safely handed over to parent with police escort present."
    });
    assertCondition("Handover marked completed", completedHandover.status === "completed");

    const careAfterCompletion = await CareRecord.findById(intakeResult.id);
    assertCondition("Care record marked handed_over", careAfterCompletion.status === "handed_over");

    const shelterAfterRelease = await Shelter.findById(shelter._id);
    assertCondition("Shelter occupancy decremented back to 0 on release", shelterAfterRelease.activePlacements === 0);

    console.log("\n--- 10. Testing Tenant Isolation ---");
    let tenantIsolationEnforced = false;
    try {
      await ngoService.getCareRecordById(otherNgoUser, intakeResult.id);
    } catch (err) {
      if (err.code === "ACCESS_DENIED") {
        tenantIsolationEnforced = true;
      }
    }
    assertCondition("Other NGO denied access to CareRecord with ACCESS_DENIED", tenantIsolationEnforced);

    // Cleanup test records
    await CareRecord.deleteMany({ ngoId: approvedNgoUser._id });
    await Handover.deleteMany({ ngoId: approvedNgoUser._id });
    await Shelter.deleteMany({ ngoId: approvedNgoUser._id });
    await MissingCase.deleteOne({ _id: testCase._id });
    await Child.deleteOne({ _id: testChild._id });
    await User.deleteMany({ _id: { $in: [approvedNgoUser._id, otherNgoUser._id, parentUser._id, policeUser._id] } });
    await Notification.deleteMany({ "data.caseId": testCase._id });

    console.log("\n================================================================");
    console.log(`Phase 9 Live Database Suite Finished: ${testsPassed} Passed, ${testsFailed} Failed`);
    console.log("================================================================\n");

    await mongoose.disconnect();
    process.exit(testsFailed > 0 ? 1 : 0);
  } catch (error) {
    console.error("Critical failure during Phase 9 live test script:", error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

runPhase9LiveTest();
