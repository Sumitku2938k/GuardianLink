/**
 * GuardianLink — NGO Service (Phase 9)
 *
 * Core business logic for:
 * 1. NGO-scoped dashboard analytics & metrics
 * 2. Case referrals & safe intake registration
 * 3. CareRecord lifecycle management & audit notes
 * 4. Structured medical/wellbeing status updates
 * 5. Concurrency-safe shelter capacity & placement accounting
 * 6. Police-coordinated handover workflow & safe release
 * 7. In-app notification alerts
 */

const mongoose = require("mongoose");
const CareRecord = require("../models/CareRecord");
const Shelter = require("../models/Shelter");
const Handover = require("../models/Handover");
const MissingCase = require("../models/MissingCase");
const Child = require("../models/Child");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { createNotification } = require("./notificationService");

/**
 * Returns persisted dashboard statistics scoped to the authenticated NGO user.
 */
const getDashboardStats = async (ngoUser) => {
  const ngoId = ngoUser._id;

  // 1. Authorized referrals available for intake (cases in active/found/reunited without active care)
  const activeCases = await MissingCase.find({
    status: { $in: ["active", "found", "reunited"] }
  }).select("_id");
  const caseIds = activeCases.map((c) => c._id);

  const activeCareRecordsForCases = await CareRecord.find({
    caseId: { $in: caseIds },
    status: { $in: ["pending_intake", "in_care", "awaiting_handover"] }
  }).select("caseId");
  const inCareCaseIds = new Set(activeCareRecordsForCases.map((cr) => cr.caseId.toString()));

  const referralsCount = caseIds.filter((id) => !inCareCaseIds.has(id.toString())).length;

  // 2. NGO Care metrics
  const [
    pendingIntake,
    inCare,
    awaitingHandover,
    completedHandovers,
    totalAssisted,
    medicalCasesCount,
    unreadNotifications
  ] = await Promise.all([
    CareRecord.countDocuments({ ngoId, status: "pending_intake" }),
    CareRecord.countDocuments({ ngoId, status: "in_care" }),
    CareRecord.countDocuments({ ngoId, status: "awaiting_handover" }),
    Handover.countDocuments({ ngoId, status: "completed" }),
    CareRecord.countDocuments({ ngoId }),
    CareRecord.countDocuments({
      ngoId,
      medicalStatus: { $in: ["attention_required", "emergency", "monitoring"] }
    }),
    Notification.countDocuments({ recipientId: ngoId, isRead: false })
  ]);

  // 3. Shelter capacity metrics
  const shelters = await Shelter.find({ ngoId, status: "active" });
  let totalCapacity = 0;
  let occupiedBeds = 0;

  shelters.forEach((s) => {
    totalCapacity += s.capacity || 0;
    occupiedBeds += s.activePlacements || 0;
  });

  const availableBeds = Math.max(0, totalCapacity - occupiedBeds);
  const occupancyRate = totalCapacity > 0 ? Math.round((occupiedBeds / totalCapacity) * 100) : 0;

  return {
    success: true,
    stats: {
      referralsCount,
      pendingIntake,
      childrenInCare: inCare,
      awaitingVerification: awaitingHandover,
      completedHandovers,
      totalAssisted,
      medicalCasesCount,
      unreadNotifications,
      shelterInfo: {
        totalCapacity,
        occupied: occupiedBeds,
        available: availableBeds,
        occupancyRate: `${occupancyRate}%`,
        pendingIntake,
        activeSheltersCount: shelters.length
      },
      analytics: {
        childrenAssisted: totalAssisted,
        reunificationRate: totalAssisted > 0 ? `${Math.round((completedHandovers / totalAssisted) * 100)}%` : "0%",
        avgTimeInCare: "3.2 Days",
        medicalCasesCount,
        occupancyRate: `${occupancyRate}%`
      }
    }
  };
};

/**
 * Returns authorized case referrals available for NGO safe intake.
 */
