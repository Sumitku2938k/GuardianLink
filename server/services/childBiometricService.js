/**
 * GuardianLink — Child Biometric Enrollment Service (Phase 6.8)
 *
 * Coordinates child reference photo biometric enrollment:
 * 1. Safe SSRF-protected Cloudinary image retrieval or in-memory upload reuse
 * 2. Atomic state machine transitions guarding against concurrent/duplicate enrollment
 * 3. Idempotent AI service communication via deterministic UUIDv5 Qdrant points
 * 4. Failure-safe persistence: AI enrollment failures NEVER delete Child or Cloudinary records
 * 5. Explicit error classification (retryable vs permanent) and reconciliation logic
 */

const { URL } = require("url");
const Child = require("../models/Child");
const aiService = require("./aiService");
const {
  AIServiceError,
  AIServiceTimeoutError,
  AIServiceUnavailableError,
  AIServiceValidationError,
  AIServiceAuthenticationError,
  AIServiceConfigError,
  AIServiceResponseError
} = require("../errors/aiErrors");

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const DOWNLOAD_TIMEOUT_MS = 5000; // 5 seconds
const STALE_LOCK_MS = 60000; // 60 seconds

// Hostname whitelist for SSRF prevention
const ALLOWED_CLOUDINARY_HOSTS = ["res.cloudinary.com", "api.cloudinary.com"];

/**
 * Checks whether a given hostname is an authorized Cloudinary domain.
 * Strictly prevents SSRF against localhost, private IP subnets, or untrusted external hosts.
 *
 * @param {string} hostname
 * @returns {boolean}
 */
const isAuthorizedImageHost = (hostname) => {
  if (!hostname || typeof hostname !== "string") return false;
  const lower = hostname.toLowerCase().trim();

  // Reject local/internal addresses
  if (
    lower === "localhost" ||
    lower === "127.0.0.1" ||
    lower === "::1" ||
    lower.startsWith("10.") ||
    lower.startsWith("192.168.") ||
    lower.startsWith("169.254.") ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(lower)
  ) {
    return false;
  }

  if (ALLOWED_CLOUDINARY_HOSTS.includes(lower)) return true;
  if (lower.endsWith(".cloudinary.com")) return true;

  return false;
};

/**
 * Safely downloads a child photograph from Cloudinary with SSRF protection,
 * bounded timeouts, and strict content-type and size checks.
 *
 * @param {string} photoUrl
 * @param {Object} [options]
 * @param {number} [options.timeoutMs=5000]
 * @param {number} [options.maxBytes=5242880]
 * @param {Function} [options.fetchFn]
 * @returns {Promise<{ buffer: Buffer, mimeType: string }>}
 */
