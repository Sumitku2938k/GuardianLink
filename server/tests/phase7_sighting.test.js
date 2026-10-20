/**
 * GuardianLink — Phase 7: Citizen Response System Test Suite
 *
 * Comprehensive validation of:
 * 1. Authentication & Role-Based Access Control (RBAC)
 * 2. AI Candidate Resolution & Privacy Allowlist Enforcement
 * 3. Sighting Submission Validation (Mandatory Safety Confirmation, Coords, Fail-Closed Eligibility)
 * 4. Sighting Persistence, Retrieval & Law Enforcement Review
 * 5. Authorized Responder & Guardian Notification Dispatching
 * 6. Privacy Protection: Zero Guardian PII Disclosed
 */

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const User = require("../models/User");
const Child = require("../models/Child");
const MissingCase = require("../models/MissingCase");
const Sighting = require("../models/Sighting");
const Notification = require("../models/Notification");

const sightingService = require("../services/sightingService");
const notificationService = require("../services/notificationService");
const { serializeCitizenCandidate } = require("../services/citizenPhotoSearchService");

// Test ObjectIds
const CITIZEN_USER_ID = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e21a01");
const OTHER_CITIZEN_ID = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e21a02");
const GUARDIAN_USER_ID = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e21a03");
const POLICE_USER_ID = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e21a04");
const ADMIN_USER_ID = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e21a05");

const TEST_CHILD_ID = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e21c01");
const TEST_CASE_ID = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e21d01");
const INELIGIBLE_CASE_ID = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e21d02");

