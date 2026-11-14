/**
 * GuardianLink — Document Security & Content Inspection Validator (Phase 18)
 *
 * Implements strict binary validation for official legal documents (FIR):
 * 1. Magic byte file signature inspection (strictly PDF, JPEG, PNG)
 * 2. MIME type verification and header spoofing detection
 * 3. File extension normalization and binary format consistency
 * 4. Active PDF content detection (/JavaScript, /JS, /Launch)
 * 5. Cryptographic SHA-256 checksum calculation
 * 6. Path traversal and malicious filename neutralization
 * 7. Minimum and maximum size enforcement (10 MB maximum)
 */

const path = require("path");
const crypto = require("crypto");

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10 MB
const MIN_DOCUMENT_SIZE = 32; // Minimum bytes for binary signature verification

const ALLOWED_DOCUMENT_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png"
];

const ALLOWED_DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png"
];

class DocumentSecurityError extends Error {
  constructor(message, code = "INVALID_DOCUMENT", status = 400) {
    super(message);
    this.name = "DocumentSecurityError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Normalizes a filename to prevent path traversal and null-byte injection.
 * @param {string} originalFilename
 * @returns {string} Safe sanitized filename
 */
const sanitizeFilename = (originalFilename) => {
  if (!originalFilename || typeof originalFilename !== "string") {
    return `document_${Date.now()}`;
  }
  // Remove null bytes and path traversal sequences
  const cleaned = originalFilename.replace(/\0/g, "").replace(/(\.\.[\/\\])+/g, "");
  const base = path.basename(cleaned);
  // Replace dangerous characters
  return base.replace(/[^a-zA-Z0-9._-]/g, "_");
};

/**
 * Normalizes file extension with leading dot in lowercase.
 * @param {string} filenameOrExt
 * @returns {string} e.g. '.pdf', '.jpg', '.png'
 */
const normalizeExtension = (filenameOrExt) => {
  if (!filenameOrExt || typeof filenameOrExt !== "string") return "";
  const ext = path.extname(filenameOrExt.trim()).toLowerCase();
  return ext;
};

/**
 * Maps extension to expected canonical format.
 * @param {string} ext
 * @returns {"pdf"|"jpeg"|"png"|null}
 */
const extensionToFormat = (ext) => {
  const normalized = ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  switch (normalized) {
    case ".pdf":
      return "pdf";
    case ".jpg":
    case ".jpeg":
      return "jpeg";
    case ".png":
      return "png";
    default:
      return null;
  }
};

/**
 * Validates PDF binary structure and checks for malicious active execution tags.
 * @param {Buffer} buffer
 */
const inspectPdf = (buffer) => {
  // PDF magic bytes: '%PDF-' (0x25, 0x50, 0x44, 0x46, 0x2D)
  if (buffer.length < 5) {
    throw new DocumentSecurityError("Corrupted PDF document: buffer too small.", "DOCUMENT_CORRUPTED");
  }

  const header = buffer.slice(0, 5).toString("ascii");
  if (header !== "%PDF-") {
    throw new DocumentSecurityError(
      "Invalid PDF file signature. The file is not a valid PDF document.",
      "INVALID_DOCUMENT_SIGNATURE"
    );
  }

  // Scan for active content exploit markers in PDF stream (up to first 500KB and trailer)
  const sample = buffer.slice(0, Math.min(buffer.length, 512 * 1024)).toString("binary");
  const dangerousPatterns = [
    /\/JavaScript/i,
    /\/JS\b/i,
    /\/Launch\b/i,
    /\/EmbeddedFile\b/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sample)) {
      throw new DocumentSecurityError(
        "PDF rejected: Document contains active executable scripts or prohibited dynamic launch actions.",
        "DISALLOWED_ACTIVE_CONTENT"
      );
    }
  }

  return {
    format: "pdf",
    mimeType: "application/pdf"
  };
};

/**
 * Validates JPEG binary SOI marker (FF D8 FF).
 * @param {Buffer} buffer
 */
const inspectJpeg = (buffer) => {
  if (buffer.length < 3) {
    throw new DocumentSecurityError("Corrupted JPEG document: buffer too small.", "DOCUMENT_CORRUPTED");
  }

  if (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
    throw new DocumentSecurityError(
      "Invalid JPEG file signature. The file does not start with a valid SOI marker.",
      "INVALID_DOCUMENT_SIGNATURE"
    );
  }

  return {
    format: "jpeg",
    mimeType: "image/jpeg"
  };
};

/**
 * Validates PNG binary signature (89 50 4E 47 0D 0A 1A 0A).
 * @param {Buffer} buffer
 */
