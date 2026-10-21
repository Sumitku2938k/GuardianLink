import { describe, it } from "node:test";
import assert from "node:assert/strict";

import * as policeService from "../src/services/policeService.js";

describe("Phase 8 Police Module UI & Service Test Suite", () => {
  it("1. policeService exports all authorized operational methods", () => {
    assert.strictEqual(typeof policeService.getPoliceCases, "function");
    assert.strictEqual(typeof policeService.getPoliceCaseById, "function");
    assert.strictEqual(typeof policeService.getPoliceDashboardStats, "function");
    assert.strictEqual(typeof policeService.updateInvestigationDetails, "function");
    assert.strictEqual(typeof policeService.assignOfficer, "function");
    assert.strictEqual(typeof policeService.addInvestigationNote, "function");
    assert.strictEqual(typeof policeService.createTask, "function");
    assert.strictEqual(typeof policeService.toggleTask, "function");
    assert.strictEqual(typeof policeService.reviewAIMatch, "function");
    assert.strictEqual(typeof policeService.getPoliceSightings, "function");
    assert.strictEqual(typeof policeService.reviewSighting, "function");
    assert.strictEqual(typeof policeService.getPoliceNotifications, "function");
    assert.strictEqual(typeof policeService.updateCaseStatus, "function");
  });

  it("2. normalizeCase maps backend Mongoose fields into safe UI schema", () => {
    const rawCase = {
      _id: "case-998811",
      caseNumber: "MC-2026-9988",
      child: {
        _id: "ch-100",
        name: "Aarav Sharma",
        age: 7,
        gender: "male",
        photos: [{ url: "https://example.com/aarav.jpg" }],
        distinctiveFeatures: "Small birthmark on left wrist"
      },
      lastSeen: {
        location: {
          address: "Sector 18 Metro Gate 2, Noida",
          city: "Noida"
        },
        dateTime: "2026-10-18T10:00:00.000Z"
      },
      status: "active",
      priority: "high",
      policeCaseNumber: "POL-DEL-2026-001",
      firNumber: "FIR-2026-88910",
      assignedOfficer: {
        name: "Insp. Vikram Rathore",
        badgeNumber: "DL-POL-9482"
      },
      investigationNotes: [
        {
          officerName: "Insp. Vikram Rathore",
          badge: "DL-POL-9482",
          text: "CCTV lead dispatched to local squad.",
          createdAt: "2026-10-18T12:00:00.000Z"
        }
      ],
      investigationTasks: [
        {
          _id: "task-1",
          label: "Review CCTV camera 4",
          completed: false,
          assignedTo: "Insp. Vikram Rathore"
        }
      ]
    };

    const normalized = policeService.normalizeCase(rawCase);
    assert.strictEqual(normalized.id, "case-998811");
    assert.strictEqual(normalized.caseNumber, "MC-2026-9988");
    assert.strictEqual(normalized.childName, "Aarav Sharma");
    assert.strictEqual(normalized.childAge, 7);
    assert.strictEqual(normalized.childGender, "Male");
    assert.strictEqual(normalized.childPhoto, "https://example.com/aarav.jpg");
    assert.strictEqual(normalized.distinctiveMarks, "Small birthmark on left wrist");
    assert.strictEqual(normalized.lastSeenLocation, "Sector 18 Metro Gate 2, Noida");
    assert.strictEqual(normalized.status, "Investigating");
    assert.strictEqual(normalized.priority, "High");
    assert.strictEqual(normalized.policeCaseNumber, "POL-DEL-2026-001");
    assert.strictEqual(normalized.firNumber, "FIR-2026-88910");
    assert.strictEqual(normalized.assignedOfficerName, "Insp. Vikram Rathore");
    assert.strictEqual(normalized.investigationNotes.length, 1);
    assert.strictEqual(normalized.investigationTasks.length, 1);
    assert.strictEqual(normalized.investigationTasks[0].id, "task-1");
  });

  it("3. normalizeNotes gracefully handles string fixtures from previous tests", () => {
    const rawLegacy = "LEGACY POLICE INTERNAL NOTE";
    const notes = policeService.normalizeNotes(rawLegacy);
    assert.strictEqual(Array.isArray(notes), true);
    assert.strictEqual(notes.length, 1);
    assert.strictEqual(notes[0].text, "LEGACY POLICE INTERNAL NOTE");
    assert.strictEqual(notes[0].officerName, "Police Department");
  });

  it("4. normalizeSighting protects exact coordinates and maps citizen report schema", () => {
    const rawSighting = {
      _id: "sight-7721",
      case: "case-998811",
      status: "under_review",
      location: {
        description: "Food court outside metro",
        coordinates: {
          type: "Point",
          coordinates: [77.2090, 28.6139]
        }
      },
      childDetails: {
        approximateAge: "6-8 yrs",
        clothingDescription: "Blue school uniform"
      },
      isChildSafe: true,
      photos: [{ url: "https://example.com/sight.jpg" }],
      createdAt: "2026-10-19T08:30:00.000Z"
    };

    const normalized = policeService.normalizeSighting(rawSighting);
    assert.strictEqual(normalized.id, "sight-7721");
    assert.strictEqual(normalized.reportNumber, "CR-T-7721");
    assert.strictEqual(normalized.location, "Food court outside metro");
    assert.strictEqual(normalized.approxAge, "6-8 yrs");
    assert.strictEqual(normalized.clothing, "Blue school uniform");
    assert.strictEqual(normalized.safetyState, "Safe / Non-Critical");
    assert.strictEqual(normalized.photo, "https://example.com/sight.jpg");
    assert.strictEqual(normalized.coordinates.lat, 28.6139);
    assert.strictEqual(normalized.coordinates.lng, 77.2090);
  });

  it("5. addInvestigationNote rejects empty or whitespace notes client-side", async () => {
    await assert.rejects(
      () => policeService.addInvestigationNote("case-1", "   "),
      /Note text is required/
    );
  });

  it("6. reviewAIMatch validates decision enum client-side", async () => {
    await assert.rejects(
      () => policeService.reviewAIMatch("case-1", "match-1", { decision: "invalid_decision" }),
      /Invalid verification decision/
    );
  });

  it("7. reviewSighting validates status client-side", async () => {
    await assert.rejects(
      () => policeService.reviewSighting("sight-1", { status: "unknown_status" }),
      /Invalid sighting review status/
    );
  });
});
