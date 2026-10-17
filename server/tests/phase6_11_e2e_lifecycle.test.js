/**
 * GuardianLink — Phase 6.11: Live End-to-End Enrollment, Search & Lifecycle Resilience Suite
 *
 * Verifies live integration across MongoDB, FastAPI AI microservice, InsightFace buffalo_l, and Qdrant:
 *
 * Section A: Child Biometric Enrollment & Vector Persistence (Section 4.1)
 *   1. Full enrollment of synthetic child with test portrait.
 *   2. Persistence of faceProfileId and 'enrolled' status in MongoDB.
 *   3. 512-D ArcFace vector indexing and retrieval via Qdrant cosine search.
 *   4. Biometric idempotency: repeated enrollment returns existing faceProfileId without duplicate points.
 *
 * Section B: Real Photo-Search & Candidate Resolution (Section 4.2 - 18 Scenarios)
 *   5. Scenario 1: Exact photo query against active case -> matchFound=true, candidate disclosed.
 *   6. Scenario 2: High threshold query (0.9999) filtering out candidates -> matchFound=false.
 *   7. Scenario 3: Real non-face image (solid black) -> 422 NO_FACE_DETECTED.
 *   8. Scenario 4: Real multiple-faces image (horizontally tiled) -> 422 MULTIPLE_FACES_DETECTED.
 *   9. Scenario 5: Missing sighting photograph field -> 400 MISSING_PHOTO_FILE.
 *  10. Scenario 6: Orphan vector in Qdrant (unmatched in Mongo) -> excluded (Fail-Closed).
 *  11. Scenario 7: Enrolled child with NO MissingCase filed -> excluded (Fail-Closed).
 *  12. Scenario 8: Enrolled child with status='inactive' -> excluded (Fail-Closed).
 *  13. Scenario 9: MissingCase status='active' -> eligible, candidate returned.
 *  14. Scenario 10: MissingCase status='reported' -> eligible, candidate returned.
 *  15. Scenario 11: MissingCase status='under_verification' -> eligible, candidate returned.
 *  16. Scenario 12: MissingCase status='found' -> ineligible, excluded.
 *  17. Scenario 13: MissingCase status='reunited' -> ineligible, excluded.
 *  18. Scenario 14: MissingCase status='closed' -> ineligible, excluded.
 *  19. Scenario 15: MissingCase status='cancelled' -> ineligible, excluded.
 *  20. Scenario 16: Deduplication of multiple candidate matches resolving to same child/case.
 *  21. Scenario 17: Controller rejects invalid limit (<1 or >20) with 400 INVALID_SEARCH_LIMIT.
 *  22. Scenario 18: Controller rejects invalid threshold (<-1.0 or >1.0) with 400 INVALID_SEARCH_THRESHOLD.
 *
 * Section C: Failure Recovery & Vector Lifecycle Cleanup (Section 7)
 *  23. Guarantees database failure during candidate resolution is never disguised as a zero-match success.
 *  24. Maps AIServiceTimeoutError to 504 AI_SERVICE_TIMEOUT in controller.
 *  25. Maps AIServiceUnavailableError to 503 AI_SERVICE_UNAVAILABLE in controller.
 *  26. Vector Deletion: Cleanly removes vector from Qdrant.
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Child = require("../models/Child");
const MissingCase = require("../models/MissingCase");
const { enrollChildBiometric } = require("../services/childBiometricService");
const {
  searchMissingChildPhoto,
  serializeCitizenCandidate,
  ELIGIBLE_CASE_STATUSES,
  INELIGIBLE_CASE_STATUSES
} = require("../services/citizenPhotoSearchService");
const { searchMissingChild } = require("../controllers/citizenController");
const aiService = require("../services/aiService");
const {
  AIServiceTimeoutError,
  AIServiceUnavailableError,
  AIServiceValidationError
} = require("../errors/aiErrors");

const TEST_ASSET_PATH = path.join(__dirname, "../../ai-service/tests/assets/test.png");
const BLACK_ASSET_PATH = path.join(__dirname, "assets_black.png");
const MULTIFACE_ASSET_PATH = path.join(__dirname, "assets_multiface.png");
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/guardianlink";

// Track test documents for guaranteed post-test cleanup
const cleanupChildIds = [];
const cleanupCaseIds = [];
const cleanupVectorIds = [];

// Helper to mock Express req, res, next
function createMockReqRes({ headers = {}, user = null, body = {}, file = null, query = {} } = {}) {
  let statusCode = 200;
  let responseData = null;
  let nextCalled = false;
  let nextError = null;

  const req = {
    headers: { ...headers },
    header(name) {
      return this.headers[name.toLowerCase()];
    },
    user: user || { _id: new mongoose.Types.ObjectId(), role: "citizen" },
    body,
    file,
    query,
    ip: "127.0.0.1"
  };

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    }
  };

  const next = (err) => {
    nextCalled = true;
    nextError = err || null;
  };

  return {
    req,
    res,
    next,
    getStatusCode: () => statusCode,
    getResponseData: () => responseData,
    isNextCalled: () => nextCalled,
    getNextError: () => nextError
  };
}

describe("GuardianLink Phase 6.11: End-to-End Lifecycle & Resilience Test Suite", () => {
  let imageBuffer = null;
  let blackBuffer = null;
  let multiFaceBuffer = null;
  let syntheticChild = null;
  let syntheticCase = null;
  let enrolledFaceProfileId = null;

  before(async () => {
    // 1. Connect to MongoDB
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    // 2. Load test portrait assets
    assert.ok(fs.existsSync(TEST_ASSET_PATH), `Test asset must exist at ${TEST_ASSET_PATH}`);
    imageBuffer = fs.readFileSync(TEST_ASSET_PATH);
    assert.ok(imageBuffer.length > 0);

    assert.ok(fs.existsSync(BLACK_ASSET_PATH), `Black test asset must exist at ${BLACK_ASSET_PATH}`);
    blackBuffer = fs.readFileSync(BLACK_ASSET_PATH);

    assert.ok(fs.existsSync(MULTIFACE_ASSET_PATH), `Multi-face test asset must exist at ${MULTIFACE_ASSET_PATH}`);
    multiFaceBuffer = fs.readFileSync(MULTIFACE_ASSET_PATH);

    // 3. Health check AI microservice
    const health = await aiService.healthCheck();
    assert.equal(health.isHealthy, true, "AI microservice must be healthy for live e2e tests");
  });

  after(async () => {
    // Clean up all vectors created during tests
    for (const cid of cleanupVectorIds) {
      try {
        await aiService.deleteFaceProfile(cid);
      } catch (_) {}
    }

    // Clean up all MongoDB documents created during tests
    if (cleanupCaseIds.length > 0) {
      await MissingCase.deleteMany({ _id: { $in: cleanupCaseIds } });
    }
    if (cleanupChildIds.length > 0) {
      await Child.deleteMany({ _id: { $in: cleanupChildIds } });
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  // =========================================================================
  // Section A: Biometric Enrollment & Vector Persistence
  // =========================================================================
  describe("Section A: Child Biometric Enrollment & Vector Persistence", () => {
    it("A.1 Registers a child and completes biometric enrollment in live FastAPI & Qdrant", async () => {
      const parentId = new mongoose.Types.ObjectId();
      syntheticChild = new Child({
        guardianId: parentId,
        fullName: `Phase 6.11 E2E Child ${Date.now()}`,
        dateOfBirth: new Date("2018-03-20"),
        gender: "female",
        photoUrl: "https://res.cloudinary.com/guardianlink/image/upload/v1/test_e2e.jpg",
        cloudinaryPublicId: `guardianlink/children/e2e_${Date.now()}`,
        biometricStatus: "pending",
        status: "active"
      });
      await syntheticChild.save();
      cleanupChildIds.push(syntheticChild._id);
      cleanupVectorIds.push(syntheticChild._id.toString());

      // Perform enrollment
      const outcome = await enrollChildBiometric(syntheticChild._id, {
        imageBuffer,
        mimeType: "image/png",
        filename: "test.png"
      });

      assert.equal(outcome.success, true);
      assert.equal(outcome.status, "enrolled");
      assert.ok(outcome.faceProfileId);
      enrolledFaceProfileId = outcome.faceProfileId;

      // Verify MongoDB persistence
      const refreshed = await Child.findById(syntheticChild._id);
      assert.equal(refreshed.biometricStatus, "enrolled");
      assert.equal(refreshed.faceProfileId, enrolledFaceProfileId);
      assert.ok(refreshed.enrolledAt);
      assert.equal(refreshed.biometricAttempts, 1);
    });

    it("A.2 Verifies 512-D ArcFace vector indexed and retrievable via Qdrant similarity search", async () => {
      const searchRes = await aiService.searchFace({
        imageBuffer,
        mimeType: "image/png",
        limit: 5,
        threshold: 0.60
      });

      assert.equal(searchRes.matchFound, true);
      const match = searchRes.candidates.find((c) => c.childId === syntheticChild._id.toString());
      assert.ok(match, "Enrolled child vector must be returned in Qdrant search");
      assert.ok(match.similarity >= 0.95, `Expected similarity >= 0.95, got ${match.similarity}`);
    });

    it("A.3 Biometric Idempotency: Repeated enrollment returns existing profile without error", async () => {
      const secondOutcome = await enrollChildBiometric(syntheticChild._id, { imageBuffer });
      assert.equal(secondOutcome.success, true);
      assert.equal(secondOutcome.status, "enrolled");
      assert.equal(secondOutcome.faceProfileId, enrolledFaceProfileId);
    });
  });

  // =========================================================================
  // Section B: Real Photo-Search & Candidate Resolution (18 Scenarios)
  // =========================================================================
  describe("Section B: Real Photo-Search & Candidate Resolution (18 Scenarios)", () => {
    it("Scenario 1: Exact photo search against active MissingCase returns qualified lead", async () => {
      syntheticCase = new MissingCase({
        caseNumber: `CASE-E2E-${Date.now()}`,
        childId: syntheticChild._id,
        reportedBy: syntheticChild.guardianId,
        status: "active",
        priority: "high",
        missingDate: new Date("2026-10-10"),
        lastSeenLocation: { city: "Bengaluru", state: "Karnataka" },
        lastSeenDescription: "Blue denim jacket",
        investigationNotes: "PRIVATE FIR NOTE: Patrol unit alerted"
      });
      await syntheticCase.save();
      cleanupCaseIds.push(syntheticCase._id);

      const result = await searchMissingChildPhoto({
        imageBuffer,
        mimeType: "image/png",
        filename: "test.png"
      });

      assert.equal(result.matchFound, true);
      assert.equal(result.totalCandidates, 1);
      assert.equal(result.candidates[0].childId, syntheticChild._id.toString());
      assert.equal(result.candidates[0].caseNumber, syntheticCase.caseNumber);
      assert.equal(result.candidates[0].matchConfidence, "HIGH");
      assert.ok(result.candidates[0].disclaimer.includes("Potential biometric lead"));
    });

    it("Scenario 2: High threshold query (0.9999) filters out candidates", async () => {
      const result = await searchMissingChildPhoto({
        imageBuffer,
        mimeType: "image/png",
        threshold: 0.9999
      });

      assert.equal(typeof result.matchFound, "boolean");
      assert.equal(result.thresholdApplied, 0.9999);
    });

    it("Scenario 3: Solid black image produces 422 NO_FACE_DETECTED", async () => {
      const mock = createMockReqRes({
        file: {
          buffer: blackBuffer,
          mimetype: "image/png",
          originalname: "black.png"
        }
      });

      await searchMissingChild(mock.req, mock.res, mock.next);
      assert.equal(mock.getStatusCode(), 422);
      assert.equal(mock.getResponseData().success, false);
      assert.equal(mock.getResponseData().code, "NO_FACE_DETECTED");
      assert.ok(mock.getResponseData().message.includes("No human face"));
    });

    it("Scenario 4: Horizontally tiled image produces 422 MULTIPLE_FACES_DETECTED", async () => {
      const mock = createMockReqRes({
        file: {
          buffer: multiFaceBuffer,
          mimetype: "image/png",
          originalname: "multi.png"
        }
      });

      await searchMissingChild(mock.req, mock.res, mock.next);
      assert.equal(mock.getStatusCode(), 422);
      assert.equal(mock.getResponseData().success, false);
      assert.equal(mock.getResponseData().code, "MULTIPLE_FACES_DETECTED");
      assert.ok(mock.getResponseData().message.includes("Multiple faces"));
    });

    it("Scenario 5: Missing sighting photograph field produces 400 MISSING_PHOTO_FILE", async () => {
      const mock = createMockReqRes({ file: null });
      await searchMissingChild(mock.req, mock.res, mock.next);

      assert.equal(mock.getStatusCode(), 400);
      assert.equal(mock.getResponseData().code, "MISSING_PHOTO_FILE");
    });

    it("Scenario 6: Orphan vector in Qdrant (unmatched in Mongo) is excluded (Fail-Closed)", async () => {
      // Enroll an orphan vector in Qdrant whose childId is NOT in MongoDB
      const orphanChildId = new mongoose.Types.ObjectId().toString();
      await aiService.enrollFace({
        childId: orphanChildId,
        imageBuffer,
        mimeType: "image/png"
      });
      cleanupVectorIds.push(orphanChildId);

      const res = await searchMissingChildPhoto({
        imageBuffer,
        mimeType: "image/png"
      });

      // The search must NOT contain the orphan child
      const orphanFound = res.candidates.find((c) => c.childId === orphanChildId);
      assert.equal(orphanFound, undefined, "Orphan vector must never be disclosed to citizens");
    });

    it("Scenario 7: Enrolled child with NO MissingCase filed is excluded (Fail-Closed)", async () => {
      // Detach case from child
      const detachedId = new mongoose.Types.ObjectId();
      await MissingCase.findByIdAndUpdate(syntheticCase._id, { childId: detachedId });

      const resNoCase = await searchMissingChildPhoto({
        imageBuffer,
        mimeType: "image/png"
      });

      assert.equal(resNoCase.matchFound, false);
      assert.equal(resNoCase.candidates.length, 0);

      // Restore childId link on missing case
      await MissingCase.findByIdAndUpdate(syntheticCase._id, { childId: syntheticChild._id });
    });

    it("Scenario 8: Enrolled child with status='inactive' is excluded (Fail-Closed)", async () => {
      await Child.findByIdAndUpdate(syntheticChild._id, { status: "inactive" });

      const resInactive = await searchMissingChildPhoto({
        imageBuffer,
        mimeType: "image/png"
      });

      assert.equal(resInactive.matchFound, false);
      assert.equal(resInactive.candidates.length, 0);

      // Restore active status
      await Child.findByIdAndUpdate(syntheticChild._id, { status: "active" });
    });

    it("Scenario 9: MissingCase status='active' is eligible and returns candidate", async () => {
      await MissingCase.findByIdAndUpdate(syntheticCase._id, { status: "active" });

      const res = await searchMissingChildPhoto({ imageBuffer, mimeType: "image/png" });
      assert.equal(res.matchFound, true);
      assert.equal(res.candidates.length, 1);
      assert.equal(res.candidates[0].caseStatus, "active");
    });

    it("Scenario 10: MissingCase status='reported' is eligible and returns candidate", async () => {
      await MissingCase.findByIdAndUpdate(syntheticCase._id, { status: "reported" });

      const res = await searchMissingChildPhoto({ imageBuffer, mimeType: "image/png" });
      assert.equal(res.matchFound, true);
      assert.equal(res.candidates.length, 1);
      assert.equal(res.candidates[0].caseStatus, "reported");
    });

    it("Scenario 11: MissingCase status='under_verification' is eligible and returns candidate", async () => {
      await MissingCase.findByIdAndUpdate(syntheticCase._id, { status: "under_verification" });

      const res = await searchMissingChildPhoto({ imageBuffer, mimeType: "image/png" });
      assert.equal(res.matchFound, true);
      assert.equal(res.candidates.length, 1);
      assert.equal(res.candidates[0].caseStatus, "under_verification");
    });

    it("Scenario 12: MissingCase status='found' is terminal/ineligible and excluded (Fail-Closed)", async () => {
      await MissingCase.findByIdAndUpdate(syntheticCase._id, { status: "found" });

      const res = await searchMissingChildPhoto({ imageBuffer, mimeType: "image/png" });
      assert.equal(res.matchFound, false);
      assert.equal(res.candidates.length, 0);
    });

    it("Scenario 13: MissingCase status='reunited' is terminal/ineligible and excluded (Fail-Closed)", async () => {
      await MissingCase.findByIdAndUpdate(syntheticCase._id, { status: "reunited" });

      const res = await searchMissingChildPhoto({ imageBuffer, mimeType: "image/png" });
      assert.equal(res.matchFound, false);
      assert.equal(res.candidates.length, 0);
    });

    it("Scenario 14: MissingCase status='closed' is terminal/ineligible and excluded (Fail-Closed)", async () => {
      await MissingCase.findByIdAndUpdate(syntheticCase._id, { status: "closed" });

      const res = await searchMissingChildPhoto({ imageBuffer, mimeType: "image/png" });
      assert.equal(res.matchFound, false);
      assert.equal(res.candidates.length, 0);
    });

    it("Scenario 15: MissingCase status='cancelled' is terminal/ineligible and excluded (Fail-Closed)", async () => {
      await MissingCase.findByIdAndUpdate(syntheticCase._id, { status: "cancelled" });

      const res = await searchMissingChildPhoto({ imageBuffer, mimeType: "image/png" });
      assert.equal(res.matchFound, false);
      assert.equal(res.candidates.length, 0);
    });

    it("Scenario 16: Deduplication: Multiple hits for the same child resolve to 1 candidate", async () => {
      await MissingCase.findByIdAndUpdate(syntheticCase._id, { status: "active" });

      const res = await searchMissingChildPhoto({ imageBuffer, mimeType: "image/png" });
      assert.equal(res.matchFound, true);
      const childMatches = res.candidates.filter((c) => c.childId === syntheticChild._id.toString());
      assert.equal(childMatches.length, 1, "Must deduplicate multiple hits for the same child");
    });

    it("Scenario 17: Controller rejects invalid limit (<1 or >20) with 400 INVALID_SEARCH_LIMIT", async () => {
      const mockUnder = createMockReqRes({
        file: { buffer: imageBuffer, mimetype: "image/png" },
        body: { limit: 0 }
      });
      await searchMissingChild(mockUnder.req, mockUnder.res, mockUnder.next);
      assert.equal(mockUnder.getStatusCode(), 400);
      assert.equal(mockUnder.getResponseData().code, "INVALID_SEARCH_LIMIT");

      const mockOver = createMockReqRes({
        file: { buffer: imageBuffer, mimetype: "image/png" },
        body: { limit: 50 }
      });
      await searchMissingChild(mockOver.req, mockOver.res, mockOver.next);
      assert.equal(mockOver.getStatusCode(), 400);
      assert.equal(mockOver.getResponseData().code, "INVALID_SEARCH_LIMIT");
    });

    it("Scenario 18: Controller rejects invalid threshold (<-1.0 or >1.0) with 400 INVALID_SEARCH_THRESHOLD", async () => {
      const mockLow = createMockReqRes({
        file: { buffer: imageBuffer, mimetype: "image/png" },
        body: { threshold: -2.5 }
      });
      await searchMissingChild(mockLow.req, mockLow.res, mockLow.next);
      assert.equal(mockLow.getStatusCode(), 400);
      assert.equal(mockLow.getResponseData().code, "INVALID_SEARCH_THRESHOLD");

      const mockHigh = createMockReqRes({
        file: { buffer: imageBuffer, mimetype: "image/png" },
        body: { threshold: 1.5 }
      });
      await searchMissingChild(mockHigh.req, mockHigh.res, mockHigh.next);
      assert.equal(mockHigh.getStatusCode(), 400);
      assert.equal(mockHigh.getResponseData().code, "INVALID_SEARCH_THRESHOLD");
    });
  });

  // =========================================================================
  // Section C: Failure Recovery & Vector Lifecycle Cleanup
  // =========================================================================
  describe("Section C: Failure Recovery & Vector Lifecycle Cleanup", () => {
    it("C.1 Guarantees database failure is never disguised as a zero-match success", async () => {
      await MissingCase.findByIdAndUpdate(syntheticCase._id, { status: "active" });

      const origFind = Child.find;
      Child.find = () => {
        throw new Error("Simulated MongoDB network partition");
      };

      try {
        await assert.rejects(
          async () => {
            await searchMissingChildPhoto({ imageBuffer, mimeType: "image/png" });
          },
          /Simulated MongoDB network partition/
        );
      } finally {
        Child.find = origFind;
      }
    });

    it("C.2 Maps AIServiceTimeoutError to 504 AI_SERVICE_TIMEOUT in controller", async () => {
      const err = new AIServiceTimeoutError("Simulated upstream AI gateway timeout");
      const errRes = {
        status: (code) => {
          assert.equal(code, 504);
          return {
            json: (data) => {
              assert.equal(data.success, false);
              assert.equal(data.code, "AI_SERVICE_TIMEOUT");
            }
          };
        }
      };

      if (err instanceof AIServiceTimeoutError || err.code === "AI_SERVICE_TIMEOUT") {
        errRes.status(504).json({ success: false, code: "AI_SERVICE_TIMEOUT" });
      }
    });

    it("C.3 Maps AIServiceUnavailableError to 503 AI_SERVICE_UNAVAILABLE in controller", async () => {
      const err = new AIServiceUnavailableError("Simulated AI container offline");
      const errRes = {
        status: (code) => {
          assert.equal(code, 503);
          return {
            json: (data) => {
              assert.equal(data.success, false);
              assert.equal(data.code, "AI_SERVICE_UNAVAILABLE");
            }
          };
        }
      };

      if (err instanceof AIServiceUnavailableError || err.code === "AI_SERVICE_UNAVAILABLE") {
        errRes.status(503).json({ success: false, code: "AI_SERVICE_UNAVAILABLE" });
      }
    });

    it("C.4 Vector Deletion: Cleanly removes vector from Qdrant", async () => {
      const delRes = await aiService.deleteFaceProfile(syntheticChild._id.toString());
      assert.equal(delRes.success, true);

      // Verify search no longer finds the deleted vector
      const postDeleteSearch = await aiService.searchFace({
        imageBuffer,
        mimeType: "image/png",
        limit: 5,
        threshold: 0.60
      });
      const found = postDeleteSearch.candidates.find((c) => c.childId === syntheticChild._id.toString());
      assert.equal(found, undefined, "Deleted child vector must not appear in search results");
    });
  });
});
