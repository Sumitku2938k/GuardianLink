/**
 * GuardianLink — Document Storage Service (Phase 18)
 *
 * Manages private on-disk document storage for FIR documents.
 * Crucial Security Guarantees:
 * - Documents are NEVER stored in public static folders or public Cloudinary assets.
 * - Files are stored in a dedicated private directory: server/uploads/private_documents/firs
 * - File access is strictly gated behind authenticated Express streaming routes with RBAC.
 * - Strict path containment check prevents path traversal attacks.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Private storage directory outside public web root
const PRIVATE_STORAGE_DIR = path.resolve(__dirname, "../uploads/private_documents/firs");

/**
 * Ensure storage directory exists with proper permissions
 */
function ensureStorageDirectory() {
  if (!fs.existsSync(PRIVATE_STORAGE_DIR)) {
    fs.mkdirSync(PRIVATE_STORAGE_DIR, { recursive: true, mode: 0o750 });
  }
}

// Initialize directory
ensureStorageDirectory();

/**
 * Generate secure, collision-resistant storage key
 * @param {string} caseId
 * @param {number} version
 * @param {string} extension (e.g. '.pdf')
 * @returns {string} storageKey
 */
function generateStorageKey(caseId, version, extension) {
  const safeExt = extension.startsWith(".") ? extension : `.${extension}`;
  const randomSuffix = crypto.randomBytes(8).toString("hex");
  return `fir_${caseId}_v${version}_${Date.now()}_${randomSuffix}${safeExt}`;
}

/**
 * Resolve absolute path from storage key and verify containment
 * @param {string} storageKey
 * @returns {string} resolved absolute path
 */
function resolveSafePath(storageKey) {
  if (!storageKey || typeof storageKey !== "string") {
    throw new Error("Invalid storage key provided");
  }

  // Prevent directory traversal characters
  const cleanKey = path.basename(storageKey);
  if (cleanKey !== storageKey) {
    throw new Error("Invalid storage key format detected (path traversal attempt)");
  }

  const resolved = path.resolve(PRIVATE_STORAGE_DIR, cleanKey);
  if (!resolved.startsWith(PRIVATE_STORAGE_DIR)) {
    throw new Error("Access denied: path traversal boundary violation");
  }

  return resolved;
}

/**
 * Save document buffer to private disk storage
 * @param {Buffer} buffer
 * @param {string} storageKey
 * @returns {Promise<{ storageKey: string, absolutePath: string, fileSizeBytes: number }>}
 */
async function saveDocument(buffer, storageKey) {
  ensureStorageDirectory();
  const filePath = resolveSafePath(storageKey);

  await fs.promises.writeFile(filePath, buffer, { mode: 0o640 });

  return {
    storageKey,
    absolutePath: filePath,
    fileSizeBytes: buffer.length
  };
}

/**
 * Check if a document file exists
 * @param {string} storageKey
 * @returns {boolean}
 */
function documentExists(storageKey) {
  try {
    const filePath = resolveSafePath(storageKey);
    return fs.existsSync(filePath);
  } catch (err) {
    return false;
  }
}

/**
 * Get a readable file stream for document retrieval
 * @param {string} storageKey
 * @returns {fs.ReadStream}
 */
function getDocumentReadStream(storageKey) {
  const filePath = resolveSafePath(storageKey);
  if (!fs.existsSync(filePath)) {
    const error = new Error("Document not found in storage archive");
    error.code = "ENOENT";
    error.status = 404;
    throw error;
  }
  return fs.createReadStream(filePath);
}

/**
 * Get file stats (size, modified date)
 * @param {string} storageKey
 * @returns {Promise<fs.Stats>}
 */
async function getDocumentStats(storageKey) {
  const filePath = resolveSafePath(storageKey);
  return await fs.promises.stat(filePath);
}

/**
 * Delete a document from storage
 * @param {string} storageKey
 * @returns {Promise<boolean>}
 */
async function deleteDocument(storageKey) {
  try {
    const filePath = resolveSafePath(storageKey);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}

module.exports = {
  PRIVATE_STORAGE_DIR,
  ensureStorageDirectory,
  generateStorageKey,
  resolveSafePath,
  saveDocument,
  documentExists,
  getDocumentReadStream,
  getDocumentStats,
  deleteDocument
};

