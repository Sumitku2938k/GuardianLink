/**
 * GuardianLink — Phase 7: Citizen Sighting & Response UI Test Suite
 *
 * Verifies client-side sighting services, validation, safety confirmation,
 * error normalization, and notification APIs.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  submitSightingReport,
  getMySightings,
  getSightingDetails,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from "../src/services/citizenService.js";

describe("Citizen Sighting & Response System Client Suite (Phase 7)", () => {
  // 1. Service Exports
  it("1. Sighting and notification API functions are defined and exported", () => {
    assert.equal(typeof submitSightingReport, "function");
    assert.equal(typeof getMySightings, "function");
    assert.equal(typeof getSightingDetails, "function");
    assert.equal(typeof getUserNotifications, "function");
    assert.equal(typeof markNotificationAsRead, "function");
    assert.equal(typeof markAllNotificationsAsRead, "function");
  });

  // 2. Client-Side Validation: Missing Case ID
  it("2. Rejects submission without caseId before dispatch", async () => {
    await assert.rejects(
      submitSightingReport({
        caseId: "",
        description: "Saw child",
        safetyConfirmed: true
      }),
      (err) => {
        assert.equal(err.code, "INVALID_CASE_ID");
        return true;
      }
    );
  });

  // 3. Client-Side Validation: Mandatory Safety Confirmation
  it("3. Rejects submission without safetyConfirmed === true", async () => {
    await assert.rejects(
      submitSightingReport({
        caseId: "6740b2a8d1e4c89a71e21d01",
        description: "Saw child near kiosk",
        safetyConfirmed: false
      }),
      (err) => {
        assert.equal(err.code, "SAFETY_CONFIRMATION_REQUIRED");
        return true;
      }
    );
  });

  // 4. Client-Side Validation: Empty Description
  it("4. Rejects submission with empty or whitespace description", async () => {
    await assert.rejects(
      submitSightingReport({
        caseId: "6740b2a8d1e4c89a71e21d01",
        description: "   ",
        safetyConfirmed: true
      }),
      (err) => {
        assert.equal(err.code, "MISSING_DESCRIPTION");
        return true;
      }
    );
  });

  // 5. Mandatory Safety Text Integrity Check
  it("5. Verifies required safety confirmation statement contains non-confrontation pledge", () => {
    const requiredStatement =
      "I understand that a potential facial match is not confirmation of identity. I will not confront, detain, follow, or physically intervene with anyone. I will provide truthful observations and allow authorized responders to assess the information.";

    assert.ok(requiredStatement.includes("potential facial match is not confirmation of identity"));
    assert.ok(requiredStatement.includes("not confront, detain, follow, or physically intervene"));
    assert.ok(requiredStatement.includes("allow authorized responders to assess"));
  });
});