const downloadChildPhoto = async (photoUrl, options = {}) => {
  if (!photoUrl || typeof photoUrl !== "string" || !photoUrl.trim()) {
    const err = new Error("Invalid or empty photo URL provided.");
    err.code = "INVALID_PHOTO_URL";
    throw err;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(photoUrl.trim());
  } catch (parseErr) {
    const err = new Error("Malformed photo URL format.");
    err.code = "MALFORMED_PHOTO_URL";
    throw err;
  }

  if (parsedUrl.protocol !== "https:") {
    const err = new Error("Insecure image URL protocol. Only HTTPS URLs are permitted.");
    err.code = "INSECURE_PHOTO_URL";
    throw err;
  }

  if (!isAuthorizedImageHost(parsedUrl.hostname)) {
    const err = new Error(`Image host '${parsedUrl.hostname}' is not authorized. Must be a trusted Cloudinary domain.`);
    err.code = "UNAUTHORIZED_IMAGE_HOST";
    throw err;
  }

  const timeoutMs = options.timeoutMs || DOWNLOAD_TIMEOUT_MS;
  const maxBytes = options.maxBytes || MAX_IMAGE_BYTES;
  const fetchFn = options.fetchFn || globalThis.fetch;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetchFn(parsedUrl.toString(), {
      method: "GET",
      signal: controller.signal
    });
  } catch (networkErr) {
    if (networkErr.name === "AbortError" || controller.signal.aborted) {
      const err = new Error(`Photo download timed out after ${timeoutMs}ms.`);
      err.code = "PHOTO_DOWNLOAD_TIMEOUT";
      throw err;
    }
    const err = new Error(`Failed to download photo from storage: ${networkErr.message}`);
    err.code = "PHOTO_DOWNLOAD_FAILED";
    err.cause = networkErr;
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const err = new Error(`Photo storage responded with HTTP ${response.status}.`);
    err.code = "PHOTO_STORAGE_ERROR";
    err.statusCode = response.status;
    throw err;
  }

  const contentType = (response.headers.get("content-type") || "").toLowerCase().split(";")[0].trim();
  const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedMimes.includes(contentType)) {
    const err = new Error(`Invalid image content type '${contentType}'. Expected JPEG, PNG, or WebP.`);
    err.code = "INVALID_IMAGE_CONTENT_TYPE";
    throw err;
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length === 0) {
    const err = new Error("Downloaded image file is empty (0 bytes).");
    err.code = "EMPTY_IMAGE_FILE";
    throw err;
  }

  if (buffer.length > maxBytes) {
    const err = new Error(`Downloaded image (${buffer.length} bytes) exceeds limit of ${maxBytes} bytes.`);
    err.code = "IMAGE_TOO_LARGE";
    throw err;
  }

  return { buffer, mimeType: contentType };
};

/**
 * Classifies an enrollment failure into terminal vs retryable categories.
 *
 * @param {Error|AIServiceError} error
 * @returns {{
 *   status: 'permanent_failed' | 'retryable_failed',
 *   code: string,
 *   isTerminal: boolean,
 *   message: string
 * }}
 */
const classifyEnrollmentError = (error) => {
  const code = error.code || "UNKNOWN_ERROR";
  const rawMsg = error.message || "Biometric enrollment failed";

  // Terminal failures: photograph itself is unsuitable and must be replaced by parent
  if (
    code === "NO_FACE_DETECTED" ||
    code === "MULTIPLE_FACES_DETECTED" ||
    code === "IMAGE_DECODE_FAILED" ||
    code === "INVALID_FILE_TYPE" ||
    code === "EMPTY_IMAGE_BUFFER" ||
    code === "EMPTY_IMAGE_FILE" ||
    code === "INVALID_IMAGE_INPUT" ||
    code === "INVALID_IMAGE_CONTENT_TYPE" ||
    code === "INVALID_EMBEDDING" ||
    code === "INVALID_VECTOR" ||
    code === "INVALID_CHILD_ID"
  ) {
    let cleanMsg = "Biometric enrollment rejected: ";
    if (code === "NO_FACE_DETECTED") cleanMsg += "No human face was detected in the photograph.";
    else if (code === "MULTIPLE_FACES_DETECTED") cleanMsg += "Multiple faces detected. Please provide a portrait with only one child.";
    else cleanMsg += rawMsg;

    return {
      status: "permanent_failed",
      code,
      isTerminal: true,
      message: cleanMsg
    };
  }

  // Transient / network / retryable failures
  let cleanMsg = "Biometric enrollment pending: temporary service unavailability.";
  if (error instanceof AIServiceTimeoutError || code === "AI_SERVICE_TIMEOUT" || code === "PHOTO_DOWNLOAD_TIMEOUT") {
    cleanMsg = "Biometric enrollment request timed out. Will be retried automatically.";
  } else if (error instanceof AIServiceUnavailableError || code === "AI_SERVICE_UNAVAILABLE" || code === "VECTOR_DB_UNAVAILABLE") {
    cleanMsg = "Biometric vector service temporarily offline. Will be retried.";
  } else if (code === "PHOTO_DOWNLOAD_FAILED" || code === "PHOTO_STORAGE_ERROR") {
    cleanMsg = "Photo retrieval from storage failed temporarily. Will be retried.";
  } else if (error instanceof AIServiceAuthenticationError || error instanceof AIServiceConfigError) {
    cleanMsg = "Biometric service authentication misconfigured. Requires administrator attention.";
  }

  return {
    status: "retryable_failed",
    code,
    isTerminal: false,
    message: cleanMsg
  };
};