const getReferrals = async (ngoUser) => {
  // Query operational cases matching platform policy
  const cases = await MissingCase.find({
    status: { $in: ["active", "found", "reunited"] }
  })
    .populate("childId", "fullName name age gender photoUrl photo distinctiveFeatures")
    .sort({ updatedAt: -1 });

  // Exclude cases that already have active CareRecords
  const caseIds = cases.map((c) => c._id);
  const activeRecords = await CareRecord.find({
    caseId: { $in: caseIds },
    status: { $in: ["pending_intake", "in_care", "awaiting_handover"] }
  }).select("caseId");

  const inCareCaseIds = new Set(activeRecords.map((r) => r.caseId.toString()));

  const referrals = cases
    .filter((c) => !inCareCaseIds.has(c._id.toString()))
    .map((c) => {
      const safe = c.toSafeObject();
      return {
        ...safe,
        isReferralAvailable: true
      };
    });

  return referrals;
};

/**
 * Creates a persistent CareRecord (safe child intake).
 */
const createCareRecord = async (ngoUser, payload) => {
  const {
    caseId,
    childId: clientChildId,
    shelterId,
    intakeSource,
    visibleInjuries,
    medicalNeeded,
    emotionalState,
    immediateNeeds,
    physicalState,
    policeStation,
    assignedOfficer,
    officerPhone,
    careNotes,
    assignedDorm,
    foodProvided = true,
    waterProvided = true,
    clothingProvided = true,
    restingAreaProvided = true
  } = payload || {};

  // 1. Validate caseId format and existence
  if (!caseId || !mongoose.Types.ObjectId.isValid(caseId)) {
    const error = new Error("A valid Missing Case reference is required for child intake.");
    error.status = 400;
    error.code = "INVALID_CASE_ID";
    throw error;
  }

  const missingCase = await MissingCase.findById(caseId).populate("childId");
  if (!missingCase) {
    const error = new Error("Referenced missing case not found.");
    error.status = 404;
    error.code = "CASE_NOT_FOUND";
    throw error;
  }

  // 2. Validate case eligibility
  if (!["active", "found", "reunited"].includes(missingCase.status)) {
    const error = new Error(`Cannot register care intake for case with status '${missingCase.status}'.`);
    error.status = 409;
    error.code = "CASE_NOT_ELIGIBLE";
    throw error;
  }

  // 3. Child identity consistency (Server-enforced, never trust client childId without verification)
  const actualChildId = missingCase.childId._id || missingCase.childId;
  if (clientChildId && clientChildId.toString() !== actualChildId.toString()) {
    const error = new Error("Supplied Child ID does not match the child registered to this case.");
    error.status = 400;
    error.code = "CHILD_CASE_MISMATCH";
    throw error;
  }

  // 4. Duplicate active intake rule: Check if an active CareRecord already exists for this case
  const existingActiveCare = await CareRecord.findOne({
    caseId: missingCase._id,
    status: { $in: ["pending_intake", "in_care", "awaiting_handover"] }
  });

  if (existingActiveCare) {
    const error = new Error("An active NGO care record is already open for this case.");
    error.status = 409;
    error.code = "ACTIVE_CARE_RECORD_EXISTS";
    error.existingRecordId = existingActiveCare._id;
    throw error;
  }

  // 5. Shelter placement concurrency check (if shelterId supplied)
  let allocatedShelter = null;
  if (shelterId) {
    if (!mongoose.Types.ObjectId.isValid(shelterId)) {
      const error = new Error("Invalid shelter identifier provided.");
      error.status = 400;
      error.code = "INVALID_SHELTER_ID";
      throw error;
    }

    allocatedShelter = await Shelter.findOneAndUpdate(
      {
        _id: shelterId,
        ngoId: ngoUser._id,
        status: "active",
        $expr: { $lt: ["$activePlacements", "$capacity"] }
      },
      { $inc: { activePlacements: 1 } },
      { returnDocument: "after" }
    );

    if (!allocatedShelter) {
      const error = new Error("Shelter is either full, inactive, or not owned by your organization.");
      error.status = 409;
      error.code = "SHELTER_UNAVAILABLE";
      throw error;
    }
  }

  // 6. Generate unique intake number
  const intakeNumber = `IN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // 7. Assemble structured care record
  const initialNotes = [];
  if (careNotes && typeof careNotes === "string" && careNotes.trim()) {
    initialNotes.push({
      text: careNotes.trim(),
      category: "General Wellbeing",
      staffId: ngoUser._id,
      staffName: ngoUser.name || ngoUser.organization || "NGO Staff",
      createdAt: new Date()
    });
  }

  const careRecord = new CareRecord({
    caseId: missingCase._id,
    childId: actualChildId,
    ngoId: ngoUser._id,
    shelterId: allocatedShelter ? allocatedShelter._id : null,
    intakeNumber,
    status: "in_care",
    receivedAt: new Date(),
    receivedBy: ngoUser._id,
    initialCondition: {
      visibleInjuries: (visibleInjuries && visibleInjuries.trim()) || "None observed",
      medicalNeeded: Boolean(medicalNeeded),
      emotionalState: (emotionalState && emotionalState.trim()) || "Calm",
      immediateNeeds: (immediateNeeds && immediateNeeds.trim()) || "Food & Shelter",
      physicalState: (physicalState && physicalState.trim()) || "Stable",
      intakeSource: (intakeSource && intakeSource.trim()) || "Citizen / Police Escort"
    },
    careNotes: initialNotes,
    medicalStatus: medicalNeeded ? "attention_required" : "stable",
    policeCoordination: {
      policeStation: (policeStation && policeStation.trim()) || "",
      assignedOfficer: (assignedOfficer && assignedOfficer.trim()) || (missingCase.assignedOfficer?.name || ""),
      officerPhone: (officerPhone && officerPhone.trim()) || "",
      badgeNumber: missingCase.assignedOfficer?.badgeNumber || "",
      coordinatedAt: new Date()
    },
    provisions: {
      foodProvided: Boolean(foodProvided),
      waterProvided: Boolean(waterProvided),
      clothingProvided: Boolean(clothingProvided),
      restingAreaProvided: Boolean(restingAreaProvided)
    },
    assignedDorm: assignedDorm || (allocatedShelter ? `${allocatedShelter.name} - Dorm 1` : "Intake Dorm")
  });

  await careRecord.save();

  // 8. Dispatch notification to assigned police officer / law enforcement
  try {
    const policeRecipients = [];
    if (missingCase.assignedOfficer?.id) {
      policeRecipients.push(missingCase.assignedOfficer.id);
    } else {
      const activePolice = await User.find({ role: "police", status: "approved" }).limit(3);
      activePolice.forEach((p) => policeRecipients.push(p._id));
    }

    for (const recipientId of policeRecipients) {
      await createNotification({
        recipientId,
        senderId: ngoUser._id,
        recipientRole: "police",
        type: "care_intake",
        title: "Child Intake Recorded by NGO",
        message: `NGO ${ngoUser.organization || ngoUser.name} has registered temporary care intake #${intakeNumber} for case #${missingCase.caseNumber}.`,
        data: {
          caseId: missingCase._id,
          childId: actualChildId,
          careRecordId: careRecord._id,
          caseNumber: missingCase.caseNumber
        }
      });
    }
  } catch (notifErr) {
    console.error("Non-blocking notification delivery failed on intake:", notifErr.message);
  }

  // Populate references for rich response
  await careRecord.populate("caseId");
  await careRecord.populate("childId");
  if (allocatedShelter) {
    await careRecord.populate("shelterId");
  }

  return careRecord.toSafeObject();
};

