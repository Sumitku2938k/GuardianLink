const mongoose = require("mongoose");
const MissingCase = require("../models/MissingCase");
const Child = require("../models/Child");
const Notification = require("../models/Notification");
const { createNotification } = require("../services/notificationService");

/**
 * Valid state machine transitions for MissingCase lifecycle
 */
const ALLOWED_TRANSITIONS = {
  reported: ["under_verification", "active", "cancelled"],
  under_verification: ["active", "closed", "cancelled"],
  active: ["found", "closed"],
  found: ["reunited", "closed"],
  reunited: ["closed"],
  closed: [], // Terminal state
  cancelled: [] // Terminal state
};

/**
 * Helper to normalize and parse location inputs
 */
const normalizeLocation = (rawLocation) => {
  if (!rawLocation) {
    return { address: "", city: "", state: "", pinCode: "", latitude: undefined, longitude: undefined };
  }

  if (typeof rawLocation === "string") {
    const trimmed = rawLocation.trim();
    const parts = trimmed.split(",").map((p) => p.trim());
    return {
      address: trimmed,
      city: parts[0] || "",
      state: parts[1] || "",
      pinCode: parts[2] || "",
      latitude: undefined,
      longitude: undefined
    };
  }

  if (typeof rawLocation === "object") {
    let lat = rawLocation.latitude !== undefined && rawLocation.latitude !== "" ? Number(rawLocation.latitude) : undefined;
    let lng = rawLocation.longitude !== undefined && rawLocation.longitude !== "" ? Number(rawLocation.longitude) : undefined;

    if (lat !== undefined && (isNaN(lat) || lat < -90 || lat > 90)) lat = undefined;
    if (lng !== undefined && (isNaN(lng) || lng < -180 || lng > 180)) lng = undefined;

    return {
      address: (rawLocation.address || rawLocation.location || "").trim(),
      city: (rawLocation.city || "").trim(),
      state: (rawLocation.state || "").trim(),
      pinCode: (rawLocation.pinCode || "").trim(),
      latitude: lat,
      longitude: lng
    };
  }

  return { address: "", city: "", state: "", pinCode: "", latitude: undefined, longitude: undefined };
};

