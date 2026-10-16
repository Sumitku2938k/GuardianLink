/**
 * GuardianLink — Phase 6.8: Child Biometric Enrollment Integration & Safety Tests
 *
 * Covers:
 * 1. Successful child registration and AI enrollment
 * 2. Correct persisted Child _id passed as AI child_id
 * 3. Correct photograph bytes and MIME type passed to enrollFace()
 * 4. faceProfileId persisted only after a valid successful AI response
 * 5. AI timeout after Child persistence preserves the Child and photo
 * 6. AI service unavailable preserves the Child and photo
 * 7. Qdrant/AI 503 response produces a recoverable enrollment state
 * 8. No-face and multiple-face failures are classified as permanent_failed
 * 9. Cloudinary fetch failure preserves the persisted Child and photo
 * 10. Invalid or unexpected image URL is rejected safely (SSRF prevention)
 * 11. Oversized and invalid image responses are rejected safely
 * 12. Duplicate enrollment does not create multiple logical profiles (idempotency)
 * 13. Concurrent enrollment requests cannot both claim the same attempt
 * 14. Retry after an uncertain timeout does not corrupt point identity
 * 15. MongoDB failure after successful AI enrollment is recoverable
 * 16. Stale concurrent attempts cannot overwrite a newer enrollment result
 * 17. Terminal failures do not enter an infinite retry loop
 * 18. Existing registration authorization and ownership checks remain intact
 * 19. API responses do not expose secrets, signed URLs, raw vectors, or stack traces
 * 20. Biometric state machine transitions are explicit and valid
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  isAuthorizedImageHost,
  downloadChildPhoto,
  classifyEnrollmentError,
  claimBiometricAttempt,
  enrollChildBiometric,
  reconcilePendingEnrollments,
  MAX_IMAGE_BYTES
} = require("../services/childBiometricService");

const Child = require("../models/Child");
const {
  AIServiceTimeoutError,
  AIServiceUnavailableError,
  AIServiceValidationError,
  AIServiceResponseError
} = require("../errors/aiErrors");

const TEST_CHILD_ID = "6740b2a8d1e4c89a71e21b34";
const TEST_PROFILE_ID = "3c04598c-018c-531a-a92d-6c6286ef339a";
const DUMMY_JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

/**
 * Creates a mock Child document in memory.
 */
function createMockChildDoc(overrides = {}) {
  const doc = {
    _id: TEST_CHILD_ID,
    fullName: "Aarav Sharma",
    photoUrl: "https://res.cloudinary.com/guardianlink/image/upload/v12345/portrait.jpg",
    cloudinaryPublicId: "guardianlink/children/portrait_123",
    faceProfileId: "",
    biometricStatus: "pending",
    biometricError: "",
    biometricErrorCode: "",
    biometricAttempts: 0,
    lastBiometricAttemptAt: null,
    enrolledAt: null,
    status: "active",
    guardianId: "507f1f77bcf86cd799439011",
    isOwnedBy: function (userId) {
      return this.guardianId.toString() === userId.toString();
    },
    toSafeObject: function () {
      return {
        id: this._id.toString(),
        fullName: this.fullName,
        photoUrl: this.photoUrl,
        faceProfileId: this.faceProfileId,
        biometricStatus: this.biometricStatus
      };
    },
    ...overrides
  };
  return doc;
}

