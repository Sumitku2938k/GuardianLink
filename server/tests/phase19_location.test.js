/**
 * GuardianLink — Phase 19: Location & Interactive Map Module Test Suite
 *
 * Comprehensive validation of:
 * 1. Location & Coordinate Validator (bounds, completeness, finite numbers, accuracy, source, capturedAt)
 * 2. Mongoose Schemas (MissingCase, Sighting, Shelter geospatial fields)
 * 3. Exact Coordinate Privacy & Role-Based Scrubbing (toSafeObject serialization)
 * 4. API Endpoints:
 *    - PATCH /api/cases/:caseId/location (Validation, authorization, audit logging)
 *    - GET /api/cases/:caseId/investigation-map (Multi-point investigation payload)
 */

const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const {
  validateLocationCoordinates,
  LocationValidationError,
  sanitizeCoordinate
} = require("../utils/locationValidator");
const MissingCase = require("../models/MissingCase");
const Sighting = require("../models/Sighting");
const Shelter = require("../models/Shelter");
const Child = require("../models/Child");
const caseController = require("../controllers/caseController");

describe("GuardianLink Phase 19: Complete Location & Interactive Map Module", () => {
  const PARENT_ID = new mongoose.Types.ObjectId();
  const OTHER_PARENT_ID = new mongoose.Types.ObjectId();
  const POLICE_ID = new mongoose.Types.ObjectId();
  const ADMIN_ID = new mongoose.Types.ObjectId();
  const NGO_ID = new mongoose.Types.ObjectId();
  const CITIZEN_ID = new mongoose.Types.ObjectId();
  const CHILD_ID = new mongoose.Types.ObjectId();
  const CASE_ID = new mongoose.Types.ObjectId();

  // =========================================================================
  // 1. Centralized Coordinate & Location Validator Unit Tests
  // =========================================================================
  describe("1. Coordinate & Location Validator (utils/locationValidator.js)", () => {
    it("accepts valid decimal geographic coordinates and normalizes them", () => {
      const input = {
        address: "123 MG Road",
        city: "Bengaluru",
        state: "Karnataka",
        pinCode: "560001",
        latitude: 12.9716,
        longitude: 77.5946,
        accuracy: 14.5,
        source: "gps"
      };

      const result = validateLocationCoordinates(input);
      assert.equal(result.latitude, 12.9716);
      assert.equal(result.longitude, 77.5946);
      assert.equal(result.accuracy, 14.5);
      assert.equal(result.source, "gps");
      assert.equal(result.city, "Bengaluru");
      assert.ok(result.capturedAt instanceof Date);
    });

    it("accepts valid string-formatted numeric coordinates and parses to finite float", () => {
      const input = {
        latitude: "28.613939",
        longitude: "77.209021",
        accuracy: "18",
        source: "manual"
      };

      const result = validateLocationCoordinates(input);
      assert.equal(typeof result.latitude, "number");
      assert.equal(typeof result.longitude, "number");
      assert.equal(result.latitude, 28.613939);
      assert.equal(result.longitude, 77.209021);
      assert.equal(result.accuracy, 18);
    });

    it("verifies coordinate boundary limits (-90 <= lat <= 90, -180 <= lng <= 180)", () => {
      // Valid boundaries
      assert.doesNotThrow(() => validateLocationCoordinates({ latitude: 90, longitude: 180 }));
      assert.doesNotThrow(() => validateLocationCoordinates({ latitude: -90, longitude: -180 }));
      assert.doesNotThrow(() => validateLocationCoordinates({ latitude: 0, longitude: 0 }));

      // Invalid latitude > 90
      assert.throws(
        () => validateLocationCoordinates({ latitude: 90.0001, longitude: 77.2 }),
        (err) => err instanceof LocationValidationError && err.code === "LATITUDE_OUT_OF_BOUNDS"
      );

      // Invalid latitude < -90
      assert.throws(
        () => validateLocationCoordinates({ latitude: -91, longitude: 77.2 }),
        (err) => err instanceof LocationValidationError && err.code === "LATITUDE_OUT_OF_BOUNDS"
      );

      // Invalid longitude > 180
      assert.throws(
        () => validateLocationCoordinates({ latitude: 28.6, longitude: 180.5 }),
        (err) => err instanceof LocationValidationError && err.code === "LONGITUDE_OUT_OF_BOUNDS"
      );

      // Invalid longitude < -180
      assert.throws(
        () => validateLocationCoordinates({ latitude: 28.6, longitude: -180.01 }),
        (err) => err instanceof LocationValidationError && err.code === "LONGITUDE_OUT_OF_BOUNDS"
      );
    });

    it("enforces coordinate pair completeness (both lat and lng must be provided together)", () => {
      // Latitude provided without longitude
      assert.throws(
        () => validateLocationCoordinates({ latitude: 28.6 }),
        (err) => err instanceof LocationValidationError && err.code === "INCOMPLETE_COORDINATES"
      );

      // Longitude provided without latitude
      assert.throws(
        () => validateLocationCoordinates({ longitude: 77.2 }),
        (err) => err instanceof LocationValidationError && err.code === "INCOMPLETE_COORDINATES"
      );
    });

    it("rejects non-numeric, NaN, Infinity and malformed coordinate values", () => {
      assert.throws(
        () => validateLocationCoordinates({ latitude: "not-a-number", longitude: 77.2 }),
        (err) => err instanceof LocationValidationError && err.code === "INVALID_LATITUDE_NUMBER"
      );

      assert.throws(
        () => validateLocationCoordinates({ latitude: 28.6, longitude: NaN }),
        (err) => err instanceof LocationValidationError && err.code === "INVALID_LONGITUDE_NUMBER"
      );

      assert.throws(
        () => validateLocationCoordinates({ latitude: Infinity, longitude: 77.2 }),
        (err) => err instanceof LocationValidationError && err.code === "INVALID_LATITUDE_NUMBER"
      );
    });

    it("validates non-negative accuracy values and allowed source enum", () => {
      // Negative accuracy
      assert.throws(
        () => validateLocationCoordinates({ latitude: 28.6, longitude: 77.2, accuracy: -5 }),
        (err) => err instanceof LocationValidationError && err.code === "INVALID_ACCURACY_VALUE"
      );

      // Valid accuracy
      const res = validateLocationCoordinates({ latitude: 28.6, longitude: 77.2, accuracy: 22 });
      assert.equal(res.accuracy, 22);

      // Invalid source enum
      assert.throws(
        () => validateLocationCoordinates({ latitude: 28.6, longitude: 77.2, source: "satellite-hack" }),
        (err) => err instanceof LocationValidationError && err.code === "INVALID_LOCATION_SOURCE"
      );

      // Valid source enums
      assert.equal(validateLocationCoordinates({ latitude: 28.6, longitude: 77.2, source: "gps" }).source, "gps");
      assert.equal(validateLocationCoordinates({ latitude: 28.6, longitude: 77.2, source: "manual" }).source, "manual");
      assert.equal(validateLocationCoordinates({ latitude: 28.6, longitude: 77.2, source: "reported" }).source, "reported");
    });

    it("enforces required coordinates when options.required is true", () => {
      assert.throws(
        () => validateLocationCoordinates(null, { required: true }),
        (err) => err instanceof LocationValidationError && err.code === "MISSING_LOCATION_COORDINATES"
      );

      assert.throws(
        () => validateLocationCoordinates({ address: "Connaught Place" }, { required: true }),
        (err) => err instanceof LocationValidationError && err.code === "MISSING_REQUIRED_COORDINATES"
      );

      assert.doesNotThrow(() =>
        validateLocationCoordinates({ latitude: 28.6, longitude: 77.2 }, { required: true })
      );
    });
  });

  // =========================================================================
  // 2. Mongoose Schemas & Geospatial Persistence
  // =========================================================================
  describe("2. Mongoose Schemas (MissingCase, Sighting, Shelter)", () => {
    it("persists coordinate metadata in MissingCase lastSeenLocation schema", () => {
      const missingCase = new MissingCase({
        childId: CHILD_ID,
        reportedBy: PARENT_ID,
        missingDate: new Date(),
        status: "reported",
        policeCaseNumber: "MC-2026-9999",
        lastSeenLocation: {
          address: "Sector 18 Market",
          city: "Noida",
          state: "Uttar Pradesh",
          pinCode: "201301",
          latitude: 28.5708,
          longitude: 77.3261,
          accuracy: 12,
          source: "gps",
          capturedAt: new Date()
        }
      });

      assert.equal(missingCase.lastSeenLocation.latitude, 28.5708);
      assert.equal(missingCase.lastSeenLocation.longitude, 77.3261);
      assert.equal(missingCase.lastSeenLocation.accuracy, 12);
      assert.equal(missingCase.lastSeenLocation.source, "gps");
    });

    it("persists coordinate metadata in Sighting location schema", () => {
      const sighting = new Sighting({
        caseId: CASE_ID,
        childId: CHILD_ID,
        reportedBy: CITIZEN_ID,
        description: "Child seen near tea stall",
        safetyConfirmed: true,
        location: {
          address: "Railway Station Platform 1",
          city: "Delhi",
          state: "Delhi",
          latitude: 28.6609,
          longitude: 77.2285,
          accuracy: 25,
          source: "manual"
        }
      });

      assert.equal(sighting.location.latitude, 28.6609);
      assert.equal(sighting.location.longitude, 77.2285);
      assert.equal(sighting.location.accuracy, 25);
      assert.equal(sighting.location.source, "manual");
    });

    it("persists coordinate fields in Shelter address schema", () => {
      const shelter = new Shelter({
        name: "Asha Child Care Shelter",
        ngoId: NGO_ID,
        capacity: 25,
        address: {
          address: "Plot 44, Institutional Area",
          city: "New Delhi",
          state: "Delhi",
          pinCode: "110025",
          latitude: 28.5601,
          longitude: 77.2805
        }
      });

      assert.equal(shelter.address.latitude, 28.5601);
      assert.equal(shelter.address.longitude, 77.2805);
    });
  });

  // =========================================================================
  // 3. Exact Coordinate Privacy & Role-Based Scrubbing
  // =========================================================================
  describe("3. Location Privacy & toSafeObject Role Scoping", () => {
    it("scrubs exact coordinates, accuracy, and source for public/citizen view", () => {
      const missingCase = new MissingCase({
        childId: CHILD_ID,
        reportedBy: PARENT_ID,
        missingDate: new Date(),
        status: "active",
        policeCaseNumber: "MC-2026-1111",
        lastSeenLocation: {
          address: "Private Flat 402, Royal Palms",
          landmark: "Near Society Gate",
          city: "Mumbai",
          state: "Maharashtra",
          pinCode: "400065",
          latitude: 19.1551,
          longitude: 72.8845,
          accuracy: 8,
          source: "gps"
        }
      });

      // Citizen view
      const citizenSafe = missingCase.toSafeObject({ role: "citizen", viewerId: CITIZEN_ID });
      assert.equal(citizenSafe.lastSeenLocation.latitude, undefined);
      assert.equal(citizenSafe.lastSeenLocation.longitude, undefined);
      assert.equal(citizenSafe.lastSeenLocation.accuracy, undefined);
      assert.equal(citizenSafe.lastSeenLocation.source, undefined);
      assert.equal(citizenSafe.lastSeenLocation.address, undefined);
      assert.equal(citizenSafe.lastSeenLocation.city, "Mumbai");
      assert.equal(citizenSafe.lastSeenLocation.state, "Maharashtra");
    });

    it("scrubs exact coordinates for NGO view", () => {
      const missingCase = new MissingCase({
        childId: CHILD_ID,
        reportedBy: PARENT_ID,
        missingDate: new Date(),
        status: "active",
        policeCaseNumber: "MC-2026-2222",
        lastSeenLocation: {
          address: "Confidential Residence",
          city: "Pune",
          state: "Maharashtra",
          latitude: 18.5204,
          longitude: 73.8567,
          accuracy: 15,
          source: "gps"
        }
      });

      const ngoSafe = missingCase.toSafeObject({ role: "ngo", viewerId: NGO_ID });
      assert.equal(ngoSafe.lastSeenLocation.latitude, undefined);
      assert.equal(ngoSafe.lastSeenLocation.longitude, undefined);
      assert.equal(ngoSafe.lastSeenLocation.city, "Pune");
    });

    it("scrubs exact coordinates for other non-owning parents", () => {
      const missingCase = new MissingCase({
        childId: CHILD_ID,
        reportedBy: PARENT_ID,
        missingDate: new Date(),
        status: "active",
        policeCaseNumber: "MC-2026-3333",
        lastSeenLocation: {
          address: "Home Address",
          city: "Jaipur",
          state: "Rajasthan",
          latitude: 26.9124,
          longitude: 75.7873,
          accuracy: 5,
          source: "gps"
        }
      });

      const otherParentSafe = missingCase.toSafeObject({ role: "parent", viewerId: OTHER_PARENT_ID });
      assert.equal(otherParentSafe.lastSeenLocation.latitude, undefined);
      assert.equal(otherParentSafe.lastSeenLocation.longitude, undefined);
    });

    it("preserves exact coordinates and accuracy for police and admin", () => {
      const missingCase = new MissingCase({
        childId: CHILD_ID,
        reportedBy: PARENT_ID,
        missingDate: new Date(),
        status: "active",
        policeCaseNumber: "MC-2026-4444",
        lastSeenLocation: {
          address: "Sector 62 Bus Stand",
          city: "Noida",
          state: "Uttar Pradesh",
          latitude: 28.628,
          longitude: 77.3649,
          accuracy: 10,
          source: "gps"
        }
      });

      // Police
      const policeSafe = missingCase.toSafeObject({ role: "police", viewerId: POLICE_ID });
      assert.equal(policeSafe.lastSeenLocation.latitude, 28.628);
      assert.equal(policeSafe.lastSeenLocation.longitude, 77.3649);
      assert.equal(policeSafe.lastSeenLocation.accuracy, 10);
      assert.equal(policeSafe.lastSeenLocation.source, "gps");

      // Admin
      const adminSafe = missingCase.toSafeObject({ role: "admin", viewerId: ADMIN_ID });
      assert.equal(adminSafe.lastSeenLocation.latitude, 28.628);
      assert.equal(adminSafe.lastSeenLocation.longitude, 77.3649);
    });

    it("preserves exact coordinates for the case-owning parent", () => {
      const missingCase = new MissingCase({
        childId: CHILD_ID,
        reportedBy: PARENT_ID,
        missingDate: new Date(),
        status: "active",
        policeCaseNumber: "MC-2026-5555",
        lastSeenLocation: {
          address: "Park Street Gate",
          city: "Kolkata",
          state: "West Bengal",
          latitude: 22.5518,
          longitude: 88.3524,
          accuracy: 6,
          source: "manual"
        }
      });

      const ownerSafe = missingCase.toSafeObject({ role: "parent", viewerId: PARENT_ID });
      assert.equal(ownerSafe.lastSeenLocation.latitude, 22.5518);
      assert.equal(ownerSafe.lastSeenLocation.longitude, 88.3524);
      assert.equal(ownerSafe.lastSeenLocation.accuracy, 6);
    });

    it("scrubs sighting coordinates for non-reporters and preserves for police/admin/reporter", () => {
      const sighting = new Sighting({
        caseId: CASE_ID,
        childId: CHILD_ID,
        reportedBy: CITIZEN_ID,
        description: "Observed child at food court",
        safetyConfirmed: true,
        location: {
          address: "Mall Food Court 3rd Floor",
          city: "Delhi",
          latitude: 28.5355,
          longitude: 77.391,
          accuracy: 20,
          source: "manual"
        }
      });

      // Public / other citizen view
      const publicSafe = sighting.toSafeObject({ isReporter: false, role: "citizen" });
      assert.equal(publicSafe.location.latitude, undefined);
      assert.equal(publicSafe.location.longitude, undefined);
      assert.equal(publicSafe.location.accuracy, undefined);

      // Reporter view
      const reporterSafe = sighting.toSafeObject({ isReporter: true });
      assert.equal(reporterSafe.location.latitude, 28.5355);
      assert.equal(reporterSafe.location.longitude, 77.391);

      // Police view
      const policeSafe = sighting.toSafeObject({ isReporter: false, role: "police" });
      assert.equal(policeSafe.location.latitude, 28.5355);
      assert.equal(policeSafe.location.longitude, 77.391);
    });
  });

  // =========================================================================
  // 4. Case Location Controller & API Workflow Tests
  // =========================================================================
  describe("4. Case Location API (updateCaseLocation & getInvestigationMapData)", () => {
    it("updateCaseLocation validates coordinates and rejects out-of-bounds coordinates", async () => {
      const req = {
        params: { caseId: CASE_ID.toString() },
        body: {
          latitude: 95.5, // Invalid > 90
          longitude: 77.2
        },
        user: { _id: POLICE_ID, role: "police" }
      };

      let responseCode = null;
      let responseBody = null;
      const res = {
        status(code) {
          responseCode = code;
          return this;
        },
        json(data) {
          responseBody = data;
          return this;
        }
      };

      // Mock MissingCase.findById
      const originalFindById = MissingCase.findById;
      MissingCase.findById = () => ({
        populate: () => Promise.resolve({
          _id: CASE_ID,
          reportedBy: PARENT_ID,
          status: "active",
          lastSeenLocation: {}
        })
      });

      try {
        await caseController.updateCaseLocation(req, res, (err) => {
          if (err) throw err;
        });

        assert.equal(responseCode, 400);
        assert.equal(responseBody.success, false);
        assert.equal(responseBody.code, "LATITUDE_OUT_OF_BOUNDS");
      } finally {
        MissingCase.findById = originalFindById;
      }
    });

    it("updateCaseLocation enforces IDOR authorization (unauthorized parent forbidden)", async () => {
      const req = {
        params: { caseId: CASE_ID.toString() },
        body: {
          latitude: 28.6139,
          longitude: 77.209
        },
        user: { _id: OTHER_PARENT_ID, role: "parent" }
      };

      let responseCode = null;
      let responseBody = null;
      const res = {
        status(code) {
          responseCode = code;
          return this;
        },
        json(data) {
          responseBody = data;
          return this;
        }
      };

      const originalFindById = MissingCase.findById;
      MissingCase.findById = () => ({
        populate: () => Promise.resolve({
          _id: CASE_ID,
          reportedBy: PARENT_ID, // Owned by different parent
          childId: { guardianId: PARENT_ID },
          status: "active"
        })
      });

      try {
        await caseController.updateCaseLocation(req, res, (err) => {
          if (err) throw err;
        });

        assert.equal(responseCode, 403);
        assert.equal(responseBody.code, "FORBIDDEN");
      } finally {
        MissingCase.findById = originalFindById;
      }
    });

    it("getInvestigationMapData returns case last seen location and linked sightings for authorized police", async () => {
      const req = {
        params: { caseId: CASE_ID.toString() },
        user: { _id: POLICE_ID, role: "police" }
      };

      let responseCode = null;
      let responseBody = null;
      const res = {
        status(code) {
          responseCode = code;
          return this;
        },
        json(data) {
          responseBody = data;
          return this;
        }
      };

      const originalCaseFind = MissingCase.findById;
      const originalSightingFind = Sighting.find;

      MissingCase.findById = () => ({
        populate: () => Promise.resolve({
          _id: CASE_ID,
          caseNumber: "MC-2026-7777",
          childId: { fullName: "Aarav Sharma" },
          status: "active",
          missingDate: new Date("2026-11-10T10:00:00Z"),
          lastSeenLocation: {
            address: "Main Market",
            city: "Delhi",
            latitude: 28.6139,
            longitude: 77.209,
            accuracy: 10,
            source: "gps"
          }
        })
      });

      Sighting.find = () => ({
        lean: () => Promise.resolve([
          {
            _id: new mongoose.Types.ObjectId(),
            status: "verified",
            description: "Child seen near metro gate",
            observedAt: new Date("2026-11-11T12:00:00Z"),
            location: {
              address: "Metro Gate 2",
              latitude: 28.62,
              longitude: 77.215,
              accuracy: 15,
              source: "manual"
            }
          }
        ])
      });

      try {
        await caseController.getInvestigationMapData(req, res, (err) => {
          if (err) throw err;
        });

        assert.equal(responseCode, 200);
        assert.equal(responseBody.success, true);
        assert.equal(responseBody.case.childName, "Aarav Sharma");
        assert.equal(responseBody.case.lastSeenLocation.latitude, 28.6139);
        assert.equal(responseBody.case.lastSeenLocation.longitude, 77.209);
        assert.equal(responseBody.sightings.length, 1);
        assert.equal(responseBody.sightings[0].verified, true);
        assert.equal(responseBody.sightings[0].location.latitude, 28.62);
      } finally {
        MissingCase.findById = originalCaseFind;
        Sighting.find = originalSightingFind;
      }
    });
  });
});
