/**
 * GuardianLink — Phase 6.9: Live Citizen Photo Search Integration & Privacy Boundary Test
 *
 * Verifies end-to-end integration with live FastAPI AI service and MongoDB:
 * 1. Health checks the live AI microservice (http://127.0.0.1:8000)
 * 2. Connects to MongoDB (localhost:27017/guardianlink)
 * 3. Enrolls a synthetic child biometric vector into Qdrant
 * 4. Step A: Search before case filing -> Discloses ZERO candidates (fail-closed check)
 * 5. Step B: Search with closed case -> Discloses ZERO candidates (closed-case check)
 * 6. Step C: Search with inactive child -> Discloses ZERO candidates (inactive-child check)
 * 7. Step D: Search with active case -> Discloses exactly 1 candidate with qualified lead metadata
 * 8. Step E: Verifies zero PII leakage (no guardianId, contact, medical notes, or raw vectors)
 * 9. Cleans up synthetic MongoDB records and Qdrant vector point
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Child = require("../models/Child");
const MissingCase = require("../models/MissingCase");
const { enrollChildBiometric } = require("../services/childBiometricService");
const { searchMissingChildPhoto } = require("../services/citizenPhotoSearchService");
const aiService = require("../services/aiService");

const TEST_ASSET_PATH = path.join(__dirname, "../../ai-service/tests/assets/test.png");
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/guardianlink";

async function runLiveSearchTest() {
  console.log("==================================================");
  console.log("🚀 GuardianLink Phase 6.9: Live Citizen Photo Search Test");
  console.log(`🍃 Target MongoDB: ${MONGO_URI}`);
  console.log(`📡 Target AI Microservice: ${process.env.AI_SERVICE_URL || "http://127.0.0.1:8000"}`);
  console.log("==================================================");

  // 1. Connect to MongoDB
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ 1. Connected to MongoDB successfully.");
  } catch (dbErr) {
    console.warn("⚠️ Could not connect to MongoDB:", dbErr.message);
    return { skipped: true, reason: dbErr.message };
  }

  // 2. Health probe AI service
  try {
    const health = await aiService.healthCheck();
    console.log("✅ 2. AI Service Health:", JSON.stringify(health));
    if (!health.isHealthy) {
      console.warn("⚠️ AI Service is degraded; aborting live test.");
      await mongoose.disconnect();
      return { skipped: true, reason: "AI service degraded" };
    }
  } catch (aiErr) {
    console.warn("⚠️ Could not reach AI service:", aiErr.message);
    await mongoose.disconnect();
    return { skipped: true, reason: "AI service unreachable" };
  }

  // 3. Load Test Image
  if (!fs.existsSync(TEST_ASSET_PATH)) {
    console.error("❌ Test image asset not found at:", TEST_ASSET_PATH);
    await mongoose.disconnect();
    return { skipped: true, reason: "Missing test.png asset" };
  }
  const imageBuffer = fs.readFileSync(TEST_ASSET_PATH);
  console.log(`📷 3. Loaded test portrait asset (${imageBuffer.length} bytes)`);

  const syntheticGuardianId = new mongoose.Types.ObjectId();
  const testChild = new Child({
    guardianId: syntheticGuardianId,
    fullName: `LiveSearch Child ${Date.now()}`,
    dateOfBirth: new Date("2017-08-10"),
    gender: "male",
    description: "Distinct birthmark on forehead",
    photoUrl: "https://res.cloudinary.com/guardianlink/image/upload/v12345/live_child.jpg",
    cloudinaryPublicId: `guardianlink/children/livesearch_${Date.now()}`,
    biometricStatus: "pending",
    status: "active",
    parentContact: "+91-9999888877",
    medicalNotes: "Type 1 Diabetic - requires insulin"
  });

  await testChild.save();
  console.log(`👶 4. Created synthetic Child record in MongoDB: id=${testChild._id}`);

  let missingCase = null;

  try {
    // 5. Enroll child biometric in Qdrant
    console.log("⏳ Enrolling biometric profile in live AI service...");
    const enrollOutcome = await enrollChildBiometric(testChild._id, {
      imageBuffer,
      mimeType: "image/png",
      filename: "test.png"
    });
    console.log("✅ 5. Child enrolled in Qdrant:", JSON.stringify(enrollOutcome));

    // 6. Test A: Search before MissingCase is filed -> MUST return 0 candidates (Fail Closed)
    console.log("⏳ 6. Testing Privacy Boundary: Search before missing case is filed...");
    const searchBeforeCase = await searchMissingChildPhoto({
      imageBuffer,
      mimeType: "image/png",
      filename: "test.png"
    });
    console.log(`   - matchFound: ${searchBeforeCase.matchFound}`);
    console.log(`   - totalCandidates: ${searchBeforeCase.totalCandidates}`);
    if (searchBeforeCase.matchFound !== false || searchBeforeCase.candidates.length !== 0) {
      throw new Error("PRIVACY BREACH: Enrolled child without missing case was disclosed!");
    }
    console.log("✅ 6. PASS: Child without missing case was safely excluded.");

    // 7. Test B: Search with closed/reunited case -> MUST return 0 candidates
    console.log("⏳ 7. Testing Privacy Boundary: Search with reunited case...");
    missingCase = new MissingCase({
      caseNumber: `CASE-LIVE-${Date.now()}`,
      childId: testChild._id,
      reportedBy: syntheticGuardianId,
      status: "reunited", // Ineligible status
      priority: "medium",
      missingDate: new Date("2026-10-01"),
      lastSeenLocation: {
        city: "Mumbai",
        state: "Maharashtra"
      },
      lastSeenDescription: "Red shirt and grey sneakers",
      investigationNotes: "PRIVATE POLICE LOG: Sighting confirmed resolved"
    });
    await missingCase.save();

    const searchClosedCase = await searchMissingChildPhoto({
      imageBuffer,
      mimeType: "image/png",
      filename: "test.png"
    });
    if (searchClosedCase.matchFound !== false || searchClosedCase.candidates.length !== 0) {
      throw new Error("PRIVACY BREACH: Child with reunited/closed case was disclosed!");
    }
    console.log("✅ 7. PASS: Reunited case was safely excluded.");

    // 8. Test C: Search with inactive child record -> MUST return 0 candidates
    console.log("⏳ 8. Testing Privacy Boundary: Search with inactive Child status...");
    missingCase.status = "active";
    await missingCase.save();
    testChild.status = "inactive";
    await testChild.save();

    const searchInactiveChild = await searchMissingChildPhoto({
      imageBuffer,
      mimeType: "image/png",
      filename: "test.png"
    });
    if (searchInactiveChild.matchFound !== false || searchInactiveChild.candidates.length !== 0) {
      throw new Error("PRIVACY BREACH: Inactive child record was disclosed!");
    }
    console.log("✅ 8. PASS: Inactive child record was safely excluded.");

    // 9. Test D: Active case + Active child -> MUST return disclosable candidate lead
    console.log("⏳ 9. Testing Authorized Disclosure: Active case + Active child...");
    testChild.status = "active";
    await testChild.save();

    const searchActive = await searchMissingChildPhoto({
      imageBuffer,
      mimeType: "image/png",
      filename: "test.png"
    });
    console.log(`   - matchFound: ${searchActive.matchFound}`);
    console.log(`   - totalCandidates: ${searchActive.totalCandidates}`);
    if (!searchActive.matchFound || searchActive.candidates.length !== 1) {
      throw new Error(`Expected exactly 1 candidate, got ${searchActive.candidates.length}`);
    }

    const candidate = searchActive.candidates[0];
    console.log("🎯 Disclosed Candidate Lead Object:");
    console.log(JSON.stringify(candidate, null, 2));

    if (candidate.childId !== testChild._id.toString()) {
      throw new Error(`Candidate childId mismatch: expected ${testChild._id}, got ${candidate.childId}`);
    }
    if (candidate.caseNumber !== missingCase.caseNumber) {
      throw new Error(`Candidate caseNumber mismatch`);
    }
    if (typeof candidate.similarity !== "number" || candidate.similarity < 0.85) {
      throw new Error(`Unexpected similarity score for identical image: ${candidate.similarity}`);
    }
    if (candidate.matchConfidence !== "HIGH") {
      throw new Error(`Expected HIGH matchConfidence, got ${candidate.matchConfidence}`);
    }

    // 10. Test E: Strict Privacy Allowlist Verification
    console.log("⏳ 10. Verifying PII and confidential field exclusion...");
    const disallowedFields = [
      "guardianId",
      "parentContact",
      "medicalNotes",
      "homeAddress",
      "policeCaseNumber",
      "investigationNotes",
      "rawEmbedding",
      "vector"
    ];
    for (const f of disallowedFields) {
      if (candidate[f] !== undefined) {
        throw new Error(`PRIVACY VIOLATION: Disallowed sensitive field '${f}' present in public candidate object!`);
      }
    }
    console.log("✅ 10. PASS: All sensitive guardian PII and investigation notes excluded.");

    // 11. Cleanup
    console.log("🧹 11. Cleaning up test data...");
    await aiService.deleteFaceProfile(testChild._id.toString());
    await MissingCase.findByIdAndDelete(missingCase._id);
    await Child.findByIdAndDelete(testChild._id);
    console.log("✅ Cleaned up Qdrant vector point and MongoDB documents.");

    console.log("==================================================");
    console.log("🎉 ALL LIVE INTEGRATION PRIVACY VERIFICATIONS PASSED!");
    console.log("==================================================");
    return { skipped: false, success: true };
  } catch (err) {
    console.error("❌ Live test failure:", err);
    try {
      await aiService.deleteFaceProfile(testChild._id.toString());
      if (missingCase) await MissingCase.findByIdAndDelete(missingCase._id);
      await Child.findByIdAndDelete(testChild._id);
    } catch (_) {}
    throw err;
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
  }
}

if (require.main === module) {
  runLiveSearchTest()
    .then((r) => process.exit(r.skipped ? 0 : 0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runLiveSearchTest };
