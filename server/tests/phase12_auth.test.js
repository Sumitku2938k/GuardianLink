/**
 * GuardianLink — Phase 12: Comprehensive Authentication, Session & RBAC Test Suite
 *
 * Validates:
 * 1. User Registration Security & Privilege Escalation Prevention
 * 2. Password Strength, Hashing & Plaintext Defense
 * 3. User Login, Credential Verification & Suspension Gates
 * 4. Session Termination & Logout Behavior
 * 5. JWT Validation, Tamper Detection & Token Expiration
 * 6. Role-Based Access Control (RBAC) Across Parent, Citizen, Police, NGO, and Admin
 */

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const authController = require("../controllers/authController");
const authenticate = require("../middleware/authenticate");
const { requireRole, requireApprovedRole } = require("../middleware/role");

const TEST_DB_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/guardianlink_phase12_test";
const JWT_SECRET = process.env.JWT_SECRET || "guardianlink_super_secret_jwt_key_2026_safe_child_platform";

const createMockReq = ({ body = {}, query = {}, params = {}, headers = {}, cookies = {}, user = null } = {}) => ({
  body,
  query,
  params,
  headers: {
    "x-forwarded-for": "127.0.0.1",
    "user-agent": "GuardianLink-Phase12-TestRunner/1.0",
    "x-request-id": "req-phase12-auth-" + Math.random().toString(36).substring(7),
    ...headers
  },
  cookies,
  user,
  ip: "127.0.0.1",
  id: "req-phase12-auth-mock"
});

const createMockRes = () => {
  const res = {
    statusCode: 200,
    data: null,
    cookies: {},
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
    cookie(name, val, options) {
      this.cookies[name] = { val, options };
      return this;
    },
    clearCookie(name, options) {
      delete this.cookies[name];
      this.clearedCookie = name;
      return this;
    },
    setHeader(name, val) {
      this.headers[name] = val;
      return this;
    }
  };
  return res;
};

