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
