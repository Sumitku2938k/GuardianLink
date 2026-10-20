/**
 * GuardianLink — Citizen Photo Search API Service (Phase 6.10)
 *
 * Communicates with the real Node.js backend:
 * POST /api/citizen/search-missing-child
 *
 * Enforces:
 * - Client-side pre-validation (size <= 5MB, format: JPEG/PNG/WebP, non-empty)
 * - Safe FormData transport with automatic boundary handling
 * - Clean error normalization mapping backend codes to human-friendly guidance
 * - AbortController signal support for cancelling stale in-flight requests
 */

import api from "../lib/axios.js";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Validates a candidate image file prior to dispatching to the backend.
 *
 * @param {File|Blob} file
 * @returns {{ isValid: boolean, error?: string, code?: string }}
 */
export function validateSearchPhoto(file) {
  if (!file) {
    return {
      isValid: false,
      error: "Please select or capture a photograph to search.",
      code: "NO_FILE_SELECTED"
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      error: "The selected photograph is empty (0 bytes). Please choose a valid image.",
      code: "EMPTY_FILE"
    };
  }

  if (file.size > MAX_PHOTO_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `Photo file size (${sizeMb} MB) exceeds the 5 MB limit. Please select a smaller photo.`,
      code: "FILE_TOO_LARGE"
    };
  }

  if (file.type && !ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    return {
      isValid: false,
      error: "Unsupported file format. Please upload a JPEG, PNG, or WebP photograph.",
      code: "INVALID_FILE_TYPE"
    };
  }

  return { isValid: true };
}

/**
 * Normalizes HTTP error responses from the backend into safe user-facing error objects.
 * Never leaks stack traces, internal endpoints, or raw secrets.
 *
 * @param {Error} err - Axios or runtime error
 * @returns {{ message: string, code: string, status?: number, isRetryable: boolean }}
 */
export function normalizeSearchError(err) {
  if (err.name === "CanceledError" || err.code === "ERR_CANCELED") {
    return {
      message: "Search was cancelled.",
      code: "REQUEST_CANCELLED",
      isRetryable: false
    };
  }

  const response = err.response;
  if (!response) {
    return {
      message: "Unable to connect to the GuardianLink search service. Please check your internet connection.",
      code: "NETWORK_ERROR",
      isRetryable: true
    };
  }

  const status = response.status;
  const data = response.data || {};
  const serverCode = data.code || "";
  const serverMsg = data.message || "";

  switch (status) {
    case 400:
      if (serverCode === "IMAGE_TOO_LARGE") {
        return {
          message: "Photograph exceeds the 5MB upload limit.",
          code: "IMAGE_TOO_LARGE",
          status,
          isRetryable: false
        };
      }
      return {
        message: serverMsg || "Invalid photograph or search parameters provided.",
        code: serverCode || "BAD_REQUEST",
        status,
        isRetryable: false
      };

    case 401:
      return {
        message: "Your session has expired. Please log in again to search.",
        code: "UNAUTHORIZED",
        status,
        isRetryable: false
      };

    case 403:
      return {
        message: "You are not authorized to perform citizen photo searches.",
        code: "FORBIDDEN",
        status,
        isRetryable: false
      };

    case 413:
      return {
        message: "The uploaded photograph is too large. Please select an image under 5MB.",
        code: "PAYLOAD_TOO_LARGE",
        status,
        isRetryable: false
      };

    case 422:
      if (serverCode === "NO_FACE_DETECTED") {
        return {
          message: "No human face was detected in the photograph. Please provide a clear, front-facing image of the child.",
          code: "NO_FACE_DETECTED",
          status,
          isRetryable: true
        };
      }
      if (serverCode === "MULTIPLE_FACES_DETECTED") {
        return {
          message: "Multiple faces were detected in the photograph. Please submit an image cropped to a single child.",
          code: "MULTIPLE_FACES_DETECTED",
          status,
          isRetryable: true
        };
      }
      return {
        message: serverMsg || "Face detection failed on this photograph. Please try another image.",
        code: serverCode || "VALIDATION_FAILED",
        status,
        isRetryable: true
      };

    case 429:
      return {
        message: "Search rate limit reached. Too many requests from your IP. Please wait 15 minutes before searching again.",
        code: "RATE_LIMIT_EXCEEDED",
        status,
        isRetryable: true
      };

    case 503:
      return {
        message: "The biometric identification service is temporarily offline for maintenance. Please try again shortly.",
        code: "AI_SERVICE_UNAVAILABLE",
        status,
        isRetryable: true
      };

    case 504:
      return {
        message: "The facial similarity search timed out. Please try again in a few moments.",
        code: "AI_SERVICE_TIMEOUT",
        status,
        isRetryable: true
      };

    default:
      return {
        message: "An unexpected error occurred while searching. Please try again later.",
        code: serverCode || "INTERNAL_ERROR",
        status,
        isRetryable: true
      };
  }
}

/**
 * Executes a facial similarity search against the real GuardianLink backend.
 *
 * @param {Object} params
 * @param {File|Blob} params.photoFile - Image file or blob
 * @param {number} [params.limit] - Optional max candidates (1-20)
 * @param {number} [params.threshold] - Optional similarity threshold (-1.0 to 1.0)
 * @param {AbortSignal} [params.signal] - Optional AbortSignal
 * @returns {Promise<{
 *   matchFound: boolean,
 *   candidates: Array<Object>,
 *   totalCandidates: number,
 *   thresholdApplied: number,
 *   message: string,
 *   disclaimer: string
 * }>}
 */