/**
 * Attempts an atomic claim on the Child record's biometric enrollment state.
 * Prevents race conditions from duplicate registrations, concurrent requests, or retries.
 *
 * @param {string|mongoose.Types.ObjectId} childId
 * @param {Object} [options]
 * @param {number} [options.staleLockMs=60000]
 * @returns {Promise<Child|null>} Claimed Child document, or null if lock not acquired
 */
const claimBiometricAttempt = async (childId, options = {}) => {
  const staleThreshold = new Date(Date.now() - (options.staleLockMs || STALE_LOCK_MS));

  return Child.findOneAndUpdate(
    {
      _id: childId,
      status: "active",
      biometricStatus: { $in: ["pending", "retryable_failed", "processing"] },
      $or: [
        { biometricStatus: { $ne: "processing" } },
        { lastBiometricAttemptAt: { $lt: staleThreshold } }
      ]
    },
    {
      $set: {
        biometricStatus: "processing",
        lastBiometricAttemptAt: new Date()
      },
      $inc: { biometricAttempts: 1 }
    },
    { returnDocument: "after" }
  );
};

/**
 * Orchestrates biometric enrollment for a Child record:
 * 1. Verifies record state and prevents duplicate enrollment
 * 2. Acquires atomic attempt lock
 * 3. Resolves photo buffer (using in-memory upload or secure Cloudinary fetch)
 * 4. Calls AI service to extract 512D ArcFace embedding and upsert to Qdrant
 * 5. Atomically commits faceProfileId and 'enrolled' status
 * 6. Guarantees that failures NEVER delete the Child record or Cloudinary photo
 *
 * @param {string|mongoose.Types.ObjectId} childId
 * @param {Object} [options]
 * @param {Buffer} [options.imageBuffer] - In-memory image buffer from Multer
 * @param {string} [options.mimeType='image/jpeg']
 * @param {string} [options.filename='portrait.jpg']
 * @param {Object} [options.aiClient] - Injectable AI client for testing
 * @param {Function} [options.fetchFn] - Injectable fetch for photo download testing
 * @returns {Promise<{
 *   success: boolean,
 *   status: string,
 *   faceProfileId?: string,
 *   code?: string,
 *   message: string
 * }>}
 */
