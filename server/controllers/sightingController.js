/**
 * GuardianLink — Sighting Controller (Phase 7)
 *
 * Handles HTTP requests for citizen sighting reports:
 * 1. POST /api/sightings — Submit citizen sighting with mandatory safety confirmation
 * 2. GET /api/sightings/mine — List current citizen's own submitted sightings
 * 3. GET /api/sightings/:id — View single sighting (reporter or authorized police/admin)
 * 4. PATCH /api/sightings/:id/review — Update review status (police/admin only)
 * 5. GET /api/sightings/case/:caseId — View all sightings for an active case
 */

const sightingService = require("../services/sightingService");

/**
 * @desc    Submit a citizen sighting report for an active missing child case
 * @route   POST /api/sightings
 * @access  Private (Citizen, Parent, Police, NGO, Admin)
 */
exports.submitSighting = async (req, res, next) => {
  try {
    const {
      caseId,
      description,
      safetyConfirmed,
      location,
      appearance,
      safetyState,
      observedAt
    } = req.body;

    const result = await sightingService.submitSighting({
      caseId,
      description,
      safetyConfirmed,
      location,
      appearance,
      safetyState,
      observedAt,
      reportingUser: req.user
    });

    console.info(
      `[Audit:SightingSubmitted] timestamp=${new Date().toISOString()} userId=${req.user._id} sightingId=${result.sighting.id} caseId=${caseId} policeNotified=${result.notifications.policeNotified} guardianNotified=${result.notifications.guardianNotified}`
    );

    return res.status(201).json({
      success: true,
      message: result.message,
      sighting: result.sighting,
      notifications: result.notifications
    });
  } catch (error) {
    if (error.code === "SAFETY_CONFIRMATION_REQUIRED" || error.code === "MISSING_DESCRIPTION" || error.code === "INVALID_COORDINATES" || error.code === "INVALID_CASE_ID" || error.code === "FUTURE_OBSERVATION_DATE") {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }

    if (error.code === "CASE_NOT_FOUND" || error.code === "SIGHTING_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }

    if (error.code === "CASE_NOT_ELIGIBLE" || error.code === "CHILD_NOT_ELIGIBLE") {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }

    next(error);
  }
};

/**
 * @desc    Get all sighting reports submitted by the authenticated citizen
 * @route   GET /api/sightings/mine
 * @access  Private (Citizen, Parent, Police, NGO, Admin)
 */
exports.getMySightings = async (req, res, next) => {
  try {
    const sightings = await sightingService.getMySightings(req.user._id, {
      limit: req.query.limit
    });

    return res.status(200).json({
      success: true,
      count: sightings.length,
      sightings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get sighting details by ID (restricted to reporter, police, admin, or case guardian)
 * @route   GET /api/sightings/:id
 * @access  Private (Reporter, Police, Admin, Case Guardian)
 */
exports.getSightingById = async (req, res, next) => {
  try {
    const sighting = await sightingService.getSightingById(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      sighting
    });
  } catch (error) {
    if (error.code === "INVALID_SIGHTING_ID") {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }

    if (error.code === "SIGHTING_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }

    if (error.code === "FORBIDDEN") {
      return res.status(403).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }

    next(error);
  }
};

/**
 * @desc    Review and update sighting status (Law enforcement / Admin only)
 * @route   PATCH /api/sightings/:id/review
 * @access  Private (Police, Admin)
 */
exports.reviewSighting = async (req, res, next) => {
  try {
    const { status, reviewNotes } = req.body;
    const updated = await sightingService.reviewSighting(
      req.params.id,
      { status, reviewNotes },
      req.user
    );

    console.info(
      `[Audit:SightingReviewed] timestamp=${new Date().toISOString()} officerId=${req.user._id} sightingId=${req.params.id} newStatus=${status}`
    );

    return res.status(200).json({
      success: true,
      message: `Sighting report status updated to '${status}'.`,
      sighting: updated
    });
  } catch (error) {
    if (error.code === "INVALID_REVIEW_STATUS" || error.code === "INVALID_SIGHTING_ID") {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }

    if (error.code === "SIGHTING_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }

    next(error);
  }
};

/**
 * @desc    Get all sightings associated with an active missing case
 * @route   GET /api/sightings/case/:caseId
 * @access  Private (Police, Admin, Case Guardian)
 */
exports.getCaseSightings = async (req, res, next) => {
  try {
    const sightings = await sightingService.getCaseSightings(req.params.caseId, req.user);

    return res.status(200).json({
      success: true,
      count: sightings.length,
      sightings
    });
  } catch (error) {
    if (error.code === "INVALID_CASE_ID") {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }

    if (error.code === "CASE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }

    if (error.code === "FORBIDDEN") {
      return res.status(403).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }

    next(error);
  }
};
