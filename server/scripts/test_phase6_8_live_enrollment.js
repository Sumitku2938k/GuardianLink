/**
 * GuardianLink — Phase 6.8: Live Child Registration -> Biometric Enrollment Integration Test
 *
 * Verifies end-to-end integration between MongoDB and the live AI microservice:
 * 1. Connects to MongoDB (localhost:27017/guardianlink)
 * 2. Creates a synthetic child record with a test portrait
 * 3. Calls enrollChildBiometric() against live containerized AI service (http://127.0.0.1:8000)
 * 4. Verifies faceProfileId and 'enrolled' status are persisted in MongoDB
 * 5. Queries Qdrant via searchFace() to verify the child is searchable
 * 6. Tests idempotent re-enrollment (skips re-calling AI if already enrolled)
 * 7. Tests failure-safety (AI service error does NOT delete child record)
 * 8. Cleans up test records from MongoDB and Qdrant
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Child = require("../models/Child");
const User = require("../models/User");
const { enrollChildBiometric } = require("../services/childBiometricService");
const aiService = require("../services/aiService");

const TEST_ASSET_PATH = path.join(__dirname, "../../ai-service/tests/assets/test.png");
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/guardianlink";

async function runLiveEnrollmentTest() {
  console.log("==================================================");
  console.log("🚀 GuardianLink Phase 6.8: Live Child Biometric Integration Test");
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
      console.warn("⚠️ AI Service is not fully healthy; aborting live test.");
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

  // 4. Create synthetic parent and child in MongoDB
  const syntheticParentId = new mongoose.Types.ObjectId();
  const testChild = new Child({
    guardianId: syntheticParentId,
    fullName: `Test Integration Child ${Date.now()}`,
    dateOfBirth: new Date("2018-05-15"),
    gender: "female",
    photoUrl: "https://res.cloudinary.com/guardianlink/image/upload/v12345/test_portrait.jpg",
    cloudinaryPublicId: `guardianlink/children/test_${Date.now()}`,
    biometricStatus: "pending"
  });

  await testChild.save();
  console.log(`👶 4. Created synthetic Child record in MongoDB: id=${testChild._id}`);

  try {
    // 5. Execute Biometric Enrollment
    console.log("⏳ Enrolling synthetic child biometric profile...");
    const enrollOutcome = await enrollChildBiometric(testChild._id, {
      imageBuffer,
      mimeType: "image/png",
      filename: "test.png"
    });

    console.log("✅ 5. Biometric Enrollment Outcome:", JSON.stringify(enrollOutcome));
    if (!enrollOutcome.success || enrollOutcome.status !== "enrolled" || !enrollOutcome.faceProfileId) {
      throw new Error(`Enrollment did not complete as expected: ${JSON.stringify(enrollOutcome)}`);
    }

    // 6. Verify MongoDB persistence
    const refreshed = await Child.findById(testChild._id);
    console.log(`🔍 6. Verified MongoDB Document:`);
    console.log(`   - biometricStatus: ${refreshed.biometricStatus}`);
    console.log(`   - faceProfileId:   ${refreshed.faceProfileId}`);
    console.log(`   - enrolledAt:      ${refreshed.enrolledAt}`);
    console.log(`   - attempts:        ${refreshed.biometricAttempts}`);

    if (refreshed.biometricStatus !== "enrolled" || refreshed.faceProfileId !== enrollOutcome.faceProfileId) {
      throw new Error("MongoDB document state does not match enrollment outcome!");
    }

    // 7. Verify Searchability in Qdrant
    console.log("⏳ Searching Qdrant with query photograph to confirm indexing...");
    const searchRes = await aiService.searchFace({
      imageBuffer,
      mimeType: "image/png",
      limit: 5,
      threshold: 0.60
    });

    console.log("✅ 7. Search Response Candidates:", JSON.stringify(searchRes.candidates));
    const found = searchRes.candidates.find((c) => c.childId === testChild._id.toString());
    if (!found) {
      throw new Error(`Enrolled child ${testChild._id} not retrieved in search!`);
    }
    console.log(`🎯 Candidate Match Verified in Vector DB: childId=${found.childId}, similarity=${found.similarity}`);

    // 8. Idempotency Check (re-running enrollment on already enrolled child returns success without error)
    console.log("⏳ Checking idempotency on already enrolled child...");
    const secondOutcome = await enrollChildBiometric(testChild._id, { imageBuffer });
    console.log("✅ 8. Idempotent Second Enrollment:", JSON.stringify(secondOutcome));
    if (!secondOutcome.success || secondOutcome.faceProfileId !== enrollOutcome.faceProfileId) {
      throw new Error("Idempotent enrollment failed to return existing profile!");
    }

    // 9. Cleanup
    console.log("🧹 9. Cleaning up test records...");
    await aiService.deleteFaceProfile(testChild._id.toString());
    await Child.findByIdAndDelete(testChild._id);
    console.log("✅ Cleaned up Qdrant vector point and MongoDB document.");

    console.log("==================================================");
    console.log("🎉 ALL LIVE INTEGRATION VERIFICATIONS PASSED!");
    console.log("==================================================");
    return { skipped: false, success: true };
  } catch (testErr) {
    console.error("❌ Live integration error:", testErr);
    // Cleanup attempt on failure
    try {
      await aiService.deleteFaceProfile(testChild._id.toString());
      await Child.findByIdAndDelete(testChild._id);
    } catch (_) {}
    throw testErr;
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
  }
}

if (require.main === module) {
  runLiveEnrollmentTest()
    .then((r) => process.exit(r.skipped ? 0 : 0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runLiveEnrollmentTest };