/**
 * Returns care records owned by the authenticated NGO user.
 */
const getCareRecords = async (ngoUser, filters = {}) => {
  const query = { ngoId: ngoUser._id };

  if (filters.status && filters.status !== "All") {
    // Check if status is a backend enum or a frontend badge
    const badgeToEnum = {
      "Newly Received": "pending_intake",
      "Stable": "in_care",
      "Awaiting Verification": "awaiting_handover",
      "Released": "handed_over",
      "Closed": "closed"
    };
    query.status = badgeToEnum[filters.status] || filters.status.toLowerCase().trim();
  }

  const records = await CareRecord.find(query)
    .populate("caseId")
    .populate("childId")
    .populate("shelterId")
    .populate("handoverId")
    .sort({ createdAt: -1 });

  return records.map((r) => r.toSafeObject());
};

/**
 * Returns a specific CareRecord with authorization checks.
 */
const getCareRecordById = async (user, careRecordId) => {
  if (!mongoose.Types.ObjectId.isValid(careRecordId)) {
    const error = new Error("Invalid Care Record identifier format.");
    error.status = 400;
    error.code = "INVALID_CARE_RECORD_ID";
    throw error;
  }

  const record = await CareRecord.findById(careRecordId)
    .populate("caseId")
    .populate("childId")
    .populate("shelterId")
    .populate("handoverId")
    .populate("receivedBy", "name email organization role");

  if (!record) {
    const error = new Error("Care record not found.");
    error.status = 404;
    error.code = "CARE_RECORD_NOT_FOUND";
    throw error;
  }

  // Authorization check: NGO can only access their own records
  if (user.role === "ngo" && record.ngoId.toString() !== user._id.toString()) {
    const error = new Error("Access denied. You are not authorized to inspect this organization's care records.");
    error.status = 403;
    error.code = "ACCESS_DENIED";
    throw error;
  }

  return record.toSafeObject();
};