export async function searchMissingChildPhoto({ photoFile, limit, threshold, signal }) {
  const validation = validateSearchPhoto(photoFile);
  if (!validation.isValid) {
    const err = new Error(validation.error);
    err.code = validation.code;
    err.isValidationError = true;
    throw err;
  }

  const formData = new FormData();
  formData.append("photo", photoFile);

  if (limit !== undefined && limit !== null) {
    formData.append("limit", String(limit));
  }
  if (threshold !== undefined && threshold !== null) {
    formData.append("threshold", String(threshold));
  }

  try {
    const res = await api.post("/api/citizen/search-missing-child", formData, {
      signal
    });

    if (res.data && res.data.success) {
      return {
        matchFound: Boolean(res.data.matchFound),
        candidates: Array.isArray(res.data.candidates) ? res.data.candidates : [],
        totalCandidates: Number(res.data.totalCandidates) || 0,
        thresholdApplied: Number(res.data.thresholdApplied) || 0.65,
        message: res.data.message || "",
        disclaimer: res.data.disclaimer || "AI similarity results represent potential leads only and do not constitute verified identification."
      };
    }

    throw new Error(res.data?.message || "Search failed without response payload");
  } catch (err) {
    if (err.isValidationError) {
      throw err;
    }
    const normalized = normalizeSearchError(err);
    const wrappedErr = new Error(normalized.message);
    wrappedErr.code = normalized.code;
    wrappedErr.status = normalized.status;
    wrappedErr.isRetryable = normalized.isRetryable;
    throw wrappedErr;
  }
}

/**
 * Submits a citizen sighting report for an active missing case.
 *
 * @param {Object} params
 * @param {string} params.caseId - Authoritative MissingCase reference ID
 * @param {string} params.description - Observation description
 * @param {boolean} params.safetyConfirmed - Mandatory safety acknowledgment
 * @param {Object} [params.location] - Sighting address, city, coords
 * @param {Object} [params.appearance] - Approx age, gender, clothing
 * @param {string} [params.safetyState] - Observed safety condition
 * @param {string|Date} [params.observedAt] - Observation time
 * @returns {Promise<{ sighting: Object, notifications: Object, message: string }>}
 */
export async function submitSightingReport(params) {
  if (!params.caseId) {
    const err = new Error("A valid missing case reference is required to submit a sighting.");
    err.code = "INVALID_CASE_ID";
    throw err;
  }

  if (params.safetyConfirmed !== true) {
    const err = new Error("You must confirm the safety instructions before submitting.");
    err.code = "SAFETY_CONFIRMATION_REQUIRED";
    throw err;
  }

  if (!params.description || !params.description.trim()) {
    const err = new Error("Please provide details of your observation.");
    err.code = "MISSING_DESCRIPTION";
    throw err;
  }

  try {
    const res = await api.post("/api/sightings", {
      caseId: params.caseId,
      description: params.description.trim(),
      safetyConfirmed: true,
      location: params.location || {},
      appearance: params.appearance || {},
      safetyState: params.safetyState || "Safe",
      observedAt: params.observedAt || new Date().toISOString()
    });

    if (res.data && res.data.success) {
      return {
        sighting: res.data.sighting,
        notifications: res.data.notifications || {},
        message: res.data.message || "Sighting report registered successfully."
      };
    }

    throw new Error(res.data?.message || "Failed to submit sighting report.");
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data || {};
    const errorMsg = data.message || err.message || "Unable to submit sighting report.";
    const wrappedErr = new Error(errorMsg);
    wrappedErr.code = data.code || (status === 409 ? "CASE_NOT_ELIGIBLE" : "SUBMISSION_FAILED");
    wrappedErr.status = status;
    throw wrappedErr;
  }
}

/**
 * Retrieves sighting reports submitted by the logged-in citizen.
 *
 * @param {Object} [options]
 * @returns {Promise<Array<Object>>}
 */
export async function getMySightings(options = {}) {
  try {
    const res = await api.get("/api/sightings/mine", { params: options });
    if (res.data && res.data.success) {
      return res.data.sightings || [];
    }
    return [];
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message || "Failed to fetch submitted sightings.";
    const wrappedErr = new Error(errorMsg);
    wrappedErr.code = err.response?.data?.code || "FETCH_FAILED";
    throw wrappedErr;
  }
}

/**
 * Retrieves single sighting report details by ID.
 *
 * @param {string} sightingId
 * @returns {Promise<Object>}
 */
export async function getSightingDetails(sightingId) {
  try {
    const res = await api.get(`/api/sightings/${sightingId}`);
    if (res.data && res.data.success) {
      return res.data.sighting;
    }
    throw new Error("Sighting record not found.");
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message || "Failed to retrieve sighting.";
    const wrappedErr = new Error(errorMsg);
    wrappedErr.code = err.response?.data?.code || "FETCH_FAILED";
    throw wrappedErr;
  }
}

/**
 * Retrieves in-app alerts and notifications for the authenticated user.
 *
 * @param {Object} [options]
 * @returns {Promise<Array<Object>>}
 */
export async function getUserNotifications(options = {}) {
  try {
    const res = await api.get("/api/notifications", { params: options });
    if (res.data && res.data.success) {
      return res.data.notifications || [];
    }
    return [];
  } catch (err) {
    return [];
  }
}

/**
 * Marks a notification as read.
 *
 * @param {string} notificationId
 * @returns {Promise<Object>}
 */
export async function markNotificationAsRead(notificationId) {
  try {
    const res = await api.patch(`/api/notifications/${notificationId}/read`);
    return res.data?.notification;
  } catch (err) {
    return null;
  }
}

/**
 * Marks all notifications as read.
 *
 * @returns {Promise<boolean>}
 */
export async function markAllNotificationsAsRead() {
  try {
    await api.patch("/api/notifications/read-all");
    return true;
  } catch (err) {
    return false;
  }
}

