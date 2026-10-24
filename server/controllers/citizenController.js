/**
 * GuardianLink — Citizen Operations Controller (Phase 6.9)
 *
 * Handles citizen photo search requests for missing children:
 * 1. Validates submitted image buffer from upload middleware
 * 2. Invokes citizenPhotoSearchService to query AI and resolve active missing cases
 * 3. Records minimal, sanitized audit events (without biometric or image payloads)
 * 4. Dispatches privacy-safe lead responses with clear potential-match disclaimers
 * 5. Handles AI microservice timeouts, outages, and face detection rejections cleanly
 */

const citizenPhotoSearchService = require("../services/citizenPhotoSearchService");
const auditLogService = require("../services/auditLogService");
const {
  AIServiceTimeoutError,
  AIServiceUnavailableError,
  AIServiceValidationError
} = require("../errors/aiErrors");

/**
 * @desc    Submit a spotted child photograph for similarity search against active missing cases
 * @route   POST /api/citizen/search-missing-child
 * @access  Private (Citizen, Parent, Police, NGO, Admin)
 */
exports.searchMissingChild = async (req, res, next) => {
  try {
    // 1. Verify file presence from uploadPhoto middleware
    if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: "A child sighting photograph must be provided under form field 'photo'.",
        code: "MISSING_PHOTO_FILE"
      });
    }

    // 2. Parse optional search constraints
    const rawLimit = req.body?.limit !== undefined ? req.body.limit : req.query?.limit;
    const rawThreshold = req.body?.threshold !== undefined ? req.body.threshold : req.query?.threshold;

    let parsedLimit = undefined;
    if (rawLimit !== undefined && rawLimit !== null && rawLimit !== "") {
      const num = Number(rawLimit);
      if (!Number.isInteger(num) || num < 1 || num > 20) {
        return res.status(400).json({
          success: false,
          message: "Search limit must be an integer between 1 and 20.",
          code: "INVALID_SEARCH_LIMIT"
        });
      }
      parsedLimit = num;
    }

    let parsedThreshold = undefined;
    if (rawThreshold !== undefined && rawThreshold !== null && rawThreshold !== "") {
      const flt = Number(rawThreshold);
      if (!Number.isFinite(flt) || flt < -1.0 || flt > 1.0) {
        return res.status(400).json({
          success: false,
          message: "Similarity threshold must be a float between -1.0 and 1.0.",
          code: "INVALID_SEARCH_THRESHOLD"
        });
      }
      parsedThreshold = flt;
    }

    // 3. Record AI match request audit event
    await auditLogService.recordAuditEvent({
      req,
      action: "AI_MATCH_REQUESTED",
      entityType: "AI_SEARCH",
      outcome: "success",
      metadata: {
        limit: parsedLimit || 5,
        threshold: parsedThreshold || 0.6
      }
    });

    // 4. Execute privacy-safe candidate resolution
    const searchResult = await citizenPhotoSearchService.searchMissingChildPhoto({
      imageBuffer: req.file.buffer,
      mimeType: req.file.mimetype || "image/jpeg",
      filename: req.file.originalname || "sighting.jpg",
      limit: parsedLimit,
      threshold: parsedThreshold
    });

    // 5. Record sanitized operational audit log
    await auditLogService.recordAuditEvent({
      req,
      action: "AI_MATCH_RETURNED",
      entityType: "AI_SEARCH",
      outcome: "success",
      metadata: {
        matchFound: searchResult.matchFound,
        totalCandidates: searchResult.totalCandidates || 0,
        thresholdApplied: searchResult.thresholdApplied
      }
    });

    const requestingUserId = req.user?._id ? req.user._id.toString() : "authenticated_citizen";
    console.info(
      `[Audit:CitizenPhotoSearch] timestamp=${new Date().toISOString()} userId=${requestingUserId} matchFound=${searchResult.matchFound} candidatesCount=${searchResult.totalCandidates} threshold=${searchResult.thresholdApplied}`
    );

    // 6. Deliver sanitized public response
    return res.status(200).json({
      success: true,
      ...searchResult
    });
  } catch (error) {
    // Graceful error mapping for AI service conditions
    if (error instanceof AIServiceTimeoutError || error.code === "AI_SERVICE_TIMEOUT") {
      return res.status(504).json({
        success: false,
        message: "Biometric search service timed out. Please try again in a few moments.",
        code: "AI_SERVICE_TIMEOUT"
      });
    }

    if (error instanceof AIServiceUnavailableError || error.code === "AI_SERVICE_UNAVAILABLE" || error.code === "VECTOR_DB_UNAVAILABLE") {
      return res.status(503).json({
        success: false,
        message: "Biometric identification service is temporarily offline. Please try again later.",
        code: "AI_SERVICE_UNAVAILABLE"
      });
    }

    if (error instanceof AIServiceValidationError || error.code === "NO_FACE_DETECTED" || error.code === "MULTIPLE_FACES_DETECTED") {
      let clientMsg = error.message;
      if (error.code === "NO_FACE_DETECTED") {
        clientMsg = "No human face was detected in the submitted sighting photograph. Please provide a clear, front-facing image.";
      } else if (error.code === "MULTIPLE_FACES_DETECTED") {
        clientMsg = "Multiple faces were detected in the photograph. Please submit an image cropped to a single child.";
      }

      return res.status(422).json({
        success: false,
        message: clientMsg,
        code: error.code || "FACE_VALIDATION_FAILED"
      });
    }

    if (error.code === "INVALID_IMAGE_BUFFER" || error.code === "INVALID_FILE_TYPE") {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }

    next(error);
  }
};
