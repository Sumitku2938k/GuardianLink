/**
 * GuardianLink — Phase 23: Security, RBAC, IDOR & Privacy Suite
 *
 * Validates strict authorization boundaries:
 * 1. Cross-Parent Child Access (IDOR prevention).
 * 2. Cross-Station Police Assignment restrictions.
 * 3. Cross-NGO Shelter & Care Record isolation.
 * 4. Unapproved NGO account access controls.
 * 5. Citizen PII & coordinate redaction.
 * 6. Document storageKey scrubbing across all roles.
 *
 * Database: Dedicated Isolated Test Database (mongodb://127.0.0.1:27018/guardianlink_phase23_e2e)
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Child = require("../models/Child");
const MissingCase = require("../models/MissingCase");
const Shelter = require("../models/Shelter");
const CareRecord = require("../models/CareRecord");
const FIR = require("../models/FIR");

const childController = require("../controllers/childController");
const caseController = require("../controllers/caseController");
const ngoController = require("../controllers/ngoController");
const ngoService = require("../services/ngoService");

const TEST_DB_URI = process.env.TEST_MONGO_URI || "mongodb://127.0.0.1:27018/guardianlink_phase23_e2e";

const createMockReq = ({ body = {}, query = {}, params = {}, headers = {}, user = null } = {}) => ({
  body,
  query,
  params,
  headers: {
    "x-forwarded-for": "127.0.0.1",
    "user-agent": "GuardianLink-Phase23-Security-Runner/1.0",
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

describe("GuardianLink Phase 23: Security, RBAC, IDOR & Privacy Validation", () => {
  let parentUserA;
  let parentUserB;
  let childA;
  let policeOfficerStationA;
  let policeOfficerStationB;
  let missingCaseA;
  let ngoApprovedA;
  let ngoApprovedB;
  let ngoPending;
  let shelterA;
  let careRecordA;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI);
    }

    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash("SecurityPass2026!", salt);

    // 1. Two independent parents
    parentUserA = await User.create({
      name: "Parent Alpha",
      email: `parent.alpha.${Date.now()}@test.local`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: passHash,
      role: "parent",
      status: "active"
    });

    parentUserB = await User.create({
      name: "Parent Beta",
      email: `parent.beta.${Date.now()}@test.local`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: passHash,
      role: "parent",
      status: "active"
    });

    childA = await Child.create({
      fullName: `Child Alpha ${Date.now()}`,
      guardianId: parentUserA._id,
      gender: "male",
      dateOfBirth: new Date("2018-05-15")
    });

    // 2. Police officers from two separate stations
    policeOfficerStationA = await User.create({
      name: "Insp. Station North",
      email: `officer.north.${Date.now()}@dept.local`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: passHash,
      role: "police",
      organization: "North District Police Station",
      status: "approved"
    });

    policeOfficerStationB = await User.create({
      name: "Insp. Station South",
      email: `officer.south.${Date.now()}@dept.local`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: passHash,
      role: "police",
      organization: "South District Police Station",
      status: "approved"
    });

    missingCaseA = await MissingCase.create({
      childId: childA._id,
      reportedBy: parentUserA._id,
      missingDate: new Date(),
      lastSeenLocation: {
        address: "123 Private Sanctuary Road",
        city: "New Delhi",
        state: "Delhi",
        pinCode: "110001",
        latitude: 28.6139,
        longitude: 77.2090
      },
      status: "active"
    });

    // 3. NGOs: Two approved and one pending
    ngoApprovedA = await User.create({
      name: "Hope Shelter NGO",
      email: `ngo.hope.${Date.now()}@ngo.local`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: passHash,
      role: "ngo",
      organization: "Hope Care Services",
      status: "approved"
    });

    ngoApprovedB = await User.create({
      name: "Mercy Home NGO",
      email: `ngo.mercy.${Date.now()}@ngo.local`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: passHash,
      role: "ngo",
      organization: "Mercy Children Home",
      status: "approved"
    });

    ngoPending = await User.create({
      name: "Unverified NGO",
      email: `ngo.pending.${Date.now()}@ngo.local`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: passHash,
      role: "ngo",
      organization: "Unverified Entity",
      status: "pending"
    });

    shelterA = await Shelter.create({
      name: "Hope Haven Facility",
      ngoId: ngoApprovedA._id,
      capacity: 10,
      activePlacements: 0,
      address: { city: "New Delhi", state: "Delhi" },
      status: "active"
    });

    careRecordA = await CareRecord.create({
      caseId: missingCaseA._id,
      childId: childA._id,
      ngoId: ngoApprovedA._id,
      shelterId: shelterA._id,
      intakeNumber: `IN-SEC-${Date.now().toString().slice(-4)}`,
      status: "in_care",
      receivedBy: ngoApprovedA._id
    });
  });

  after(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe("SECURITY 1: Cross-Parent IDOR Enforcement", () => {
    it("strictly prevents Parent B from inspecting Parent A's registered child (returns 404 CHILD_NOT_FOUND)", async () => {
      const req = createMockReq({
        user: parentUserB,
        params: { id: childA._id.toString() }
      });
      const res = createMockRes();

      await childController.getChildById(req, res, (err) => {
        if (err) res.status(err.status || 404).json({ success: false, message: err.message, code: err.code });
      });

      assert.equal(res.statusCode, 404);
      assert.equal(res.data.code, "CHILD_NOT_FOUND");
    });

    it("strictly prevents Parent B from modifying Parent A's registered child details", async () => {
      const req = createMockReq({
        user: parentUserB,
        params: { id: childA._id.toString() },
        body: { fullName: "Tampered Child Name" }
      });
      const res = createMockRes();

      await childController.updateChild(req, res, (err) => {
        if (err) res.status(err.status || 404).json({ success: false, message: err.message, code: err.code });
      });

      assert.equal(res.statusCode, 404);
      assert.equal(res.data.code, "CHILD_NOT_FOUND");

      const untouched = await Child.findById(childA._id);
      assert.notEqual(untouched.fullName, "Tampered Child Name");
    });
  });

  describe("SECURITY 2: Cross-Station Police Assignment Scoping", () => {
    it("blocks police officer from Station A assigning officer from Station B (403 CROSS_STATION_ASSIGNMENT_DENIED)", async () => {
      const req = createMockReq({
        user: policeOfficerStationA,
        params: { caseId: missingCaseA._id.toString() },
        body: { officerId: policeOfficerStationB._id.toString() }
      });
      const res = createMockRes();

      await caseController.assignOfficer(req, res, (err) => {
        if (err) res.status(err.status || 403).json({ success: false, message: err.message, code: err.code });
      });

      assert.equal(res.statusCode, 403);
      assert.equal(res.data.code, "CROSS_STATION_ASSIGNMENT_DENIED");
    });
  });

  describe("SECURITY 3: Cross-NGO Shelter & Care Record Isolation", () => {
    it("prevents NGO B from updating NGO A's shelter facility", async () => {
      const req = createMockReq({
        user: ngoApprovedB,
        params: { shelterId: shelterA._id.toString() },
        body: { name: "Hijacked Shelter Facility" }
      });
      const res = createMockRes();

      await ngoController.updateShelter(req, res, (err) => {
        if (err) res.status(err.status || 404).json({ success: false, message: err.message, code: err.code });
      });

      assert.equal(res.statusCode, 404);
      assert.equal(res.data.code, "SHELTER_NOT_FOUND");

      const untouched = await Shelter.findById(shelterA._id);
      assert.equal(untouched.name, "Hope Haven Facility");
    });

    it("prevents NGO B from inspecting NGO A's private care records (403 ACCESS_DENIED)", async () => {
      await assert.rejects(
        async () => {
          await ngoService.getCareRecordById(ngoApprovedB, careRecordA._id.toString());
        },
        (err) => {
          assert.equal(err.status, 403);
          assert.equal(err.code, "ACCESS_DENIED");
          return true;
        }
      );
    });
  });

  describe("SECURITY 4: Unverified NGO Access Restrictions", () => {
    it("rejects unapproved NGO account from accessing care records (403 ACCOUNT_VERIFICATION_PENDING)", async () => {
      const req = createMockReq({
        user: ngoPending,
        params: { careRecordId: careRecordA._id.toString() }
      });
      const res = createMockRes();

      await ngoController.getCareRecordById(req, res, (err) => {
        if (err) res.status(err.status || 403).json({ success: false, message: err.message, code: err.code });
      });

      assert.equal(res.statusCode, 403);
      assert.equal(res.data.code, "ACCOUNT_VERIFICATION_PENDING");
    });

    it("rejects unapproved NGO account from creating new shelter facilities", async () => {
      const req = createMockReq({
        user: ngoPending,
        body: { name: "Unauthorized Shelter", capacity: 10 }
      });
      const res = createMockRes();

      await ngoController.createShelter(req, res, (err) => {
        if (err) res.status(err.status || 403).json({ success: false, message: err.message, code: err.code });
      });

      assert.equal(res.statusCode, 403);
      assert.equal(res.data.code, "ACCOUNT_VERIFICATION_PENDING");
    });
  });

  describe("SECURITY 5: Citizen PII & Residential Location Privacy", () => {
    it("completely redacts street address, pin code, and exact GPS coordinates for citizen view", () => {
      const citizenView = missingCaseA.toSafeObject({ role: "citizen", userId: new mongoose.Types.ObjectId().toString() });

      assert.equal(citizenView.lastSeenLocation.latitude, undefined, "Latitude must be redacted for citizen");
      assert.equal(citizenView.lastSeenLocation.longitude, undefined, "Longitude must be redacted for citizen");
      assert.equal(citizenView.lastSeenLocation.address, undefined, "Street address must be redacted for citizen");
      assert.equal(citizenView.lastSeenLocation.pinCode, undefined, "PIN code must be redacted for citizen");
      assert.equal(citizenView.lastSeenLocation.city, "New Delhi", "City is retained for regional awareness");
    });

    it("preserves exact coordinates only for authorized police officers", () => {
      const policeView = missingCaseA.toSafeObject({ role: "police", userId: policeOfficerStationA._id.toString() });

      assert.equal(policeView.lastSeenLocation.latitude, 28.6139);
      assert.equal(policeView.lastSeenLocation.longitude, 77.2090);
    });
  });

  describe("SECURITY 6: FIR Document Private Storage Key Scrubbing", () => {
    it("ensures FIR.toSafeObject strips internal storageKey across all roles", async () => {
      const fir = new FIR({
        missingCaseId: missingCaseA._id,
        childId: childA._id,
        submittedBy: parentUserA._id,
        firNumber: "FIR-SEC-9988",
        policeStation: "North District",
        district: "North",
        state: "Delhi",
        filingDate: new Date(),
        status: "pending_review",
        complainantName: "Parent Alpha",
        relationship: "Father",
        contactPhone: "919876543210",
        documents: [
          {
            version: 1,
            originalFilename: "FIR_Secret.pdf",
            storageKey: "super_secret_s3_storage_key_xyz",
            fileExtension: ".pdf",
            mimeType: "application/pdf",
            fileSizeBytes: 2048,
            sha256Checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            uploadedBy: parentUserA._id,
            isActive: true
          }
        ]
      });
      await fir.save();

      // Check for parent
      const parentView = fir.toSafeObject({ role: "parent", userId: parentUserA._id.toString() });
      assert.equal(parentView.storageKey, undefined);
      assert.equal(parentView.documents[0].storageKey, undefined);

      // Check for police
      const policeView = fir.toSafeObject({ role: "police", userId: policeOfficerStationA._id.toString() });
      assert.equal(policeView.storageKey, undefined);
      assert.equal(policeView.documents[0].storageKey, undefined);

      // Check for citizen
      const citizenView = fir.toSafeObject({ role: "citizen" });
      assert.equal(citizenView.storageKey, undefined);
      assert.equal(citizenView.documents[0].storageKey, undefined);
    });
  });
});