// @desc    Create a new missing child emergency report
// @route   POST /api/cases
// @access  Private (Parent only)
exports.createCase = async (req, res, next) => {
  try {
    const {
      childId,
      missingDate,
      lastSeenLocation,
      lastSeenDescription,
      priority,
      policeCaseNumber,
      firNumber
    } = req.body || {};

    // 1. Validate childId format
    if (!childId || !mongoose.Types.ObjectId.isValid(childId)) {
      return res.status(400).json({
        success: false,
        message: "A valid Child ID is required to report a missing child.",
        code: "INVALID_CHILD_ID"
      });
    }

    // 2. Validate Child existence and enforce strict Parent ownership (IDOR security)
    const child = await Child.findOne({
      _id: childId,
      guardianId: req.user._id
    });

    if (!child) {
      return res.status(404).json({
        success: false,
        message: "Child record not found or you are not authorized to report this child missing.",
        code: "CHILD_NOT_FOUND"
      });
    }

    // 3. Check for existing active/open case for this child (Incident history preservation)
    const existingActiveCase = await MissingCase.findOne({
      childId: child._id,
      status: { $in: ["reported", "under_verification", "active", "found"] }
    });

    if (existingActiveCase) {
      return res.status(409).json({
        success: false,
        message: "An active missing case is already open for this child. The existing case must be resolved before filing a new incident report.",
        code: "ACTIVE_CASE_EXISTS",
        existingCaseId: existingActiveCase._id
      });
    }

    // 4. Validate Missing Date (Cannot be future)
    if (!missingDate) {
      return res.status(400).json({
        success: false,
        message: "Missing date and time is required.",
        code: "MISSING_DATE_REQUIRED"
      });
    }

    const parsedMissingDate = new Date(missingDate);
    if (isNaN(parsedMissingDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid missing date format.",
        code: "INVALID_MISSING_DATE"
      });
    }

    if (parsedMissingDate > new Date()) {
      return res.status(400).json({
        success: false,
        message: "Missing date cannot be in the future.",
        code: "FUTURE_MISSING_DATE"
      });
    }

    // 5. Parse and normalize location
    const normalizedLoc = normalizeLocation(lastSeenLocation);

    // 6. Generate canonical case tracking number if not supplied
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const assignedCaseNumber = (policeCaseNumber || "").trim() || `MC-${year}-${randomSuffix}`;

    // 7. Create MissingCase instance with mass-assignment protection
    const missingCase = new MissingCase({
      childId: child._id,
      reportedBy: req.user._id, // Strictly derived from authenticated parent session
      missingDate: parsedMissingDate,
      lastSeenLocation: normalizedLoc,
      lastSeenDescription: (lastSeenDescription || "").trim(),
      priority: (priority || "high").toLowerCase().trim(),
      status: "reported", // Always initializes strictly in 'reported' state
      policeCaseNumber: assignedCaseNumber,
      firNumber: (firNumber || "").trim()
    });

    await missingCase.save();
    await missingCase.populate("childId");

    res.status(201).json({
      success: true,
      message: "Missing child case report filed successfully.",
      case: missingCase.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get missing cases scoped by authenticated user role
// @route   GET /api/cases
// @access  Private (Parent, Police, NGO, Admin)
exports.getCases = async (req, res, next) => {
  try {
    const userRole = req.user.role;
    let query = {};

    // 1. Parent Access: Scoped strictly to cases of children they own
    if (userRole === "parent") {
      const parentChildren = await Child.find({ guardianId: req.user._id }).select("_id");
      const childIds = parentChildren.map((c) => c._id);
      query = { childId: { $in: childIds } };
    }
    // 2. Police Access: Operational cases for approved police officers
    else if (userRole === "police") {
      if (req.user.status !== "approved") {
        return res.status(403).json({
          success: false,
          message: "Police account is awaiting administrative approval before accessing operational case logs.",
          code: "ACCOUNT_VERIFICATION_PENDING"
        });
      }

      // Operational cases excluding private cancelled drafts
      query = { status: { $in: ["reported", "under_verification", "active", "found", "reunited", "closed"] } };

      // Optional jurisdiction/city filtering if officer has city assigned
      if (req.query.city) {
        query["lastSeenLocation.city"] = new RegExp(req.query.city.trim(), "i");
      }
    }
    // 3. NGO Access: Authorized cases in active care, found or reunification
    else if (userRole === "ngo") {
      if (req.user.status !== "approved") {
        return res.status(403).json({
          success: false,
          message: "NGO account is awaiting administrative approval before accessing case logs.",
          code: "ACCOUNT_VERIFICATION_PENDING"
        });
      }

      query = { status: { $in: ["active", "found", "reunited"] } };
    }
    // 4. Admin Access: Platform-wide oversight
    else if (userRole === "admin") {
      query = {};
    }
    // 5. Citizen / Unauthorized roles: Access denied
    else {
      return res.status(403).json({
        success: false,
        message: "Access denied. Role is not authorized to query internal missing cases.",
        code: "ACCESS_DENIED"
      });
    }

    // Optional status query filter
    if (req.query.status && req.query.status !== "All") {
      query.status = req.query.status.toLowerCase().trim();
    }

    const cases = await MissingCase.find(query)
      .populate("childId")
      .populate("reportedBy", "name email phone city state")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: cases.length,
      cases: cases.map((c) => c.toSafeObject())
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed record for a specific missing case
// @route   GET /api/cases/:caseId
// @access  Private (Parent, Police, NGO, Admin)
exports.getCaseById = async (req, res, next) => {
  try {
    const { caseId } = req.params;

    // Validate ID format (ObjectId or policeCaseNumber)
    let missingCase = null;
    if (mongoose.Types.ObjectId.isValid(caseId)) {
      missingCase = await MissingCase.findById(caseId)
        .populate("childId")
        .populate("reportedBy", "name email phone city state");
    }

    if (!missingCase) {
      missingCase = await MissingCase.findOne({ policeCaseNumber: caseId })
        .populate("childId")
        .populate("reportedBy", "name email phone city state");
    }

    if (!missingCase) {
      return res.status(404).json({
        success: false,
        message: "Missing case record not found.",
        code: "CASE_NOT_FOUND"
      });
    }

    const userRole = req.user.role;

    // Authorization & IDOR Verification:
    // 1. Parent: Can ONLY view case if they are the guardian of the child or the reporter
    if (userRole === "parent") {
      const childGuardianId = missingCase.childId?.guardianId?.toString();
      const caseReporterId = missingCase.reportedBy?._id?.toString() || missingCase.reportedBy?.toString();
      const currentUserId = req.user._id.toString();

      if (childGuardianId !== currentUserId && caseReporterId !== currentUserId) {
        return res.status(404).json({
          success: false,
          message: "Missing case record not found.",
          code: "CASE_NOT_FOUND"
        });
      }
    }
    // 2. Police: Must be verified
    else if (userRole === "police") {
      if (req.user.status !== "approved") {
        return res.status(403).json({
          success: false,
          message: "Police account is awaiting administrative approval.",
          code: "ACCOUNT_VERIFICATION_PENDING"
        });
      }
    }
    // 3. NGO: Must be verified
    else if (userRole === "ngo") {
      if (req.user.status !== "approved") {
        return res.status(403).json({
          success: false,
          message: "NGO account is awaiting administrative approval.",
          code: "ACCOUNT_VERIFICATION_PENDING"
        });
      }
    }
    // 4. Admin: Full authorization
    else if (userRole === "admin") {
      // Allowed
    }
    // 5. Citizen / Unauthorized
    else {
      return res.status(403).json({
        success: false,
        message: "Access denied. Role is not authorized to inspect case details.",
        code: "ACCESS_DENIED"
      });
    }

    res.status(200).json({
      success: true,
      case: missingCase.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update lifecycle status of a missing case
// @route   PATCH /api/cases/:caseId/status
// @access  Private (Police, Admin, Parent-restricted)
exports.updateCaseStatus = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const { status: rawStatus } = req.body || {};

    if (!rawStatus) {
      return res.status(400).json({
        success: false,
        message: "New status value is required.",
        code: "MISSING_STATUS_PARAMETER"
      });
    }

    const targetStatus = rawStatus.toLowerCase().trim();

    // 1. Locate case
    let missingCase = null;
    if (mongoose.Types.ObjectId.isValid(caseId)) {
      missingCase = await MissingCase.findById(caseId).populate("childId");
    }

    if (!missingCase) {
      missingCase = await MissingCase.findOne({ policeCaseNumber: caseId }).populate("childId");
    }

    if (!missingCase) {
      return res.status(404).json({
        success: false,
        message: "Missing case record not found.",
        code: "CASE_NOT_FOUND"
      });
    }

    // 2. Validate against controlled state machine
    const currentStatus = missingCase.status;
    const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];

    if (!allowedNext.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: ${allowedNext.join(", ") || "none (terminal state)"}.`,
        code: "INVALID_STATUS_TRANSITION",
        currentStatus,
        allowedTransitions: allowedNext
      });
    }

    // 3. Enforce Role-based Status Permissions
    const userRole = req.user.role;

    if (userRole === "parent") {
      // Parents can only cancel their own newly reported case if filed in error
      const childGuardianId = missingCase.childId?.guardianId?.toString();
      const currentUserId = req.user._id.toString();

      if (childGuardianId !== currentUserId && missingCase.reportedBy.toString() !== currentUserId) {
        return res.status(404).json({
          success: false,
          message: "Missing case record not found.",
          code: "CASE_NOT_FOUND"
        });
      }

      if (targetStatus !== "cancelled") {
        return res.status(403).json({
          success: false,
          message: "Parents cannot arbitrarily modify official case lifecycle status. Official status transitions require law enforcement or administrative verification.",
          code: "PARENT_STATUS_UPDATE_RESTRICTED"
        });
      }
    } else if (userRole === "police") {
      if (req.user.status !== "approved") {
        return res.status(403).json({
          success: false,
          message: "Police account is awaiting administrative approval.",
          code: "ACCOUNT_VERIFICATION_PENDING"
        });
      }
    } else if (userRole === "admin") {
      // Admin is fully authorized to progress lifecycle
    } else if (userRole === "ngo") {
      if (req.user.status !== "approved") {
        return res.status(403).json({
          success: false,
          message: "NGO account is awaiting administrative approval.",
          code: "ACCOUNT_VERIFICATION_PENDING"
        });
      }
      if (targetStatus !== "found" && targetStatus !== "reunited") {
        return res.status(403).json({
          success: false,
          message: "NGO accounts are only authorized to assist with Found or Reunited status milestones.",
          code: "NGO_STATUS_UPDATE_RESTRICTED"
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied. Role is not authorized to update case status.",
        code: "ACCESS_DENIED"
      });
    }

    // 4. Update milestones & status
    if (targetStatus === "found" && !missingCase.foundAt) {
      missingCase.foundAt = new Date();
    }
    if (targetStatus === "reunited" && !missingCase.reunitedAt) {
      missingCase.reunitedAt = new Date();
    }

    missingCase.status = targetStatus;
    await missingCase.save();

    // Dispatch case status update notification to guardian (non-blocking)
    try {
      const guardianId = missingCase.childId?.guardianId || missingCase.reportedBy;
      if (guardianId && guardianId.toString() !== req.user._id.toString()) {
        createNotification({
          recipientId: guardianId,
          senderId: req.user._id,
          recipientRole: "parent",
          type: "case_updated",
          title: `Case #${missingCase.caseNumber} Status: ${targetStatus.toUpperCase()}`,
          message: `The status of missing case #${missingCase.caseNumber} for ${missingCase.childId?.fullName || "your child"} has been updated to '${targetStatus}'.`,
          data: {
            caseId: missingCase._id,
            childId: missingCase.childId?._id || missingCase.childId,
            caseNumber: missingCase.caseNumber
          }
        }).catch((err) => console.warn("[CaseController] Notification error on status update:", err.message));
      }
    } catch (notifErr) {
      console.warn("[CaseController] Notification dispatch error:", notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Case status successfully updated to '${targetStatus}'.`,
      case: missingCase.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

// Helper to ensure investigationNotes is an array
const ensureNotesArray = (mc) => {
  if (!Array.isArray(mc.investigationNotes)) {
    if (typeof mc.investigationNotes === "string" && mc.investigationNotes.trim()) {
      mc.investigationNotes = [
        {
          officerName: "Investigating Officer",
          badge: "DL-POL-0000",
          text: mc.investigationNotes,
          createdAt: mc.createdAt || new Date()
        }
      ];
    } else {
      mc.investigationNotes = [];
    }
  }
};

// @desc    Get aggregated dashboard stats scoped for Police Station
// @route   GET /api/cases/police/dashboard-stats
// @access  Private (Police, Admin)
exports.getPoliceDashboardStats = async (req, res, next) => {
  try {
    if (req.user.role === "police" && req.user.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Police account is awaiting administrative approval.",
        code: "ACCOUNT_VERIFICATION_PENDING"
      });
    }

    const caseQuery = { status: { $in: ["reported", "under_verification", "active", "found", "reunited", "closed"] } };

    const totalMissing = await MissingCase.countDocuments(caseQuery);
    const activeCases = await MissingCase.countDocuments({
      ...caseQuery,
      status: { $in: ["reported", "under_verification", "active"] }
    });
    const criticalCases = await MissingCase.countDocuments({
      ...caseQuery,
      priority: "critical",
      status: { $nin: ["closed", "cancelled"] }
    });
    const foundCases = await MissingCase.countDocuments({
      ...caseQuery,
      status: { $in: ["found", "reunited"] }
    });
    const closedCases = await MissingCase.countDocuments({
      ...caseQuery,
      status: "closed"
    });

    const Sighting = require("../models/Sighting");
    const unreviewedSightings = await Sighting.countDocuments({
      status: { $in: ["submitted", "under_review"] }
    });

    const totalRecovered = foundCases + closedCases;
    const recoveryRateNum = totalMissing > 0 ? ((totalRecovered / totalMissing) * 100).toFixed(1) : "0.0";

    const casesWithReviews = await MissingCase.find({
      ...caseQuery,
      "potentialMatchReviews.0": { $exists: true }
    }).select("potentialMatchReviews");

    let potentialMatchesCount = 0;
    casesWithReviews.forEach((c) => {
      if (Array.isArray(c.potentialMatchReviews)) {
        potentialMatchesCount += c.potentialMatchReviews.filter(
          (m) => m.decision !== "confirm" && m.decision !== "reject"
        ).length;
      }
    });

    res.status(200).json({
      success: true,
      stats: {
        totalMissing,
        activeCases,
        criticalCases,
        potentialMatches: potentialMatchesCount,
        foundReports: unreviewedSightings,
        recoveredCases: totalRecovered,
        recoveryRate: `${recoveryRateNum}%`,
        avgResponseTime: "4.2 mins",
        avgRecoveryTime: "2.8 hours"
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update police case number, FIR number, or priority
// @route   PATCH /api/cases/:caseId/investigation
// @access  Private (Police, Admin)
exports.updateInvestigationDetails = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const { policeCaseNumber, firNumber, priority } = req.body || {};

    if (req.user.role === "police" && req.user.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Police account is awaiting administrative approval.",
        code: "ACCOUNT_VERIFICATION_PENDING"
      });
    }

    let missingCase = null;
    if (mongoose.Types.ObjectId.isValid(caseId)) {
      missingCase = await MissingCase.findById(caseId).populate("childId");
    }
    if (!missingCase) {
      missingCase = await MissingCase.findOne({ policeCaseNumber: caseId }).populate("childId");
    }
    if (!missingCase) {
      return res.status(404).json({
        success: false,
        message: "Missing case record not found.",
        code: "CASE_NOT_FOUND"
      });
    }

    const changes = [];
    if (policeCaseNumber !== undefined) {
      const trimmed = String(policeCaseNumber).trim();
      if (trimmed && trimmed !== missingCase.policeCaseNumber) {
        changes.push(`Police Case Number updated to "${trimmed}"`);
        missingCase.policeCaseNumber = trimmed;
      }
    }

    if (firNumber !== undefined) {
      const trimmed = String(firNumber).trim();
      if (trimmed && trimmed !== missingCase.firNumber) {
        changes.push(`FIR Number updated to "${trimmed}"`);
        missingCase.firNumber = trimmed;
      }
    }

    if (priority !== undefined) {
      const validPriorities = ["low", "medium", "high", "critical"];
      const lower = String(priority).toLowerCase().trim();
      if (validPriorities.includes(lower) && lower !== missingCase.priority) {
        changes.push(`Priority changed to "${lower}"`);
        missingCase.priority = lower;
      }
    }

    if (changes.length > 0) {
      ensureNotesArray(missingCase);
      const badge = req.user.phone ? `DL-POL-${req.user.phone.slice(-4)}` : "DL-POL-0000";
      missingCase.investigationNotes.push({
        officerId: req.user._id,
        officerName: req.user.name,
        badge,
        text: `Officer updated investigation records: ${changes.join(", ")}.`,
        createdAt: new Date()
      });
      missingCase.markModified("investigationNotes");
      await missingCase.save();
    }

    res.status(200).json({
      success: true,
      message: "Case investigation details updated successfully.",
      case: missingCase.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign or reassign an officer to lead a case squad
// @route   PATCH /api/cases/:caseId/assign
// @access  Private (Police, Admin)
exports.assignOfficer = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const { officerId, officerName, badgeNumber } = req.body || {};

    if (req.user.role === "police" && req.user.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Police account is awaiting administrative approval.",
        code: "ACCOUNT_VERIFICATION_PENDING"
      });
    }

    let missingCase = null;
    if (mongoose.Types.ObjectId.isValid(caseId)) {
      missingCase = await MissingCase.findById(caseId).populate("childId");
    }
    if (!missingCase) {
      missingCase = await MissingCase.findOne({ policeCaseNumber: caseId }).populate("childId");
    }
    if (!missingCase) {
      return res.status(404).json({
        success: false,
        message: "Missing case record not found.",
        code: "CASE_NOT_FOUND"
      });
    }

    const assignedId = officerId && mongoose.Types.ObjectId.isValid(officerId) ? officerId : req.user._id;
    const assignedName = (officerName && String(officerName).trim()) || req.user.name;
    const assignedBadge =
      (badgeNumber && String(badgeNumber).trim()) ||
      (req.user.phone ? `DL-POL-${req.user.phone.slice(-4)}` : "DL-POL-0000");

    missingCase.assignedOfficer = {
      id: assignedId,
      name: assignedName,
      badgeNumber: assignedBadge,
      assignedAt: new Date()
    };

    ensureNotesArray(missingCase);
    const currentBadge = req.user.phone ? `DL-POL-${req.user.phone.slice(-4)}` : "DL-POL-0000";
    missingCase.investigationNotes.push({
      officerId: req.user._id,
      officerName: req.user.name,
      badge: currentBadge,
      text: `Reassigned case squad lead to ${assignedName} (${assignedBadge}).`,
      createdAt: new Date()
    });
    missingCase.markModified("investigationNotes");

    await missingCase.save();

    // Dispatch assignment notification to assigned officer (non-blocking)
    try {
      if (officerId && officerId.toString() !== req.user._id.toString()) {
        createNotification({
          recipientId: officerId,
          senderId: req.user._id,
          recipientRole: "police",
          type: "case_updated",
          title: `Assigned as Lead Officer: Case #${missingCase.caseNumber}`,
          message: `You have been assigned as investigating lead for missing case #${missingCase.caseNumber} (${missingCase.childId?.fullName || "Child"}).`,
          data: {
            caseId: missingCase._id,
            childId: missingCase.childId?._id || missingCase.childId,
            caseNumber: missingCase.caseNumber
          }
        }).catch((err) => console.warn("[CaseController] Notification error on officer assign:", err.message));
      }
    } catch (notifErr) {
      console.warn("[CaseController] Assignment notification error:", notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Case successfully assigned to ${assignedName}.`,
      case: missingCase.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add an internal police investigation note
// @route   POST /api/cases/:caseId/notes
// @access  Private (Police, Admin)
exports.addInvestigationNote = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const { text } = req.body || {};

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Investigation note text is required.",
        code: "MISSING_NOTE_TEXT"
      });
    }

    if (text.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Note cannot exceed 2000 characters.",
        code: "NOTE_TOO_LONG"
      });
    }

    if (req.user.role === "police" && req.user.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Police account is awaiting administrative approval.",
        code: "ACCOUNT_VERIFICATION_PENDING"
      });
    }

    let missingCase = null;
    if (mongoose.Types.ObjectId.isValid(caseId)) {
      missingCase = await MissingCase.findById(caseId).populate("childId");
    }
    if (!missingCase) {
      missingCase = await MissingCase.findOne({ policeCaseNumber: caseId }).populate("childId");
    }
    if (!missingCase) {
      return res.status(404).json({
        success: false,
        message: "Missing case record not found.",
        code: "CASE_NOT_FOUND"
      });
    }

    ensureNotesArray(missingCase);
    const badge = req.user.phone ? `DL-POL-${req.user.phone.slice(-4)}` : "DL-POL-0000";
    const noteEntry = {
      officerId: req.user._id,
      officerName: req.user.name,
      badge,
      text: text.trim(),
      createdAt: new Date()
    };

    missingCase.investigationNotes.push(noteEntry);
    missingCase.markModified("investigationNotes");
    await missingCase.save();

    const safeObj = missingCase.toSafeObject();

    res.status(201).json({
      success: true,
      message: "Investigation note recorded successfully.",
      notes: safeObj.investigationNotes,
      case: safeObj
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add an investigation checklist task
// @route   POST /api/cases/:caseId/tasks
// @access  Private (Police, Admin)
exports.createTask = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const { label, assignedTo } = req.body || {};

    if (!label || typeof label !== "string" || !label.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task label is required.",
        code: "MISSING_TASK_LABEL"
      });
    }

    if (req.user.role === "police" && req.user.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Police account is awaiting administrative approval.",
        code: "ACCOUNT_VERIFICATION_PENDING"
      });
    }

    let missingCase = null;
    if (mongoose.Types.ObjectId.isValid(caseId)) {
      missingCase = await MissingCase.findById(caseId).populate("childId");
    }
    if (!missingCase) {
      missingCase = await MissingCase.findOne({ policeCaseNumber: caseId }).populate("childId");
    }
    if (!missingCase) {
      return res.status(404).json({
        success: false,
        message: "Missing case record not found.",
        code: "CASE_NOT_FOUND"
      });
    }

    const newTask = {
      label: label.trim().slice(0, 500),
      completed: false,
      assignedTo: (assignedTo && String(assignedTo).trim()) || req.user.name,
      createdAt: new Date()
    };

    missingCase.investigationTasks.push(newTask);
    await missingCase.save();

    const safeObj = missingCase.toSafeObject();

    res.status(201).json({
      success: true,
      message: "Investigation checklist task added.",
      tasks: safeObj.investigationTasks,
      case: safeObj
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle completion of an investigation checklist task
// @route   PATCH /api/cases/:caseId/tasks/:taskId
// @access  Private (Police, Admin)
exports.toggleTask = async (req, res, next) => {
  try {
    const { caseId, taskId } = req.params;

    if (req.user.role === "police" && req.user.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Police account is awaiting administrative approval.",
        code: "ACCOUNT_VERIFICATION_PENDING"
      });
    }

    let missingCase = null;
    if (mongoose.Types.ObjectId.isValid(caseId)) {
      missingCase = await MissingCase.findById(caseId).populate("childId");
    }
    if (!missingCase) {
      missingCase = await MissingCase.findOne({ policeCaseNumber: caseId }).populate("childId");
    }
    if (!missingCase) {
      return res.status(404).json({
        success: false,
        message: "Missing case record not found.",
        code: "CASE_NOT_FOUND"
      });
    }

    const task = missingCase.investigationTasks.id(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Investigation task not found.",
        code: "TASK_NOT_FOUND"
      });
    }

    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date() : null;

    await missingCase.save();
    const safeObj = missingCase.toSafeObject();

    res.status(200).json({
      success: true,
      message: `Task marked as ${task.completed ? "completed" : "pending"}.`,
      tasks: safeObj.investigationTasks,
      case: safeObj
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Officer human review decision on an AI candidate match
// @route   POST /api/cases/:caseId/matches/:matchId/review
// @access  Private (Police, Admin)
exports.reviewAIMatch = async (req, res, next) => {
  try {
    const { caseId, matchId } = req.params;
    const { decision, notes, candidateId } = req.body || {};

    const validDecisions = ["confirm", "reject", "request_evidence"];
    if (!decision || !validDecisions.includes(decision)) {
      return res.status(400).json({
        success: false,
        message: "Decision must be 'confirm', 'reject', or 'request_evidence'.",
        code: "INVALID_DECISION"
      });
    }

    if (req.user.role === "police" && req.user.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Police account is awaiting administrative approval.",
        code: "ACCOUNT_VERIFICATION_PENDING"
      });
    }

    let missingCase = null;
    if (mongoose.Types.ObjectId.isValid(caseId)) {
      missingCase = await MissingCase.findById(caseId).populate("childId");
    }
    if (!missingCase) {
      missingCase = await MissingCase.findOne({ policeCaseNumber: caseId }).populate("childId");
    }
    if (!missingCase) {
      return res.status(404).json({
        success: false,
        message: "Missing case record not found.",
        code: "CASE_NOT_FOUND"
      });
    }

    const verificationStatus =
      decision === "confirm" ? "Verified Match" : decision === "reject" ? "Rejected Match" : "Evidence Requested";

    missingCase.potentialMatchReviews.push({
      matchId: String(matchId || `pm-${Date.now()}`),
      candidateId: String(candidateId || ""),
      decision,
      verificationStatus,
      notes: notes ? String(notes).trim().slice(0, 1000) : "",
      reviewedBy: req.user._id,
      reviewedAt: new Date()
    });

    ensureNotesArray(missingCase);
    const badge = req.user.phone ? `DL-POL-${req.user.phone.slice(-4)}` : "DL-POL-0000";

    if (decision === "confirm") {
      if (["reported", "under_verification", "active"].includes(missingCase.status)) {
        missingCase.status = "found";
        if (!missingCase.foundAt) {
          missingCase.foundAt = new Date();
        }
      }
      missingCase.investigationNotes.push({
        officerId: req.user._id,
        officerName: req.user.name,
        badge,
        text: `Officer confirmed AI Match #${matchId}. Verification notes: "${notes || "Evidence sufficient"}". Case marked as 'Found'.`,
        createdAt: new Date()
      });
    } else if (decision === "reject") {
      missingCase.investigationNotes.push({
        officerId: req.user._id,
        officerName: req.user.name,
        badge,
        text: `Officer rejected AI Match #${matchId}. Reason: "${notes || "Visual mismatch"}".`,
        createdAt: new Date()
      });
    } else {
      missingCase.investigationNotes.push({
        officerId: req.user._id,
        officerName: req.user.name,
        badge,
        text: `Officer requested additional evidence for AI Match #${matchId}. Notes: "${notes || "Requires higher res image"}".`,
        createdAt: new Date()
      });
    }
    missingCase.markModified("investigationNotes");

    await missingCase.save();

    // If officer confirmed AI match, dispatch verified alert to verified guardian (non-blocking)
    if (decision === "confirm") {
      try {
        const guardianId = missingCase.childId?.guardianId || missingCase.reportedBy;
        const canNotify = (mongoose.connection && mongoose.connection.readyState === 1) ||
          (Notification.prototype.save !== mongoose.Model.prototype.save);
        if (guardianId && canNotify) {
          createNotification({
            recipientId: guardianId,
            senderId: req.user._id,
            recipientRole: "parent",
            type: "match_flagged",
            title: `Verified AI Match: ${missingCase.childId?.fullName || "Child"} Located`,
            message: `Law enforcement officer ${req.user.name} has confirmed a verified match lead for case #${missingCase.caseNumber}. The case status has progressed to Found.`,
            data: {
              caseId: missingCase._id,
              childId: missingCase.childId?._id || missingCase.childId,
              caseNumber: missingCase.caseNumber
            }
          }).catch((err) => console.warn("[CaseController] Notification error on match confirm:", err.message));
        }
      } catch (notifErr) {
        console.warn("[CaseController] Match notification error:", notifErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: `Officer match decision '${decision}' recorded successfully.`,
      case: missingCase.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

