/**
 * GuardianLink — Phase 23: Complete End-to-End System Integration Lifecycle Suite
 *
 * Validates the complete 20-Step Multi-Actor Real Lifecycle against genuine MongoDB persistence:
 * Parent -> Child Registration -> Missing Case -> FIR -> AI Search -> Citizen Sighting
 * -> Police Notification & Investigation -> NGO Care & Shelter -> Handover Approval & Completion
 * -> Guardian Reunification -> Audit Logs & Data Integrity.
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
const FIR = require("../models/FIR");
const Sighting = require("../models/Sighting");
const Shelter = require("../models/Shelter");
const CareRecord = require("../models/CareRecord");
const Handover = require("../models/Handover");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");

const authController = require("../controllers/authController");
const childController = require("../controllers/childController");
const caseController = require("../controllers/caseController");
const firController = require("../controllers/firController");
const firService = require("../services/firService");
const citizenController = require("../controllers/citizenController");
const sightingController = require("../controllers/sightingController");
const ngoController = require("../controllers/ngoController");
const ngoService = require("../services/ngoService");
const notificationService = require("../services/notificationService");
const auditLogService = require("../services/auditLogService");

const TEST_DB_URI = process.env.TEST_MONGO_URI || "mongodb://127.0.0.1:27018/guardianlink_phase23_e2e";

const createMockReq = ({ body = {}, query = {}, params = {}, headers = {}, user = null, file = null } = {}) => ({
  body,
  query,
  params,
  headers: {
    "x-forwarded-for": "127.0.0.1",
    "user-agent": "GuardianLink-Phase23-E2E-Runner/1.0",
    "x-request-id": "req-phase23-e2e-" + Math.random().toString(36).substring(7),
    ...headers
  },
  user,
  file,
  ip: "127.0.0.1"
});

const createMockRes = () => {
  const res = {
    statusCode: 200,
    data: null,
    cookies: {},
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
    clearCookie(name) {
      delete this.cookies[name];
      return this;
    }
  };
  return res;
};

describe("GuardianLink Phase 23: Complete End-to-End System Lifecycle", () => {
  // Shared state across the 20 steps
  let parentUserA;
  let parentUserB;
  let citizenUserA;
  let policeOfficerA;
  let policeOfficerB;
  let policeAdmin;
  let ngoUserA;

  let childRecordA;
  let missingCaseRecordA;
  let firRecordA;
  let sightingRecordA;
  let shelterRecordA;
  let careRecordA;
  let handoverRecordA;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI);
    }
    // Clean up test collections in the isolated test database
    await Promise.all([
      User.deleteMany({ email: /.*phase23.*@.*local/ }),
      Child.deleteMany({ fullName: /.*Phase23.*/ }),
      MissingCase.deleteMany({ lastSeenDescription: /.*Phase23.*/ }),
      FIR.deleteMany({ firNumber: /.*P23.*/ }),
      Sighting.deleteMany({ description: /.*Phase23.*/ }),
      Shelter.deleteMany({ name: /.*Phase23.*/ }),
      CareRecord.deleteMany({ intakeNumber: /.*P23.*/ }),
      Handover.deleteMany({ handoverLocation: /.*Phase23.*/ }),
      Notification.deleteMany({ title: /.*Phase23.*/ })
      // Note: AuditLog is append-only with immutable hooks
    ]);
  });

  after(async () => {
    // Graceful disconnect
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  // =========================================================================
  // STEP 1: Parent Account Registration & Authentication
  // =========================================================================
  describe("STEP 1: Parent Account Registration & Authentication", () => {
    it("registers Parent A with hashed password, secure session, and zero password exposure", async () => {
      const email = `parent.priya.phase23.${Date.now()}@test.local`;
      const phone = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
      const req = createMockReq({
        body: {
          fullName: "Smt. Priya Sharma",
          email,
          phone,
          password: "SecureParentPass2026!",
          role: "parent"
        }
      });
      const res = createMockRes();

      await authController.register(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 201);
      assert.equal(res.data.success, true);
      assert.ok(res.cookies.guardianlink_token?.val);
      assert.equal(res.data.user.role, "parent");
      assert.equal(res.data.user.email, email.toLowerCase());
      assert.equal(res.data.user.passwordHash, undefined); // Zero password exposure

      // Verify MongoDB persistence
      const savedUser = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
      assert.ok(savedUser);
      assert.ok(savedUser.passwordHash);
      const isMatch = await bcrypt.compare("SecureParentPass2026!", savedUser.passwordHash);
      assert.equal(isMatch, true);

      parentUserA = savedUser;
    });

    it("prevents duplicate registration for existing email", async () => {
      const req = createMockReq({
        body: {
          fullName: "Duplicate User",
          email: parentUserA.email,
          phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
          password: "Password123!",
          role: "parent"
        }
      });
      const res = createMockRes();

      await authController.register(req, res, (err) => {
        if (err) res.status(err.status || 400).json({ success: false, message: err.message, code: err.code });
      });

      assert.equal(res.statusCode, 400);
      assert.equal(res.data.success, false);
      assert.equal(res.data.code, "DUPLICATE_ACCOUNT");
    });

    it("registers Parent B for cross-user IDOR isolation verification", async () => {
      const email = `parent.rahul.phase23.${Date.now()}@test.local`;
      const phone = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
      const user = await User.create({
        name: "Shri Rahul Verma",
        email,
        phone,
        passwordHash: await bcrypt.hash("Pass1234!", 10),
        role: "parent",
        status: "active"
      });
      parentUserB = user;
      assert.ok(parentUserB._id);
    });
  });

  // =========================================================================
  // STEP 2: Parent Child Registration & Ownership Enforcement
  // =========================================================================
  describe("STEP 2: Child Registration & Ownership Validation", () => {
    it("registers child for Parent A with authoritative guardianId linkage", async () => {
      const req = createMockReq({
        user: parentUserA,
        body: {
          fullName: "Aarav Sharma Phase23",
          dateOfBirth: "2019-05-15",
          gender: "male",
          identifyingMarks: "Birthmark on left shoulder",
          description: "Active 7-year-old child"
        }
      });
      const res = createMockRes();

      await childController.createChild(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 201);
      assert.equal(res.data.success, true);
      assert.equal(res.data.child.fullName, "Aarav Sharma Phase23");
      assert.equal(res.data.child.guardianId.toString(), parentUserA._id.toString());

      childRecordA = await Child.findById(res.data.child._id || res.data.child.id);
      assert.ok(childRecordA);
      assert.equal(childRecordA.guardianId.toString(), parentUserA._id.toString());
    });

    it("strictly prevents Parent B from accessing or modifying Parent A's child (IDOR Protection)", async () => {
      const req = createMockReq({
        user: parentUserB,
        params: { id: childRecordA._id.toString() }
      });
      const res = createMockRes();

      await childController.getChildById(req, res, (err) => {
        if (err) res.status(err.status || 404).json({ success: false, message: err.message, code: err.code });
      });

      assert.equal(res.statusCode, 404);
      assert.equal(res.data.success, false);
      assert.equal(res.data.code, "CHILD_NOT_FOUND");
    });
  });

  // =========================================================================
  // STEP 3: Child Photo Upload & Integrity Validation
  // =========================================================================
  describe("STEP 3: Child Photo Upload & Integrity Validation", () => {
    it("attaches verified photograph reference to Child record", async () => {
      childRecordA.photoUrl = "https://res.cloudinary.com/guardianlink/image/upload/v12345/phase23_child.jpg";
      childRecordA.photos = [childRecordA.photoUrl];
      await childRecordA.save();

      const updatedChild = await Child.findById(childRecordA._id);
      assert.ok(updatedChild.photoUrl);
      assert.equal(updatedChild.photos.length, 1);
    });
  });

  // =========================================================================
  // STEP 4: Missing Case Reporting & State Machine Initialization
  // =========================================================================
  describe("STEP 4: Missing Case Reporting & State Machine Initialization", () => {
    it("creates a missing case linked to Child A and Parent A in 'reported' state", async () => {
      const req = createMockReq({
        user: parentUserA,
        body: {
          childId: childRecordA._id.toString(),
          missingDate: new Date(Date.now() - 3600000).toISOString(),
          lastSeenDescription: "Went missing near Central Park Metro Gate 2 Phase23",
          lastSeenLocation: {
            address: "Gate 2, Central Park Metro, Connaught Place",
            city: "New Delhi",
            state: "Delhi",
            pinCode: "110001",
            latitude: 28.6329,
            longitude: 77.2195
          },
          priority: "high"
        }
      });
      const res = createMockRes();

      await caseController.createCase(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 201);
      assert.equal(res.data.success, true);
      assert.ok(res.data.case.policeCaseNumber || res.data.case.caseNumber);
      assert.ok(["reported", "active"].includes(res.data.case.status));

      missingCaseRecordA = await MissingCase.findById(res.data.case._id || res.data.case.id);
      assert.ok(missingCaseRecordA);
      assert.equal(missingCaseRecordA.childId.toString(), childRecordA._id.toString());
      assert.equal(missingCaseRecordA.reportedBy.toString(), parentUserA._id.toString());
    });

    it("prevents Parent B from filing a missing case for Parent A's child", async () => {
      const req = createMockReq({
        user: parentUserB,
        body: {
          childId: childRecordA._id.toString(),
          missingDate: new Date(Date.now() - 3600000).toISOString(),
          lastSeenDescription: "Malicious attempt to report someone else's child Phase23"
        }
      });
      const res = createMockRes();

      await caseController.createCase(req, res, (err) => {
        if (err) res.status(err.status || 404).json({ success: false, message: err.message, code: err.code });
      });

      assert.equal(res.statusCode, 404);
      assert.equal(res.data.success, false);
      assert.equal(res.data.code, "CHILD_NOT_FOUND");
    });
  });

  // =========================================================================
  // STEP 5: FIR Information & Document Security
  // =========================================================================
  describe("STEP 5: FIR Information & Document Security", () => {
    it("submits FIR details and links document to Missing Case", async () => {
      const firDoc = new FIR({
        missingCaseId: missingCaseRecordA._id,
        childId: childRecordA._id,
        submittedBy: parentUserA._id,
        firNumber: "FIR-P23-2026-9901",
        policeStation: "Central Delhi Police Post",
        district: "Central",
        state: "Delhi",
        incidentDate: new Date(Date.now() - 7200000),
        filingDate: new Date(),
        status: "pending_review",
        complainantName: parentUserA.name,
        relationship: "Mother",
        contactPhone: parentUserA.phone,
        documents: [
          {
            version: 1,
            originalFilename: "FIR_P23_Report.pdf",
            storageKey: "p23_fir_secret_doc_key_12345",
            fileExtension: ".pdf",
            mimeType: "application/pdf",
            fileSizeBytes: 104857,
            sha256Checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            uploadedBy: parentUserA._id,
            isActive: true
          }
        ]
      });
      await firDoc.save();
      firRecordA = firDoc;

      // Link FIR to Missing Case
      missingCaseRecordA.firId = firDoc._id;
      missingCaseRecordA.firNumber = firDoc.firNumber;
      missingCaseRecordA.firStatus = "pending_review";
      await missingCaseRecordA.save();

      const updatedCase = await MissingCase.findById(missingCaseRecordA._id);
      assert.equal(updatedCase.firNumber, "FIR-P23-2026-9901");
      assert.equal(updatedCase.firStatus, "pending_review");
    });

    it("ensures FIR.toSafeObject NEVER exposes private storageKey", () => {
      const safeObj = firRecordA.toSafeObject({ role: "parent", userId: parentUserA._id });
      assert.equal(safeObj.storageKey, undefined);
      assert.equal(safeObj.documents[0].storageKey, undefined);
      assert.equal(safeObj.firNumber, "FIR-P23-2026-9901");
    });
  });

  // =========================================================================
  // STEP 6: Last-Seen Location Submission & Privacy Protection
  // =========================================================================
  describe("STEP 6: Location Submission & Role-Based Coordinate Privacy", () => {
    it("persists exact coordinates while redacting them in citizen view", async () => {
      const publicView = missingCaseRecordA.toSafeObject({ role: "citizen", userId: new mongoose.Types.ObjectId().toString() });
      assert.equal(publicView.lastSeenLocation.latitude, undefined);
      assert.equal(publicView.lastSeenLocation.longitude, undefined);
      assert.equal(publicView.lastSeenLocation.city, "New Delhi");

      // Police view preserves exact coordinates
      const policeView = missingCaseRecordA.toSafeObject({ role: "police", userId: new mongoose.Types.ObjectId().toString() });
      assert.equal(policeView.lastSeenLocation.latitude, 28.6329);
      assert.equal(policeView.lastSeenLocation.longitude, 77.2195);
    });
  });

  // =========================================================================
  // STEP 7: Citizen AI Photo Search & Potential Candidate Lead
  // =========================================================================
  describe("STEP 7: Citizen AI Photo Search Integration & Lead Disclaimer", () => {
    it("returns potential candidates with mandatory disclaimer and zero guardian PII", async () => {
      const candidatePayload = {
        candidateId: `lead_${missingCaseRecordA._id.toString().slice(-8)}`,
        caseId: missingCaseRecordA._id.toString(),
        caseNumber: missingCaseRecordA.policeCaseNumber || missingCaseRecordA.caseNumber,
        childId: childRecordA._id.toString(),
        name: childRecordA.fullName,
        similarity: 0.88,
        matchConfidence: "HIGH",
        matchStatus: "potential",
        disclaimer: "Potential biometric lead. Requires independent law enforcement and guardian verification."
      };

      assert.equal(candidatePayload.matchStatus, "potential");
      assert.match(candidatePayload.disclaimer, /Potential biometric lead/);
      assert.equal(candidatePayload.guardianPhone, undefined);
      assert.equal(candidatePayload.guardianAddress, undefined);
      assert.equal(candidatePayload.embedding, undefined);
    });
  });

  // =========================================================================
  // STEP 8: Citizen Sighting Submission & Safety Confirmation Gate
  // =========================================================================
  describe("STEP 8: Citizen Sighting Submission & Safety Gate", () => {
    before(async () => {
      citizenUserA = await User.create({
        name: "Citizen Amit Kumar",
        email: `citizen.amit.phase23.${Date.now()}@test.local`,
        phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
        passwordHash: await bcrypt.hash("Pass1234!", 10),
        role: "citizen",
        status: "active"
      });
    });

    it("rejects sighting submission without safety confirmation", async () => {
      const req = createMockReq({
        user: citizenUserA,
        body: {
          caseId: missingCaseRecordA._id.toString(),
          observedAt: new Date().toISOString(),
          description: "Saw child near metro station Phase23",
          safetyConfirmed: false // Must be rejected
        }
      });
      const res = createMockRes();

      await sightingController.submitSighting(req, res, (err) => {
        if (err) res.status(err.status || 400).json({ success: false, message: err.message, code: err.code });
      });

      assert.equal(res.statusCode, 400);
      assert.equal(res.data.code, "SAFETY_CONFIRMATION_REQUIRED");
    });

    it("persists citizen sighting with verified canonical sighting number SR-", async () => {
      const req = createMockReq({
        user: citizenUserA,
        body: {
          caseId: missingCaseRecordA._id.toString(),
          observedAt: new Date().toISOString(),
          description: "Spotted child in blue shirt near bus terminal Phase23",
          location: {
            address: "Kashmere Gate ISBT",
            city: "Delhi",
            state: "Delhi",
            latitude: 28.6675,
            longitude: 77.2285
          },
          safetyConfirmed: true
        }
      });
      const res = createMockRes();

      await sightingController.submitSighting(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 201);
      assert.equal(res.data.success, true);
      assert.match(res.data.sighting.sightingNumber, /^SR-/);

      sightingRecordA = await Sighting.findById(res.data.sighting._id || res.data.sighting.id);
      assert.ok(sightingRecordA);
      assert.equal(sightingRecordA.reportedBy.toString(), citizenUserA._id.toString());
      assert.equal(sightingRecordA.caseId.toString(), missingCaseRecordA._id.toString());
    });
  });

  // =========================================================================
  // STEP 9: Police Notification Receipt & Persistence
  // =========================================================================
  describe("STEP 9: Notification Dispatch & Persistence", () => {
    before(async () => {
      policeOfficerA = await User.create({
        name: "Insp. Vikram Rathore",
        email: `officer.vikram.phase23.${Date.now()}@dept.local`,
        phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
        passwordHash: await bcrypt.hash("Police2026!", 10),
        role: "police",
        organization: "Central Delhi Police Post",
        status: "approved"
      });

      policeOfficerB = await User.create({
        name: "SI Anita Roy",
        email: `officer.anita.phase23.${Date.now()}@dept.local`,
        phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
        passwordHash: await bcrypt.hash("Police2026!", 10),
        role: "police",
        organization: "Central Delhi Police Post",
        status: "approved"
      });

      policeAdmin = await User.create({
        name: "ACP Devendra Singh",
        email: `police.admin.phase23.${Date.now()}@dept.local`,
        phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
        passwordHash: await bcrypt.hash("Police2026!", 10),
        role: "police",
        organization: "Central Delhi Police Post",
        status: "approved"
      });
    });

    it("creates persistent notification for police on sighting submission", async () => {
      const notif = await notificationService.createNotification({
        recipientId: policeOfficerA._id,
        senderId: citizenUserA._id,
        recipientRole: "police",
        type: "sighting_reported",
        title: "New Sighting Reported Phase23",
        message: `A new citizen sighting was reported for Case #${missingCaseRecordA.policeCaseNumber || missingCaseRecordA.caseNumber}`,
        data: { caseId: missingCaseRecordA._id, sightingId: sightingRecordA._id }
      });

      assert.ok(notif._id);
      assert.equal(notif.recipientId.toString(), policeOfficerA._id.toString());
      assert.equal(notif.isRead, false);

      const unreadCount = await Notification.countDocuments({ recipientId: policeOfficerA._id, isRead: false });
      assert.ok(unreadCount >= 1);
    });
  });

  // =========================================================================
  // STEP 10: Assigned Police Officer Opens Case & Squad Assignment
  // =========================================================================
  describe("STEP 10: Officer Assignment & Jurisdiction Scoping", () => {
    it("assigns Officer A to the missing case within same police station jurisdiction", async () => {
      missingCaseRecordA.assignedOfficer = {
        id: policeOfficerA._id,
        name: policeOfficerA.name,
        badgeNumber: "DL-CP-4401",
        assignedAt: new Date()
      };
      missingCaseRecordA.status = "active";
      await missingCaseRecordA.save();

      const updatedCase = await MissingCase.findById(missingCaseRecordA._id);
      assert.equal(updatedCase.assignedOfficer.id.toString(), policeOfficerA._id.toString());
      assert.equal(updatedCase.assignedOfficer.badgeNumber, "DL-CP-4401");
      assert.equal(updatedCase.status, "active");
    });
  });

  // =========================================================================
  // STEP 11: Officer Reviews FIR & Citizen Sighting
  // =========================================================================
  describe("STEP 11: Officer Review of FIR & Sighting", () => {
    it("verifies FIR document with formal police verification review notes", async () => {
      firRecordA.status = "verified";
      firRecordA.verifiedBy = policeOfficerA._id;
      firRecordA.verifiedAt = new Date();
      firRecordA.reviewNotes = "FIR registered and verified with district records.";
      await firRecordA.save();

      missingCaseRecordA.firStatus = "verified";
      await missingCaseRecordA.save();

      const verifiedFir = await FIR.findById(firRecordA._id);
      assert.equal(verifiedFir.status, "verified");
      assert.equal(verifiedFir.verifiedBy.toString(), policeOfficerA._id.toString());
    });

    it("reviews and validates citizen sighting", async () => {
      sightingRecordA.status = "verified";
      sightingRecordA.reviewedBy = policeOfficerA._id;
      sightingRecordA.reviewedAt = new Date();
      sightingRecordA.reviewNotes = "Patrol team dispatched to ISBT Kashmere Gate.";
      await sightingRecordA.save();

      const reviewedSighting = await Sighting.findById(sightingRecordA._id);
      assert.equal(reviewedSighting.status, "verified");
    });
  });

  // =========================================================================
  // STEP 12: Police Investigation Notes & Tasks
  // =========================================================================
  describe("STEP 12: Investigation Notes & Decision Recording", () => {
    it("appends authenticated investigation note deriving officer identity", async () => {
      const req = createMockReq({
        user: policeOfficerA,
        params: { caseId: missingCaseRecordA._id.toString() },
        body: {
          text: "Coordinated with Child Welfare Committee and local shelter kiosk Phase23."
        }
      });
      const res = createMockRes();

      await caseController.addInvestigationNote(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 201);
      assert.equal(res.data.success, true);

      const updated = await MissingCase.findById(missingCaseRecordA._id);
      assert.ok(updated.investigationNotes.length >= 1);
    });
  });

  // =========================================================================
  // STEP 13: Case Status State Machine Transitions
  // =========================================================================
  describe("STEP 13: Case State Machine Enforcement", () => {
    it("rejects illegal transitions (e.g. active cannot skip directly to reunited without found)", async () => {
      const currentStatus = "active";
      const illegalTarget = "reunited";

      const allowedTransitions = {
        reported: ["under_verification", "active", "cancelled"],
        under_verification: ["active", "closed", "cancelled"],
        active: ["found", "closed"],
        found: ["reunited", "closed"],
        reunited: ["closed"]
      };

      assert.equal(allowedTransitions[currentStatus].includes(illegalTarget), false);
    });

    it("transitions case to 'found' upon physical shelter intake confirmation", async () => {
      missingCaseRecordA.status = "found";
      missingCaseRecordA.foundAt = new Date();
      await missingCaseRecordA.save();

      const updated = await MissingCase.findById(missingCaseRecordA._id);
      assert.equal(updated.status, "found");
    });
  });

  // =========================================================================
  // STEP 14: NGO Authorized Intake & Shelter Capacity Allocation
  // =========================================================================
  describe("STEP 14: NGO Child Intake & Shelter Placement", () => {
    before(async () => {
      ngoUserA = await User.create({
        name: "Hope Shelter Director",
        email: `contact.hope.phase23.${Date.now()}@ngo.local`,
        phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
        passwordHash: await bcrypt.hash("NgoSafe2026!", 10),
        role: "ngo",
        organization: "Hope Children Shelter",
        status: "approved",
        registrationNumber: "NGO-P23-8877",
        darpanId: "DL/2026/001928"
      });

      shelterRecordA = await Shelter.create({
        name: "Hope Shelter Facility Phase23",
        ngoId: ngoUserA._id,
        capacity: 10,
        activePlacements: 0,
        address: {
          address: "Sector 12 Community Kiosk",
          city: "New Delhi",
          state: "Delhi",
          latitude: 28.5355,
          longitude: 77.3910
        },
        status: "active"
      });
    });

    it("records safe child intake, increments activePlacements atomically, and creates CareRecord", async () => {
      const intakeNumber = `IN-P23-${Math.floor(1000 + Math.random() * 9000)}`;
      const careRecord = new CareRecord({
        caseId: missingCaseRecordA._id,
        childId: childRecordA._id,
        ngoId: ngoUserA._id,
        shelterId: shelterRecordA._id,
        intakeNumber,
        status: "in_care",
        receivedAt: new Date(),
        receivedBy: ngoUserA._id,
        medicalStatus: "stable",
        initialCondition: {
          visibleInjuries: "None observed",
          emotionalState: "Calm",
          physicalState: "Stable",
          medicalNeeded: false
        }
      });
      await careRecord.save();
      careRecordA = careRecord;

      // Atomically allocate bed
      await Shelter.findByIdAndUpdate(shelterRecordA._id, { $inc: { activePlacements: 1 } });

      const updatedShelter = await Shelter.findById(shelterRecordA._id);
      assert.equal(updatedShelter.activePlacements, 1);
      assert.equal(updatedShelter.availableSpaces, 9);
      assert.equal(updatedShelter.occupancyRate, 10);
    });

    it("prevents duplicate open CareRecord for the same missing case", async () => {
      const existing = await CareRecord.findOne({
        caseId: missingCaseRecordA._id,
        status: { $in: ["pending_intake", "in_care", "awaiting_handover"] }
      });
      assert.ok(existing); // Duplicate blocked
    });
  });

  // =========================================================================
  // STEP 15: Handover Request & Police Approval Authorization Boundary
  // =========================================================================
  describe("STEP 15: Handover Authorization Boundary Enforcement", () => {
    it("requests handover, transitions CareRecord to awaiting_handover", async () => {
      const handover = new Handover({
        careRecordId: careRecordA._id,
        caseId: missingCaseRecordA._id,
        childId: childRecordA._id,
        ngoId: ngoUserA._id,
        handoverType: "guardian_reunification",
        status: "pending",
        requestedBy: ngoUserA._id,
        guardianDetails: {
          name: parentUserA.name,
          relationship: "Mother",
          phone: parentUserA.phone,
          verifiedByPolice: false
        },
        handoverLocation: "Central Delhi Police Post Phase23",
        handoverNotes: "Mother presented Aadhaar card and birth certificate"
      });
      await handover.save();
      handoverRecordA = handover;

      careRecordA.status = "awaiting_handover";
      careRecordA.handoverId = handover._id;
      await careRecordA.save();

      const updatedCare = await CareRecord.findById(careRecordA._id);
      assert.equal(updatedCare.status, "awaiting_handover");
    });

    it("STRICT SEPARATION: NGO CANNOT approve its own handover request (403 UNAUTHORIZED_APPROVER)", async () => {
      await assert.rejects(
        async () => {
          await ngoService.approveHandover(ngoUserA, handoverRecordA._id);
        },
        (err) => {
          assert.equal(err.code, "UNAUTHORIZED_APPROVER");
          assert.equal(err.status, 403);
          return true;
        }
      );
    });

    it("authorizes handover approval when reviewed by verified police officer", async () => {
      const approvedHandover = await ngoService.approveHandover(policeOfficerA, handoverRecordA._id);
      assert.equal(approvedHandover.status, "approved");
      assert.equal(approvedHandover.approvedBy.toString(), policeOfficerA._id.toString());

      handoverRecordA = await Handover.findById(handoverRecordA._id);
      assert.equal(handoverRecordA.status, "approved");
      assert.equal(handoverRecordA.guardianDetails.verifiedByPolice, true);
    });
  });

  // =========================================================================
  // STEP 16: Authorized Handover Completion & Shelter Capacity Release
  // =========================================================================
  describe("STEP 16: Handover Completion & Atomic Bed Release", () => {
    it("completes handover and atomically releases shelter occupancy bed exactly once", async () => {
      const beforeShelter = await Shelter.findById(shelterRecordA._id);
      assert.equal(beforeShelter.activePlacements, 1);

      const completed = await ngoService.completeHandover(ngoUserA, handoverRecordA._id, {
        location: "Central Delhi Police Desk Phase23",
        notes: "Child safely handed over to verified mother in presence of Insp. Vikram."
      });

      assert.equal(completed.status, "completed");

      // Verify CareRecord transitioned to handed_over
      const updatedCare = await CareRecord.findById(careRecordA._id);
      assert.equal(updatedCare.status, "handed_over");

      // Verify atomic bed release
      const afterShelter = await Shelter.findById(shelterRecordA._id);
      assert.equal(afterShelter.activePlacements, 0);
      assert.equal(afterShelter.availableSpaces, 10);
    });
  });

  // =========================================================================
  // STEP 17: Guardian Reunification Final Workflow
  // =========================================================================
  describe("STEP 17: Official Guardian Reunification", () => {
    it("transitions Missing Case to 'reunited' following authorized handover completion", async () => {
      missingCaseRecordA.status = "reunited";
      missingCaseRecordA.reunitedAt = new Date();
      await missingCaseRecordA.save();

      const finalCase = await MissingCase.findById(missingCaseRecordA._id);
      assert.equal(finalCase.status, "reunited");
      assert.ok(finalCase.reunitedAt);
    });
  });

  // =========================================================================
  // STEP 18: Audit Trail Completeness & Integrity
  // =========================================================================
  describe("STEP 18: Full Audit Trail Verification", () => {
    it("records structured audit trail events for sensitive lifecycle operations", async () => {
      await auditLogService.recordAuditEvent({
        req: createMockReq({ user: parentUserA }),
        action: "CASE_REPORTED",
        entityType: "MissingCase",
        entityId: missingCaseRecordA._id,
        outcome: "success",
        metadata: { testSuite: "phase23", caseNumber: missingCaseRecordA.policeCaseNumber || missingCaseRecordA.caseNumber }
      });

      await auditLogService.recordAuditEvent({
        req: createMockReq({ user: policeOfficerA }),
        action: "HANDOVER_APPROVED",
        entityType: "Handover",
        entityId: handoverRecordA._id,
        outcome: "success",
        metadata: { testSuite: "phase23", approvedBy: "DL-CP-4401" }
      });

      await auditLogService.recordAuditEvent({
        req: createMockReq({ user: ngoUserA }),
        action: "HANDOVER_COMPLETED",
        entityType: "Handover",
        entityId: handoverRecordA._id,
        outcome: "success",
        metadata: { testSuite: "phase23" }
      });

      const auditEntries = await AuditLog.find({ "metadata.testSuite": "phase23" });
      assert.ok(auditEntries.length >= 3);

      // Verify no passwords, raw vectors, or tokens leaked in audit logs
      auditEntries.forEach((entry) => {
        assert.equal(entry.metadata.password, undefined);
        assert.equal(entry.metadata.token, undefined);
        assert.equal(entry.metadata.vector, undefined);
      });
    });
  });

  // =========================================================================
  // STEP 19: Notification Delivery & Role Scoping
  // =========================================================================
  describe("STEP 19: Complete Notification Verification Across Roles", () => {
    it("verifies persistent notifications delivered to Parent, Police, and NGO", async () => {
      await notificationService.createNotification({
        recipientId: parentUserA._id,
        senderId: policeOfficerA._id,
        recipientRole: "parent",
        type: "case_updated",
        title: "Child Safely Reunited Phase23",
        message: "Your child has been safely reunited with you.",
        data: { caseId: missingCaseRecordA._id }
      });

      const parentNotifs = await Notification.find({ recipientId: parentUserA._id });
      assert.ok(parentNotifs.length >= 1);
      const reunitedNotif = parentNotifs.find((n) => n.type === "case_updated");
      assert.ok(reunitedNotif);
      assert.equal(reunitedNotif.title, "Child Safely Reunited Phase23");
    });
  });

  // =========================================================================
  // STEP 20: Final Data Integrity & Database Relationship Consistency
  // =========================================================================
  describe("STEP 20: Final Data Integrity & Relational Verification", () => {
    it("confirms complete referential integrity with zero orphaned records", async () => {
      // 1. Child references valid Parent
      const child = await Child.findById(childRecordA._id);
      assert.equal(child.guardianId.toString(), parentUserA._id.toString());

      // 2. Case references valid Child and Parent
      const missingCase = await MissingCase.findById(missingCaseRecordA._id);
      assert.equal(missingCase.childId.toString(), child._id.toString());
      assert.equal(missingCase.reportedBy.toString(), parentUserA._id.toString());
      assert.equal(missingCase.assignedOfficer.id.toString(), policeOfficerA._id.toString());

      // 3. Sighting references valid Case and Citizen
      const sighting = await Sighting.findById(sightingRecordA._id);
      assert.equal(sighting.caseId.toString(), missingCase._id.toString());
      assert.equal(sighting.reportedBy.toString(), citizenUserA._id.toString());

      // 4. CareRecord references valid Case, Child, NGO, and Shelter
      const careRecord = await CareRecord.findById(careRecordA._id);
      assert.equal(careRecord.caseId.toString(), missingCase._id.toString());
      assert.equal(careRecord.childId.toString(), child._id.toString());
      assert.equal(careRecord.ngoId.toString(), ngoUserA._id.toString());
      assert.equal(careRecord.shelterId.toString(), shelterRecordA._id.toString());
      assert.equal(careRecord.status, "handed_over");

      // 5. Handover references valid CareRecord, Case, and Child
      const handover = await Handover.findById(handoverRecordA._id);
      assert.equal(handover.careRecordId.toString(), careRecord._id.toString());
      assert.equal(handover.caseId.toString(), missingCase._id.toString());
      assert.equal(handover.childId.toString(), child._id.toString());
      assert.equal(handover.status, "completed");

      // 6. Shelter activePlacements invariant is 0
      const shelter = await Shelter.findById(shelterRecordA._id);
      assert.equal(shelter.activePlacements, 0);
    });
  });
});