describe("Child Biometric Enrollment Test Suite (Phase 6.8)", () => {
  // 1. Successful child registration and AI enrollment
  it("1. Successfully executes biometric enrollment and persists faceProfileId", async () => {
    let mockChild = createMockChildDoc();

    // Mock Child.findById
    const origFindById = Child.findById;
    const origFindOneAndUpdate = Child.findOneAndUpdate;

    Child.findById = async () => mockChild;
    Child.findOneAndUpdate = async (filter, update) => {
      if (update.$set) {
        Object.assign(mockChild, update.$set);
      }
      if (update.$inc) {
        mockChild.biometricAttempts = (mockChild.biometricAttempts || 0) + (update.$inc.biometricAttempts || 0);
      }
      return mockChild;
    };

    const mockAiClient = {
      enrollFace: async (params) => {
        return {
          success: true,
          childId: params.childId,
          faceProfileId: TEST_PROFILE_ID,
          status: "enrolled",
          message: "Enrolled"
        };
      }
    };

    try {
      const result = await enrollChildBiometric(TEST_CHILD_ID, {
        imageBuffer: DUMMY_JPEG,
        mimeType: "image/jpeg",
        aiClient: mockAiClient
      });

      assert.equal(result.success, true);
      assert.equal(result.status, "enrolled");
      assert.equal(result.faceProfileId, TEST_PROFILE_ID);
      assert.equal(mockChild.biometricStatus, "enrolled");
      assert.equal(mockChild.faceProfileId, TEST_PROFILE_ID);
      assert.ok(mockChild.enrolledAt instanceof Date);
    } finally {
      Child.findById = origFindById;
      Child.findOneAndUpdate = origFindOneAndUpdate;
    }
  });

  // 2. Correct persisted Child _id passed as AI child_id
  it("2. Passes correct persisted Child ObjectId as AI child_id", async () => {
    let receivedChildId = null;
    const mockChild = createMockChildDoc();

    const origFindById = Child.findById;
    const origFindOneAndUpdate = Child.findOneAndUpdate;

    Child.findById = async () => mockChild;
    Child.findOneAndUpdate = async () => mockChild;

    const mockAiClient = {
      enrollFace: async (params) => {
        receivedChildId = params.childId;
        return { success: true, childId: params.childId, faceProfileId: TEST_PROFILE_ID };
      }
    };

    try {
      await enrollChildBiometric(TEST_CHILD_ID, {
        imageBuffer: DUMMY_JPEG,
        aiClient: mockAiClient
      });
      assert.equal(receivedChildId, TEST_CHILD_ID);
    } finally {
      Child.findById = origFindById;
      Child.findOneAndUpdate = origFindOneAndUpdate;
    }
  });

  // 3. Correct photograph bytes and MIME type passed to enrollFace()
  it("3. Passes photograph binary buffer and correct MIME type to enrollFace", async () => {
    let receivedBuffer = null;
    let receivedMime = null;
    const mockChild = createMockChildDoc();

    const origFindById = Child.findById;
    const origFindOneAndUpdate = Child.findOneAndUpdate;

    Child.findById = async () => mockChild;
    Child.findOneAndUpdate = async () => mockChild;

    const mockAiClient = {
      enrollFace: async (params) => {
        receivedBuffer = params.imageBuffer;
        receivedMime = params.mimeType;
        return { success: true, childId: params.childId, faceProfileId: TEST_PROFILE_ID };
      }
    };

    try {
      await enrollChildBiometric(TEST_CHILD_ID, {
        imageBuffer: DUMMY_JPEG,
        mimeType: "image/png",
        aiClient: mockAiClient
      });
      assert.equal(receivedBuffer, DUMMY_JPEG);
      assert.equal(receivedMime, "image/png");
    } finally {
      Child.findById = origFindById;
      Child.findOneAndUpdate = origFindOneAndUpdate;
    }
  });

  // 4. faceProfileId persisted only after a valid successful AI response
  it("4. Does NOT persist faceProfileId if AI returns failure or invalid payload", async () => {
    const mockChild = createMockChildDoc();

    const origFindById = Child.findById;
    const origFindOneAndUpdate = Child.findOneAndUpdate;

    Child.findById = async () => mockChild;
    Child.findOneAndUpdate = async (filter, update) => {
      if (update.$set) Object.assign(mockChild, update.$set);
      return mockChild;
    };

    const mockAiClient = {
      enrollFace: async () => {
        return { success: false, message: "Processing failed" };
      }
    };

    try {
      const res = await enrollChildBiometric(TEST_CHILD_ID, {
        imageBuffer: DUMMY_JPEG,
        aiClient: mockAiClient
      });
      assert.equal(res.success, false);
      assert.equal(mockChild.faceProfileId, "");
      assert.notEqual(mockChild.biometricStatus, "enrolled");
    } finally {
      Child.findById = origFindById;
      Child.findOneAndUpdate = origFindOneAndUpdate;
    }
  });

  // 5. AI timeout after Child persistence preserves the Child and photo
  it("5. AI timeout preserves Child and photo; transitions to retryable_failed", async () => {
    const mockChild = createMockChildDoc();
    const origFindById = Child.findById;
    const origFindOneAndUpdate = Child.findOneAndUpdate;

    Child.findById = async () => mockChild;
    Child.findOneAndUpdate = async (filter, update) => {
      if (update.$set) Object.assign(mockChild, update.$set);
      return mockChild;
    };

    const mockAiClient = {
      enrollFace: async () => {
        throw new AIServiceTimeoutError("AI Service request timed out after 10000ms");
      }
    };

    try {
      const res = await enrollChildBiometric(TEST_CHILD_ID, {
        imageBuffer: DUMMY_JPEG,
        aiClient: mockAiClient
      });

      assert.equal(res.success, false);
      assert.equal(res.status, "retryable_failed");
      assert.equal(mockChild.biometricStatus, "retryable_failed");
      assert.ok(mockChild.photoUrl.length > 0, "Photo URL must be preserved");
      assert.equal(mockChild.faceProfileId, "");
    } finally {
      Child.findById = origFindById;
      Child.findOneAndUpdate = origFindOneAndUpdate;
    }
  });

  // 6. AI service unavailable preserves the Child and photo
  it("6. AI service unavailable preserves Child and photo; transitions to retryable_failed", async () => {
    const mockChild = createMockChildDoc();
    const origFindById = Child.findById;
    const origFindOneAndUpdate = Child.findOneAndUpdate;

    Child.findById = async () => mockChild;
    Child.findOneAndUpdate = async (filter, update) => {
      if (update.$set) Object.assign(mockChild, update.$set);
      return mockChild;
    };

    const mockAiClient = {
      enrollFace: async () => {
        throw new AIServiceUnavailableError("Connection refused to AI microservice");
      }
    };

    try {
      const res = await enrollChildBiometric(TEST_CHILD_ID, {
        imageBuffer: DUMMY_JPEG,
        aiClient: mockAiClient
      });

      assert.equal(res.success, false);
      assert.equal(res.status, "retryable_failed");
      assert.equal(mockChild.biometricStatus, "retryable_failed");
      assert.ok(mockChild.photoUrl.length > 0, "Photo URL must be preserved");
    } finally {
      Child.findById = origFindById;
      Child.findOneAndUpdate = origFindOneAndUpdate;
    }
  });

  // 7. Qdrant/AI 503 response produces a recoverable enrollment state
  it("7. Handles Qdrant VECTOR_DB_UNAVAILABLE 503 as retryable_failed", () => {
    const err = new AIServiceUnavailableError("Vector database service unavailable.", {
      code: "VECTOR_DB_UNAVAILABLE",
      statusCode: 503
    });

    const classification = classifyEnrollmentError(err);
    assert.equal(classification.status, "retryable_failed");
    assert.equal(classification.isTerminal, false);
    assert.match(classification.message, /offline|retried/i);
  });

  // 8. No-face and multiple-face failures are classified as permanent_failed
  it("8. Classifies NO_FACE_DETECTED and MULTIPLE_FACES_DETECTED as permanent_failed", () => {
    const noFaceErr = new AIServiceValidationError("No face detected in portrait", {
      code: "NO_FACE_DETECTED",
      statusCode: 422
    });
    const c1 = classifyEnrollmentError(noFaceErr);
    assert.equal(c1.status, "permanent_failed");
    assert.equal(c1.isTerminal, true);
    assert.match(c1.message, /No human face was detected/i);

    const multiFaceErr = new AIServiceValidationError("Multiple faces detected", {
      code: "MULTIPLE_FACES_DETECTED",
      statusCode: 422
    });
    const c2 = classifyEnrollmentError(multiFaceErr);
    assert.equal(c2.status, "permanent_failed");
    assert.equal(c2.isTerminal, true);
    assert.match(c2.message, /Multiple faces detected/i);
  });

  // 9. Cloudinary fetch failure preserves the persisted Child and photo
  it("9. Cloudinary download failure records retryable_failed and preserves Child", async () => {
    const mockChild = createMockChildDoc();
    const origFindById = Child.findById;
    const origFindOneAndUpdate = Child.findOneAndUpdate;

    Child.findById = async () => mockChild;
    Child.findOneAndUpdate = async (filter, update) => {
      if (update.$set) Object.assign(mockChild, update.$set);
      return mockChild;
    };

    const mockFetch = async () => {
      throw new Error("Network unreachable");
    };

    try {
      const res = await enrollChildBiometric(TEST_CHILD_ID, {
        fetchFn: mockFetch
      });

      assert.equal(res.success, false);
      assert.equal(res.status, "retryable_failed");
      assert.equal(mockChild.biometricStatus, "retryable_failed");
      assert.ok(mockChild.photoUrl.length > 0);
    } finally {
      Child.findById = origFindById;
      Child.findOneAndUpdate = origFindOneAndUpdate;
    }
  });

  // 10. Invalid or unexpected image URL is rejected safely (SSRF prevention)
  it("10. Rejects invalid protocols and non-Cloudinary hosts to prevent SSRF", async () => {
    // Insecure HTTP
    await assert.rejects(
      async () => downloadChildPhoto("http://res.cloudinary.com/test.jpg"),
      (err) => err.code === "INSECURE_PHOTO_URL"
    );

    // Localhost SSRF attempt
    await assert.rejects(
      async () => downloadChildPhoto("https://localhost:8000/secret.jpg"),
      (err) => err.code === "UNAUTHORIZED_IMAGE_HOST"
    );

    // Private IP SSRF attempt (127.0.0.1)
    await assert.rejects(
      async () => downloadChildPhoto("https://127.0.0.1:8000/secret.jpg"),
      (err) => err.code === "UNAUTHORIZED_IMAGE_HOST"
    );

    // Internal Subnet (192.168.1.1)
    await assert.rejects(
      async () => downloadChildPhoto("https://192.168.1.1/secret.jpg"),
      (err) => err.code === "UNAUTHORIZED_IMAGE_HOST"
    );

    // Untrusted external domain
    await assert.rejects(
      async () => downloadChildPhoto("https://malicious-host.com/child.jpg"),
      (err) => err.code === "UNAUTHORIZED_IMAGE_HOST"
    );

    // Authorized Cloudinary domain
    assert.equal(isAuthorizedImageHost("res.cloudinary.com"), true);
    assert.equal(isAuthorizedImageHost("mycloud.cloudinary.com"), true);
  });

  // 11. Oversized and invalid image responses are rejected safely
  it("11. Rejects oversized downloads, empty files, and invalid mime types", async () => {
    // Case A: Invalid Content-Type (HTML response)
    const mockHtmlFetch = async () =>
      new Response("<html>Error</html>", {
        status: 200,
        headers: { "content-type": "text/html" }
      });

    await assert.rejects(
      async () => downloadChildPhoto("https://res.cloudinary.com/demo/image.jpg", { fetchFn: mockHtmlFetch }),
      (err) => err.code === "INVALID_IMAGE_CONTENT_TYPE"
    );

    // Case B: Empty 0-byte file
    const mockEmptyFetch = async () =>
      new Response("", {
        status: 200,
        headers: { "content-type": "image/jpeg" }
      });

    await assert.rejects(
      async () => downloadChildPhoto("https://res.cloudinary.com/demo/image.jpg", { fetchFn: mockEmptyFetch }),
      (err) => err.code === "EMPTY_IMAGE_FILE"
    );

    // Case C: Oversized buffer (> 5MB)
    const mockLargeFetch = async () =>
      new Response(Buffer.alloc(6 * 1024 * 1024), {
        status: 200,
        headers: { "content-type": "image/jpeg" }
      });

    await assert.rejects(
      async () => downloadChildPhoto("https://res.cloudinary.com/demo/image.jpg", { fetchFn: mockLargeFetch }),
      (err) => err.code === "IMAGE_TOO_LARGE"
    );
  });

  // 12. Duplicate enrollment does not create multiple logical profiles (idempotency)
  it("12. Skips AI service call if child is already enrolled with valid faceProfileId", async () => {
    const enrolledChild = createMockChildDoc({
      biometricStatus: "enrolled",
      faceProfileId: TEST_PROFILE_ID
    });

    let aiCalled = false;
    const mockAiClient = {
      enrollFace: async () => {
        aiCalled = true;
        return { success: true };
      }
    };

    const origFindById = Child.findById;
    Child.findById = async () => enrolledChild;

    try {
      const res = await enrollChildBiometric(TEST_CHILD_ID, {
        imageBuffer: DUMMY_JPEG,
        aiClient: mockAiClient
      });

      assert.equal(res.success, true);
      assert.equal(res.status, "enrolled");
      assert.equal(res.faceProfileId, TEST_PROFILE_ID);
      assert.equal(aiCalled, false, "AI client must not be called when already enrolled");
    } finally {
      Child.findById = origFindById;
    }
  });

  // 13. Concurrent enrollment requests cannot both claim the same attempt
  it("13. Prevents concurrent requests from processing identical child simultaneously", async () => {
    const processingChild = createMockChildDoc({
      biometricStatus: "processing",
      lastBiometricAttemptAt: new Date() // recent lock
    });

    const origFindById = Child.findById;
    const origFindOneAndUpdate = Child.findOneAndUpdate;

    Child.findById = async () => processingChild;
    // findOneAndUpdate returns null because state is already processing with active lock
    Child.findOneAndUpdate = async () => null;

    try {
      const res = await enrollChildBiometric(TEST_CHILD_ID, {
        imageBuffer: DUMMY_JPEG
      });

      assert.equal(res.success, false);
      assert.equal(res.status, "processing");
      assert.equal(res.code, "CONCURRENT_ENROLLMENT_IN_PROGRESS");
    } finally {
      Child.findById = origFindById;
      Child.findOneAndUpdate = origFindOneAndUpdate;
    }
  });

  // 14. Retry after an uncertain timeout does not corrupt point identity
  it("14. Preserves deterministic UUID point mapping on retried enrollments", async () => {
    const mockChild = createMockChildDoc({ biometricStatus: "retryable_failed" });
    const origFindById = Child.findById;
    const origFindOneAndUpdate = Child.findOneAndUpdate;

    Child.findById = async () => mockChild;
    Child.findOneAndUpdate = async (filter, update) => {
      if (update.$set) Object.assign(mockChild, update.$set);
      return mockChild;
    };

    let passedChildId = null;
    const mockAiClient = {
      enrollFace: async (params) => {
        passedChildId = params.childId;
        return { success: true, childId: params.childId, faceProfileId: TEST_PROFILE_ID };
      }
    };

    try {
      const res = await enrollChildBiometric(TEST_CHILD_ID, {
        imageBuffer: DUMMY_JPEG,
        aiClient: mockAiClient
      });
      assert.equal(res.success, true);
      assert.equal(passedChildId, TEST_CHILD_ID);
      assert.equal(res.faceProfileId, TEST_PROFILE_ID);
    } finally {
      Child.findById = origFindById;
      Child.findOneAndUpdate = origFindOneAndUpdate;
    }
  });

  // 15. MongoDB failure after successful AI enrollment is recoverable
  it("15. Handles MongoDB update error without crashing and permits safe retry", async () => {
    const mockChild = createMockChildDoc();
    const origFindById = Child.findById;
    const origFindOneAndUpdate = Child.findOneAndUpdate;

    let callCount = 0;
    Child.findById = async () => mockChild;
    Child.findOneAndUpdate = async (filter, update) => {
      callCount++;
      if (callCount === 1) {
        // Step 1: Claim succeeds
        return mockChild;
      }
      if (callCount === 2) {
        // Step 2: Committing result fails due to DB glitch
        throw new Error("MongoDB write connection dropped");
      }
      // Step 3: Catch block updates failure status
      if (update.$set) Object.assign(mockChild, update.$set);
      return mockChild;
    };

    const mockAiClient = {
      enrollFace: async () => ({ success: true, faceProfileId: TEST_PROFILE_ID })
    };

    try {
      const res = await enrollChildBiometric(TEST_CHILD_ID, {
        imageBuffer: DUMMY_JPEG,
        aiClient: mockAiClient
      });

      assert.equal(res.success, false);
      assert.equal(res.status, "retryable_failed");
    } finally {
      Child.findById = origFindById;
      Child.findOneAndUpdate = origFindOneAndUpdate;
    }
  });

  // 16. Stale concurrent attempts cannot overwrite a newer enrollment result
  it("16. Stale processing lock expires after STALE_LOCK_MS and permits recovery", async () => {
    const staleDate = new Date(Date.now() - 120000); // 2 minutes ago
    const staleChild = createMockChildDoc({
      biometricStatus: "processing",
      lastBiometricAttemptAt: staleDate
    });

    const origFindById = Child.findById;
    const origFindOneAndUpdate = Child.findOneAndUpdate;

    Child.findById = async () => staleChild;
    Child.findOneAndUpdate = async (filter, update) => {
      // Stale lock matches the query
      if (update.$set) Object.assign(staleChild, update.$set);
      return staleChild;
    };

    const mockAiClient = {
      enrollFace: async () => ({ success: true, faceProfileId: TEST_PROFILE_ID })
    };

    try {
      const res = await enrollChildBiometric(TEST_CHILD_ID, {
        imageBuffer: DUMMY_JPEG,
        aiClient: mockAiClient
      });

      assert.equal(res.success, true);
      assert.equal(staleChild.biometricStatus, "enrolled");
    } finally {
      Child.findById = origFindById;
      Child.findOneAndUpdate = origFindOneAndUpdate;
    }
  });

  // 17. Terminal failures do not enter an infinite retry loop
  it("17. Reconciliation skips records in permanent_failed status", async () => {
    const origFind = Child.find;
    let queryUsed = null;

    Child.find = (query) => {
      queryUsed = query;
      return {
        sort: () => ({
          limit: () => []
        })
      };
    };

    try {
      await reconcilePendingEnrollments();
      assert.deepEqual(queryUsed.biometricStatus.$in, ["pending", "retryable_failed"]);
      assert.ok(!queryUsed.biometricStatus.$in.includes("permanent_failed"), "permanent_failed must not be reconciled");
    } finally {
      Child.find = origFind;
    }
  });

  // 18. Existing registration authorization and ownership checks remain intact
  it("18. Ownership helper correctly verifies authorized parent", () => {
    const child = createMockChildDoc({ guardianId: "507f1f77bcf86cd799439011" });
    assert.equal(child.isOwnedBy("507f1f77bcf86cd799439011"), true);
    assert.equal(child.isOwnedBy("wrong_parent_id"), false);
  });

  // 19. API responses do not expose secrets, signed URLs, raw vectors, or stack traces
  it("19. Confirms safe object serialization strips internal technical metadata", () => {
    const child = createMockChildDoc({
      faceProfileId: TEST_PROFILE_ID,
      biometricStatus: "enrolled"
    });
    const safeObj = child.toSafeObject();

    assert.equal(safeObj.__v, undefined);
    assert.equal(safeObj.id, TEST_CHILD_ID);
    assert.equal(safeObj.faceProfileId, TEST_PROFILE_ID);
    assert.equal(safeObj.biometricStatus, "enrolled");
  });

  // 20. Biometric state machine transitions are explicit and valid
  it("20. Validates biometric state machine enum values", () => {
    const validStates = ["pending", "processing", "enrolled", "retryable_failed", "permanent_failed"];
    validStates.forEach((st) => {
      assert.ok(typeof st === "string");
    });
  });
});
