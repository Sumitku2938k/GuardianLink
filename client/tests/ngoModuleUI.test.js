import { describe, it } from "node:test";
import assert from "node:assert/strict";

import * as ngoService from "../src/services/ngoService.js";

describe("Phase 9 NGO Module UI & Service Test Suite", () => {
  it("1. ngoService exports all authorized operational methods", () => {
    assert.strictEqual(typeof ngoService.getNgoDashboardStats, "function");
    assert.strictEqual(typeof ngoService.getNgoReferrals, "function");
    assert.strictEqual(typeof ngoService.getNgoCareRecords, "function");
    assert.strictEqual(typeof ngoService.getNgoCareRecordById, "function");
    assert.strictEqual(typeof ngoService.createNgoIntake, "function");
    assert.strictEqual(typeof ngoService.updateCareRecordStatus, "function");
    assert.strictEqual(typeof ngoService.addCareNote, "function");
    assert.strictEqual(typeof ngoService.updateMedicalStatus, "function");
    assert.strictEqual(typeof ngoService.assignPlacement, "function");
    assert.strictEqual(typeof ngoService.getNgoShelters, "function");
    assert.strictEqual(typeof ngoService.createShelter, "function");
    assert.strictEqual(typeof ngoService.updateShelter, "function");
    assert.strictEqual(typeof ngoService.requestHandover, "function");
    assert.strictEqual(typeof ngoService.getHandovers, "function");
    assert.strictEqual(typeof ngoService.getHandoverById, "function");
    assert.strictEqual(typeof ngoService.approveHandover, "function");
    assert.strictEqual(typeof ngoService.rejectHandover, "function");
    assert.strictEqual(typeof ngoService.completeHandover, "function");
  });

  it("2. normalizeCareRecord maps raw backend CareRecord into safe UI schema", () => {
    const rawRecord = {
      _id: "6740b2a8d1e4c89a71e22001",
      intakeNumber: "IN-2026-8801",
      status: "in_care",
      medicalStatus: "attention_required",
      receivedAt: new Date(Date.now() - 3600000 * 48), // 2 days ago
      childId: {
        _id: "ch-101",
        fullName: "Kabir Mehta",
        age: 10,
        gender: "male",
        photoUrl: "https://example.com/kabir.jpg"
      },
      caseId: {
        _id: "mc-901",
        caseNumber: "MC-2026-8821"
      },
      shelterId: {
        _id: "sh-1",
        name: "Helping Hands Kiosk"
      },
      initialCondition: {
        emotionalState: "Calm",
        intakeSource: "Police Escort from Sector 12"
      },
      policeCoordination: {
        policeStation: "Delhi Central Metro Police Post",
        assignedOfficer: "Insp. Vikram Rathore"
      },
      careNotes: [
        {
          text: "Provided warm dinner and clean shirt.",
          category: "General Wellbeing",
          createdAt: new Date()
        }
      ]
    };

    const normalized = ngoService.normalizeCareRecord(rawRecord);

    assert.strictEqual(normalized.id, "6740b2a8d1e4c89a71e22001");
    assert.strictEqual(normalized.childReference, "Kabir Mehta");
    assert.strictEqual(normalized.caseNumber, "MC-2026-8821");
    assert.strictEqual(normalized.intakeId, "IN-2026-8801");
    assert.strictEqual(normalized.approxAge, 10);
    assert.strictEqual(normalized.gender, "Male");
    assert.strictEqual(normalized.careStatus, "Stable");
    assert.strictEqual(normalized.medicalStatus, "Medical Attention Required");
    assert.strictEqual(normalized.policeStation, "Delhi Central Metro Police Post");
    assert.strictEqual(normalized.assignedOfficer, "Insp. Vikram Rathore");
    assert.strictEqual(normalized.timeInShelter, "2 days in care");
  });

  it("3. normalizeShelter calculates available spaces and occupancy percentage", () => {
    const rawShelter = {
      _id: "sh-101",
      name: "Sector 12 Shelter",
      capacity: 20,
      activePlacements: 8,
      status: "active",
      staffCount: 12
    };

    const normalized = ngoService.normalizeShelter(rawShelter);

    assert.strictEqual(normalized.id, "sh-101");
    assert.strictEqual(normalized.totalCapacity, 20);
    assert.strictEqual(normalized.occupied, 8);
    assert.strictEqual(normalized.available, 12);
    assert.strictEqual(normalized.occupancyPercentage, 40);
  });

  it("4. normalizeTransfer maps handover request into schedule roster schema", () => {
    const rawHandover = {
      _id: "6740b2a8d1e4c89a71e22999",
      handoverType: "guardian_reunification",
      status: "approved",
      requestedAt: new Date("2026-10-20T10:00:00Z"),
      careRecordId: { _id: "cr-01" },
      childId: { fullName: "Rhea Kapoor" },
      caseId: { caseNumber: "MC-2026-4431" },
      guardianDetails: {
        name: "Sunil Kapoor",
        relationship: "Father",
        verifiedByPolice: true
      },
      receivingOfficer: {
        name: "Insp. Sharma"
      }
    };

    const normalized = ngoService.normalizeTransfer(rawHandover);

    assert.strictEqual(normalized.id, "TR-E22999");
    assert.strictEqual(normalized.childReference, "Rhea Kapoor (Case #MC-2026-4431)");
    assert.strictEqual(normalized.status, "Approved");
    assert.strictEqual(normalized.toFacility, "Verified Guardian (Sunil Kapoor)");
    assert.strictEqual(normalized.guardianVerified, true);
    assert.strictEqual(normalized.responsibleStaff, "Officer Insp. Sharma");
  });

  it("5. normalizeCareRecord handles missing sub-documents and null fields safely", () => {
    const sparseRecord = {
      _id: "6740b2a8d1e4c89a71e22002"
    };

    const normalized = ngoService.normalizeCareRecord(sparseRecord);

    assert.strictEqual(normalized.id, "6740b2a8d1e4c89a71e22002");
    assert.strictEqual(normalized.childReference, "Child");
    assert.strictEqual(normalized.careStatus, "Stable");
    assert.strictEqual(normalized.medicalStatus, "Stable");
    assert.strictEqual(normalized.assignedDorm, "Main Dormitory");
  });
});