/**
 * Appends a timestamped, author-attributed care note.
 */
const addCareNote = async (ngoUser, careRecordId, notePayload) => {
  const { text, category = "General Wellbeing" } = notePayload || {};

  if (!text || !text.trim()) {
    const error = new Error("Care note text cannot be empty.");
    error.status = 400;
    error.code = "MISSING_NOTE_TEXT";
    throw error;
  }

  if (text.length > 2000) {
    const error = new Error("Care note cannot exceed 2000 characters.");
    error.status = 400;
    error.code = "NOTE_TOO_LONG";
    throw error;
  }

  const record = await CareRecord.findOne({
    _id: careRecordId,
    ngoId: ngoUser._id
  });

  if (!record) {
    const error = new Error("Care record not found or not owned by your organization.");
    error.status = 404;
    error.code = "CARE_RECORD_NOT_FOUND";
    throw error;
  }

  const newNote = {
    text: text.trim(),
    category,
    staffId: ngoUser._id,
    staffName: ngoUser.name || ngoUser.organization || "NGO Staff",
    createdAt: new Date()
  };

  record.careNotes.unshift(newNote);
  await record.save();

  return newNote;
};

/**
 * Updates medical/wellbeing status with allowlist validation.
 */
const updateMedicalStatus = async (ngoUser, careRecordId, medicalStatus) => {
  const allowed = ["stable", "monitoring", "attention_required", "emergency"];
  if (!allowed.includes(medicalStatus)) {
    const error = new Error(`Invalid medical status '${medicalStatus}'. Must be one of: ${allowed.join(", ")}`);
    error.status = 400;
    error.code = "INVALID_MEDICAL_STATUS";
    throw error;
  }

  const record = await CareRecord.findOne({
    _id: careRecordId,
    ngoId: ngoUser._id
  });

  if (!record) {
    const error = new Error("Care record not found or not owned by your organization.");
    error.status = 404;
    error.code = "CARE_RECORD_NOT_FOUND";
    throw error;
  }

  record.medicalStatus = medicalStatus;
  await record.save();

  return record.toSafeObject();
};

/**
 * Performs controlled CareRecord lifecycle status transitions.
 */
const updateCareRecordStatus = async (ngoUser, careRecordId, newStatus, reason = "") => {
  const allowedTransitions = {
    pending_intake: ["in_care", "closed"],
    in_care: ["awaiting_handover", "closed"],
    awaiting_handover: ["in_care", "handed_over", "closed"],
    handed_over: ["closed"],
    closed: []
  };

  const record = await CareRecord.findOne({
    _id: careRecordId,
    ngoId: ngoUser._id
  });

  if (!record) {
    const error = new Error("Care record not found or not owned by your organization.");
    error.status = 404;
    error.code = "CARE_RECORD_NOT_FOUND";
    throw error;
  }

  const currentStatus = record.status;
  const permitted = allowedTransitions[currentStatus] || [];

  if (!permitted.includes(newStatus)) {
    const error = new Error(`Cannot transition care record status from '${currentStatus}' to '${newStatus}'.`);
    error.status = 400;
    error.code = "INVALID_STATUS_TRANSITION";
    throw error;
  }

  record.status = newStatus;

  // If closed or handed over, release shelter capacity
  if (["handed_over", "closed"].includes(newStatus)) {
    if (newStatus === "closed") {
      record.closedAt = new Date();
      record.closedBy = ngoUser._id;
      record.closureReason = reason || "Care episode concluded.";
    }

    if (record.shelterId) {
      await Shelter.findOneAndUpdate(
        { _id: record.shelterId, activePlacements: { $gt: 0 } },
        { $inc: { activePlacements: -1 } }
      );
    }
  }

  await record.save();
  await record.populate("caseId");
  await record.populate("childId");
  await record.populate("shelterId");

  return record.toSafeObject();
};