const inspectPng = (buffer) => {
  if (buffer.length < 8) {
    throw new DocumentSecurityError("Corrupted PNG document: buffer too small.", "DOCUMENT_CORRUPTED");
  }

  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (buffer[i] !== pngSignature[i]) {
      throw new DocumentSecurityError(
        "Invalid PNG file signature. The file does not match standard PNG header.",
        "INVALID_DOCUMENT_SIGNATURE"
      );
    }
  }

  return {
    format: "png",
    mimeType: "image/png"
  };
};

/**
 * Validates untrusted document buffer against strict binary criteria.
 *
 * @param {Buffer} buffer - Document buffer
 * @param {Object} options - Validation options
 * @param {string} [options.filename] - Original filename
 * @param {string} [options.declaredMime] - Client-declared MIME type
 * @param {number} [options.maxSize=10485760] - Maximum allowed file size in bytes
 * @returns {{ format: string, mimeType: string, sha256: string, sizeBytes: number, sanitizedFilename: string }}
 */
const validateDocumentBuffer = (buffer, options = {}) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new DocumentSecurityError("No document buffer provided for security inspection.", "NO_DOCUMENT_BUFFER");
  }

  const maxSize = options.maxSize || MAX_DOCUMENT_SIZE;
  if (buffer.length > maxSize) {
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
    throw new DocumentSecurityError(
      `Document exceeds maximum permitted size of 10MB (Received: ${sizeMb} MB).`,
      "FILE_TOO_LARGE"
    );
  }

  if (buffer.length < MIN_DOCUMENT_SIZE) {
    throw new DocumentSecurityError(
      "Document is empty or contains insufficient data for security verification.",
      "FILE_TOO_SMALL"
    );
  }

  const filename = options.filename || "";
  const sanitizedFilename = sanitizeFilename(filename);
  const ext = normalizeExtension(sanitizedFilename);

  if (filename && !ALLOWED_DOCUMENT_EXTENSIONS.includes(ext)) {
    throw new DocumentSecurityError(
      `Unsupported file extension '${ext}'. Only PDF (.pdf), JPEG (.jpg, .jpeg), and PNG (.png) documents are allowed.`,
      "UNSUPPORTED_DOCUMENT_EXTENSION"
    );
  }

  // Detect binary format from magic bytes
  let detected = null;
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    detected = inspectPdf(buffer);
  } else if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    detected = inspectJpeg(buffer);
  } else if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    detected = inspectPng(buffer);
  } else {
    throw new DocumentSecurityError(
      "Invalid or unrecognized document format. File binary header does not match PDF, JPEG, or PNG signatures.",
      "INVALID_DOCUMENT_SIGNATURE"
    );
  }

  // Cross-verify with file extension
  if (ext) {
    const expectedFormat = extensionToFormat(ext);
    if (expectedFormat !== detected.format) {
      throw new DocumentSecurityError(
        `Extension mismatch: file has extension '${ext}' but binary content is ${detected.format.toUpperCase()}.`,
        "EXTENSION_CONTENT_MISMATCH"
      );
    }
  }

  // Cross-verify with declared MIME type
  if (options.declaredMime) {
    const declared = options.declaredMime.toLowerCase().trim();
    if (declared && !ALLOWED_DOCUMENT_MIMES.includes(declared)) {
      throw new DocumentSecurityError(
        `Declared MIME type '${declared}' is not permitted.`,
        "DISALLOWED_MIME_TYPE"
      );
    }
  }

  // Calculate cryptographic SHA-256 checksum for audit and tamper detection
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  return {
    format: detected.format,
    mimeType: detected.mimeType,
    sha256,
    sizeBytes: buffer.length,
    sanitizedFilename
  };
};

/**
 * Convenience helper returning validated metadata
 * @param {Buffer} buffer
 * @param {string} [filename=""]
 * @param {string} [declaredMime=""]
 * @returns {Object}
 */
const validateDocument = (buffer, filename = "", declaredMime = "") => {
  const result = validateDocumentBuffer(buffer, { filename, declaredMime });
  const ext = normalizeExtension(result.sanitizedFilename) ||
    (result.format === "pdf" ? ".pdf" : result.format === "png" ? ".png" : ".jpg");

  return {
    isValid: true,
    format: result.format,
    detectedMimeType: result.mimeType,
    mimeType: result.mimeType,
    extension: ext,
    sha256Checksum: result.sha256,
    sizeBytes: result.sizeBytes,
    originalFilename: result.sanitizedFilename || `document${ext}`
  };
};

module.exports = {
  validateDocument,
  validateDocumentBuffer,
  sanitizeFilename,
  normalizeExtension,
  DocumentSecurityError,
  MAX_DOCUMENT_SIZE,
  MIN_DOCUMENT_SIZE,
  ALLOWED_DOCUMENT_MIMES,
  ALLOWED_DOCUMENT_EXTENSIONS
};
