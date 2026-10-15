/**
 * GuardianLink — Phase 6.7: Optional Live Integration Smoke Test
 *
 * Runs end-to-end integration tests against a running AI microservice container:
 * 1. Probes GET /health
 * 2. Enrolls a synthetic test child (using authorized test asset)
 * 3. Searches for the enrolled child and validates similarity score >= 0.9
 * 4. Deletes the synthetic child vector
 * 5. Verifies subsequent search returns 0 candidates
 * 6. Guarantees complete cleanup of test data
 *
 * Prerequisite:
 * Docker Compose services `qdrant` and `ai-service` must be running:
 *   docker compose up -d qdrant ai-service
 */

const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const {
  AIServiceClient,
  healthCheck,
  enrollFace,
  searchFace,
  deleteFaceProfile
} = require("../services/aiService");

const TEST_ASSET_PATH = path.join(__dirname, "../../ai-service/tests/assets/test.png");

async function runLiveSmokeTest() {
  console.log("==================================================");
  console.log("🔍 GuardianLink Phase 6.7: Live AI Client Smoke Test");
  console.log(`📡 Target URL: ${process.env.AI_SERVICE_URL || "http://127.0.0.1:8000"}`);
  console.log("==================================================");

  // 1. Health Probe
  let health;
  try {
    health = await healthCheck();
    console.log("✅ 1. Health Check Response:", JSON.stringify(health));
  } catch (err) {
    console.warn(`⚠️ [SMOKE TEST SKIPPED / BLOCKED]: Could not connect to AI microservice at ${process.env.AI_SERVICE_URL || "http://127.0.0.1:8000"}.`);
    console.warn(`   Reason: ${err.message}`);
    console.warn("   To run live integration tests, ensure Docker containers are active:");
    console.warn("   docker compose up -d qdrant ai-service");
    return { skipped: true, reason: err.message };
  }

  if (!health.isHealthy) {
    console.warn("⚠️ AI Microservice is in degraded state:", health);
  }

  // 2. Read Test Image
  if (!fs.existsSync(TEST_ASSET_PATH)) {
    console.error(`❌ Test image asset not found at ${TEST_ASSET_PATH}`);
    return { skipped: true, reason: "Missing test.png asset" };
  }

  const imageBuffer = fs.readFileSync(TEST_ASSET_PATH);
  const syntheticChildId = `smoke_test_child_${Date.now()}`;
  console.log(`🧪 Using synthetic childId: ${syntheticChildId} (${imageBuffer.length} bytes image)`);

  let enrollRes;
  try {
    // 3. Enroll Face
    console.log("⏳ Enrolling reference facial portrait...");
    enrollRes = await enrollFace({
      childId: syntheticChildId,
      imageBuffer,
      mimeType: "image/png",
      filename: "test.png"
    });
    console.log("✅ 2. Enrollment Succeeded:", JSON.stringify(enrollRes));

    if (!enrollRes.success || enrollRes.childId !== syntheticChildId || !enrollRes.faceProfileId) {
      throw new Error(`Enrollment response contract mismatch: ${JSON.stringify(enrollRes)}`);
    }

    // 4. Biometric Similarity Search
    console.log("⏳ Executing similarity search query with reference image...");
    const searchRes = await searchFace({
      imageBuffer,
      mimeType: "image/png",
      filename: "test.png",
      limit: 5,
      threshold: 0.60
    });
    console.log("✅ 3. Search Succeeded:", JSON.stringify(searchRes));

    const matched = searchRes.candidates.find((c) => c.childId === syntheticChildId);
    if (!matched) {
      throw new Error(`Expected candidate ${syntheticChildId} was not returned in search results.`);
    }

    if (matched.similarity < 0.90) {
      throw new Error(`Similarity score ${matched.similarity} lower than expected for identical image.`);
    }
    console.log(`🎯 Candidate Match Verified: childId=${matched.childId}, similarity=${matched.similarity}`);

    // 5. Delete Face Profile
    console.log("⏳ Deleting synthetic child vector point...");
    const deleteRes = await deleteFaceProfile(syntheticChildId);
    console.log("✅ 4. Deletion Succeeded:", JSON.stringify(deleteRes));

    if (!deleteRes.success || deleteRes.childId !== syntheticChildId) {
      throw new Error(`Deletion response contract mismatch: ${JSON.stringify(deleteRes)}`);
    }

    // 6. Verify Post-Deletion Absence
    console.log("⏳ Verifying candidate is no longer returned post-deletion...");
    const postDeleteSearch = await searchFace({
      imageBuffer,
      mimeType: "image/png",
      filename: "test.png",
      limit: 5,
      threshold: 0.60
    });
    const stillPresent = postDeleteSearch.candidates.some((c) => c.childId === syntheticChildId);
    if (stillPresent) {
      throw new Error(`Candidate ${syntheticChildId} still found after deletion!`);
    }
    console.log("✅ 5. Post-Deletion Absence Confirmed. Cleaned up successfully.");

    console.log("==================================================");
    console.log("🎉 ALL LIVE INTEGRATION SMOKE TESTS PASSED!");
    console.log("==================================================");
    return { skipped: false, success: true };
  } catch (error) {
    console.error("❌ Smoke test error:", error);
    // Cleanup attempt on failure
    try {
      await deleteFaceProfile(syntheticChildId);
      console.log("🧹 Cleaned up synthetic child after error.");
    } catch (_) {}
    throw error;
  }
}

if (require.main === module) {
  runLiveSmokeTest()
    .then((result) => {
      if (result.skipped) {
        process.exit(0);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runLiveSmokeTest };
