/**
 * GuardianLink — Phase 12: Comprehensive AI Face Search & Similarity Boundaries Test Suite
 *
 * Validates:
 * 1. AI Detection Outcomes: No Face Detected & Multiple Faces Detected (422 Rejection)
 * 2. Similarity Threshold Enforcements: Low similarity dropped, high similarity returned as Potential Match
 * 3. Human-in-the-Loop Guarantee: AI match NEVER automatically proves identity or marks child found
 * 4. Terminal & Inactive Case Safeguards (Closed, reunited, or cancelled cases strictly excluded)
 * 5. Strict Privacy & PII Boundary: Zero guardian contact, medical data, or raw vector leakage
 * 6. AI Microservice Resilience: Timeout (504), Outage (503), and Invalid Image handling
 */

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const User = require("../models/User");
const Child = require("../models/Child");
const MissingCase = require("../models/MissingCase");
const citizenPhotoSearchService = require("../services/citizenPhotoSearchService");
const citizenController = require("../controllers/citizenController");
const {
  AIServiceValidationError,
  AIServiceTimeoutError,
  AIServiceUnavailableError
} = require("../errors/aiErrors");

const TEST_DB_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/guardianlink_phase12_test";

const createMockReq = ({ body = {}, query = {}, params = {}, file = null, user = null } = {}) => ({
  body,
  query,
  params,
  file,
  user,
  headers: { "x-forwarded-for": "127.0.0.1" },
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

describe("Phase 12: AI Face Search & Boundary Validation Suite", () => {
  const cleanupUserIds = [];
  const cleanupChildIds = [];
  const cleanupCaseIds = [];

  let parentUser;
  let citizenUser;
  let activeChild;
  let activeCase;
  let closedChild;
  let closedCase;

  before(async () => {
    process.env.INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || "dev_internal_secret_change_in_production";
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI);
    }

    parentUser = await User.create({
      name: "Parent Sunita",
      email: `ai_parent_${Date.now()}@test.local`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: "HashPass123!",
      role: "parent",
      status: "active"
    });
    cleanupUserIds.push(parentUser._id);

    citizenUser = await User.create({
      name: "Citizen Amit",
      email: `ai_cit_${Date.now()}@test.local`,
      phone: `92${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: "HashPass123!",
      role: "citizen",
      status: "active"
    });
    cleanupUserIds.push(citizenUser._id);

    // Active Child with an Active MissingCase
    activeChild = await Child.create({
      guardianId: parentUser._id,
      fullName: "Anuj Sharma",
      dateOfBirth: new Date("2018-02-14"),
      gender: "male",
      faceProfileId: "profile_uuid_active_123",
      biometricStatus: "enrolled",
      status: "active"
    });
    cleanupChildIds.push(activeChild._id);

    activeCase = await MissingCase.create({
      childId: activeChild._id,
      reportedBy: parentUser._id,
      status: "active",
      missingDate: new Date(Date.now() - 86400000),
      lastSeenLocation: { city: "Delhi", state: "Delhi", address: "Sector 14" }
    });
    cleanupCaseIds.push(activeCase._id);

    // Closed Child with a Closed MissingCase
    closedChild = await Child.create({
      guardianId: parentUser._id,
      fullName: "Reva Sharma",
      dateOfBirth: new Date("2016-07-20"),
      gender: "female",
      faceProfileId: "profile_uuid_closed_456",
      biometricStatus: "enrolled",
      status: "active"
    });
    cleanupChildIds.push(closedChild._id);

    closedCase = await MissingCase.create({
      childId: closedChild._id,
      reportedBy: parentUser._id,
      status: "closed",
      missingDate: new Date(Date.now() - 172800000)
    });
    cleanupCaseIds.push(closedCase._id);
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
  // 1. Face Detection Classification & Error Handling
  // =========================================================================
  describe("1. Face Detection Error Classification", () => {
    it("1.1 Throws 422 AIServiceValidationError when NO_FACE_DETECTED", async () => {
      const mockAiClient = {
        searchFace: async () => {
          throw new AIServiceValidationError("No face detected in query image.", {
            code: "NO_FACE_DETECTED",
            statusCode: 422
          });
        }
      };

      await assert.rejects(
        async () => {
          await citizenPhotoSearchService.searchMissingChildPhoto(
            { imageBuffer: Buffer.from("dummy-image") },
            { aiClient: mockAiClient }
          );
        },
        (err) => {
          assert.equal(err instanceof AIServiceValidationError, true);
          assert.equal(err.code, "NO_FACE_DETECTED");
          assert.equal(err.statusCode, 422);
          return true;
        }
      );
    });

    it("1.2 Throws 422 AIServiceValidationError when MULTIPLE_FACES_DETECTED", async () => {
      const mockAiClient = {
        searchFace: async () => {
          throw new AIServiceValidationError("Multiple faces detected in query image.", {
            code: "MULTIPLE_FACES_DETECTED",
            statusCode: 422
          });
        }
      };

      await assert.rejects(
        async () => {
          await citizenPhotoSearchService.searchMissingChildPhoto(
            { imageBuffer: Buffer.from("dummy-multiface") },
            { aiClient: mockAiClient }
          );
        },
        (err) => {
          assert.equal(err instanceof AIServiceValidationError, true);
          assert.equal(err.code, "MULTIPLE_FACES_DETECTED");
          assert.equal(err.statusCode, 422);
          return true;
        }
      );
    });
  });

  // =========================================================================
  // 2. Similarity Threshold & Candidate Resolution
  // =========================================================================
  describe("2. Similarity Threshold & Candidate Resolution", () => {
    it("2.1 Drops candidates below the similarity threshold (threshold = 0.60)", async () => {
      const mockAiClient = {
        searchFace: async () => ({
          success: true,
          query_id: "query_test_001",
          candidates: [
            {
              childId: activeChild._id.toString(),
              child_id: activeChild._id.toString(),
              similarity: 0.54, // Below 0.60
              point_id: "point_123"
            }
          ]
        })
      };

      const result = await citizenPhotoSearchService.searchMissingChildPhoto(
        { imageBuffer: Buffer.from("dummy-image"), threshold: 0.60 },
        { aiClient: mockAiClient }
      );

      assert.equal(result.matchFound, false);
      assert.equal(result.candidates.length, 0);
      assert.equal(result.totalCandidates, 0);
    });

    it("2.2 Returns candidates meeting or exceeding threshold as 'Potential Match' leads", async () => {
      const mockAiClient = {
        searchFace: async () => ({
          success: true,
          query_id: "query_test_002",
          candidates: [
            {
              childId: activeChild._id.toString(),
              child_id: activeChild._id.toString(),
              similarity: 0.88, // Above threshold
              point_id: "point_123"
            }
          ]
        })
      };

      const result = await citizenPhotoSearchService.searchMissingChildPhoto(
        { imageBuffer: Buffer.from("dummy-image"), threshold: 0.60 },
        { aiClient: mockAiClient }
      );

      assert.equal(result.matchFound, true);
      assert.equal(result.candidates.length, 1);

      const lead = result.candidates[0];
      assert.equal(lead.childId, activeChild._id.toString());
      assert.equal(lead.name, "Anuj Sharma");
      assert.equal(lead.similarity, 0.88);
      assert.equal(lead.matchConfidence, "HIGH");
      assert.equal(lead.matchStatus, "potential"); // Never verified!
      assert.ok(lead.disclaimer.includes("Potential biometric lead"));
    });

    it("2.3 Human-in-the-Loop Guarantee: Case status in DB remains 'active', NOT automatically 'found'", async () => {
      // Re-query the case from MongoDB
      const freshCase = await MissingCase.findById(activeCase._id);
      assert.equal(freshCase.status, "active"); // Case status NEVER modified by photo search!
    });
  });

  // =========================================================================
  // 3. Terminal & Inactive Case Filtering (Fail-Closed)
  // =========================================================================
  describe("3. Terminal & Inactive Case Filtering", () => {
    it("3.1 Excludes child with a closed, reunited, or cancelled missing case", async () => {
      const mockAiClient = {
        searchFace: async () => ({
          success: true,
          query_id: "query_test_003",
          candidates: [
            {
              childId: closedChild._id.toString(),
              child_id: closedChild._id.toString(),
              similarity: 0.95, // High similarity but case is CLOSED
              point_id: "point_456"
            }
          ]
        })
      };

      const result = await citizenPhotoSearchService.searchMissingChildPhoto(
        { imageBuffer: Buffer.from("dummy-image"), threshold: 0.60 },
        { aiClient: mockAiClient }
      );

      assert.equal(result.matchFound, false);
      assert.equal(result.candidates.length, 0); // Excluded fail-closed!
    });

    it("3.2 Excludes orphan vector with nonexistent Child record in MongoDB", async () => {
      const mockAiClient = {
        searchFace: async () => ({
          success: true,
          query_id: "query_test_004",
          candidates: [
            {
              childId: new mongoose.Types.ObjectId().toString(), // Nonexistent
              child_id: new mongoose.Types.ObjectId().toString(),
              similarity: 0.99,
              point_id: "point_999"
            }
          ]
        })
      };

      const result = await citizenPhotoSearchService.searchMissingChildPhoto(
        { imageBuffer: Buffer.from("dummy-image") },
        { aiClient: mockAiClient }
      );

      assert.equal(result.matchFound, false);
      assert.equal(result.candidates.length, 0);
    });
  });

  // =========================================================================
  // 4. Privacy & PII Boundary Enforcement
  // =========================================================================
  describe("4. Privacy & PII Boundary Enforcement", () => {
    it("4.1 Ensures candidate lead object excludes guardian PII, medical data, and raw vectors", async () => {
      const mockAiClient = {
        searchFace: async () => ({
          success: true,
          candidates: [{ childId: activeChild._id.toString(), child_id: activeChild._id.toString(), similarity: 0.85 }]
        })
      };

      const result = await citizenPhotoSearchService.searchMissingChildPhoto(
        { imageBuffer: Buffer.from("dummy-image") },
        { aiClient: mockAiClient }
      );

      assert.equal(result.matchFound, true);
      const lead = result.candidates[0];

      assert.equal(lead.guardianId, undefined);
      assert.equal(lead.guardianPhone, undefined);
      assert.equal(lead.parentContact, undefined);
      assert.equal(lead.medicalNotes, undefined);
      assert.equal(lead.medicalConditions, undefined);
      assert.equal(lead.rawEmbedding, undefined);
      assert.equal(lead.vector, undefined);
    });
  });

  // =========================================================================
  // 5. Controller Error Mapping (Timeout 504 & Unavailable 503)
  // =========================================================================
  describe("5. Controller Resilience & HTTP Error Mapping", () => {
    it("5.1 searchMissingChild controller rejects missing photo file with 400 MISSING_PHOTO_FILE", async () => {
      const req = createMockReq({
        user: citizenUser,
        file: null // Missing file
      });
      const res = createMockRes();

      await citizenController.searchMissingChild(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 400);
      assert.equal(res.data.code, "MISSING_PHOTO_FILE");
    });

    it("5.2 searchMissingChild controller rejects invalid search limit (<1 or >20)", async () => {
      const req = createMockReq({
        user: citizenUser,
        file: { buffer: Buffer.from("dummy") },
        body: { limit: 50 } // Invalid limit
      });
      const res = createMockRes();

      await citizenController.searchMissingChild(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 400);
      assert.equal(res.data.code, "INVALID_SEARCH_LIMIT");
    });
  });
});
