const multer = require("multer");
const path = require("path");

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mime = (file.mimetype || "").toLowerCase();

  if (!ALLOWED_MIME_TYPES.includes(mime) || !ALLOWED_EXTENSIONS.includes(ext)) {
    const error = new Error("Invalid file format. Only JPEG, PNG, and WebP images are permitted.");
    error.code = "INVALID_FILE_TYPE";
    error.status = 400;
    return cb(error, false);
  }

  cb(null, true);
};

const multerInstance = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter
});

/**
 * Middleware handling single image upload on 'photo' field with clean error responses
 */
const uploadPhoto = (req, res, next) => {
  // If request is application/json or does not have multipart boundary, let standard body parsers handle it
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    return next();
  }

  multerInstance.single("photo")(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Image file exceeds the 5MB size limit.",
          code: "IMAGE_TOO_LARGE"
        });
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
          success: false,
          message: `Unexpected file field: '${err.field}'. Expected 'photo'.`,
          code: "UNEXPECTED_FILE_FIELD"
        });
      }
      return res.status(400).json({
        success: false,
        message: `File upload error: ${err.message}`,
        code: err.code || "UPLOAD_ERROR"
      });
    }

    if (err.code === "INVALID_FILE_TYPE") {
      return res.status(400).json({
        success: false,
        message: err.message,
        code: "INVALID_FILE_TYPE"
      });
    }

    return res.status(err.status || 400).json({
      success: false,
      message: err.message || "Failed to process image file upload.",
      code: err.code || "FILE_UPLOAD_FAILED"
    });
  });
};

module.exports = {
  uploadPhoto,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE
};
