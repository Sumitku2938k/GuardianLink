/**
 * GuardianLink — Phase 23: Database Concurrency & Atomic Bounds Suite
 *
 * Validates atomic MongoDB updates and race-condition safety:
 * 1. Shelter placement overflow race condition ($expr & $inc bounding).
 * 2. Handover completion concurrency (guaranteeing single bed release).
 * 3. Atomic status transitions on MissingCase.
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
const Handover = require("../models/Handover");

const ngoService = require("../services/ngoService");

const TEST_DB_URI = process.env.TEST_MONGO_URI || "mongodb://127.0.0.1:27018/guardianlink_phase23_e2e";

describe("GuardianLink Phase 23: Database Concurrency & Race-Condition Safety", () => {
  let ngoUser;
  let policeUser;
  let parentUser;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI);
    }

    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash("ConcurrentPass2026!", salt);

    ngoUser = await User.create({
      name: "Concurrency NGO Director",
      email: `ngo.concurrency.${Date.now()}@test.local`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: passHash,
      role: "ngo",
      status: "approved"
    });

    policeUser = await User.create({
      name: "Insp. Concurrency Verifier",
      email: `police.concurrency.${Date.now()}@test.local`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: passHash,
      role: "police",
      status: "approved"
    });

    parentUser = await User.create({
      name: "Parent Concurrency",
      email: `parent.concurrency.${Date.now()}@test.local`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: passHash,
      role: "parent",
      status: "active"
    });
  });

  after(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe("CONCURRENCY 1: Simultaneous Admissions for Final Remaining Bed", () => {
    it("guarantees that with 1 remaining bed, only 1 of 10 concurrent requests succeeds and 9 fail with SHELTER_UNAVAILABLE", async () => {
      // 1. Create a shelter with total capacity 1 and 0 active placements (1 bed available)
      const shelter = await Shelter.create({
        name: `Shelter-Race-${Date.now()}`,
        ngoId: ngoUser._id,
        capacity: 1,
        activePlacements: 0,
        address: {
          address: "10 Race Condition Blvd",
          city: "New Delhi",
          state: "Delhi",
          latitude: 28.6139,
          longitude: 77.2090
        },
        status: "active"
      });

      // 2. Create 10 children, 10 missing cases, and 10 care records waiting for placement
      const careRecords = [];
      for (let i = 0; i < 10; i++) {
        const child = await Child.create({
          fullName: `Child Concurrency ${i} ${Date.now()}`,
          guardianId: parentUser._id,
          gender: "male",
          dateOfBirth: new Date("2018-01-01")
        });

        const missingCase = await MissingCase.create({
          childId: child._id,
          reportedBy: parentUser._id,
          missingDate: new Date(),
          lastSeenLocation: { city: "New Delhi", state: "Delhi" },
          status: "active"
        });

        const careRecord = await CareRecord.create({
          caseId: missingCase._id,
          childId: child._id,
          ngoId: ngoUser._id,
          intakeNumber: `IN-CC-${Date.now().toString().slice(-4)}-${i}-${Math.floor(100 + Math.random() * 900)}`,
          status: "in_care",
          receivedBy: ngoUser._id,
          shelterId: null
        });

        careRecords.push(careRecord);
      }

      // 3. Dispatch 10 simultaneous assignPlacement calls targeting the single remaining bed
      const promises = careRecords.map((cr) =>
        ngoService.assignPlacement(ngoUser, cr._id, {
          shelterId: shelter._id.toString(),
          assignedDorm: "Dorm Alpha"
        })
      );

      const results = await Promise.allSettled(promises);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      assert.equal(fulfilled.length, 1, "Exactly one concurrent placement must succeed for the single remaining bed");
      assert.equal(rejected.length, 9, "All 9 excess concurrent requests must be rejected");

      // Verify rejected reasons are all SHELTER_UNAVAILABLE
      for (const rej of rejected) {
        assert.equal(rej.reason.code, "SHELTER_UNAVAILABLE");
        assert.equal(rej.reason.status, 409);
      }

      // 4. Verify MongoDB shelter invariant
      const finalShelter = await Shelter.findById(shelter._id);
      assert.equal(finalShelter.activePlacements, 1, "activePlacements must never exceed capacity 1");
      assert.equal(finalShelter.availableSpaces, 0);
      assert.equal(finalShelter.occupancyRate, 100);
    });
  });

  describe("CONCURRENCY 2: Simultaneous Handover Completion Requests", () => {
    it("guarantees that 5 simultaneous completion calls for the same handover result in exactly 1 bed release", async () => {
      // 1. Create a shelter with 1 active placement
      const shelter = await Shelter.create({
        name: `Shelter-HandoverRace-${Date.now()}`,
        ngoId: ngoUser._id,
        capacity: 5,
        activePlacements: 1,
        address: {
          address: "20 Handover Way",
          city: "New Delhi",
          state: "Delhi",
          latitude: 28.6139,
          longitude: 77.2090
        },
        status: "active"
      });

      const child = await Child.create({
        fullName: `Child Handover Race ${Date.now()}`,
        guardianId: parentUser._id,
        gender: "female",
        dateOfBirth: new Date("2017-06-01")
      });

      const missingCase = await MissingCase.create({
        childId: child._id,
        reportedBy: parentUser._id,
        missingDate: new Date(),
        lastSeenLocation: { city: "New Delhi", state: "Delhi" },
        status: "found"
      });

      const careRecord = await CareRecord.create({
        caseId: missingCase._id,
        childId: child._id,
        ngoId: ngoUser._id,
        shelterId: shelter._id,
        intakeNumber: `IN-HO-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`,
        status: "awaiting_handover",
        receivedBy: ngoUser._id
      });

      // Approved handover ready for completion
      const handover = await Handover.create({
        careRecordId: careRecord._id,
        caseId: missingCase._id,
        childId: child._id,
        ngoId: ngoUser._id,
        handoverType: "guardian_reunification",
        status: "approved",
        requestedBy: ngoUser._id,
        approvedBy: policeUser._id,
        approvedAt: new Date(),
        guardianDetails: {
          name: parentUser.name,
          phone: parentUser.phone,
          verifiedByPolice: true
        }
      });

      careRecord.handoverId = handover._id;
      await careRecord.save();

      // 2. Dispatch 5 simultaneous completeHandover calls for this EXACT same handover record
      const completionPromises = Array.from({ length: 5 }, (_, i) =>
        ngoService.completeHandover(ngoUser, handover._id, {
          location: `Desk ${i}`,
          notes: `Concurrent handover attempt #${i}`
        })
      );

      const results = await Promise.allSettled(completionPromises);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      assert.equal(fulfilled.length, 1, "Exactly one completion must succeed");
      assert.equal(rejected.length, 4, "Other 4 concurrent completion requests must fail safely");

      for (const rej of rejected) {
        assert.equal(rej.reason.code, "HANDOVER_NOT_APPROVED");
      }

      // 3. Invariant check: Shelter bed was released exactly ONCE (activePlacements is 0, not -4)
      const finalShelter = await Shelter.findById(shelter._id);
      assert.equal(finalShelter.activePlacements, 0, "activePlacements must be decremented exactly once to 0");
      assert.ok(finalShelter.activePlacements >= 0, "activePlacements must never drop below 0");

      const finalCare = await CareRecord.findById(careRecord._id);
      assert.equal(finalCare.status, "handed_over");

      const finalHandover = await Handover.findById(handover._id);
      assert.equal(finalHandover.status, "completed");
    });
  });

  describe("CONCURRENCY 3: Atomic Boundary with Conditional MongoDB Write Operators", () => {
    it("strictly prevents Shelter activePlacements decrement below zero under concurrent release attempts", async () => {
      const shelter = await Shelter.create({
        name: `Shelter-Underflow-${Date.now()}`,
        ngoId: ngoUser._id,
        capacity: 5,
        activePlacements: 0, // Already 0
        address: { address: "Zero Floor", city: "Delhi", state: "Delhi" },
        status: "active"
      });

      // Dispatch 5 concurrent decrement operations with the query guard activePlacements: { $gt: 0 }
      const decrements = Array.from({ length: 5 }, () =>
        Shelter.findOneAndUpdate(
          { _id: shelter._id, activePlacements: { $gt: 0 } },
          { $inc: { activePlacements: -1 } },
          { returnDocument: "after" }
        )
      );

      const results = await Promise.all(decrements);
      // All 5 should return null because activePlacements was 0
      assert.equal(results.every((r) => r === null), true);

      const finalShelter = await Shelter.findById(shelter._id);
      assert.equal(finalShelter.activePlacements, 0);
    });
  });
});

