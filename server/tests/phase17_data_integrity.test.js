/**
 * GuardianLink — Phase 17 Automated Verification Tests
 *
 * Verifies:
 * 1. Mock Data Elimination from Frontend Contexts & Components
 * 2. Guardian Address Privacy & PII Redaction
 * 3. Script Execution Environment Isolation (scriptGuard)
 * 4. Nginx Permissions-Policy Configuration
 * 5. Dynamic Backend Analytics Integrity
 */

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");

// Import Schemas & Utilities
const MissingCase = require("../models/MissingCase");
const { assertNonProductionScript } = require("../utils/scriptGuard");

describe("Phase 17 — Data Integrity, Mock Elimination & Security Audit", () => {

  describe("1. Script Execution Safety & Environment Guard", () => {
    test("assertNonProductionScript exits when NODE_ENV is production", () => {
      const originalEnv = process.env.NODE_ENV;
      let exitCalled = false;
      let exitCode = null;

      const originalExit = process.exit;
      process.exit = (code) => {
        exitCalled = true;
        exitCode = code;
        throw new Error(`EXIT_CALLED_${code}`);
      };

      try {
        process.env.NODE_ENV = "production";
        assert.throws(
          () => assertNonProductionScript("testScript.js"),
          /EXIT_CALLED_1/
        );
        assert.equal(exitCalled, true);
        assert.equal(exitCode, 1);
      } finally {
        process.env.NODE_ENV = originalEnv;
        process.exit = originalExit;
      }
    });

    test("assertNonProductionScript passes in development/test environment", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";
      try {
        assert.doesNotThrow(() => assertNonProductionScript("testScript.js"));
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test("seedDevData.js script file includes strict script guard check", () => {
      const seedScriptPath = path.join(__dirname, "../scripts/seedDevData.js");
      assert.ok(fs.existsSync(seedScriptPath), "seedDevData.js must exist");
      const content = fs.readFileSync(seedScriptPath, "utf-8");
      assert.ok(content.includes("assertNonProductionScript"), "Must call assertNonProductionScript");
      assert.ok(content.includes("NODE_ENV === \"production\""), "Must check NODE_ENV production");
    });
  });

  describe("2. Nginx Production Security Headers", () => {
    test("nginx.conf enables camera and geolocation for self domain", () => {
      const nginxConfPath = path.join(__dirname, "../../client/nginx.conf");
      assert.ok(fs.existsSync(nginxConfPath), "nginx.conf must exist");
      const content = fs.readFileSync(nginxConfPath, "utf-8");

      assert.ok(
        content.includes('Permissions-Policy "camera=(self), microphone=(), geolocation=(self)"'),
        "nginx.conf must permit camera=(self) and geolocation=(self) for scanning and sighting coordinates"
      );
      assert.ok(
        !content.includes('Permissions-Policy "camera=(), microphone=(), geolocation=()"'),
        "nginx.conf must not permanently block camera and geolocation"
      );
    });
  });

  describe("3. Guardian PII & Residential Address Protection", () => {
    const createTestCase = () => {
      const c = new MissingCase({
        childId: new mongoose.Types.ObjectId(),
        reportedBy: new mongoose.Types.ObjectId(),
        caseNumber: "MC-2026-TEST01",
        lastSeenLocation: {
          address: "Apartment 402, Block C, Private Residence",
          landmark: "Metro Station Gate 2",
          city: "New Delhi",
          state: "Delhi",
          pinCode: "110001",
          latitude: 28.6139,
          longitude: 77.2090
        },
        lastSeenDescription: "Child was wearing blue t-shirt",
        status: "active",
        missingDate: new Date()
      });

      c._doc.childId = {
        _id: new mongoose.Types.ObjectId(),
        fullName: "Test Child",
        age: 8,
        gender: "Male",
        emergencyContacts: [{ name: "Guardian", phone: "9876543210" }]
      };

      c._doc.reportedBy = {
        _id: new mongoose.Types.ObjectId(),
        name: "Parent Name",
        email: "parent@private.local",
        phone: "+91 98110 00000",
        city: "New Delhi",
        state: "Delhi"
      };

      return c;
    };

    test("toPublicResponse redacts street address and pinCode", () => {
      const mockCase = createTestCase();
      const publicResp = mockCase.toPublicResponse();
      assert.ok(!publicResp.last_seen_location.includes("Apartment 402"), "Must not include street address");
      assert.ok(!publicResp.last_seen_location.includes("110001"), "Must not include pinCode");
      assert.ok(publicResp.last_seen_location.includes("Metro Station Gate 2"), "Should include landmark");
      assert.ok(publicResp.last_seen_location.includes("New Delhi"), "Should include city");
    });

    test("toSafeObject for role 'citizen' scrubs guardian contact details and street address", () => {
      const mockCase = createTestCase();
      const citizenSafe = mockCase.toSafeObject({ role: "citizen" });
      assert.equal(citizenSafe.reportedBy.phone, undefined, "Guardian phone must be redacted for citizen");
      assert.equal(citizenSafe.reportedBy.email, undefined, "Guardian email must be redacted for citizen");
      assert.equal(citizenSafe.lastSeenLocation.address, undefined, "Street address must be redacted for citizen");
      assert.equal(citizenSafe.lastSeenLocation.pinCode, undefined, "Pin code must be redacted for citizen");
      assert.equal(citizenSafe.childId.emergencyContacts, undefined, "Emergency contacts must be redacted for citizen");
    });

    test("toSafeObject for role 'ngo' scrubs guardian contact details and street address", () => {
      const mockCase = createTestCase();
      const ngoSafe = mockCase.toSafeObject({ role: "ngo" });
      assert.equal(ngoSafe.reportedBy.phone, undefined, "Guardian phone must be redacted for NGO");
      assert.equal(ngoSafe.reportedBy.email, undefined, "Guardian email must be redacted for NGO");
      assert.equal(ngoSafe.lastSeenLocation.address, undefined, "Street address must be redacted for NGO");
      assert.equal(ngoSafe.lastSeenLocation.pinCode, undefined, "Pin code must be redacted for NGO");
      assert.equal(ngoSafe.childId.emergencyContacts, undefined, "Emergency contacts must be redacted for NGO");
    });

    test("toSafeObject for role 'police' preserves necessary operational details", () => {
      const mockCase = createTestCase();
      const policeSafe = mockCase.toSafeObject({ role: "police" });
      assert.ok(policeSafe.reportedBy.phone, "Police must have access to reporting guardian contact");
      assert.ok(policeSafe.lastSeenLocation.address, "Police must have access to incident street address");
    });
  });

  describe("4. Frontend Mock Elimination Audit", () => {
    test("CitizenContext.jsx initializes foundReports as empty array without fake records", () => {
      const file = path.join(__dirname, "../../client/src/context/CitizenContext.jsx");
      const content = fs.readFileSync(file, "utf-8");

      assert.ok(!content.includes("CR-2026-9041"), "Mock record CR-2026-9041 must be removed");
      assert.ok(!content.includes("CR-2026-3180"), "Mock record CR-2026-3180 must be removed");
      assert.ok(!content.includes("CR-2026-1120"), "Mock record CR-2026-1120 must be removed");
      assert.ok(!content.includes("John Mehta"), "Fictional parent John Mehta must be removed");
      assert.ok(!content.includes("Math.random()"), "Math.random mock generator must be removed");
    });

    test("PoliceContext.jsx has zero hardcoded fake officers and zero synthetic CCTV leads", () => {
      const file = path.join(__dirname, "../../client/src/context/PoliceContext.jsx");
      const content = fs.readFileSync(file, "utf-8");

      assert.ok(!content.includes("off-101"), "Fake officer off-101 must be removed");
      assert.ok(!content.includes("off-102"), "Fake officer off-102 must be removed");
      assert.ok(!content.includes("DL-POL-8821"), "Hardcoded fake badge must be removed");
      assert.ok(!content.includes("pm-ai-"), "Synthetic CCTV candidate generator must be removed");
      assert.ok(!content.includes("CCTV Camera #"), "Synthetic CCTV labels must be removed");
    });

    test("NgoContext.jsx has zero hardcoded fake organization records or static facilities", () => {
      const file = path.join(__dirname, "../../client/src/context/NgoContext.jsx");
      const content = fs.readFileSync(file, "utf-8");

      assert.ok(!content.includes("Helping Hands Child Foundation"), "Fake NGO name must be removed");
      assert.ok(!content.includes("NGO-DL-2024-9841"), "Fake NGO registration must be removed");
      assert.ok(!content.includes("+91 11 2617 2000"), "Fake NGO phone must be removed");
      assert.ok(!content.includes("3.4 Days"), "Static avgTimeInCare must be removed");
    });

    test("NearbyHelpCard.jsx has zero fake responder stations and no Mock Location Data badge", () => {
      const file = path.join(__dirname, "../../client/src/components/citizen/NearbyHelpCard.jsx");
      const content = fs.readFileSync(file, "utf-8");

      assert.ok(!content.includes("Mock Location Data"), "Mock Location Data badge must be removed");
      assert.ok(!content.includes("Sector 14 Police Protection Post"), "Fake police post must be removed");
      assert.ok(!content.includes("0.4 km away"), "Fake distance must be removed");
      assert.ok(content.includes("1098"), "Childline 1098 must be present");
      assert.ok(content.includes("112"), "Emergency 112 must be present");
    });

    test("GuardianContactModal.jsx requires police and child welfare protocol", () => {
      const file = path.join(__dirname, "../../client/src/components/citizen/GuardianContactModal.jsx");
      const content = fs.readFileSync(file, "utf-8");

      assert.ok(!content.includes("John Mehta"), "Fictional parent John Mehta must be removed");
      assert.ok(!content.includes("+91 98110 00100"), "Fake phone bridge must be removed");
      assert.ok(!content.includes("3s demo timer"), "Fake demo timer badge must be removed");
      assert.ok(content.includes("Juvenile Justice Act") || content.includes("Child Protection"), "Must display legal child safety notice");
    });
  });

  describe("5. Backend Dynamic Analytics Audit", () => {
    test("caseController.js does not contain static fake response times", () => {
      const file = path.join(__dirname, "../controllers/caseController.js");
      const content = fs.readFileSync(file, "utf-8");

      assert.ok(!content.includes('"4.2 mins"'), 'Static "4.2 mins" must be replaced with empirical calculation');
      assert.ok(!content.includes('"2.8 hours"'), 'Static "2.8 hours" must be replaced with empirical calculation');
    });

    test("ngoService.js does not contain static fake care duration", () => {
      const file = path.join(__dirname, "../services/ngoService.js");
      const content = fs.readFileSync(file, "utf-8");

      assert.ok(!content.includes('"3.2 Days"'), 'Static "3.2 Days" must be replaced with empirical calculation');
    });
  });

});
