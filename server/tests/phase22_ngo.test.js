/**
 * GuardianLink — Phase 22: NGO Portal Completion Test Suite
 *
 * Comprehensive validation of:
 * 1. Dynamic NGO Profile & Licensing (GET/PATCH /api/ngo/profile, IDOR & Privilege Protection)
 * 2. Real Shelter & Facility Management (GET/POST/PATCH /api/ngo/shelters, Cross-Org Isolation)
 * 3. Live Shelter Occupancy & Concurrency (Boundary validation, Atomic placement, Zero negative count)
 * 4. Safe Child Intake Wizard & Referrals (POST /api/ngo/care-records, Duplicate intake prevention, Session identity)
 * 5. Dynamic Care Records & Medical Status (Lifecycle transitions, Timestamped care notes)
 * 6. Optional AI Biometric Pre-Check (POST /api/ngo/biometric-precheck, Investigation lead only, Zero Guardian PII)
 * 7. Handover Authorization Workflow (Role boundaries, Police approval requirement, Atomic bed release)
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const User = require("../models/User");
const Shelter = require("../models/Shelter");
const CareRecord = require("../models/CareRecord");
const Handover = require("../models/Handover");
const MissingCase = require("../models/MissingCase");
const Child = require("../models/Child");
const ngoController = require("../controllers/ngoController");
const ngoService = require("../services/ngoService");
const auditLogService = require("../services/auditLogService");
const citizenPhotoSearchService = require("../services/citizenPhotoSearchService");
const notificationService = require("../services/notificationService");

describe("GuardianLink Phase 22: NGO Portal Completion", () => {
  // Stub audit logging & notification delivery for fast unit tests
  auditLogService.recordAuditEvent = async () => ({ id: "mock-audit-id" });
  notificationService.createNotification = async () => ({ id: "mock-notif-1" });

  // Default User.find mock to avoid unhandled buffering in non-blocking notifications
  const origDefaultUserFind = User.find;
  User.find = (q) => ({
    limit: () => Promise.resolve([]),
    select: () => ({ sort: () => Promise.resolve([]) })
  });

  const NGO_A_ID = new mongoose.Types.ObjectId();
  const NGO_B_ID = new mongoose.Types.ObjectId();
  const POLICE_ID = new mongoose.Types.ObjectId();
  const ADMIN_ID = new mongoose.Types.ObjectId();
  const SHELTER_1_ID = new mongoose.Types.ObjectId();
  const CASE_1_ID = new mongoose.Types.ObjectId();
  const CHILD_1_ID = new mongoose.Types.ObjectId();
  const CARE_RECORD_1_ID = new mongoose.Types.ObjectId();
  const HANDOVER_1_ID = new mongoose.Types.ObjectId();

  const approvedNgoUser = {
    _id: NGO_A_ID,
    id: NGO_A_ID.toString(),
    name: "Child Hope Foundation Staff",
    email: "contact@childhope.org",
    phone: "+919876543210",
    role: "ngo",
    organization: "Child Hope Foundation",
    status: "approved",
    isVerified: true
  };

  const pendingNgoUser = {
    _id: new mongoose.Types.ObjectId(),
    name: "New Shelter Initiative",
    email: "pending@newshelter.org",
    phone: "+919876543299",
    role: "ngo",
    organization: "New Shelter Initiative",
    status: "pending",
    isVerified: false
  };

  const policeUser = {
    _id: POLICE_ID,
    id: POLICE_ID.toString(),
    name: "Inspector Vikram Sharma",
    role: "police",
    organization: "Central Police Post",
    badgeNumber: "DL-POL-4412",
    status: "approved",
    isVerified: true
  };

  // Mock Express response helper
  const createMockRes = () => {
    const res = {
      statusCode: 200,
      jsonData: null,
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (data) {
        this.jsonData = data;
        return this;
      }
    };
    return res;
  };

  // =========================================================================
  // 1. Dynamic NGO Profile & Licensing (AC-22.1 — AC-22.5)
  // =========================================================================
  describe("1. Dynamic NGO Profile & Licensing (GET /api/ngo/profile & PATCH /api/ngo/profile)", () => {
    it("allows approved NGO to fetch full organization profile and license data", async () => {
      const origFindById = User.findById;
      try {
        User.findById = (id) => ({
          select: () =>
            Promise.resolve({
              _id: NGO_A_ID,
              name: "Child Hope Foundation Staff",
              email: "contact@childhope.org",
              phone: "+919876543210",
              organization: "Child Hope Foundation",
              role: "ngo",
              status: "approved",
              isVerified: true,
              registrationNumber: "NGO-DL-2024-9981",
              registrationAuthority: "Registrar of Societies, Delhi",
              registrationDate: new Date("2020-01-15"),
              darpanId: "DL/2020/0254199",
              address: "Sector 14 Institutional Area",
              city: "New Delhi",
              state: "Delhi",
              pinCode: "110001",
              verifiedAt: new Date("2024-02-01"),
              profilePhoto: "https://example.com/logo.jpg",
              rejectionReason: "",
              createdAt: new Date("2024-01-01")
            })
        });

        const req = { user: approvedNgoUser };
        const res = createMockRes();

        await ngoController.getNgoProfile(req, res, () => {});

        assert.equal(res.statusCode, 200);
        assert.equal(res.jsonData.success, true);
        assert.equal(res.jsonData.profile.organization, "Child Hope Foundation");
        assert.equal(res.jsonData.profile.registrationNumber, "NGO-DL-2024-9981");
        assert.equal(res.jsonData.profile.darpanId, "DL/2020/0254199");
        assert.equal(res.jsonData.profile.status, "approved");
        assert.equal(res.jsonData.profile.isVerified, true);
      } finally {
        User.findById = origFindById;
      }
    });

    it("allows pending NGO to view their profile and see pending verification status", async () => {
      const origFindById = User.findById;
      try {
        User.findById = (id) => ({
          select: () =>
            Promise.resolve({
              _id: pendingNgoUser._id,
              name: "New Shelter Initiative",
              email: "pending@newshelter.org",
              phone: "+919876543299",
              organization: "New Shelter Initiative",
              role: "ngo",
              status: "pending",
              isVerified: false,
              registrationNumber: "PENDING-001",
              darpanId: "",
              createdAt: new Date()
            })
        });

        const req = { user: pendingNgoUser };
        const res = createMockRes();

        await ngoController.getNgoProfile(req, res, () => {});

        assert.equal(res.statusCode, 200);
        assert.equal(res.jsonData.success, true);
        assert.equal(res.jsonData.profile.status, "pending");
        assert.equal(res.jsonData.profile.isVerified, false);
      } finally {
        User.findById = origFindById;
      }
    });

    it("updates non-privileged profile fields while strictly ignoring role/status/isVerified tampering", async () => {
      const origFindById = User.findById;
      try {
        const mockUserDoc = {
          _id: NGO_A_ID,
          name: "Child Hope Foundation Staff",
          email: "contact@childhope.org",
          phone: "+919876543210",
          organization: "Child Hope Foundation",
          role: "ngo",
          status: "approved",
          isVerified: true,
          address: "Old Address",
          city: "Delhi",
          state: "Delhi",
          pinCode: "110001",
          darpanId: "",
          registrationNumber: "NGO-DL-2024-9981",
          save: async function () {
            return this;
          }
        };

        User.findById = () => Promise.resolve(mockUserDoc);

        const req = {
          user: approvedNgoUser,
          body: {
            address: "42 Vasant Vihar Institutional Area",
            city: "New Delhi",
            pinCode: "110057",
            darpanId: "DL/2024/998877",
            phone: "+919811122233",
            // Attempt privilege escalation:
            role: "admin",
            status: "suspended",
            isVerified: false
          }
        };
        const res = createMockRes();

        await ngoController.updateNgoProfile(req, res, () => {});

        assert.equal(res.statusCode, 200);
        assert.equal(res.jsonData.success, true);
        assert.equal(mockUserDoc.address, "42 Vasant Vihar Institutional Area");
        assert.equal(mockUserDoc.pinCode, "110057");
        assert.equal(mockUserDoc.darpanId, "DL/2024/998877");
        assert.equal(mockUserDoc.phone, "+919811122233");

        // Privilege escalation must have been ignored:
        assert.equal(mockUserDoc.role, "ngo");
        assert.equal(mockUserDoc.status, "approved");
        assert.equal(mockUserDoc.isVerified, true);
      } finally {
        User.findById = origFindById;
      }
    });
  });

  // =========================================================================
  // 2. Real Shelter & Facility Management (AC-22.6 — AC-22.9)
  // =========================================================================
  describe("2. Real Shelter & Facility Management (GET /api/ngo/shelters, POST /api/ngo/shelters, PATCH /api/ngo/shelters/:id)", () => {
    it("creates shelter with validated coordinates and positive capacity bound to ngoId", async () => {
      const origSave = Shelter.prototype.save;
      try {
        let savedDoc = null;
        Shelter.prototype.save = async function () {
          savedDoc = this;
          return this;
        };

        const shelterPayload = {
          name: "Safe Haven Kiosk Sector 14",
          capacity: 20,
          address: {
            address: "Plot 14, Main Road",
            city: "New Delhi",
            state: "Delhi",
            pinCode: "110001",
            latitude: 28.6139,
            longitude: 77.2090
          },
          contactPhone: "+91 11 2334 5678"
        };

        const result = await ngoService.createShelter(approvedNgoUser, shelterPayload);

        assert.ok(result);
        assert.equal(savedDoc.name, "Safe Haven Kiosk Sector 14");
        assert.equal(savedDoc.capacity, 20);
        assert.equal(savedDoc.activePlacements, 0);
        assert.equal(savedDoc.status, "active");
        assert.equal(savedDoc.ngoId.toString(), approvedNgoUser._id.toString());
        assert.equal(savedDoc.address.latitude, 28.6139);
        assert.equal(savedDoc.address.longitude, 77.2090);
      } finally {
        Shelter.prototype.save = origSave;
      }
    });

    it("rejects shelter creation with invalid or non-positive capacity", async () => {
      await assert.rejects(
        async () => {
          await ngoService.createShelter(approvedNgoUser, {
            name: "Invalid Shelter",
            capacity: 0
          });
        },
        (err) => {
          assert.equal(err.code, "INVALID_CAPACITY");
          assert.equal(err.status, 400);
          return true;
        }
      );
    });

    it("enforces cross-organization shelter update isolation (NGO A cannot update NGO B's shelter)", async () => {
      const origFindOne = Shelter.findOne;
      try {
        // Query filters by {_id, ngoId: ngoUser._id}. If NGO B owns it, findOne returns null.
        Shelter.findOne = (q) => {
          if (q.ngoId.toString() === approvedNgoUser._id.toString()) {
            return Promise.resolve(null);
          }
          return Promise.resolve({ _id: SHELTER_1_ID, ngoId: NGO_B_ID });
        };

        await assert.rejects(
          async () => {
            await ngoService.updateShelter(approvedNgoUser, SHELTER_1_ID, { name: "Hijacked Name" });
          },
          (err) => {
            assert.equal(err.code, "SHELTER_NOT_FOUND");
            assert.equal(err.status, 404);
            return true;
          }
        );
      } finally {
        Shelter.findOne = origFindOne;
      }
    });

    it("rejects reducing shelter capacity below currently active placements", async () => {
      const origFindOne = Shelter.findOne;
      try {
        Shelter.findOne = () =>
          Promise.resolve({
            _id: SHELTER_1_ID,
            ngoId: approvedNgoUser._id,
            capacity: 15,
            activePlacements: 10,
            save: async () => {}
          });

        await assert.rejects(
          async () => {
            await ngoService.updateShelter(approvedNgoUser, SHELTER_1_ID, { capacity: 8 });
          },
          (err) => {
            assert.match(err.message, /Capacity cannot be reduced below current active placements/);
            assert.equal(err.status, 400);
            return true;
          }
        );
      } finally {
        Shelter.findOne = origFindOne;
      }
    });
  });

  // =========================================================================
  // 3. Live Shelter Occupancy & Concurrency Invariants (AC-22.10 — AC-22.12)
  // =========================================================================
  describe("3. Live Shelter Occupancy & Concurrency Invariants", () => {
    it("correctly computes virtual availableSpaces and occupancyRate and guards 0 capacity", () => {
      const shelterSchema = Shelter.schema;
      const getAvailableSpaces = shelterSchema.virtuals.availableSpaces.getters[0];
      const getOccupancyRate = shelterSchema.virtuals.occupancyRate.getters[0];

      // Normal case
      const mockDocNormal = { capacity: 20, activePlacements: 15 };
      assert.equal(getAvailableSpaces.call(mockDocNormal), 5);
      assert.equal(getOccupancyRate.call(mockDocNormal), 75);

      // Full case
      const mockDocFull = { capacity: 20, activePlacements: 20 };
      assert.equal(getAvailableSpaces.call(mockDocFull), 0);
      assert.equal(getOccupancyRate.call(mockDocFull), 100);

      // Overbooked bound check (should not be negative)
      const mockDocOver = { capacity: 10, activePlacements: 12 };
      assert.equal(getAvailableSpaces.call(mockDocOver), 0);

      // Zero capacity (no division by zero / NaN)
      const mockDocZero = { capacity: 0, activePlacements: 0 };
      assert.equal(getAvailableSpaces.call(mockDocZero), 0);
      assert.equal(getOccupancyRate.call(mockDocZero), 0);
    });

    it("enforces atomic $expr bounds on shelter placement and rejects when full", async () => {
      const origFindOneAndUpdate = Shelter.findOneAndUpdate;
      const origFindOne = CareRecord.findOne;

      try {
        // Mock CareRecord
        CareRecord.findOne = () =>
          Promise.resolve({
            _id: CARE_RECORD_1_ID,
            ngoId: approvedNgoUser._id,
            status: "in_care",
            shelterId: null,
            save: async () => {},
            populate: async () => {},
            toSafeObject: () => ({ id: CARE_RECORD_1_ID.toString(), shelterId: SHELTER_1_ID.toString() })
          });

        // Concurrency atomic update returns null when activePlacements >= capacity
        let capturedQuery = null;
        Shelter.findOneAndUpdate = (q) => {
          capturedQuery = q;
          return Promise.resolve(null); // Simulated full shelter
        };

        await assert.rejects(
          async () => {
            await ngoService.assignPlacement(approvedNgoUser, CARE_RECORD_1_ID, {
              shelterId: SHELTER_1_ID,
              assignedDorm: "Dorm B"
            });
          },
          (err) => {
            assert.equal(err.code, "SHELTER_UNAVAILABLE");
            assert.equal(err.status, 409);
            return true;
          }
        );

        // Verify that query included the atomic $expr check
        assert.deepEqual(capturedQuery.$expr, { $lt: ["$activePlacements", "$capacity"] });
        assert.equal(capturedQuery._id.toString(), SHELTER_1_ID.toString());
      } finally {
        Shelter.findOneAndUpdate = origFindOneAndUpdate;
        CareRecord.findOne = origFindOne;
      }
    });
  });

  // =========================================================================
  // 4. Safe Child Intake Wizard & Referrals (AC-22.13 — AC-22.15)
  // =========================================================================
  describe("4. Safe Child Intake Wizard & Referrals (POST /api/ngo/care-records)", () => {
    it("returns authorized case referrals excluding cases with open CareRecords", async () => {
      const origCaseFind = MissingCase.find;
      const origCareFind = CareRecord.find;

      try {
        const caseA_Id = new mongoose.Types.ObjectId();
        const caseB_Id = new mongoose.Types.ObjectId();

        MissingCase.find = () => ({
          populate: () => ({
            sort: () =>
              Promise.resolve([
                {
                  _id: caseA_Id,
                  caseNumber: "MC-2026-0001",
                  status: "active",
                  toSafeObject: () => ({ id: caseA_Id.toString(), caseNumber: "MC-2026-0001" })
                },
                {
                  _id: caseB_Id,
                  caseNumber: "MC-2026-0002",
                  status: "found",
                  toSafeObject: () => ({ id: caseB_Id.toString(), caseNumber: "MC-2026-0002" })
                }
              ])
          })
        });

        // Case A already has an active care record in progress
        CareRecord.find = () => ({
          select: () => Promise.resolve([{ caseId: caseA_Id }])
        });

        const referrals = await ngoService.getReferrals(approvedNgoUser);

        // Only Case B should be available
        assert.equal(referrals.length, 1);
        assert.equal(referrals[0].id, caseB_Id.toString());
        assert.equal(referrals[0].isReferralAvailable, true);
      } finally {
        MissingCase.find = origCaseFind;
        CareRecord.find = origCareFind;
      }
    });

    it("rejects child intake when active CareRecord is already open for that case", async () => {
      const origCaseFindById = MissingCase.findById;
      const origCareFindOne = CareRecord.findOne;

      try {
        MissingCase.findById = () => ({
          populate: () =>
            Promise.resolve({
              _id: CASE_1_ID,
              status: "active",
              childId: { _id: CHILD_1_ID }
            })
        });

        CareRecord.findOne = () =>
          Promise.resolve({
            _id: CARE_RECORD_1_ID,
            status: "in_care"
          });

        await assert.rejects(
          async () => {
            await ngoService.createCareRecord(approvedNgoUser, {
              caseId: CASE_1_ID,
              childId: CHILD_1_ID
            });
          },
          (err) => {
            assert.equal(err.code, "ACTIVE_CARE_RECORD_EXISTS");
            assert.equal(err.status, 409);
            return true;
          }
        );
      } finally {
        MissingCase.findById = origCaseFindById;
        CareRecord.findOne = origCareFindOne;
      }
    });

    it("creates persistent CareRecord deriving receivedBy from session identity", async () => {
      const origCaseFindById = MissingCase.findById;
      const origCareFindOne = CareRecord.findOne;
      const origCareSave = CareRecord.prototype.save;
      const origCarePopulate = CareRecord.prototype.populate;

      try {
        MissingCase.findById = () => ({
          populate: () =>
            Promise.resolve({
              _id: CASE_1_ID,
              status: "active",
              childId: { _id: CHILD_1_ID }
            })
        });

        CareRecord.findOne = () => Promise.resolve(null);

        let savedRecord = null;
        CareRecord.prototype.save = async function () {
          savedRecord = this;
          return this;
        };
        CareRecord.prototype.populate = async function () {
          return this;
        };

        const result = await ngoService.createCareRecord(approvedNgoUser, {
          caseId: CASE_1_ID,
          childId: CHILD_1_ID,
          intakeSource: "Police Patrol Escort",
          careNotes: "Child escorted in safe condition",
          emotionalState: "Calm",
          medicalNeeded: false
        });

        assert.ok(savedRecord);
        assert.equal(savedRecord.caseId.toString(), CASE_1_ID.toString());
        assert.equal(savedRecord.childId.toString(), CHILD_1_ID.toString());
        assert.equal(savedRecord.ngoId.toString(), approvedNgoUser._id.toString());
        assert.equal(savedRecord.receivedBy.toString(), approvedNgoUser._id.toString()); // Session author
        assert.equal(savedRecord.status, "in_care");
        assert.equal(savedRecord.medicalStatus, "stable");
        assert.match(savedRecord.intakeNumber, /^IN-\d{4}-\d{4}$/);
      } finally {
        MissingCase.findById = origCaseFindById;
        CareRecord.findOne = origCareFindOne;
        CareRecord.prototype.save = origCareSave;
        CareRecord.prototype.populate = origCarePopulate;
      }
    });
  });

  // =========================================================================
  // 5. Dynamic Care Records & Medical Status (AC-22.16 — AC-22.18)
  // =========================================================================
  describe("5. Dynamic Care Records & Medical Status Lifecycle", () => {
    it("appends timestamped care notes with staff author identity and category", async () => {
      const origFindOne = CareRecord.findOne;
      try {
        const mockCareRecord = {
          _id: CARE_RECORD_1_ID,
          ngoId: approvedNgoUser._id,
          careNotes: [],
          save: async function () {
            return this;
          }
        };

        CareRecord.findOne = () => Promise.resolve(mockCareRecord);

        const note = await ngoService.addCareNote(approvedNgoUser, CARE_RECORD_1_ID, {
          text: "Provided evening nutrition and milk. Child went to sleep calmly.",
          category: "Nutrition"
        });

        assert.equal(note.text, "Provided evening nutrition and milk. Child went to sleep calmly.");
        assert.equal(note.category, "Nutrition");
        assert.equal(note.staffId.toString(), approvedNgoUser._id.toString());
        assert.equal(mockCareRecord.careNotes.length, 1);
      } finally {
        CareRecord.findOne = origFindOne;
      }
    });

    it("enforces allowed care status transitions and rejects invalid state hops", async () => {
      const origFindOne = CareRecord.findOne;
      try {
        const mockCareRecord = {
          _id: CARE_RECORD_1_ID,
          ngoId: approvedNgoUser._id,
          status: "in_care",
          save: async function () {
            return this;
          },
          populate: async () => {},
          toSafeObject: function () {
            return { id: this._id.toString(), status: this.status };
          }
        };

        CareRecord.findOne = () => Promise.resolve(mockCareRecord);

        // 'in_care' can transition to 'awaiting_handover' or 'closed'
        const validUpdated = await ngoService.updateCareRecordStatus(
          approvedNgoUser,
          CARE_RECORD_1_ID,
          "awaiting_handover"
        );
        assert.equal(validUpdated.status, "awaiting_handover");

        // Set status to 'handed_over'
        mockCareRecord.status = "handed_over";

        // 'handed_over' cannot hop back to 'pending_intake'
        await assert.rejects(
          async () => {
            await ngoService.updateCareRecordStatus(
              approvedNgoUser,
              CARE_RECORD_1_ID,
              "pending_intake"
            );
          },
          (err) => {
            assert.equal(err.code, "INVALID_STATUS_TRANSITION");
            assert.equal(err.status, 400);
            return true;
          }
        );
      } finally {
        CareRecord.findOne = origFindOne;
      }
    });
  });

  // =========================================================================
  // 6. Optional AI Biometric Pre-Check (AC-22.19 — AC-22.22)
  // =========================================================================
  describe("6. Optional AI Biometric Pre-Check (POST /api/ngo/biometric-precheck)", () => {
    it("rejects biometric precheck without uploaded image file buffer", async () => {
      const req = {
        user: approvedNgoUser,
        file: null
      };
      const res = createMockRes();

      await ngoController.biometricPrecheck(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.equal(res.jsonData.success, false);
      assert.equal(res.jsonData.code, "IMAGE_REQUIRED");
    });

    it("returns potential leads with mandatory disclaimer and zero guardian PII", async () => {
      const origSearch = citizenPhotoSearchService.searchMissingChildPhoto;
      try {
        citizenPhotoSearchService.searchMissingChildPhoto = async (params) => {
          assert.ok(params.imageBuffer);
          return {
            matchFound: true,
            totalCandidates: 1,
            thresholdApplied: 0.6,
            message: "1 potential candidate discovered.",
            disclaimer: "Potential biometric lead. Requires independent law enforcement and guardian verification.",
            candidates: [
              {
                candidateId: "lead_882100",
                caseId: CASE_1_ID.toString(),
                caseNumber: "MC-2026-8821",
                childId: CHILD_1_ID.toString(),
                name: "Aarav Sharma",
                age: 7,
                gender: "male",
                photoUrl: "https://example.com/aarav.jpg",
                similarity: 0.88,
                matchConfidence: "HIGH",
                matchStatus: "potential",
                disclaimer: "Potential biometric lead. Requires independent law enforcement and guardian verification."
              }
            ]
          };
        };

        const req = {
          user: approvedNgoUser,
          file: {
            buffer: Buffer.from("fake-image-bytes"),
            mimetype: "image/jpeg",
            originalname: "child_intake.jpg"
          },
          body: { limit: 5 }
        };
        const res = createMockRes();

        await ngoController.biometricPrecheck(req, res, () => {});

        assert.equal(res.statusCode, 200);
        assert.equal(res.jsonData.success, true);
        assert.equal(res.jsonData.matchFound, true);
        assert.equal(res.jsonData.candidates.length, 1);

        const candidate = res.jsonData.candidates[0];
        assert.equal(candidate.matchStatus, "potential");
        assert.match(candidate.disclaimer, /Potential biometric lead/);

        // Strict Privacy Boundary Verification:
        assert.equal(candidate.guardianPhone, undefined);
        assert.equal(candidate.guardianAddress, undefined);
        assert.equal(candidate.embedding, undefined);
        assert.equal(candidate.vector, undefined);
      } finally {
        citizenPhotoSearchService.searchMissingChildPhoto = origSearch;
      }
    });
  });

  // =========================================================================
  // 7. Handover Authorization Workflow (AC-22.23 — AC-22.26)
  // =========================================================================
  describe("7. Handover Authorization Workflow & Occupancy Release", () => {
    it("requests handover, sets careRecord status to awaiting_handover, and notifies police", async () => {
      const origCareFindOne = CareRecord.findOne;
      const origCareSave = CareRecord.prototype.save;
      const origHandoverSave = Handover.prototype.save;
      const origCaseFindById = MissingCase.findById;

      try {
        const mockCare = {
          _id: CARE_RECORD_1_ID,
          caseId: CASE_1_ID,
          childId: CHILD_1_ID,
          ngoId: approvedNgoUser._id,
          status: "in_care",
          save: async function () {
            return this;
          }
        };

        CareRecord.findOne = () => Promise.resolve(mockCare);
        Handover.findOne = () => Promise.resolve(null);
        MissingCase.findById = () => Promise.resolve({ caseNumber: "MC-2026-8821" });

        let savedHandover = null;
        Handover.prototype.save = async function () {
          savedHandover = this;
          return this;
        };

        const result = await ngoService.requestHandover(approvedNgoUser, CARE_RECORD_1_ID, {
          handoverType: "guardian_reunification",
          guardianName: "Sunita Sharma",
          location: "Central Police Station Desk",
          notes: "Parent identity documents presented"
        });

        assert.ok(savedHandover);
        assert.equal(savedHandover.status, "pending");
        assert.equal(savedHandover.guardianDetails.name, "Sunita Sharma");
        assert.equal(mockCare.status, "awaiting_handover");
      } finally {
        CareRecord.findOne = origCareFindOne;
        CareRecord.prototype.save = origCareSave;
        Handover.prototype.save = origHandoverSave;
        MissingCase.findById = origCaseFindById;
      }
    });

    it("rejects unauthorized approval attempts from NGO role (Only police/admin can approve)", async () => {
      await assert.rejects(
        async () => {
          // NGO user attempting to approve handover
          await ngoService.approveHandover(approvedNgoUser, HANDOVER_1_ID);
        },
        (err) => {
          assert.equal(err.code, "UNAUTHORIZED_APPROVER");
          assert.equal(err.status, 403);
          return true;
        }
      );
    });

    it("rejects completing a handover that has not been approved by police", async () => {
      const origFindById = Handover.findById;
      try {
        Handover.findById = () =>
          Promise.resolve({
            _id: HANDOVER_1_ID,
            status: "pending", // Still pending police approval
            ngoId: approvedNgoUser._id
          });

        await assert.rejects(
          async () => {
            await ngoService.completeHandover(approvedNgoUser, HANDOVER_1_ID, { location: "Desk" });
          },
          (err) => {
            assert.equal(err.code, "HANDOVER_NOT_APPROVED");
            assert.equal(err.status, 400);
            return true;
          }
        );
      } finally {
        Handover.findById = origFindById;
      }
    });

    it("completes approved handover, updates careRecord to handed_over, and releases shelter capacity", async () => {
      const origHandoverFind = Handover.findById;
      const origCareFind = CareRecord.findById;
      const origShelterUpdate = Shelter.findOneAndUpdate;

      try {
        let savedHandover = null;
        Handover.findById = () =>
          Promise.resolve({
            _id: HANDOVER_1_ID,
            status: "approved", // Formally approved by police
            ngoId: approvedNgoUser._id,
            careRecordId: CARE_RECORD_1_ID,
            save: async function () {
              savedHandover = this;
              return this;
            },
            toSafeObject: function () {
              return { id: this._id.toString(), status: this.status };
            }
          });

        let savedCare = null;
        CareRecord.findById = () =>
          Promise.resolve({
            _id: CARE_RECORD_1_ID,
            shelterId: SHELTER_1_ID,
            status: "awaiting_handover",
            save: async function () {
              savedCare = this;
              return this;
            }
          });

        let decrementedQuery = null;
        let decrementedUpdate = null;
        Shelter.findOneAndUpdate = (q, u) => {
          decrementedQuery = q;
          decrementedUpdate = u;
          return Promise.resolve({ _id: SHELTER_1_ID });
        };

        const res = await ngoService.completeHandover(approvedNgoUser, HANDOVER_1_ID, {
          location: "Central Delhi Police Post",
          notes: "Child safely handed over to verified mother."
        });

        assert.equal(res.status, "completed");
        assert.equal(savedHandover.status, "completed");
        assert.equal(savedCare.status, "handed_over");

        // Verify atomic decrement of active shelter placements:
        assert.equal(decrementedQuery._id.toString(), SHELTER_1_ID.toString());
        assert.deepEqual(decrementedUpdate, { $inc: { activePlacements: -1 } });
      } finally {
        Handover.findById = origHandoverFind;
        CareRecord.findById = origCareFind;
        Shelter.findOneAndUpdate = origShelterUpdate;
      }
    });
  });
});
