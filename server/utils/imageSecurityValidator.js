/**
 * GuardianLink — Centralized Image Security & Content Inspection Validator (Phase 13)
 *
 * Provides deep, dependency-free binary header validation for untrusted image uploads:
 * 1. Magic byte file signature inspection (strictly JPEG, PNG, WebP)
 * 2. Independent file extension normalization and binary format consistency check
 * 3. Declared MIME type verification (prevents header spoofing)
 * 4. Image dimension and pixel-count extraction (prevents decompression bombs)
 * 5. Animated image detection and rejection (multi-frame WebP)
 * 6. Minimum/maximum size and corrupted header rejections
 */

const path = require("path");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MIN_FILE_SIZE = 32; // Minimum bytes required for signature inspection
const MAX_DIMENSION = 4096; // 4096 px max width or height
const MIN_DIMENSION = 16; // 16 px min width or height
const MAX_TOTAL_PIXELS = 16 * 1024 * 1024; // 16,777,216 pixels (~16 Megapixels)

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

class ImageSecurityError extends Error {
  constructor(message, code = "INVALID_IMAGE", status = 400) {
    super(message);
    this.name = "ImageSecurityError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Normalizes a file extension into canonical format.
 * @param {string} extOrFilename
 * @returns {string} normalized extension with leading dot (e.g. '.jpg', '.jpeg', '.png', '.webp')
 */
const normalizeExtension = (extOrFilename) => {
  if (!extOrFilename || typeof extOrFilename !== "string") return "";
  const ext = path.extname(extOrFilename.trim()).toLowerCase();
  return ext;
};

/**
 * Maps a file extension to its expected image format.
 * @param {string} ext
 * @returns {string|null}
 */
const extensionToFormat = (ext) => {
  const normalized = ext.startsWith(".") ? ext : `.${ext}`;
  switch (normalized.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "jpeg";
    case ".png":
      return "png";
    case ".webp":
      return "webp";
    default:
      return null;
  }
};

/**
 * Inspects a PNG buffer to extract dimensions from the IHDR chunk.
 * @param {Buffer} buffer
 * @returns {{ format: string, mimeType: string, width: number, height: number }}
 */
const inspectPng = (buffer) => {
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A (8 bytes)
  // IHDR chunk: 4 bytes length, 4 bytes 'IHDR' (49 48 44 52), 4 bytes width, 4 bytes height
  if (buffer.length < 24) {
    throw new ImageSecurityError("Corrupted PNG image: file truncated before IHDR header.", "IMAGE_CORRUPTED");
  }

  const ihdrMarker = buffer.slice(12, 16).toString("ascii");
  if (ihdrMarker !== "IHDR") {
    throw new ImageSecurityError("Corrupted PNG image: missing IHDR header.", "IMAGE_CORRUPTED");
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  return {
    format: "png",
    mimeType: "image/png",
    width,
    height
  };
};

/**
 * Inspects a JPEG buffer to extract dimensions from the SOF marker.
 * @param {Buffer} buffer
 * @returns {{ format: string, mimeType: string, width: number, height: number }}
 */
const inspectJpeg = (buffer) => {
  let offset = 2; // Skip SOI (FF D8)
  const len = buffer.length;

  while (offset < len - 4) {
    // Scan for marker FF
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }

    const marker = buffer[offset + 1];

    // EOI (End of Image) or SOS (Start of Scan)
    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    // Check for SOF markers (Start of Frame) containing dimensions:
    // Baseline (C0), Extended (C1), Progressive (C2), Lossless (C3),
    // Differential (C5, C6, C7), Extended Arithmetic (C9, CA, CB, CD, CE, CF)
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isSof && offset + 9 <= len) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return {
        format: "jpeg",
        mimeType: "image/jpeg",
        width,
        height
      };
    }

    // Skip variable-length marker segment
    if (offset + 4 > len) break;
    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2) {
      break; // Invalid segment length
    }
    offset += 2 + segmentLength;
  }

  throw new ImageSecurityError("Malformed JPEG image: missing or corrupted frame header.", "IMAGE_CORRUPTED");
};