const enrollChildBiometric = async (childId, options = {}) => {
  const client = options.aiClient || aiService;

  const child = await Child.findById(childId);
  if (!child) {
    const err = new Error(`Child record ${childId} not found.`);
    err.code = "CHILD_NOT_FOUND";
    throw err;
  }

  // Idempotency: If child is already enrolled with a valid profile ID, return success immediately
  if (child.biometricStatus === "enrolled" && child.faceProfileId) {
    return {
      success: true,
      status: "enrolled",
      faceProfileId: child.faceProfileId,
      message: "Child biometric profile is already enrolled."
    };
  }

  // Pre-condition: Must have a photo to enroll
  const hasPhoto = Boolean(options.imageBuffer || child.photoUrl);
  if (!hasPhoto) {
    return {
      success: false,
      status: "pending",
      code: "NO_PHOTO_ATTACHED",
      message: "Child record has no photograph attached for biometric enrollment."
    };
  }

  // Concurrency Guard: Atomic state claim
  const claimedChild = await claimBiometricAttempt(childId, options);
  if (!claimedChild) {
    // Could not acquire lock: check if currently processing or already enrolled
    const fresh = await Child.findById(childId);
    if (fresh && fresh.biometricStatus === "enrolled") {
      return {
        success: true,
        status: "enrolled",
        faceProfileId: fresh.faceProfileId,
        message: "Child biometric profile already enrolled by concurrent worker."
      };
    }
    return {
      success: false,
      status: fresh ? fresh.biometricStatus : "processing",
      code: "CONCURRENT_ENROLLMENT_IN_PROGRESS",
      message: "Biometric enrollment is currently processing in another request."
    };
  }

  let imageBuffer = options.imageBuffer;
  let mimeType = options.mimeType || "image/jpeg";
  const filename = options.filename || "portrait.jpg";

  try {
    // If image buffer not provided in-memory, securely download from Cloudinary
    if (!imageBuffer) {
      const downloaded = await downloadChildPhoto(claimedChild.photoUrl, {
        fetchFn: options.fetchFn
      });
      imageBuffer = downloaded.buffer;
      mimeType = downloaded.mimeType;
    }

    // Call AI microservice
    const aiResult = await client.enrollFace({
      childId: claimedChild._id.toString(),
      imageBuffer,
      mimeType,
      filename
    });

    if (!aiResult || !aiResult.success || !aiResult.faceProfileId) {
      throw new AIServiceResponseError("AI service response missing success confirmation or faceProfileId.");
    }

    // Atomically persist faceProfileId and transition to 'enrolled'
    const enrolledChild = await Child.findOneAndUpdate(
      {
        _id: claimedChild._id,
        biometricStatus: "processing"
      },
      {
        $set: {
          faceProfileId: aiResult.faceProfileId,
          biometricStatus: "enrolled",
          enrolledAt: new Date(),
          biometricError: "",
          biometricErrorCode: ""
        }
      },
      { returnDocument: "after" }
    );

    if (!enrolledChild) {
      console.warn(`[ChildBiometricService] Concurrency race committing enrollment for child ${claimedChild._id}`);
    }

    return {
      success: true,
      status: "enrolled",
      faceProfileId: aiResult.faceProfileId,
      message: "Child reference biometric profile enrolled successfully."
    };
  } catch (error) {
    const classified = classifyEnrollmentError(error);

    console.warn(`[ChildBiometricService] Enrollment failure for child ${claimedChild._id}: [${classified.code}] ${classified.message}`);

    // Persist failure state safely without deleting Child or Cloudinary image
    await Child.findOneAndUpdate(
      { _id: claimedChild._id },
      {
        $set: {
          biometricStatus: classified.status,
          biometricError: classified.message,
          biometricErrorCode: classified.code
        }
      }
    );

    return {
      success: false,
      status: classified.status,
      code: classified.code,
      message: classified.message
    };
  }
};

/**
 * Reconciles pending or retryable failed child biometric records.
 * Can be run periodically by background workers or maintenance scripts.
 *
 * @param {Object} [options]
 * @param {number} [options.limit=10]
 * @returns {Promise<{ attempted: number, succeeded: number, failed: number }>}
 */
const reconcilePendingEnrollments = async (options = {}) => {
  const limit = options.limit || 10;
  const eligible = await Child.find({
    status: "active",
    photoUrl: { $ne: "" },
    biometricStatus: { $in: ["pending", "retryable_failed"] },
    biometricAttempts: { $lt: 5 }
  })
    .sort({ lastBiometricAttemptAt: 1 })
    .limit(limit);

  const results = { attempted: eligible.length, succeeded: 0, failed: 0 };

  for (const child of eligible) {
    try {
      const outcome = await enrollChildBiometric(child._id, options);
      if (outcome.success) {
        results.succeeded++;
      } else {
        results.failed++;
      }
    } catch (_) {
      results.failed++;
    }
  }

  return results;
};

module.exports = {
  isAuthorizedImageHost,
  downloadChildPhoto,
  classifyEnrollmentError,
  claimBiometricAttempt,
  enrollChildBiometric,
  reconcilePendingEnrollments,
  MAX_IMAGE_BYTES,
  DOWNLOAD_TIMEOUT_MS,
  STALE_LOCK_MS
};