describe("GuardianLink Phase 7: Citizen Response System", () => {
  let citizenUser;
  let otherCitizen;
  let guardianUser;
  let policeUser;
  let testChild;
  let activeCase;
  let closedCase;

  beforeEach(() => {
    citizenUser = {
      _id: CITIZEN_USER_ID,
      name: "Rahul Verma",
      email: "rahul.citizen@example.com",
      role: "citizen",
      isActive: true
    };

    otherCitizen = {
      _id: OTHER_CITIZEN_ID,
      name: "Sneha Patel",
      email: "sneha.citizen@example.com",
      role: "citizen",
      isActive: true
    };

    guardianUser = {
      _id: GUARDIAN_USER_ID,
      name: "Suresh Sharma",
      email: "suresh.parent@example.com",
      phone: "+91-9876543210",
      role: "parent",
      isActive: true
    };

    policeUser = {
      _id: POLICE_USER_ID,
      name: "Insp. R. S. Rathore",
      email: "rathore.police@example.gov.in",
      role: "police",
      isActive: true,
      status: "active"
    };

    testChild = {
      _id: TEST_CHILD_ID,
      guardianId: GUARDIAN_USER_ID,
      fullName: "Aarav Sharma",
      age: 8,
      gender: "male",
      status: "active",
      photoUrl: "https://res.cloudinary.com/guardianlink/image/upload/v123/aarav.jpg"
    };

    activeCase = {
      _id: TEST_CASE_ID,
      childId: TEST_CHILD_ID,
      reportedBy: GUARDIAN_USER_ID,
      caseNumber: "MC-2026-9901",
      policeCaseNumber: "FIR-881/2026",
      status: "active",
      missingDate: new Date(Date.now() - 24 * 3600 * 1000),
      lastSeenLocation: {
        address: "Kiosk #4, Central Station",
        city: "New Delhi",
        state: "Delhi",
        latitude: 28.6139,
        longitude: 77.2090
      },
      lastSeenDescription: "Wearing blue shirt and sneakers"
    };

    closedCase = {
      _id: INELIGIBLE_CASE_ID,
      childId: TEST_CHILD_ID,
      reportedBy: GUARDIAN_USER_ID,
      caseNumber: "MC-2026-7700",
      status: "closed",
      missingDate: new Date(Date.now() - 72 * 3600 * 1000)
    };
  });

  // =========================================================================
  // 1. Authentication & Role-Based Access Control (RBAC)
  // =========================================================================
  describe("1. Authentication & Role-Based Access Control (RBAC)", () => {
    it("1.1 Rejects anonymous sighting submission with 401 UNAUTHORIZED", async () => {
      await assert.rejects(
        sightingService.submitSighting({
          caseId: TEST_CASE_ID.toString(),
          description: "Saw child near metro kiosk",
          safetyConfirmed: true,
          reportingUser: null
        }),
        (err) => {
          assert.equal(err.status, 401);
          assert.equal(err.code, "UNAUTHORIZED");
          return true;
        }
      );
    });

    it("1.2 Prevents unrelated citizen from accessing another citizen's sighting details", async () => {
      // Mock Sighting findById
      const originalFindById = Sighting.findById;
      Sighting.findById = function () {
        return {
          populate: function () {
            return {
              populate: async function () {
                return {
                  _id: new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e21e01"),
                  reportedBy: CITIZEN_USER_ID,
                  caseId: activeCase,
                  childId: testChild,
                  sightingNumber: "SR-8811-100",
                  toSafeObject: (opts = {}) => ({
                    id: "6740b2a8d1e4c89a71e21e01",
                    reportNumber: "SR-8811-100"
                  })
                };
              }
            };
          }
        };
      };

      try {
        await assert.rejects(
          sightingService.getSightingById("6740b2a8d1e4c89a71e21e01", otherCitizen),
          (err) => {
            assert.equal(err.status, 403);
            assert.equal(err.code, "FORBIDDEN");
            return true;
          }
        );
      } finally {
        Sighting.findById = originalFindById;
      }
    });

    it("1.3 Allows authorized police officer to access any sighting details", async () => {
      const originalFindById = Sighting.findById;
      Sighting.findById = function () {
        return {
          populate: function () {
            return {
              populate: async function () {
                return {
                  _id: new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e21e01"),
                  reportedBy: CITIZEN_USER_ID,
                  caseId: activeCase,
                  childId: testChild,
                  sightingNumber: "SR-8811-100",
                  location: { address: "Metro Exit 3", latitude: 28.61, longitude: 77.20 },
                  toSafeObject: (opts = {}) => ({
                    id: "6740b2a8d1e4c89a71e21e01",
                    reportNumber: "SR-8811-100",
                    location: opts.isAuthorizedResponder ? { address: "Metro Exit 3", latitude: 28.61, longitude: 77.20 } : { address: "Metro Exit 3" }
                  })
                };
              }
            };
          }
        };
      };

      try {
        const result = await sightingService.getSightingById("6740b2a8d1e4c89a71e21e01", policeUser);
        assert.ok(result);
        assert.equal(result.reportNumber, "SR-8811-100");
        assert.ok(result.location.latitude !== undefined, "Police can view exact coordinates");
      } finally {
        Sighting.findById = originalFindById;
      }
    });
  });

  // =========================================================================
  // 2. AI Candidate Resolution & Privacy Allowlist Enforcement
  // =========================================================================
  describe("2. AI Candidate Resolution & Privacy Allowlist Enforcement", () => {
    it("2.1 Candidate serializer excludes guardian phone, email, address, and raw vectors", () => {
      const candidateAI = { childId: TEST_CHILD_ID.toString(), similarity: 0.8842 };
      const serialized = serializeCitizenCandidate(candidateAI, testChild, activeCase);

      assert.equal(serialized.childId, TEST_CHILD_ID.toString());
      assert.equal(serialized.caseId, TEST_CASE_ID.toString());
      assert.equal(serialized.name, "Aarav Sharma");
      assert.equal(serialized.matchStatus, "potential");
      assert.equal(serialized.canReportSighting, true);
      assert.equal(serialized.similarity, 0.8842);

      // Strict privacy check: No guardian PII
      assert.equal(serialized.guardianId, undefined);
      assert.equal(serialized.guardianPhone, undefined);
      assert.equal(serialized.parentContact, undefined);
      assert.equal(serialized.guardianEmail, undefined);
      assert.equal(serialized.homeAddress, undefined);
      assert.equal(serialized.medicalNotes, undefined);
      assert.equal(serialized.embedding, undefined);
    });

    it("2.2 Never labels an AI match as 'Verified Match' or identity percentage", () => {
      const candidateAI = { childId: TEST_CHILD_ID.toString(), similarity: 0.95 };
      const serialized = serializeCitizenCandidate(candidateAI, testChild, activeCase);

      assert.notEqual(serialized.matchStatus, "Verified Match");
      assert.notEqual(serialized.matchStatus, "confirmed");
      assert.equal(serialized.matchStatus, "potential");
      assert.ok(typeof serialized.similarity === "number");
      assert.ok(serialized.disclaimer.includes("Requires independent"));
    });
  });

  // =========================================================================
  // 3. Sighting Submission Validation & Re-validation
  // =========================================================================
  describe("3. Sighting Submission Validation & Re-validation", () => {
    it("3.1 Rejects submission if safetyConfirmed is not true (400 SAFETY_CONFIRMATION_REQUIRED)", async () => {
      await assert.rejects(
        sightingService.submitSighting({
          caseId: TEST_CASE_ID.toString(),
          description: "Saw child sitting alone",
          safetyConfirmed: false,
          reportingUser: citizenUser
        }),
        (err) => {
          assert.equal(err.status, 400);
          assert.equal(err.code, "SAFETY_CONFIRMATION_REQUIRED");
          return true;
        }
      );
    });

    it("3.2 Rejects submission with empty or missing description (400 MISSING_DESCRIPTION)", async () => {
      await assert.rejects(
        sightingService.submitSighting({
          caseId: TEST_CASE_ID.toString(),
          description: "   ",
          safetyConfirmed: true,
          reportingUser: citizenUser
        }),
        (err) => {
          assert.equal(err.status, 400);
          assert.equal(err.code, "MISSING_DESCRIPTION");
          return true;
        }
      );
    });

    it("3.3 Rejects submission if caseId is invalid (400 INVALID_CASE_ID)", async () => {
      await assert.rejects(
        sightingService.submitSighting({
          caseId: "not-a-valid-id",
          description: "Saw child near park",
          safetyConfirmed: true,
          reportingUser: citizenUser
        }),
        (err) => {
          assert.equal(err.status, 400);
          assert.equal(err.code, "INVALID_CASE_ID");
          return true;
        }
      );
    });

    it("3.4 Rejects submission if case is not found in MongoDB (404 CASE_NOT_FOUND)", async () => {
      const originalFindById = MissingCase.findById;
      MissingCase.findById = async () => null;

      try {
        await assert.rejects(
          sightingService.submitSighting({
            caseId: TEST_CASE_ID.toString(),
            description: "Saw child near park",
            safetyConfirmed: true,
            reportingUser: citizenUser
          }),
          (err) => {
            assert.equal(err.status, 404);
            assert.equal(err.code, "CASE_NOT_FOUND");
            return true;
          }
        );
      } finally {
        MissingCase.findById = originalFindById;
      }
    });

    it("3.5 Revalidates case eligibility at submission time: Rejects closed or resolved cases (409 CASE_NOT_ELIGIBLE)", async () => {
      const originalFindById = MissingCase.findById;
      MissingCase.findById = async () => closedCase;

      try {
        await assert.rejects(
          sightingService.submitSighting({
            caseId: INELIGIBLE_CASE_ID.toString(),
            description: "Saw child near bus terminal",
            safetyConfirmed: true,
            reportingUser: citizenUser
          }),
          (err) => {
            assert.equal(err.status, 409);
            assert.equal(err.code, "CASE_NOT_ELIGIBLE");
            return true;
          }
        );
      } finally {
        MissingCase.findById = originalFindById;
      }
    });

    it("3.6 Rejects invalid coordinates (latitude out of -90..90)", async () => {
      await assert.rejects(
        sightingService.submitSighting({
          caseId: TEST_CASE_ID.toString(),
          description: "Saw child near market",
          safetyConfirmed: true,
          location: { latitude: 120.5 },
          reportingUser: citizenUser
        }),
        (err) => {
          assert.equal(err.status, 400);
          assert.equal(err.code, "INVALID_COORDINATES");
          return true;
        }
      );
    });

    it("3.7 Rejects observation date set in the distant future (400 FUTURE_OBSERVATION_DATE)", async () => {
      const futureDate = new Date(Date.now() + 24 * 3600 * 1000);
      await assert.rejects(
        sightingService.submitSighting({
          caseId: TEST_CASE_ID.toString(),
          description: "Saw child",
          safetyConfirmed: true,
          observedAt: futureDate.toISOString(),
          reportingUser: citizenUser
        }),
        (err) => {
          assert.equal(err.status, 400);
          assert.equal(err.code, "FUTURE_OBSERVATION_DATE");
          return true;
        }
      );
    });
  });

  // =========================================================================
  // 4. Sighting Persistence, Resolution & Law Enforcement Review
  // =========================================================================
  describe("4. Sighting Persistence, Resolution & Review", () => {
    it("4.1 Derives childId directly from MissingCase and reportedBy from session (Anti-Mass-Assignment)", async () => {
      const originalCaseFind = MissingCase.findById;
      const originalChildFind = Child.findById;
      const originalSave = Sighting.prototype.save;
      const originalNotify = notificationService.notifyAuthorizedRespondersForSighting;

      let savedDoc = null;
      MissingCase.findById = async () => activeCase;
      Child.findById = async () => testChild;
      Sighting.prototype.save = async function () {
        savedDoc = this;
        return this;
      };
      notificationService.notifyAuthorizedRespondersForSighting = async () => ({
        policeNotified: 2,
        guardianNotified: true,
        notificationIds: ["n1", "n2"]
      });

      try {
        const fakeAttackerChildId = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e21f99");
        const fakeAttackerReporterId = new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e21f88");

        const outcome = await sightingService.submitSighting({
          caseId: TEST_CASE_ID.toString(),
          childId: fakeAttackerChildId.toString(), // Attacker tries to override childId
          reportedBy: fakeAttackerReporterId.toString(), // Attacker tries to spoof reportedBy
          status: "verified", // Attacker tries to self-verify report
          description: "Saw child sitting with a book near Sector 14 library.",
          safetyConfirmed: true,
          location: {
            address: "Sector 14 Library",
            city: "Delhi",
            state: "Delhi",
            latitude: 28.6139,
            longitude: 77.2090
          },
          appearance: {
            approxAge: "8 years",
            clothing: "Blue polo shirt"
          },
          reportingUser: citizenUser
        });

        assert.ok(outcome.sighting);
        assert.ok(savedDoc);
        // Verify childId was taken from activeCase, NOT the attacker payload
        assert.equal(savedDoc.childId.toString(), TEST_CHILD_ID.toString());
        // Verify reportedBy came strictly from req.user
        assert.equal(savedDoc.reportedBy.toString(), CITIZEN_USER_ID.toString());
        // Verify status initialized strictly to 'submitted'
        assert.equal(savedDoc.status, "submitted");
        // Verify report number generated
        assert.ok(savedDoc.sightingNumber.startsWith("SR-"));
      } finally {
        MissingCase.findById = originalCaseFind;
        Child.findById = originalChildFind;
        Sighting.prototype.save = originalSave;
        notificationService.notifyAuthorizedRespondersForSighting = originalNotify;
      }
    });

    it("4.2 Law enforcement review: Allows authorized police to update review status", async () => {
      const originalFindById = Sighting.findById;
      const originalSave = Sighting.prototype.save;
      const originalNotify = notificationService.createNotification;

      let savedDoc = null;
      Sighting.findById = async () => ({
        _id: new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e21e01"),
        status: "submitted",
        reportNumber: "SR-8811-100",
        reportedBy: CITIZEN_USER_ID,
        save: async function () {
          savedDoc = this;
          return this;
        },
        toSafeObject: () => ({
          id: "6740b2a8d1e4c89a71e21e01",
          status: savedDoc?.status || "submitted",
          reportNumber: "SR-8811-100"
        })
      });
      notificationService.createNotification = async () => ({ id: "notif-rev-1" });

      try {
        const reviewed = await sightingService.reviewSighting(
          "6740b2a8d1e4c89a71e21e01",
          { status: "verified", reviewNotes: "Field unit confirmed child identity." },
          policeUser
        );

        assert.equal(reviewed.status, "verified");
        assert.equal(savedDoc.status, "verified");
        assert.equal(savedDoc.reviewedBy.toString(), POLICE_USER_ID.toString());
        assert.ok(savedDoc.reviewedAt);
      } finally {
        Sighting.findById = originalFindById;
        Sighting.prototype.save = originalSave;
        notificationService.createNotification = originalNotify;
      }
    });

    it("4.3 Law enforcement review: Rejects invalid review status (400 INVALID_REVIEW_STATUS)", async () => {
      await assert.rejects(
        sightingService.reviewSighting(
          "6740b2a8d1e4c89a71e21e01",
          { status: "random_status" },
          policeUser
        ),
        (err) => {
          assert.equal(err.status, 400);
          assert.equal(err.code, "INVALID_REVIEW_STATUS");
          return true;
        }
      );
    });
  });

  // =========================================================================
  // 5. Authorized Notification Alerts & Failure Resilience
  // =========================================================================
  describe("5. Authorized Notification Alerts & Resilience", () => {
    it("5.1 Dispatches in-app notifications to authorized police officers and verified guardian", async () => {
      const originalUserFind = User.find;
      const originalUserFindById = User.findById;
      const originalNotifSave = Notification.prototype.save;

      const createdNotifs = [];
      User.find = function () {
        return {
          limit: async function () {
            return [policeUser];
          }
        };
      };
      User.findById = async () => guardianUser;
      Notification.prototype.save = async function () {
        createdNotifs.push(this);
        return this;
      };

      const mockSighting = {
        _id: new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e21e01"),
        reportNumber: "SR-8811-100",
        reportedBy: CITIZEN_USER_ID,
        location: { landmark: "Sector 14 Library", city: "Delhi", state: "Delhi" }
      };

      try {
        const outcome = await notificationService.notifyAuthorizedRespondersForSighting({
          sighting: mockSighting,
          missingCase: activeCase,
          child: testChild
        });

        assert.equal(outcome.policeNotified, 1);
        assert.equal(outcome.guardianNotified, true);
        assert.equal(createdNotifs.length, 2);

        // Police notification check
        const policeNotif = createdNotifs.find((n) => n.recipientRole === "police");
        assert.ok(policeNotif);
        assert.ok(policeNotif.title.includes("New Sighting Report"));
        assert.equal(policeNotif.deliveryStatus, "confirmed");

        // Guardian notification check: Must NOT leak guardian contact info
        const guardianNotif = createdNotifs.find((n) => n.recipientRole === "parent");
        assert.ok(guardianNotif);
        assert.ok(guardianNotif.title.includes("New Sighting Reported"));
        assert.ok(!guardianNotif.message.includes(guardianUser.phone), "No guardian phone in alert");
        assert.ok(!guardianNotif.message.includes(guardianUser.email), "No guardian email in alert");
      } finally {
        User.find = originalUserFind;
        User.findById = originalUserFindById;
        Notification.prototype.save = originalNotifSave;
      }
    });

    it("5.2 Notification failure does NOT delete or rollback the persisted sighting report", async () => {
      const originalCaseFind = MissingCase.findById;
      const originalChildFind = Child.findById;
      const originalSave = Sighting.prototype.save;
      const originalNotify = notificationService.notifyAuthorizedRespondersForSighting;

      MissingCase.findById = async () => activeCase;
      Child.findById = async () => testChild;
      Sighting.prototype.save = async function () {
        return this;
      };
      // Simulate notification service throwing an unexpected error
      notificationService.notifyAuthorizedRespondersForSighting = async () => {
        throw new Error("Notification provider network failure");
      };

      try {
        const outcome = await sightingService.submitSighting({
          caseId: TEST_CASE_ID.toString(),
          description: "Child sighted near school bus stand.",
          safetyConfirmed: true,
          reportingUser: citizenUser
        });

        // Sighting must still be returned successfully!
        assert.ok(outcome.sighting);
        assert.equal(outcome.sighting.status, "submitted");
      } finally {
        MissingCase.findById = originalCaseFind;
        Child.findById = originalChildFind;
        Sighting.prototype.save = originalSave;
        notificationService.notifyAuthorizedRespondersForSighting = originalNotify;
      }
    });
  });
});