describe("Phase 12: Authentication, Session & RBAC Security Suite", () => {
  const cleanupUserIds = [];

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI);
    }
  });

  after(async () => {
    if (cleanupUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: cleanupUserIds } });
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  // =========================================================================
  // 1. User Registration & Privilege Escalation Defense
  // =========================================================================
  describe("1. Registration & Privilege Escalation", () => {
    it("1.1 Successfully registers a parent user with hashed password and active status", async () => {
      const email = `parent_${Date.now()}@test.local`;
      const phone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

      const req = createMockReq({
        body: {
          fullName: "Aarav Sharma",
          email,
          phone,
          password: "SecurePassword123!",
          role: "parent",
          city: "New Delhi",
          state: "Delhi"
        }
      });
      const res = createMockRes();

      await authController.register(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 201);
      assert.equal(res.data.success, true);
      assert.ok(res.data.user);
      assert.equal(res.data.user.role, "parent");
      assert.equal(res.data.user.status, "active");
      assert.equal(res.data.user.email, email.toLowerCase());
      assert.equal(res.data.user.password, undefined); // Password never leaked
      assert.equal(res.data.user.passwordHash, undefined);

      const dbUser = await User.findById(res.data.user.id).select("+passwordHash");
      assert.ok(dbUser);
      cleanupUserIds.push(dbUser._id);

      // Verify password was hashed and not plaintext
      assert.notEqual(dbUser.passwordHash, "SecurePassword123!");
      assert.ok(dbUser.passwordHash.startsWith("$2"));
      const isMatch = await bcrypt.compare("SecurePassword123!", dbUser.passwordHash);
      assert.equal(isMatch, true);
    });

    it("1.2 Prohibits public registration of 'admin' role (Privilege Escalation Prevention)", async () => {
      const req = createMockReq({
        body: {
          fullName: "Hacker Admin",
          email: `hacker_${Date.now()}@exploit.local`,
          phone: `99${Math.floor(10000000 + Math.random() * 90000000)}`,
          password: "SecretAdminPass123!",
          role: "admin"
        }
      });
      const res = createMockRes();

      await authController.register(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 403);
      assert.equal(res.data.success, false);
      assert.equal(res.data.code, "ADMIN_REGISTRATION_FORBIDDEN");
    });

    it("1.3 Rejects duplicate email or duplicate phone registration", async () => {
      const email = `dup_${Date.now()}@test.local`;
      const phone = `97${Math.floor(10000000 + Math.random() * 90000000)}`;

      const user = await User.create({
        name: "Existing User",
        email,
        phone,
        passwordHash: "HashDummy123!",
        role: "citizen",
        status: "active"
      });
      cleanupUserIds.push(user._id);

      const req = createMockReq({
        body: {
          fullName: "Duplicate User",
          email,
          phone: "9123456789",
          password: "AnotherPassword123!",
          role: "citizen"
        }
      });
      const res = createMockRes();

      await authController.register(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 400);
      assert.equal(res.data.success, false);
      assert.equal(res.data.code, "DUPLICATE_ACCOUNT");
    });

    it("1.4 Enforces pending status for newly registered police and NGO accounts", async () => {
      const policeEmail = `police_${Date.now()}@dept.local`;
      const policePhone = `95${Math.floor(10000000 + Math.random() * 90000000)}`;

      const req = createMockReq({
        body: {
          fullName: "Sub-Inspector Priya",
          email: policeEmail,
          phone: policePhone,
          password: "PolicePassword2026!",
          role: "police",
          organization: "Sector 18 Police Station"
        }
      });
      const res = createMockRes();

      await authController.register(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 201);
      assert.equal(res.data.user.role, "police");
      assert.equal(res.data.user.status, "pending");
      assert.equal(res.data.user.isVerified, false);

      const dbPolice = await User.findById(res.data.user.id);
      cleanupUserIds.push(dbPolice._id);
      assert.equal(dbPolice.status, "pending");
    });

    it("1.5 Rejects registration with missing required fields", async () => {
      const req = createMockReq({
        body: {
          fullName: "",
          email: "missing_fields@test.local",
          phone: "",
          password: ""
        }
      });
      const res = createMockRes();

      await authController.register(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 400);
      assert.equal(res.data.success, false);
      assert.equal(res.data.code, "MISSING_REQUIRED_FIELDS");
    });
  });

  // =========================================================================
  // 2. User Login & Credential Verification
  // =========================================================================
  describe("2. Login & Credential Verification", () => {
    let testCitizen;
    const citizenPassword = "CitizenPassword2026!";

    before(async () => {
      const email = `login_cit_${Date.now()}@test.local`;
      const phone = `93${Math.floor(10000000 + Math.random() * 90000000)}`;
      testCitizen = new User({
        name: "Rahul Verma",
        email,
        phone,
        passwordHash: citizenPassword,
        role: "citizen",
        status: "active",
        isVerified: true
      });
      await testCitizen.save();
      cleanupUserIds.push(testCitizen._id);
    });

    it("2.1 Successfully logs in with valid email and password", async () => {
      const req = createMockReq({
        body: {
          identifier: testCitizen.email,
          password: citizenPassword
        }
      });
      const res = createMockRes();

      await authController.login(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.cookies["guardianlink_token"] && res.cookies["guardianlink_token"].val);
      assert.equal(res.data.user.id, testCitizen._id.toString());
      assert.equal(res.data.user.password, undefined);
    });

    it("2.2 Successfully logs in with valid phone number identifier", async () => {
      const req = createMockReq({
        body: {
          identifier: testCitizen.phone,
          password: citizenPassword
        }
      });
      const res = createMockRes();

      await authController.login(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
    });

    it("2.3 Rejects login with incorrect password with 401 INVALID_CREDENTIALS", async () => {
      const req = createMockReq({
        body: {
          identifier: testCitizen.email,
          password: "WrongPassword999!"
        }
      });
      const res = createMockRes();

      await authController.login(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 401);
      assert.equal(res.data.success, false);
      assert.equal(res.data.code, "INVALID_CREDENTIALS");
    });

    it("2.4 Rejects login for unknown user identifier", async () => {
      const req = createMockReq({
        body: {
          identifier: "nonexistent_account@nowhere.local",
          password: "AnyPassword123!"
        }
      });
      const res = createMockRes();

      await authController.login(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 401);
      assert.equal(res.data.code, "INVALID_CREDENTIALS");
    });

    it("2.5 Blocks login for suspended user with 403 ACCOUNT_SUSPENDED", async () => {
      const suspendedUser = new User({
        name: "Suspended Malicious",
        email: `suspended_${Date.now()}@test.local`,
        phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
        passwordHash: "SuspendedPass123!",
        role: "citizen",
        status: "suspended"
      });
      await suspendedUser.save();
      cleanupUserIds.push(suspendedUser._id);

      const req = createMockReq({
        body: {
          identifier: suspendedUser.email,
          password: "SuspendedPass123!"
        }
      });
      const res = createMockRes();

      await authController.login(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 403);
      assert.equal(res.data.success, false);
      assert.equal(res.data.code, "ACCOUNT_SUSPENDED");
    });
  });

  // =========================================================================
  // 3. Logout & Token Invalidation
  // =========================================================================
  describe("3. Logout & Cookie Clearing", () => {
    it("3.1 Logs out user and clears the JWT authentication cookie", async () => {
      const req = createMockReq({
        user: { _id: new mongoose.Types.ObjectId(), name: "Test User", role: "citizen" }
      });
      const res = createMockRes();

      await authController.logout(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.clearedCookie, "guardianlink_token");
    });
  });

  // =========================================================================
  // 4. JWT & Authentication Middleware (`authenticate`)
  // =========================================================================
  describe("4. JWT Signature, Expiration & Middleware Protection", () => {
    it("4.1 Rejects request with missing token with 401 UNAUTHORIZED", async () => {
      const req = createMockReq();
      const res = createMockRes();
      let nextCalled = false;

      await authenticate(req, res, () => { nextCalled = true; });

      assert.equal(res.statusCode, 401);
      assert.equal(res.data.code, "UNAUTHORIZED");
      assert.equal(nextCalled, false);
    });

    it("4.2 Rejects tampered or forged JWT signature", async () => {
      const forgedToken = jwt.sign(
        { id: new mongoose.Types.ObjectId().toString(), role: "admin" },
        "WRONG_FORGED_SECRET_KEY"
      );

      const req = createMockReq({
        headers: { authorization: `Bearer ${forgedToken}` }
      });
      const res = createMockRes();
      let nextCalled = false;

      await authenticate(req, res, () => { nextCalled = true; });

      assert.equal(res.statusCode, 401);
      assert.equal(res.data.code, "INVALID_TOKEN");
      assert.equal(nextCalled, false);
    });

    it("4.3 Rejects expired JWT token", async () => {
      const expiredToken = jwt.sign(
        { id: new mongoose.Types.ObjectId().toString(), role: "parent" },
        JWT_SECRET,
        { expiresIn: "0s" } // Immediate expiration
      );

      const req = createMockReq({
        headers: { authorization: `Bearer ${expiredToken}` }
      });
      const res = createMockRes();
      let nextCalled = false;

      await authenticate(req, res, () => { nextCalled = true; });

      assert.equal(res.statusCode, 401);
      assert.equal(res.data.code, "INVALID_TOKEN");
      assert.equal(nextCalled, false);
    });
  });

  // =========================================================================
  // 5. Role-Based Access Control (RBAC) & Gate Enforcement
  // =========================================================================
  describe("5. Role-Based Access Control (RBAC)", () => {
    it("5.1 Forbids parent from accessing admin-only routes", () => {
      const req = createMockReq({
        user: { _id: new mongoose.Types.ObjectId(), role: "parent", status: "active" }
      });
      const res = createMockRes();
      let nextCalled = false;

      const adminGate = requireRole("admin");
      adminGate(req, res, () => { nextCalled = true; });

      assert.equal(res.statusCode, 403);
      assert.equal(res.data.code, "FORBIDDEN_ROLE");
      assert.equal(nextCalled, false);
    });

    it("5.2 Forbids citizen from accessing police-only routes", () => {
      const req = createMockReq({
        user: { _id: new mongoose.Types.ObjectId(), role: "citizen", status: "active" }
      });
      const res = createMockRes();
      let nextCalled = false;

      const policeGate = requireRole("police");
      policeGate(req, res, () => { nextCalled = true; });

      assert.equal(res.statusCode, 403);
      assert.equal(res.data.code, "FORBIDDEN_ROLE");
      assert.equal(nextCalled, false);
    });

    it("5.3 Forbids pending police officer from accessing operational police actions", () => {
      const req = createMockReq({
        user: { _id: new mongoose.Types.ObjectId(), role: "police", status: "pending" }
      });
      const res = createMockRes();
      let nextCalled = false;

      const approvalGate = requireApprovedRole("police");
      approvalGate(req, res, () => { nextCalled = true; });

      assert.equal(res.statusCode, 403);
      assert.equal(res.data.code, "ACCOUNT_VERIFICATION_PENDING");
      assert.equal(nextCalled, false);
    });

    it("5.4 Blocks non-police user from police approved gate with FORBIDDEN_ROLE", () => {
      const req = createMockReq({
        user: { _id: new mongoose.Types.ObjectId(), role: "citizen", status: "active" }
      });
      const res = createMockRes();
      let nextCalled = false;

      const approvalGate = requireApprovedRole("police");
      approvalGate(req, res, () => { nextCalled = true; });

      assert.equal(res.statusCode, 403);
      assert.equal(res.data.code, "FORBIDDEN_ROLE");
      assert.equal(nextCalled, false);
    });

    it("5.5 Allows approved police officer to pass approval gate", () => {
      const req = createMockReq({
        user: { _id: new mongoose.Types.ObjectId(), role: "police", status: "approved" }
      });
      const res = createMockRes();
      let nextCalled = false;

      const approvalGate = requireApprovedRole("police");
      approvalGate(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, true);
      assert.equal(res.statusCode, 200);
    });
  });
});