/**
 * Inspects a WebP buffer to extract dimensions and check for animated frames.
 * @param {Buffer} buffer
 * @returns {{ format: string, mimeType: string, width: number, height: number, isAnimated: boolean }}
 */
const inspectWebp = (buffer) => {
  if (buffer.length < 16) {
    throw new ImageSecurityError("Corrupted WebP image: truncated header.", "IMAGE_CORRUPTED");
  }

  const chunkType = buffer.slice(12, 16).toString("ascii");

  // VP8 (Lossy)
  if (chunkType === "VP8 ") {
    if (buffer.length < 30) {
      throw new ImageSecurityError("Corrupted WebP VP8 image: truncated frame.", "IMAGE_CORRUPTED");
    }
    // Keyframe code: 9D 01 2A at offsets 23..25
    const width = buffer.readUInt16LE(26) & 0x3fff;
    const height = buffer.readUInt16LE(28) & 0x3fff;
    return {
      format: "webp",
      mimeType: "image/webp",
      width,
      height,
      isAnimated: false
    };
  }

  // VP8L (Lossless)
  if (chunkType === "VP8L") {
    if (buffer.length < 25) {
      throw new ImageSecurityError("Corrupted WebP VP8L image: truncated frame.", "IMAGE_CORRUPTED");
    }
    const b0 = buffer[21];
    const b1 = buffer[22];
    const b2 = buffer[23];
    const b3 = buffer[24];
    const width = 1 + (((b1 & 0x3f) << 8) | b0);
    const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    return {
      format: "webp",
      mimeType: "image/webp",
      width,
      height,
      isAnimated: false
    };
  }

  // VP8X (Extended format)
  if (chunkType === "VP8X") {
    if (buffer.length < 30) {
      throw new ImageSecurityError("Corrupted WebP VP8X image: truncated header.", "IMAGE_CORRUPTED");
    }
    const flags = buffer.readUInt8(20);
    const isAnimated = Boolean(flags & 0x02); // Bit 1: Animation flag

    if (isAnimated) {
      throw new ImageSecurityError(
        "Animated or multi-frame WebP images are not permitted.",
        "ANIMATED_IMAGE_REJECTED"
      );
    }

    const width = 1 + buffer.readUIntLE(24, 3);
    const height = 1 + buffer.readUIntLE(27, 3);

    return {
      format: "webp",
      mimeType: "image/webp",
      width,
      height,
      isAnimated: false
    };
  }

  throw new ImageSecurityError(`Unsupported or malformed WebP chunk type: '${chunkType}'.`, "IMAGE_CORRUPTED");
};

/**
 * Validates untrusted image upload buffer:
 * - Checks file size bounds.
 * - Detects true file format from binary magic bytes.
 * - Parses and validates image dimensions and total pixel count.
 * - Confirms consistency with declared MIME type and file extension.
 * - Rejects decompression bombs, corrupted data, and animated files.
 *
 * @param {Buffer} buffer - In-memory image buffer
 * @param {Object} [options]
 * @param {string} [options.filename] - Original filename from client
 * @param {string} [options.declaredMime] - Content-Type declared by client
 * @param {number} [options.maxSize] - Maximum allowed byte size (default: 5MB)
 * @returns {{
 *   valid: boolean,
 *   format: string,
 *   mimeType: string,
 *   width: number,
 *   height: number,
 *   bytes: number,
 *   pixelCount: number
 * }}
 */