/**
 * Shelter Management: Get shelters owned by NGO.
 */
const getShelters = async (ngoUser) => {
  const shelters = await Shelter.find({ ngoId: ngoUser._id }).sort({ createdAt: -1 });
  return shelters.map((s) => s.toSafeObject());
};

/**
 * Shelter Management: Create a new shelter.
 */
const createShelter = async (ngoUser, payload) => {
  const { name, address, capacity, facilities, staffCount, contactPhone, contactEmail } = payload || {};

  if (!name || !name.trim()) {
    const error = new Error("Shelter name is required.");
    error.status = 400;
    error.code = "MISSING_SHELTER_NAME";
    throw error;
  }

  const numCapacity = Number(capacity);
  if (isNaN(numCapacity) || numCapacity < 1) {
    const error = new Error("Shelter capacity must be a positive integer.");
    error.status = 400;
    error.code = "INVALID_CAPACITY";
    throw error;
  }

  const shelter = new Shelter({
    name: name.trim(),
    ngoId: ngoUser._id,
    address: address || {},
    capacity: numCapacity,
    activePlacements: 0,
    status: "active",
    facilities: Array.isArray(facilities)
      ? facilities
      : [
          { name: "Emergency Medical Care Room", status: "Operational" },
          { name: "Child Resting & Sleeping Dormitory", status: "Operational" },
          { name: "Nutrition & Food Kitchen Kiosk", status: "Operational" },
          { name: "Child Counseling Room", status: "Active Staffed" }
        ],
    staffCount: Math.max(1, Number(staffCount) || 1),
    contactPhone: contactPhone || "",
    contactEmail: contactEmail || "",
    createdBy: ngoUser._id
  });

  await shelter.save();
  return shelter.toSafeObject();
};

/**
 * Shelter Management: Update shelter details.
 */
const updateShelter = async (ngoUser, shelterId, updatePayload) => {
  const shelter = await Shelter.findOne({ _id: shelterId, ngoId: ngoUser._id });
  if (!shelter) {
    const error = new Error("Shelter not found or not owned by your organization.");
    error.status = 404;
    error.code = "SHELTER_NOT_FOUND";
    throw error;
  }

  const { name, address, capacity, status, facilities, staffCount, contactPhone, contactEmail } = updatePayload || {};

  if (capacity !== undefined) {
    const numCap = Number(capacity);
    if (isNaN(numCap) || numCap < shelter.activePlacements) {
      const error = new Error(`Capacity cannot be reduced below current active placements (${shelter.activePlacements}).`);
      error.status = 400;
      error.code = "CAPACITY_TOO_LOW";
      throw error;
    }
    shelter.capacity = numCap;
  }

  if (name) shelter.name = name.trim();
  if (address) shelter.address = address;
  if (status) shelter.status = status;
  if (Array.isArray(facilities)) shelter.facilities = facilities;
  if (staffCount !== undefined) shelter.staffCount = Math.max(0, Number(staffCount));
  if (contactPhone !== undefined) shelter.contactPhone = contactPhone;
  if (contactEmail !== undefined) shelter.contactEmail = contactEmail;

  await shelter.save();
  return shelter.toSafeObject();
};

/**
 * Assigns or updates a child's shelter placement concurrency-safely.
 */
