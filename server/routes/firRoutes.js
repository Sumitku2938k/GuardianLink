/**
 * GuardianLink — FIR Routes (Phase 18)
 *
 * Implements route definitions, authentication, authorization,
 * and multipart document upload handling for the FIR module.
 */

const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();

const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const firController = require("../controllers/firController");

// Memory storage for preliminary upload before security inspection
const storage = multer.memoryStorage();

const firFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const allowedExts = [".pdf", ".jpg", ".jpeg", ".png"];
  const allowedMimes = ["application/pdf", "image/jpeg", "image/png"];

  if (!allowedExts.includes(ext) || !allowedMimes.includes(file.mimetype.toLowerCase())) {
    const error = new Error("Invalid document format. Only PDF, JPEG, and PNG files are permitted.");
    error.code = "INVALID_DOCUMENT_FORMAT";
    error.status = 400;
    return cb(error, false);
  }
  cb(null, true);
};

const uploadDocument = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  },
  fileFilter: firFileFilter
}).single("document");

/**
 * Clean wrapper for multer upload handling
 */
const handleUpload = (req, res, next) => {
  uploadDocument(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "FIR document exceeds the maximum 10MB size limit.",
            code: "DOCUMENT_TOO_LARGE"
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
          code: err.code
        });
      }
      return res.status(err.status || 400).json({
        success: false,
        message: err.message || "Failed to process document upload",
        code: err.code || "UPLOAD_ERROR"
      });
    }
    next();
  });
};

// All FIR routes require authentication
router.use(authenticate);

// 1. Pending verification queue for police/admin (Must precede /:caseId /:firId)
router.get("/pending", authorize("police", "admin"), firController.getPendingFIRs);

// 2. Fetch FIR by Missing Case ID
router.get("/case/:caseId", authorize("parent", "police", "ngo", "admin"), firController.getFIRByCaseId);

// 3. Submit official FIR for a case (Parent or Admin)
router.post("/:caseId", authorize("parent", "admin"), handleUpload, firController.submitFIR);

// 4. Fetch FIR details by FIR ID
router.get("/:firId", authorize("parent", "police", "ngo", "admin"), firController.getFIRById);

// 5. Document replacement / resubmission (Parent or Admin)
router.post("/:firId/documents/replace", authorize("parent", "admin"), handleUpload, firController.replaceDocument);

// 6. Police Verification & Rejection
router.patch("/:firId/verify", authorize("police", "admin"), firController.verifyFIR);
router.patch("/:firId/reject", authorize("police", "admin"), firController.rejectFIR);

// 7. Secure Document Preview & Download (Citizen and NGO blocked)
router.get("/:firId/documents/:version/preview", authorize("parent", "police", "admin"), firController.previewDocument);
router.get("/:firId/documents/:version/download", authorize("parent", "police", "admin"), firController.downloadDocument);

module.exports = router;

