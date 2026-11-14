/**
 * GuardianLink — FIR Controller (Phase 18)
 *
 * Handles HTTP requests for the FIR module:
 * - Parent FIR filing and document uploads
 * - Parent FIR document replacement/resubmission
 * - Police verification and rejection workflows
 * - Scoped FIR queries with IDOR protection
 * - Secure document streaming with strict security headers
 */

const firService = require("../services/firService");
const { DocumentSecurityError } = require("../utils/documentSecurityValidator");

/**
 * Standardized error responder for FIR operations
 */
function handleFIRError(err, res) {
  if (err instanceof firService.FIRServiceError) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
      code: err.code || "FIR_ERROR"
    });
  }

  if (err instanceof DocumentSecurityError) {
    return res.status(400).json({
      success: false,
      message: err.message,
      code: err.code || "DOCUMENT_SECURITY_ERROR"
    });
  }

  console.error("[FIRController] Unexpected error:", err);
  return res.status(500).json({
    success: false,
    message: err.message || "An unexpected error occurred while processing the FIR request",
    code: "INTERNAL_ERROR"
  });
}

/**
 * 1. Submit official FIR with document (Parent or Admin)
 * POST /api/firs/:caseId
 */
async function submitFIR(req, res) {
  try {
    const { caseId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "FIR document file is required (PDF, JPEG, or PNG)",
        code: "FILE_REQUIRED"
      });
    }

    const firData = {
      firNumber: req.body.firNumber,
      policeStation: req.body.policeStation,
      district: req.body.district,
      state: req.body.state,
      filingDate: req.body.filingDate,
      incidentDate: req.body.incidentDate,
      sections: req.body.sections,
      complainantName: req.body.complainantName,
      relationship: req.body.relationship,
      contactPhone: req.body.contactPhone
    };

    const result = await firService.createFIR({
      caseId,
      firData,
      fileBuffer: file.buffer,
      fileMeta: {
        originalname: file.originalname,
        mimetype: file.mimetype
      },
      user: req.user,
      req
    });

    return res.status(201).json({
      success: true,
      message: "Official FIR successfully filed and submitted for police verification",
      data: result
    });
  } catch (err) {
    return handleFIRError(err, res);
  }
}

/**
 * 2. Replace FIR document with newer version (Parent or Admin)
 * POST /api/firs/:firId/documents/replace
 */
async function replaceDocument(req, res) {
  try {
    const { firId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Replacement FIR document file is required",
        code: "FILE_REQUIRED"
      });
    }

    const replacementReason = req.body.replacementReason || "Updated document version uploaded";

    const result = await firService.replaceDocument({
      firId,
      fileBuffer: file.buffer,
      fileMeta: {
        originalname: file.originalname,
        mimetype: file.mimetype
      },
      replacementReason,
      user: req.user,
      req
    });

    return res.status(200).json({
      success: true,
      message: "FIR document replaced successfully. Status updated to pending review.",
      data: result
    });
  } catch (err) {
    return handleFIRError(err, res);
  }
}

/**
 * 3. Verify FIR (Police or Admin only)
 * PATCH /api/firs/:firId/verify
 */
async function verifyFIR(req, res) {
  try {
    const { firId } = req.params;
    const { reviewNotes } = req.body;

    const result = await firService.verifyFIR({
      firId,
      officerUser: req.user,
      reviewNotes,
      req
    });

    return res.status(200).json({
      success: true,
      message: "FIR officially verified and recorded",
      data: result
    });
  } catch (err) {
    return handleFIRError(err, res);
  }
}

/**
 * 4. Reject FIR (Police or Admin only)
 * PATCH /api/firs/:firId/reject
 */
async function rejectFIR(req, res) {
  try {
    const { firId } = req.params;
    const { reviewNotes, rejectionReason } = req.body;

    const result = await firService.rejectFIR({
      firId,
      officerUser: req.user,
      reviewNotes,
      rejectionReason,
      req
    });

    return res.status(200).json({
      success: true,
      message: "FIR rejected with officer review notes",
      data: result
    });
  } catch (err) {
    return handleFIRError(err, res);
  }
}

/**
 * 5. Get FIR by Missing Case ID
 * GET /api/firs/case/:caseId
 */
async function getFIRByCaseId(req, res) {
  try {
    const { caseId } = req.params;
    const result = await firService.getFIRByCaseId({
      caseId,
      user: req.user
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    return handleFIRError(err, res);
  }
}

/**
 * 6. Get FIR by FIR ID
 * GET /api/firs/:firId
 */
async function getFIRById(req, res) {
  try {
    const { firId } = req.params;
    const result = await firService.getFIRById({
      firId,
      user: req.user
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    return handleFIRError(err, res);
  }
}

/**
 * 7. List pending FIRs (Police and Admin only)
 * GET /api/firs/pending
 */
async function getPendingFIRs(req, res) {
  try {
    const result = await firService.getPendingFIRs({
      user: req.user,
      query: req.query
    });

    return res.status(200).json({
      success: true,
      data: result.firs,
      pagination: result.pagination
    });
  } catch (err) {
    return handleFIRError(err, res);
  }
}

/**
 * 8. Stream FIR document (download or inline preview)
 * GET /api/firs/:firId/documents/:version/download
 * GET /api/firs/:firId/documents/:version/preview
 */
async function streamDocument(req, res, isPreview = false) {
  try {
    const { firId, version } = req.params;

    const { readStream, mimeType, originalFilename, fileSizeBytes } = await firService.getDocumentStream({
      firId,
      version: version === "preview" || version === "download" ? "latest" : version,
      user: req.user,
      req
    });

    // Clean filename for Content-Disposition header
    const safeFilename = originalFilename.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const dispositionType = isPreview ? "inline" : "attachment";

    // Strict security headers for document delivery
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", fileSizeBytes);
    res.setHeader("Content-Disposition", `${dispositionType}; filename="${safeFilename}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Content-Security-Policy", "sandbox");

    readStream.pipe(res);
  } catch (err) {
    return handleFIRError(err, res);
  }
}

module.exports = {
  submitFIR,
  replaceDocument,
  verifyFIR,
  rejectFIR,
  getFIRByCaseId,
  getFIRById,
  getPendingFIRs,
  previewDocument: (req, res) => streamDocument(req, res, true),
  downloadDocument: (req, res) => streamDocument(req, res, false)
};