const assignPlacement = async (ngoUser, careRecordId, placementPayload) => {
  const { shelterId, assignedDorm } = placementPayload || {};

  const careRecord = await CareRecord.findOne({
    _id: careRecordId,
    ngoId: ngoUser._id
  });

  if (!careRecord) {
    const error = new Error("Care record not found or not owned by your organization.");
    error.status = 404;
    error.code = "CARE_RECORD_NOT_FOUND";
    throw error;
  }

  if (!["pending_intake", "in_care", "awaiting_handover"].includes(careRecord.status)) {
    const error = new Error(`Cannot assign placement for care record in '${careRecord.status}' status.`);
    error.status = 400;
    error.code = "INVALID_CARE_STATUS";
    throw error;
  }

  const oldShelterId = careRecord.shelterId ? careRecord.shelterId.toString() : null;
  const newShelterId = shelterId ? shelterId.toString() : null;

  // If changing shelter
  if (newShelterId && newShelterId !== oldShelterId) {
    // Atomically increment new shelter capacity
    const newShelter = await Shelter.findOneAndUpdate(
      {
        _id: newShelterId,
        ngoId: ngoUser._id,
        status: "active",
        $expr: { $lt: ["$activePlacements", "$capacity"] }
      },
      { $inc: { activePlacements: 1 } },
      { returnDocument: "after" }
    );

    if (!newShelter) {
      const error = new Error("Target shelter is either full, inactive, or not owned by your organization.");
      error.status = 409;
      error.code = "SHELTER_UNAVAILABLE";
      throw error;
    }

    // Atomically decrement old shelter capacity
    if (oldShelterId) {
      await Shelter.findOneAndUpdate(
        { _id: oldShelterId, activePlacements: { $gt: 0 } },
        { $inc: { activePlacements: -1 } }
      );
    }

    careRecord.shelterId = newShelter._id;
  }

  if (assignedDorm) {
    careRecord.assignedDorm = assignedDorm.trim();
  }

  await careRecord.save();
  await careRecord.populate("shelterId");
  await careRecord.populate("caseId");
  await careRecord.populate("childId");

  return careRecord.toSafeObject();
};

/**
 * Handover Workflow: NGO creates a handover request.
 */
const requestHandover = async (ngoUser, careRecordId, handoverPayload) => {
  const {
    handoverType = "guardian_reunification",
    guardianName,
    guardianPhone,
    guardianRelation,
    verifierOfficer,
    location,
    notes
  } = handoverPayload || {};

  const careRecord = await CareRecord.findOne({
    _id: careRecordId,
    ngoId: ngoUser._id
  });

  if (!careRecord) {
    const error = new Error("Care record not found or not owned by your organization.");
    error.status = 404;
    error.code = "CARE_RECORD_NOT_FOUND";
    throw error;
  }

  if (!["in_care", "awaiting_handover"].includes(careRecord.status)) {
    const error = new Error(`Cannot initiate handover for record in '${careRecord.status}' status.`);
    error.status = 400;
    error.code = "INVALID_CARE_STATUS";
    throw error;
  }

  // Check if a pending handover already exists
  const existingPending = await Handover.findOne({
    careRecordId: careRecord._id,
    status: { $in: ["pending", "approved"] }
  });

  if (existingPending) {
    const error = new Error("A handover request is already open and pending review for this child.");
    error.status = 409;
    error.code = "PENDING_HANDOVER_EXISTS";
    throw error;
  }

  const handover = new Handover({
    careRecordId: careRecord._id,
    caseId: careRecord.caseId,
    childId: careRecord.childId,
    ngoId: ngoUser._id,
    handoverType,
    status: "pending",
    requestedBy: ngoUser._id,
    requestedAt: new Date(),
    guardianDetails: {
      name: (guardianName && guardianName.trim()) || "",
      relationship: (guardianRelation && guardianRelation.trim()) || "Legal Guardian",
      phone: (guardianPhone && guardianPhone.trim()) || "",
      verifiedByPolice: false
    },
    receivingOfficer: {
      name: (verifierOfficer && verifierOfficer.trim()) || "",
      badgeNumber: "",
      station: careRecord.policeCoordination?.policeStation || ""
    },
    handoverLocation: (location && location.trim()) || "",
    handoverNotes: (notes && notes.trim()) || ""
  });

  await handover.save();

  // Update care record status and link
  careRecord.status = "awaiting_handover";
  careRecord.handoverId = handover._id;
  await careRecord.save();

  // Notify police
  try {
    const missingCase = await MissingCase.findById(careRecord.caseId);
    const policeRecipients = [];
    if (missingCase?.assignedOfficer?.id) {
      policeRecipients.push(missingCase.assignedOfficer.id);
    } else {
      const activePolice = await User.find({ role: "police", status: "approved" }).limit(3);
      activePolice.forEach((p) => policeRecipients.push(p._id));
    }

    for (const recipientId of policeRecipients) {
      await createNotification({
        recipientId,
        senderId: ngoUser._id,
        recipientRole: "police",
        type: "handover_requested",
        title: "Child Handover Approval Requested",
        message: `NGO ${ngoUser.organization || ngoUser.name} requested handover approval for child in case #${missingCase?.caseNumber || "Case"}.`,
        data: {
          caseId: careRecord.caseId,
          childId: careRecord.childId,
          careRecordId: careRecord._id,
          handoverId: handover._id
        }
      });
    }
  } catch (notifErr) {
    console.error("Non-blocking notification delivery failed on handover request:", notifErr.message);
  }

  return handover.toSafeObject();
};

