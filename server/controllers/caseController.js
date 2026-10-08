const mongoose = require("mongoose");
const MissingCase = require("../models/MissingCase");
const Child = require("../models/Child");

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

    res.status(200).json({
      success: true,
      message: `Case status successfully updated to '${targetStatus}'.`,
      case: missingCase.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};
