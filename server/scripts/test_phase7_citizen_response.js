/**
 * GuardianLink — Phase 7: Citizen Response System Integration Test Script
 *
 * Verifies the complete Citizen Response System against MongoDB:
 * Citizen Login -> AI Biometric Candidate -> Fail-Closed Eligibility ->
 * Sighting Submission (Location + Mandatory Safety Confirmation) ->
 * Persistent MongoDB Sighting -> Authorized Police & Guardian Alerts ->
 * Law Enforcement Review.
 *
 * Usage:
 *   node server/scripts/test_phase7_citizen_response.js
 */

const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Child = require("../models/Child");
const MissingCase = require("../models/MissingCase");
const Sighting = require("../models/Sighting");
const Notification = require("../models/Notification");

const sightingService = require("../services/sightingService");
const notificationService = require("../services/notificationService");
const { serializeCitizenCandidate } = require("../services/citizenPhotoSearchService");

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

async function runPhase7LiveTest() {
  console.log("================================================================");
  console.log("🛡️  GUARDIANLINK PHASE 7: CITIZEN RESPONSE SYSTEM INTEGRATION TEST");
  console.log(`🍃 Target Database: ${MONGO_URI}`);
  console.log("================================================================\n");

  // 1. Connect to Database
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ 1. MongoDB connection established successfully.\n");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }

  // Cleanup references to avoid orphaned fixtures
  const createdUserIds = [];
  let testChildId = null;
  let testCaseId = null;
  let closedCaseId = null;
  let createdSightingId = null;

  try {
    // ------------------------------------------------------------------------
    // SETUP: Create Synthetic Actors & Fixtures
    // ------------------------------------------------------------------------
    console.log("📋 Setting up test fixtures (Citizen, Guardian, Police, Child, Cases)...");

    // Citizen User
    const citizen = await User.create({
      name: "Phase7 Citizen Reporter",
      email: `p7.citizen.${Date.now()}@guardianlink.test`,
      phone: `919000${Math.floor(1000 + Math.random() * 9000)}`,
      passwordHash: "dummyHashForTestingOnly123!",
      role: "citizen",
      isActive: true,
      status: "active"
    });
    createdUserIds.push(citizen._id);

    // Other Citizen (for IDOR / privacy test)
    const otherCitizen = await User.create({
      name: "Phase7 Other Citizen",
      email: `p7.other.${Date.now()}@guardianlink.test`,
      phone: `919001${Math.floor(1000 + Math.random() * 9000)}`,
      passwordHash: "dummyHashForTestingOnly123!",
      role: "citizen",
      isActive: true,
      status: "active"
    });
    createdUserIds.push(otherCitizen._id);

    // Guardian Parent
    const guardian = await User.create({
      name: "Phase7 Verified Guardian",
      email: `p7.guardian.${Date.now()}@guardianlink.test`,
      phone: `919002${Math.floor(1000 + Math.random() * 9000)}`,
      passwordHash: "dummyHashForTestingOnly123!",
      role: "parent",
      isActive: true,
      status: "active"
    });
    createdUserIds.push(guardian._id);

    // Police Officer
    const police = await User.create({
      name: "Phase7 Police Officer",
      email: `p7.police.${Date.now()}@guardianlink.test`,
      phone: `919003${Math.floor(1000 + Math.random() * 9000)}`,
      passwordHash: "dummyHashForTestingOnly123!",
      role: "police",
      organization: "Sector 14 Police Post",
      isActive: true,
      status: "active"
    });
    createdUserIds.push(police._id);

    // Child Document
    const child = await Child.create({
      guardianId: guardian._id,
      fullName: "P7 Test Child Aarav",
      dateOfBirth: new Date("2016-05-15"),
      gender: "male",
      photoUrl: "https://res.cloudinary.com/guardianlink/image/upload/v123/p7test.jpg",
      status: "active"
    });
    testChildId = child._id;

    // Active MissingCase Document
    const activeCase = await MissingCase.create({
      childId: child._id,
      reportedBy: guardian._id,
      missingDate: new Date(Date.now() - 48 * 3600 * 1000),
      lastSeenLocation: {
        address: "Public Library Gate 2",
        city: "New Delhi",
        state: "Delhi",
        latitude: 28.6139,
        longitude: 77.2090
      },
      lastSeenDescription: "Wearing blue shirt and khaki trousers",
      status: "active",
      priority: "high"
    });
    testCaseId = activeCase._id;

    // Closed / Ineligible MissingCase Document
    const closedCase = await MissingCase.create({
      childId: child._id,
      reportedBy: guardian._id,
      missingDate: new Date(Date.now() - 120 * 3600 * 1000),
      lastSeenLocation: { city: "New Delhi", state: "Delhi" },
      status: "closed",
      priority: "low"
    });
    closedCaseId = closedCase._id;

    console.log("✅ Fixtures created successfully.\n");

    // ------------------------------------------------------------------------
    // SECTION 1: Privacy Allowlist & Candidate Resolution
    // ------------------------------------------------------------------------
    console.log("🔍 SECTION 1: Candidate Resolution & Privacy Allowlist");
    const aiCandidate = { childId: child._id.toString(), similarity: 0.892 };
    const serializedCandidate = serializeCitizenCandidate(aiCandidate, child, activeCase);

    assertCondition("Candidate serializer derives opaque candidateId", serializedCandidate.candidateId.startsWith("lead_"));
    assertCondition("Candidate serializer includes matchStatus='potential'", serializedCandidate.matchStatus === "potential");
    assertCondition("Candidate serializer includes canReportSighting=true", serializedCandidate.canReportSighting === true);
    assertCondition("Candidate serializer includes child name & approximate age", serializedCandidate.name === child.fullName && serializedCandidate.age !== null);
    assertCondition("Strict Privacy: Guardian phone number is NOT in candidate", serializedCandidate.guardianPhone === undefined && serializedCandidate.parentContact === undefined);
    assertCondition("Strict Privacy: Guardian email address is NOT in candidate", serializedCandidate.guardianEmail === undefined);
    assertCondition("Strict Privacy: Raw embeddings / vectors are NOT in candidate", serializedCandidate.embedding === undefined && serializedCandidate.faceEmbedding === undefined);

    // ------------------------------------------------------------------------
    // SECTION 2: Sighting Submission Validation & Re-validation
    // ------------------------------------------------------------------------
    console.log("\n📝 SECTION 2: Sighting Submission Validation & Security");

    // 2.1 Rejects anonymous submission
    try {
      await sightingService.submitSighting({
        caseId: activeCase._id.toString(),
        description: "Saw child sitting alone",
        safetyConfirmed: true,
        reportingUser: null
      });
      assertCondition("Rejects anonymous submission (401)", false);
    } catch (err) {
      assertCondition("Rejects anonymous submission (401)", err.status === 401 && err.code === "UNAUTHORIZED");
    }

    // 2.2 Rejects when safety confirmation is false
    try {
      await sightingService.submitSighting({
        caseId: activeCase._id.toString(),
        description: "Saw child near metro kiosk",
        safetyConfirmed: false,
        reportingUser: citizen
      });
      assertCondition("Rejects submission when safetyConfirmed === false (400)", false);
    } catch (err) {
      assertCondition("Rejects submission when safetyConfirmed === false (400)", err.code === "SAFETY_CONFIRMATION_REQUIRED");
    }

    // 2.3 Rejects when description is missing
    try {
      await sightingService.submitSighting({
        caseId: activeCase._id.toString(),
        description: "    ",
        safetyConfirmed: true,
        reportingUser: citizen
      });
      assertCondition("Rejects submission when description is empty (400)", false);
    } catch (err) {
      assertCondition("Rejects submission when description is empty (400)", err.code === "MISSING_DESCRIPTION");
    }

    // 2.4 Rejects invalid coordinates
    try {
      await sightingService.submitSighting({
        caseId: activeCase._id.toString(),
        description: "Saw child near metro kiosk",
        safetyConfirmed: true,
        location: { latitude: 95.0 }, // Out of range -90..90
        reportingUser: citizen
      });
      assertCondition("Rejects latitude > 90 (400 INVALID_COORDINATES)", false);
    } catch (err) {
      assertCondition("Rejects latitude > 90 (400 INVALID_COORDINATES)", err.code === "INVALID_COORDINATES");
    }

    // 2.5 Revalidates case eligibility at submission time: Ineligible / Closed case
    try {
      await sightingService.submitSighting({
        caseId: closedCase._id.toString(),
        description: "Saw child near bus terminal",
        safetyConfirmed: true,
        reportingUser: citizen
      });
      assertCondition("Revalidates eligibility: Closed case is rejected (409)", false);
    } catch (err) {
      assertCondition("Revalidates eligibility: Closed case is rejected (409)", err.status === 409 && err.code === "CASE_NOT_ELIGIBLE");
    }

    // ------------------------------------------------------------------------
    // SECTION 3: Successful Sighting Persistence in MongoDB
    // ------------------------------------------------------------------------
    console.log("\n💾 SECTION 3: Sighting Persistence & Database State");

    const validSubmission = await sightingService.submitSighting({
      caseId: activeCase._id.toString(),
      childId: new mongoose.Types.ObjectId().toString(), // Attempted spoof of childId
      reportedBy: otherCitizen._id.toString(), // Attempted spoof of reportedBy
      status: "verified", // Attempted self-verification
      description: "Child was sitting quietly on a wooden bench near the library reading room.",
      safetyConfirmed: true,
      location: {
        address: "Sector 14 Public Library Kiosk",
        city: "New Delhi",
        state: "Delhi",
        landmark: "Near Metro Exit 3",
        pinCode: "110001",
        latitude: 28.6139,
        longitude: 77.2090
      },
      appearance: {
        approxAge: "8 years",
        approxGender: "Male",
        clothing: "Navy blue polo shirt, khaki shorts",
        distinctiveFeatures: "Small scratch on left wrist"
      },
      safetyState: "Healthy & Safe",
      reportingUser: citizen
    });

    assertCondition("Sighting submission returns success with persisted sighting", Boolean(validSubmission.sighting && validSubmission.sighting.id));
    createdSightingId = validSubmission.sighting.id;

    // Verify record in MongoDB directly
    const persistedSighting = await Sighting.findById(createdSightingId);
    assertCondition("Sighting exists in MongoDB collection", Boolean(persistedSighting));
    assertCondition("Generated canonical sightingNumber (SR-...)", persistedSighting.sightingNumber.startsWith("SR-"));
    assertCondition("childId resolved strictly from MissingCase (Anti-spoofing)", persistedSighting.childId.toString() === child._id.toString());
    assertCondition("reportedBy derived strictly from session (Anti-spoofing)", persistedSighting.reportedBy.toString() === citizen._id.toString());
    assertCondition("status initialized strictly to 'submitted'", persistedSighting.status === "submitted");
    assertCondition("safetyConfirmed saved as true in MongoDB", persistedSighting.safetyConfirmed === true);

    // ------------------------------------------------------------------------
    // SECTION 4: Authorized Responder & Guardian Notifications
    // ------------------------------------------------------------------------
    console.log("\n🔔 SECTION 4: In-App Notification Alerts");

    const notifications = await Notification.find({
      "data.sightingId": persistedSighting._id
    });

    assertCondition("Notifications generated for authorized recipients", notifications.length >= 2);

    const policeNotif = notifications.find((n) => n.recipientRole === "police");
    assertCondition("Police received sighting notification", Boolean(policeNotif));
    if (policeNotif) {
      assertCondition("Police alert has deliveryStatus='confirmed'", policeNotif.deliveryStatus === "confirmed");
      assertCondition("Police alert contains report reference", policeNotif.message.includes(persistedSighting.reportNumber));
    }

    const guardianNotif = notifications.find((n) => n.recipientRole === "parent");
    assertCondition("Guardian received sighting notification", Boolean(guardianNotif));
    if (guardianNotif) {
      assertCondition("Guardian alert has deliveryStatus='confirmed'", guardianNotif.deliveryStatus === "confirmed");
      assertCondition("Guardian alert includes child name", guardianNotif.title.includes(child.fullName));
      assertCondition("Strict Privacy: Guardian phone number NOT in alert", !guardianNotif.message.includes(guardian.phone));
      assertCondition("Strict Privacy: Guardian email NOT in alert", !guardianNotif.message.includes(guardian.email));
    }

    // ------------------------------------------------------------------------
    // SECTION 5: Sighting Retrieval & IDOR Protection
    // ------------------------------------------------------------------------
    console.log("\n🔒 SECTION 5: Sighting Retrieval & IDOR Access Controls");

    // Reporter can retrieve own report
    const reporterView = await sightingService.getSightingById(createdSightingId, citizen);
    assertCondition("Reporter can retrieve their own sighting", reporterView.id === createdSightingId.toString());

    // Other citizen CANNOT retrieve report (IDOR check)
    try {
      await sightingService.getSightingById(createdSightingId, otherCitizen);
      assertCondition("Unrelated citizen rejected from viewing report (403 FORBIDDEN)", false);
    } catch (err) {
      assertCondition("Unrelated citizen rejected from viewing report (403 FORBIDDEN)", err.status === 403 && err.code === "FORBIDDEN");
    }

    // Police can retrieve report and view exact coordinates
    const policeView = await sightingService.getSightingById(createdSightingId, police);
    assertCondition("Police can retrieve sighting report", policeView.id === createdSightingId.toString());
    assertCondition("Police view contains sensitive coordinates", policeView.location.latitude !== undefined && policeView.location.longitude !== undefined);

    // List reports for citizen
    const citizenList = await sightingService.getMySightings(citizen._id);
    assertCondition("Citizen can list their submitted reports via getMySightings", citizenList.length >= 1 && citizenList[0].id === createdSightingId.toString());

    // ------------------------------------------------------------------------
    // SECTION 6: Law Enforcement Review Flow
    // ------------------------------------------------------------------------
    console.log("\n⚖️ SECTION 6: Law Enforcement Review Workflow");

    // Police reviews sighting status
    const reviewed = await sightingService.reviewSighting(
      createdSightingId,
      { status: "verified", reviewNotes: "Field unit dispatched and verified match." },
      police
    );

    assertCondition("Police successfully updated status to 'verified'", reviewed.status === "verified");

    const refreshedSighting = await Sighting.findById(createdSightingId);
    assertCondition("Status 'verified' persisted in MongoDB", refreshedSighting.status === "verified");
    assertCondition("reviewedBy recorded as police officer ID", refreshedSighting.reviewedBy.toString() === police._id.toString());
    assertCondition("reviewedAt recorded as timestamp", Boolean(refreshedSighting.reviewedAt));
    assertCondition("Review notes persisted", refreshedSighting.reviewNotes === "Field unit dispatched and verified match.");

    // Sighting update triggers notification to reporting citizen
    const citizenReviewNotifs = await Notification.find({
      recipientId: citizen._id,
      type: "sighting_reviewed"
    });
    assertCondition("Citizen receives notification when report is reviewed", citizenReviewNotifs.length >= 1);

    // ------------------------------------------------------------------------
    // SECTION 7: Failure Recovery Resilience
    // ------------------------------------------------------------------------
    console.log("\n🛡️ SECTION 7: Failure Recovery Resilience");

    // Notification failure does NOT delete or rollback sighting
    const originalCreate = notificationService.notifyAuthorizedRespondersForSighting;
    notificationService.notifyAuthorizedRespondersForSighting = async () => {
      throw new Error("Simulated Notification Network Outage");
    };

    try {
      const resilientReport = await sightingService.submitSighting({
        caseId: activeCase._id.toString(),
        description: "Another observation under degraded notification conditions.",
        safetyConfirmed: true,
        reportingUser: citizen
      });
      assertCondition("Sighting persists even when notification dispatch fails", Boolean(resilientReport.sighting && resilientReport.sighting.id));

      const checkInDb = await Sighting.findById(resilientReport.sighting.id);
      assertCondition("Degraded-notification sighting confirmed in MongoDB", Boolean(checkInDb));
      if (checkInDb) {
        await Sighting.findByIdAndDelete(checkInDb._id);
      }
    } finally {
      notificationService.notifyAuthorizedRespondersForSighting = originalCreate;
    }

  } catch (unexpectedError) {
    console.error("❌ Unexpected test execution error:", unexpectedError);
    testsFailed++;
  } finally {
    // ------------------------------------------------------------------------
    // CLEANUP: Clean synthetic test records
    // ------------------------------------------------------------------------
    console.log("\n🧹 Cleaning up test fixtures from MongoDB...");
    try {
      if (createdSightingId) {
        await Sighting.findByIdAndDelete(createdSightingId);
      }
      if (testCaseId) {
        await MissingCase.findByIdAndDelete(testCaseId);
      }
      if (closedCaseId) {
        await MissingCase.findByIdAndDelete(closedCaseId);
      }
      if (testChildId) {
        await Child.findByIdAndDelete(testChildId);
      }
      for (const uid of createdUserIds) {
        await User.findByIdAndDelete(uid);
        await Notification.deleteMany({ recipientId: uid });
        await Notification.deleteMany({ senderId: uid });
      }
      console.log("✅ Fixture cleanup complete.");
    } catch (cleanupErr) {
      console.warn("⚠️ Cleanup warning:", cleanupErr.message);
    }

    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected.");
  }

  // ------------------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------------------
  console.log("\n================================================================");
  console.log(`📊 PHASE 7 INTEGRATION TEST SUMMARY`);
  console.log(`   Passed: ${testsPassed}`);
  console.log(`   Failed: ${testsFailed}`);
  console.log("================================================================");

  if (testsFailed > 0) {
    console.error("\n❌ PHASE 7 STATUS: FAILED");
    process.exit(1);
  } else {
    console.log("\n🎉 PHASE 7 STATUS: PASS — ALL CITIZEN RESPONSE CRITERIA MET");
    process.exit(0);
  }
}

runPhase7LiveTest();