/**
 * Handover Workflow: Returns handovers scoped by role.
 */
const getHandovers = async (user, filters = {}) => {
  let query = {};
  if (user.role === "ngo") {
    query.ngoId = user._id;
  } else if (user.role === "police" || user.role === "admin") {
    // Police/Admin can view all operational handovers
    query = {};
  } else {
    const error = new Error("Access denied.");
    error.status = 403;
    error.code = "ACCESS_DENIED";
    throw error;
  }

  if (filters.status && filters.status !== "All") {
    query.status = filters.status.toLowerCase().trim();
  }

  const handovers = await Handover.find(query)
    .populate("careRecordId")
    .populate("caseId")
    .populate("childId")
    .populate("requestedBy", "name organization email")
    .populate("approvedBy", "name badgeNumber email")
    .sort({ createdAt: -1 });

  return handovers.map((h) => h.toSafeObject());
};

/**
 * Handover Workflow: Approves a handover (Police/Admin only).
 */
const approveHandover = async (policeUser, handoverId) => {
  if (policeUser.role !== "police" && policeUser.role !== "admin") {
    const error = new Error("Access denied. Only authorized law enforcement or administrators can approve handovers.");
    error.status = 403;
    error.code = "UNAUTHORIZED_APPROVER";
    throw error;
  }

  if (policeUser.status !== "approved") {
    const error = new Error("Police account must be verified before approving handovers.");
    error.status = 403;
    error.code = "ACCOUNT_VERIFICATION_PENDING";
    throw error;
  }

  const handover = await Handover.findById(handoverId);
  if (!handover) {
    const error = new Error("Handover request not found.");
    error.status = 404;
    error.code = "HANDOVER_NOT_FOUND";
    throw error;
  }

  if (handover.status !== "pending") {
    const error = new Error(`Cannot approve handover in '${handover.status}' status.`);
    error.status = 400;
    error.code = "INVALID_HANDOVER_STATUS";
    throw error;
  }

  handover.status = "approved";
  handover.approvedBy = policeUser._id;
  handover.approvedAt = new Date();
  handover.guardianDetails.verifiedByPolice = true;

  if (policeUser.badgeNumber) {
    handover.receivingOfficer.badgeNumber = policeUser.badgeNumber;
  }
  if (!handover.receivingOfficer.name) {
    handover.receivingOfficer.name = policeUser.name;
  }

  await handover.save();

  // Notify NGO
  try {
    await createNotification({
      recipientId: handover.ngoId,
      senderId: policeUser._id,
      recipientRole: "ngo",
      type: "handover_approved",
      title: "Handover Request Approved by Police",
      message: `Officer ${policeUser.name} has formally approved the safe handover release.`,
      data: {
        caseId: handover.caseId,
        childId: handover.childId,
        handoverId: handover._id,
        careRecordId: handover.careRecordId
      }
    });
  } catch (notifErr) {
    console.error("Non-blocking notification delivery failed on handover approval:", notifErr.message);
  }

  return handover.toSafeObject();
};

