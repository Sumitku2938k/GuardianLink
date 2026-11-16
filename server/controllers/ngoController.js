/**
 * GuardianLink — NGO Controller (Phase 9)
 *
 * Express route handlers for NGO operational workflows:
 * - Scoped dashboard statistics & analytics
 * - Authorized case referrals & safe child intake
 * - CareRecord lifecycle & timestamped care notes
 * - Medical/wellbeing status updates
 * - Shelter management & atomic capacity placement
 * - Police-coordinated handover review & completion
 */

const ngoService = require("../services/ngoService");
const Handover = require("../models/Handover");
const User = require("../models/User");
const auditLogService = require("../services/auditLogService");
const citizenPhotoSearchService = require("../services/citizenPhotoSearchService");

// Helper to enforce verified status
const ensureApproved = (req, res) => {
  if (req.user.status !== "approved") {
    res.status(403).json({
      success: false,
      message: "Account is awaiting administrative verification before accessing operational care records.",
      code: "ACCOUNT_VERIFICATION_PENDING"
    });
    return false;
  }
  return true;
};

// @desc    Get persisted NGO dashboard statistics
// @route   GET /api/ngo/dashboard-stats
// @access  Private (NGO, Admin)
exports.getDashboardStats = async (req, res, next) => {
  try {
    if (!ensureApproved(req, res)) return;
    const result = await ngoService.getDashboardStats(req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Get authorized missing cases available for intake
// @route   GET /api/ngo/referrals
// @access  Private (NGO, Admin)
exports.getReferrals = async (req, res, next) => {
  try {
    if (!ensureApproved(req, res)) return;
    const referrals = await ngoService.getReferrals(req.user);
    res.status(200).json({
      success: true,
      count: referrals.length,
      referrals
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record safe child intake (create CareRecord)
// @route   POST /api/ngo/care-records
// @access  Private (NGO, Admin)
exports.createCareRecord = async (req, res, next) => {
  try {
    if (!ensureApproved(req, res)) return;
    const careRecord = await ngoService.createCareRecord(req.user, req.body);

    await auditLogService.recordAuditEvent({
      req,
      action: "CARE_RECORD_CREATED",
      entityType: "CareRecord",
      entityId: careRecord._id || careRecord.id,
      outcome: "success",
      metadata: {
        careRecordId: (careRecord._id || careRecord.id).toString(),
        status: careRecord.status
      }
    });

    res.status(201).json({
      success: true,
      message: "Safe child intake successfully recorded.",
      careRecord
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        code: error.code,
        existingRecordId: error.existingRecordId
      });
    }
    next(error);
  }
};

// @desc    Get CareRecords owned by NGO
// @route   GET /api/ngo/care-records
// @access  Private (NGO, Admin)
exports.getCareRecords = async (req, res, next) => {
  try {
    if (!ensureApproved(req, res)) return;
    const records = await ngoService.getCareRecords(req.user, req.query);
    res.status(200).json({
      success: true,
      count: records.length,
      careRecords: records
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get specific CareRecord details
// @route   GET /api/ngo/care-records/:careRecordId
// @access  Private (NGO, Police, Admin)
exports.getCareRecordById = async (req, res, next) => {
  try {
    if (!ensureApproved(req, res)) return;
    const record = await ngoService.getCareRecordById(req.user, req.params.careRecordId);
    res.status(200).json({
      success: true,
      careRecord: record
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }
    next(error);
  }
};

// @desc    Update CareRecord status lifecycle
// @route   PATCH /api/ngo/care-records/:careRecordId/status
// @access  Private (NGO, Admin)
exports.updateCareRecordStatus = async (req, res, next) => {
  try {
    if (!ensureApproved(req, res)) return;
    const { status, reason } = req.body || {};
    const record = await ngoService.updateCareRecordStatus(
      req.user,
      req.params.careRecordId,
      status,
      reason
    );

    await auditLogService.recordAuditEvent({
      req,
      action: "CARE_STATUS_CHANGED",
      entityType: "CareRecord",
      entityId: record._id || record.id,
      outcome: "success",
      metadata: {
        careRecordId: (record._id || record.id).toString(),
        status,
        reason: reason || ""
      }
    });

    res.status(200).json({
      success: true,
      message: `Care record status updated to '${status}'.`,
      careRecord: record
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }
    next(error);
  }
};

// @desc    Add timestamped care note
// @route   POST /api/ngo/care-records/:careRecordId/notes
// @access  Private (NGO, Admin)
exports.addCareNote = async (req, res, next) => {
  try {
    if (!ensureApproved(req, res)) return;
    const note = await ngoService.addCareNote(req.user, req.params.careRecordId, req.body);
    res.status(201).json({
      success: true,
      message: "Daily care update note logged successfully.",
      note
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }
    next(error);
  }
};

// @desc    Update child medical/wellbeing status
// @route   PATCH /api/ngo/care-records/:careRecordId/medical-status
// @access  Private (NGO, Admin)
exports.updateMedicalStatus = async (req, res, next) => {
  try {
    if (!ensureApproved(req, res)) return;
    const { medicalStatus } = req.body || {};
    const record = await ngoService.updateMedicalStatus(
      req.user,
      req.params.careRecordId,
      medicalStatus
    );
    res.status(200).json({
      success: true,
      message: "Medical and wellbeing status updated.",
      careRecord: record
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }
    next(error);
  }
};

// @desc    Get shelters owned by NGO
// @route   GET /api/ngo/shelters
// @access  Private (NGO, Admin)
exports.getShelters = async (req, res, next) => {
  try {
    if (!ensureApproved(req, res)) return;
    const shelters = await ngoService.getShelters(req.user);
    res.status(200).json({
      success: true,
      count: shelters.length,
      shelters
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new shelter
// @route   POST /api/ngo/shelters
// @access  Private (NGO, Admin)
exports.createShelter = async (req, res, next) => {
  try {
    if (!ensureApproved(req, res)) return;
    const shelter = await ngoService.createShelter(req.user, req.body);

    await auditLogService.recordAuditEvent({
      req,
      action: "SHELTER_CREATED",
      entityType: "Shelter",
      entityId: shelter._id || shelter.id,
      outcome: "success",
      metadata: {
        shelterName: shelter.name,
        capacity: shelter.capacity
      }
    });

    res.status(201).json({
      success: true,
      message: "Shelter facility registered successfully.",
      shelter
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }
    next(error);
  }
};

// @desc    Update shelter configuration or capacity
// @route   PATCH /api/ngo/shelters/:shelterId
// @access  Private (NGO, Admin)
exports.updateShelter = async (req, res, next) => {
  try {
    if (!ensureApproved(req, res)) return;
    const shelter = await ngoService.updateShelter(req.user, req.params.shelterId, req.body);

    await auditLogService.recordAuditEvent({
      req,
      action: "SHELTER_UPDATED",
      entityType: "Shelter",
      entityId: shelter._id || shelter.id,
      outcome: "success",
      metadata: {
        shelterName: shelter.name
      }
    });

    res.status(200).json({
      success: true,
      message: "Shelter facility updated successfully.",
      shelter
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }
    next(error);
  }
};

// @desc    Assign or transfer shelter placement
// @route   POST /api/ngo/care-records/:careRecordId/placement
// @access  Private (NGO, Admin)
exports.assignPlacement = async (req, res, next) => {
  try {
    if (!ensureApproved(req, res)) return;
    const record = await ngoService.assignPlacement(req.user, req.params.careRecordId, req.body);

    await auditLogService.recordAuditEvent({
      req,
      action: "CHILD_PLACEMENT_CREATED",
      entityType: "CareRecord",
      entityId: record._id || record.id,
      outcome: "success",
      metadata: {
        careRecordId: (record._id || record.id).toString()
      }
    });

    res.status(200).json({
      success: true,
      message: "Shelter placement assigned successfully.",
      careRecord: record
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }
    next(error);
  }
};

// @desc    Create handover request
// @route   POST /api/ngo/care-records/:careRecordId/handovers
// @access  Private (NGO, Admin)
exports.requestHandover = async (req, res, next) => {
  try {
    if (!ensureApproved(req, res)) return;
    const handover = await ngoService.requestHandover(req.user, req.params.careRecordId, req.body);

    await auditLogService.recordAuditEvent({
      req,
      action: "HANDOVER_REQUESTED",
      entityType: "Handover",
      entityId: handover._id || handover.id,
      outcome: "success",
      metadata: {
        handoverId: (handover._id || handover.id).toString()
      }
    });

    res.status(201).json({
      success: true,
      message: "Handover and safe release request submitted for police verification.",
      handover
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }
    next(error);
  }
};

// @desc    Get handovers list
// @route   GET /api/ngo/handovers
// @access  Private (NGO, Police, Admin)
exports.getHandovers = async (req, res, next) => {
  try {
    if (!ensureApproved(req, res)) return;
    const handovers = await ngoService.getHandovers(req.user, req.query);
    res.status(200).json({
      success: true,
      count: handovers.length,
      handovers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get specific handover record
// @route   GET /api/ngo/handovers/:handoverId
// @access  Private (NGO, Police, Admin)
exports.getHandoverById = async (req, res, next) => {
  try {
    if (!ensureApproved(req, res)) return;
    const handover = await Handover.findById(req.params.handoverId)
      .populate("careRecordId")
      .populate("caseId")
      .populate("childId")
      .populate("requestedBy", "name organization email")
      .populate("approvedBy", "name badgeNumber email");

    if (!handover) {
      return res.status(404).json({
        success: false,
        message: "Handover record not found.",
        code: "HANDOVER_NOT_FOUND"
      });
    }

    if (req.user.role === "ngo" && handover.ngoId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
        code: "ACCESS_DENIED"
      });
    }

    res.status(200).json({
      success: true,
      handover: handover.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve handover request (Police/Admin only)
// @route   PATCH /api/ngo/handovers/:handoverId/approve
// @access  Private (Police, Admin)
exports.approveHandover = async (req, res, next) => {
  try {
    if (!ensureApproved(req, res)) return;
    const handover = await ngoService.approveHandover(req.user, req.params.handoverId);

    await auditLogService.recordAuditEvent({
      req,
      action: "HANDOVER_APPROVED",
      entityType: "Handover",
      entityId: handover._id || handover.id,
      outcome: "success",
      metadata: {
        handoverId: (handover._id || handover.id).toString()
      }
    });

    res.status(200).json({
      success: true,
      message: "Handover request approved. Release authorized.",
      handover
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }
    next(error);
  }
};

// @desc    Reject handover request (Police/Admin only)
// @route   PATCH /api/ngo/handovers/:handoverId/reject
// @access  Private (Police, Admin)
exports.rejectHandover = async (req, res, next) => {
  try {
    if (!ensureApproved(req, res)) return;
    const { reason } = req.body || {};
    const handover = await ngoService.rejectHandover(req.user, req.params.handoverId, reason);

    await auditLogService.recordAuditEvent({
      req,
      action: "HANDOVER_REJECTED",
      entityType: "Handover",
      entityId: handover._id || handover.id,
      outcome: "success",
      metadata: {
        handoverId: (handover._id || handover.id).toString(),
        reason: reason || ""
      }
    });

    res.status(200).json({
      success: true,
      message: "Handover request rejected.",
      handover
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }
    next(error);
  }
};

// @desc    Complete handover and record safe release
// @route   PATCH /api/ngo/handovers/:handoverId/complete
// @access  Private (NGO, Police, Admin)
exports.completeHandover = async (req, res, next) => {
  try {
    if (!ensureApproved(req, res)) return;
    const handover = await ngoService.completeHandover(req.user, req.params.handoverId, req.body);

    await auditLogService.recordAuditEvent({
      req,
      action: "HANDOVER_COMPLETED",
      entityType: "Handover",
      entityId: handover._id || handover.id,
      outcome: "success",
      metadata: {
        handoverId: (handover._id || handover.id).toString()
      }
    });

    res.status(200).json({
      success: true,
      message: "Handover successfully completed and child released into verified custody.",
      handover
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }
    next(error);
  }
};

// @desc    Get authenticated NGO organization profile and license info
// @route   GET /api/ngo/profile
// @access  Private (NGO, Admin)
exports.getNgoProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      "name email phone organization role status isVerified profilePhoto city state pinCode address registrationNumber registrationAuthority registrationDate darpanId verifiedAt rejectionReason createdAt"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "NGO user profile not found.",
        code: "USER_NOT_FOUND"
      });
    }

    res.status(200).json({
      success: true,
      profile: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        organization: user.organization || user.name,
        role: user.role,
        status: user.status,
        isVerified: Boolean(user.isVerified),
        registrationNumber: user.registrationNumber || "",
        registrationAuthority: user.registrationAuthority || "",
        registrationDate: user.registrationDate || null,
        darpanId: user.darpanId || "",
        address: user.address || "",
        city: user.city || "",
        state: user.state || "",
        pinCode: user.pinCode || "",
        verifiedAt: user.verifiedAt || null,
        profilePhoto: user.profilePhoto || "",
        rejectionReason: user.rejectionReason || "",
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update authenticated NGO organization profile and licensing details
// @route   PATCH /api/ngo/profile
// @access  Private (NGO, Admin)
exports.updateNgoProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "NGO user profile not found.",
        code: "USER_NOT_FOUND"
      });
    }

    const {
      organization,
      phone,
      address,
      city,
      state,
      pinCode,
      registrationNumber,
      registrationAuthority,
      registrationDate,
      darpanId
    } = req.body || {};

    // Update allowed fields (strictly ignoring role, status, isVerified, verifiedAt, passwordHash)
    if (organization !== undefined) user.organization = String(organization).trim();
    if (phone !== undefined) user.phone = String(phone).trim();
    if (address !== undefined) user.address = String(address).trim();
    if (city !== undefined) user.city = String(city).trim();
    if (state !== undefined) user.state = String(state).trim();
    if (pinCode !== undefined) user.pinCode = String(pinCode).trim();
    if (registrationNumber !== undefined) user.registrationNumber = String(registrationNumber).trim();
    if (registrationAuthority !== undefined) user.registrationAuthority = String(registrationAuthority).trim();
    if (darpanId !== undefined) user.darpanId = String(darpanId).trim();
    if (registrationDate !== undefined) {
      user.registrationDate = registrationDate ? new Date(registrationDate) : null;
    }

    await user.save();

    await auditLogService.recordAuditEvent({
      req,
      action: "NGO_PROFILE_UPDATED",
      entityType: "User",
      entityId: user._id,
      outcome: "success",
      metadata: {
        userId: user._id.toString(),
        organization: user.organization
      }
    });

    res.status(200).json({
      success: true,
      message: "NGO profile updated successfully.",
      profile: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        organization: user.organization,
        role: user.role,
        status: user.status,
        isVerified: Boolean(user.isVerified),
        registrationNumber: user.registrationNumber || "",
        registrationAuthority: user.registrationAuthority || "",
        registrationDate: user.registrationDate || null,
        darpanId: user.darpanId || "",
        address: user.address || "",
        city: user.city || "",
        state: user.state || "",
        pinCode: user.pinCode || "",
        verifiedAt: user.verifiedAt || null,
        profilePhoto: user.profilePhoto || "",
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Optional AI Biometric Candidate Pre-check for child intake investigation
// @route   POST /api/ngo/biometric-precheck
// @access  Private (NGO, Admin)
exports.biometricPrecheck = async (req, res, next) => {
  try {
    if (!ensureApproved(req, res)) return;

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "An image file is required for biometric candidate pre-check.",
        code: "IMAGE_REQUIRED"
      });
    }

    let parsedLimit = 5;
    if (req.body?.limit !== undefined) {
      const l = parseInt(req.body.limit, 10);
      if (!isNaN(l) && l >= 1 && l <= 20) {
        parsedLimit = l;
      }
    }

    let parsedThreshold = 0.6;
    if (req.body?.threshold !== undefined) {
      const t = parseFloat(req.body.threshold);
      if (!isNaN(t) && t >= -1.0 && t <= 1.0) {
        parsedThreshold = t;
      }
    }

    await auditLogService.recordAuditEvent({
      req,
      action: "AI_MATCH_REQUESTED",
      entityType: "AI_SEARCH",
      outcome: "success",
      metadata: {
        requester: "ngo",
        limit: parsedLimit,
        threshold: parsedThreshold
      }
    });

    const searchResult = await citizenPhotoSearchService.searchMissingChildPhoto({
      imageBuffer: req.file.buffer,
      mimeType: req.file.mimetype || "image/jpeg",
      filename: req.file.originalname || "precheck.jpg",
      limit: parsedLimit,
      threshold: parsedThreshold
    });

    await auditLogService.recordAuditEvent({
      req,
      action: "AI_MATCH_RETURNED",
      entityType: "AI_SEARCH",
      outcome: "success",
      metadata: {
        requester: "ngo",
        matchFound: searchResult.matchFound,
        totalCandidates: searchResult.totalCandidates || 0,
        thresholdApplied: searchResult.thresholdApplied
      }
    });

    res.status(200).json({
      success: true,
      matchFound: searchResult.matchFound,
      candidates: searchResult.candidates || [],
      totalCandidates: searchResult.totalCandidates || 0,
      thresholdApplied: searchResult.thresholdApplied,
      message: searchResult.message,
      disclaimer: searchResult.disclaimer || "Potential biometric lead. Requires independent law enforcement and guardian verification."
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }
    next(error);
  }
};