const validateImageBuffer = (buffer, options = {}) => {
  const { filename, declaredMime, maxSize = MAX_FILE_SIZE } = options;

  // 1. Buffer existence and minimum size check
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new ImageSecurityError("Invalid image buffer: buffer must be provided.", "INVALID_IMAGE_BUFFER");
  }

  if (buffer.length === 0) {
    throw new ImageSecurityError("Image file is empty (0 bytes).", "IMAGE_EMPTY");
  }

  if (buffer.length < MIN_FILE_SIZE) {
    throw new ImageSecurityError(
      `Image file too small (${buffer.length} bytes). Must be at least ${MIN_FILE_SIZE} bytes.`,
      "IMAGE_TOO_SMALL"
    );
  }

  // 2. Maximum file size check
  if (buffer.length > maxSize) {
    throw new ImageSecurityError(
      `Image size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum permitted limit of ${(maxSize / (1024 * 1024)).toFixed(2)} MB.`,
      "IMAGE_TOO_LARGE"
    );
  }

  // 3. Binary Magic Byte Inspection
  let detected = null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    detected = inspectJpeg(buffer);
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  else if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    detected = inspectPng(buffer);
  }
  // WebP: RIFF (bytes 0..3) + WEBP (bytes 8..11)
  else if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    detected = inspectWebp(buffer);
  } else {
    throw new ImageSecurityError(
      "Invalid file signature. File does not match supported image formats (JPEG, PNG, WebP).",
      "INVALID_FILE_SIGNATURE"
    );
  }

  const { format, mimeType, width, height } = detected;
  const pixelCount = width * height;

  // 4. Dimension & Pixel Count Boundary Validation (Decompression Bomb Protection)
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new ImageSecurityError(
      `Invalid image dimensions (${width}x${height}). Dimensions must be positive integers.`,
      "INVALID_DIMENSIONS"
    );
  }

  if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
    throw new ImageSecurityError(
      `Image dimensions (${width}x${height}) are too small. Minimum resolution is ${MIN_DIMENSION}x${MIN_DIMENSION} pixels.`,
      "IMAGE_DIMENSIONS_TOO_SMALL"
    );
  }

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new ImageSecurityError(
      `Image dimensions (${width}x${height}) exceed maximum allowed limit of ${MAX_DIMENSION}x${MAX_DIMENSION} pixels.`,
      "IMAGE_DIMENSIONS_EXCEEDED"
    );
  }

  if (pixelCount > MAX_TOTAL_PIXELS) {
    throw new ImageSecurityError(
      `Image total pixel count (${pixelCount}) exceeds maximum safety limit of ${MAX_TOTAL_PIXELS} pixels (decompression bomb protection).`,
      "IMAGE_PIXELS_EXCEEDED"
    );
  }

  // 5. Cross-check with declared filename extension (if provided)
  if (filename) {
    const ext = normalizeExtension(filename);
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      throw new ImageSecurityError(
        `Unsupported file extension '${ext}'. Allowed extensions: ${ALLOWED_EXTENSIONS.join(", ")}.`,
        "UNSUPPORTED_EXTENSION"
      );
    }

    const expectedFormat = extensionToFormat(ext);
    if (expectedFormat !== format) {
      throw new ImageSecurityError(
        `File extension '${ext}' does not match detected image format '${format}'.`,
        "MIME_EXTENSION_MISMATCH"
      );
    }
  }

  // 6. Cross-check with declared Content-Type header (if provided)
  if (declaredMime) {
    const normDeclared = declaredMime.toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.includes(normDeclared)) {
      throw new ImageSecurityError(
        `Unsupported declared MIME type '${normDeclared}'.`,
        "UNSUPPORTED_MIME_TYPE"
      );
    }

    if (normDeclared !== mimeType) {
      throw new ImageSecurityError(
        `Declared MIME type '${normDeclared}' does not match actual image binary signature ('${mimeType}').`,
        "MIME_HEADER_MISMATCH"
      );
    }
  }

  return {
    valid: true,
    format,
    mimeType,
    width,
    height,
    bytes: buffer.length,
    pixelCount
  };
};

module.exports = {
  validateImageBuffer,
  ImageSecurityError,
  MAX_FILE_SIZE,
  MIN_FILE_SIZE,
  MAX_DIMENSION,
  MIN_DIMENSION,
  MAX_TOTAL_PIXELS,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  normalizeExtension,
  extensionToFormat
};