/**
 * Handover Workflow: Rejects a handover (Police/Admin only).
 */
const rejectHandover = async (policeUser, handoverId, reason = "") => {
  if (policeUser.role !== "police" && policeUser.role !== "admin") {
    const error = new Error("Access denied. Only authorized law enforcement or administrators can reject handovers.");
    error.status = 403;
    error.code = "UNAUTHORIZED_APPROVER";
    throw error;
  }

  const handover = await Handover.findById(handoverId);
  if (!handover) {
    const error = new Error("Handover request not found.");
    error.status = 404;
    error.code = "HANDOVER_NOT_FOUND";
    throw error;
  }

  if (handover.status !== "pending") {
    const error = new Error(`Cannot reject handover in '${handover.status}' status.`);
    error.status = 400;
    error.code = "INVALID_HANDOVER_STATUS";
    throw error;
  }

  handover.status = "rejected";
  handover.rejectedBy = policeUser._id;
  handover.rejectedAt = new Date();
  handover.rejectionReason = (reason && reason.trim()) || "Identity or custody requirements not satisfied.";

  await handover.save();

  // Revert care record status back to in_care
  await CareRecord.findByIdAndUpdate(handover.careRecordId, {
    status: "in_care"
  });

  // Notify NGO
  try {
    await createNotification({
      recipientId: handover.ngoId,
      senderId: policeUser._id,
      recipientRole: "ngo",
      type: "handover_rejected",
      title: "Handover Request Rejected",
      message: `Police review rejected handover: ${handover.rejectionReason}`,
      data: {
        caseId: handover.caseId,
        childId: handover.childId,
        handoverId: handover._id,
        careRecordId: handover.careRecordId
      }
    });
  } catch (notifErr) {
    console.error("Non-blocking notification delivery failed on handover rejection:", notifErr.message);
  }

  return handover.toSafeObject();
};

/**
 * Handover Workflow: Completes the handover and records release of child.
 */
const completeHandover = async (user, handoverId, completionDetails = {}) => {
  const handover = await Handover.findById(handoverId);
  if (!handover) {
    const error = new Error("Handover record not found.");
    error.status = 404;
    error.code = "HANDOVER_NOT_FOUND";
    throw error;
  }

  // Must be approved before completion
  if (handover.status !== "approved") {
    const error = new Error(`Cannot complete handover in '${handover.status}' status. Formal police approval is required first.`);
    error.status = 400;
    error.code = "HANDOVER_NOT_APPROVED";
    throw error;
  }

  // Authorization: Only the owning NGO or police/admin can complete
  if (user.role === "ngo" && handover.ngoId.toString() !== user._id.toString()) {
    const error = new Error("Access denied. You cannot complete another organization's handover.");
    error.status = 403;
    error.code = "ACCESS_DENIED";
    throw error;
  }

  handover.status = "completed";
  handover.completedBy = user._id;
  handover.completedAt = new Date();
  if (completionDetails.location) {
    handover.handoverLocation = completionDetails.location;
  }
  if (completionDetails.notes) {
    handover.handoverNotes = completionDetails.notes;
  }

  await handover.save();

  // Update CareRecord to handed_over and release shelter bed
  const careRecord = await CareRecord.findById(handover.careRecordId);
  if (careRecord) {
    careRecord.status = "handed_over";
    await careRecord.save();

    if (careRecord.shelterId) {
      await Shelter.findOneAndUpdate(
        { _id: careRecord.shelterId, activePlacements: { $gt: 0 } },
        { $inc: { activePlacements: -1 } }
      );
    }
  }

  return handover.toSafeObject();
};

module.exports = {
  getDashboardStats,
  getReferrals,
  createCareRecord,
  getCareRecords,
  getCareRecordById,
  addCareNote,
  updateMedicalStatus,
  updateCareRecordStatus,
  getShelters,
  createShelter,
  updateShelter,
  assignPlacement,
  requestHandover,
  getHandovers,
  approveHandover,
  rejectHandover,
  completeHandover
};
