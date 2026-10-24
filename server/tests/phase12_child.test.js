/**
 * GuardianLink — Phase 12: Comprehensive Child CRUD & Ownership Security Test Suite
 *
 * Validates:
 * 1. Child Creation, Validation & Derived Ownership
 * 2. IDOR Prevention & Multi-Parent Ownership Isolation
 * 3. Mass-Assignment & Protected Field Tampering Defense
 * 4. Child Photo Replacement & Biometric Vector Cleanup
 * 5. Soft Status Lifecycle (Active / Inactive)
 */

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const User = require("../models/User");
const Child = require("../models/Child");
const childController = require("../controllers/childController");

const TEST_DB_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/guardianlink_phase12_test";

const createMockReq = ({ body = {}, query = {}, params = {}, headers = {}, file = null, user = null } = {}) => ({
  body,
  query,
  params,
  file,
  headers: {
    "x-forwarded-for": "127.0.0.1",
    "user-agent": "GuardianLink-Phase12-ChildRunner/1.0",
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

describe("Phase 12: Child Management & Ownership Enforcement Suite", () => {
  const cleanupUserIds = [];
  const cleanupChildIds = [];

  let parentA;
  let parentB;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI);
    }

    // Create two isolated parent accounts
    parentA = await User.create({
      name: "Parent A (Sunita)",
      email: `parentA_${Date.now()}@test.local`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: "ParentPass123!",
      role: "parent",
      status: "active"
    });
    cleanupUserIds.push(parentA._id);

    parentB = await User.create({
      name: "Parent B (Rajesh)",
      email: `parentB_${Date.now()}@test.local`,
      phone: `92${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: "ParentPass123!",
      role: "parent",
      status: "active"
    });
    cleanupUserIds.push(parentB._id);
  });

  after(async () => {
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
  // 1. Child Creation & Ownership Derivation
  // =========================================================================
  describe("1. Child Creation & Ownership Derivation", () => {
    it("1.1 Successfully creates a child profile under authenticated parent", async () => {
      const req = createMockReq({
        user: parentA,
        body: {
          fullName: "Aanya Sharma",
          dateOfBirth: "2018-05-14",
          gender: "female",
          description: "Black hair, brown eyes, red jacket",
          photoUrl: "https://res.cloudinary.com/guardianlink/image/upload/v12345/aanya.jpg",
          bloodGroup: "O+",
          height: "115 cm",
          weight: "22 kg"
        }
      });
      const res = createMockRes();

      await childController.createChild(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 201);
      assert.equal(res.data.success, true);
      assert.ok(res.data.child);
      assert.equal(res.data.child.fullName, "Aanya Sharma");
      assert.equal(res.data.child.gender, "female");

      const dbChild = await Child.findById(res.data.child.id);
      assert.ok(dbChild);
      cleanupChildIds.push(dbChild._id);

      // Ownership must match parentA strictly
      assert.equal(dbChild.guardianId.toString(), parentA._id.toString());
    });

    it("1.2 Ignores client-supplied guardianId spoofing and enforces session ownership", async () => {
      const forgedGuardianId = new mongoose.Types.ObjectId();

      const req = createMockReq({
        user: parentA,
        body: {
          fullName: "Spoof Test Child",
          dateOfBirth: "2019-01-01",
          gender: "male",
          guardianId: forgedGuardianId // Spoofing attempt
        }
      });
      const res = createMockRes();

      await childController.createChild(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 201);
      const dbChild = await Child.findById(res.data.child.id);
      cleanupChildIds.push(dbChild._id);

      // Must be parentA, NOT the forged ID
      assert.equal(dbChild.guardianId.toString(), parentA._id.toString());
      assert.notEqual(dbChild.guardianId.toString(), forgedGuardianId.toString());
    });

    it("1.3 Rejects child creation when required full name is missing", async () => {
      const req = createMockReq({
        user: parentA,
        body: {
          fullName: "   ",
          dateOfBirth: "2019-01-01"
        }
      });
      const res = createMockRes();

      await childController.createChild(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 400);
      assert.equal(res.data.success, false);
      assert.equal(res.data.code, "MISSING_FULL_NAME");
    });

    it("1.4 Rejects child creation when date of birth is in the future", async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);

      const req = createMockReq({
        user: parentA,
        body: {
          fullName: "Time Traveler Child",
          dateOfBirth: futureDate.toISOString()
        }
      });
      const res = createMockRes();

      await childController.createChild(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 400);
      assert.equal(res.data.code, "FUTURE_DOB_NOT_ALLOWED");
    });
  });

  // =========================================================================
  // 2. Multi-Parent Ownership Isolation (IDOR Protection)
  // =========================================================================
  describe("2. IDOR Prevention & Ownership Isolation", () => {
    let childOfParentA;

    before(async () => {
      childOfParentA = await Child.create({
        guardianId: parentA._id,
        fullName: "Rohan Sharma",
        dateOfBirth: new Date("2017-08-20"),
        gender: "male",
        status: "active"
      });
      cleanupChildIds.push(childOfParentA._id);
    });

    it("2.1 Parent A can retrieve their own registered child", async () => {
      const req = createMockReq({
        user: parentA,
        params: { id: childOfParentA._id.toString() }
      });
      const res = createMockRes();

      await childController.getChildById(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.child.id, childOfParentA._id.toString());
    });

    it("2.2 Parent B cannot retrieve Parent A's child (404 CHILD_NOT_FOUND)", async () => {
      const req = createMockReq({
        user: parentB, // Unauthorized parent
        params: { id: childOfParentA._id.toString() }
      });
      const res = createMockRes();

      await childController.getChildById(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 404);
      assert.equal(res.data.success, false);
      assert.equal(res.data.code, "CHILD_NOT_FOUND");
    });

    it("2.3 Parent B cannot update Parent A's child (404 CHILD_NOT_FOUND)", async () => {
      const req = createMockReq({
        user: parentB, // Unauthorized parent
        params: { id: childOfParentA._id.toString() },
        body: { fullName: "Hacked Child Name" }
      });
      const res = createMockRes();

      await childController.updateChild(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 404);
      assert.equal(res.data.code, "CHILD_NOT_FOUND");

      // Verify DB record remained unchanged
      const freshChild = await Child.findById(childOfParentA._id);
      assert.equal(freshChild.fullName, "Rohan Sharma");
    });

    it("2.4 Rejects malformed child ID format with 400 INVALID_CHILD_ID", async () => {
      const req = createMockReq({
        user: parentA,
        params: { id: "not-a-valid-mongo-id-123" }
      });
      const res = createMockRes();

      await childController.getChildById(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 400);
      assert.equal(res.data.code, "INVALID_CHILD_ID");
    });
  });

  // =========================================================================
  // 3. Mass-Assignment & Protected Field Tampering Defense
  // =========================================================================
  describe("3. Mass-Assignment Defense", () => {
    let testChild;

    before(async () => {
      testChild = await Child.create({
        guardianId: parentA._id,
        fullName: "Pooja Sharma",
        dateOfBirth: new Date("2016-03-10"),
        gender: "female",
        faceProfileId: "profile_original_uuid_999",
        biometricStatus: "enrolled",
        status: "active"
      });
      cleanupChildIds.push(testChild._id);
    });

    it("3.1 Silently rejects client attempts to overwrite guardianId or faceProfileId via updateChild", async () => {
      const attackerParentId = new mongoose.Types.ObjectId();

      const req = createMockReq({
        user: parentA,
        params: { id: testChild._id.toString() },
        body: {
          fullName: "Pooja Sharma Updated",
          guardianId: attackerParentId, // Forbidden mass-assignment
          faceProfileId: "forged_vector_uuid_000", // Forbidden mass-assignment
          biometricStatus: "failed" // Forbidden mass-assignment
        }
      });
      const res = createMockRes();

      await childController.updateChild(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.child.fullName, "Pooja Sharma Updated");

      const dbRecord = await Child.findById(testChild._id);
      assert.equal(dbRecord.guardianId.toString(), parentA._id.toString());
      assert.equal(dbRecord.faceProfileId, "profile_original_uuid_999");
      assert.equal(dbRecord.biometricStatus, "enrolled");
    });
  });

  // =========================================================================
  // 4. Photo Deletion & Soft Status Transitions
  // =========================================================================
  describe("4. Photo Deletion & Soft Status Toggle", () => {
    let photoChild;

    before(async () => {
      photoChild = await Child.create({
        guardianId: parentA._id,
        fullName: "Kavya Sharma",
        dateOfBirth: new Date("2019-11-22"),
        gender: "female",
        photoUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        cloudinaryPublicId: "sample_public_id_123",
        status: "active"
      });
      cleanupChildIds.push(photoChild._id);
    });

    it("4.1 Deletes photo while preserving the child record intact", async () => {
      const req = createMockReq({
        user: parentA,
        params: { id: photoChild._id.toString() }
      });
      const res = createMockRes();

      await childController.deleteChildPhoto(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);

      const dbChild = await Child.findById(photoChild._id);
      assert.ok(dbChild); // Child still exists!
      assert.equal(dbChild.photoUrl, "");
      assert.equal(dbChild.cloudinaryPublicId, "");
    });

    it("4.2 Toggles child active status safely", async () => {
      const req = createMockReq({
        user: parentA,
        params: { id: photoChild._id.toString() },
        body: { status: "inactive" }
      });
      const res = createMockRes();

      await childController.updateChildStatus(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.child.status, "inactive");

      const freshChild = await Child.findById(photoChild._id);
      assert.equal(freshChild.status, "inactive");
    });
  });
});
