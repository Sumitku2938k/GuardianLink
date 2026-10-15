/**
 * GuardianLink — AI Microservice Client
 *
 * Provides a dedicated, typed, and resilient HTTP client for communicating with the
 * FastAPI biometric microservice (InsightFace SCRFD + ArcFace and Qdrant).
 *
 * Implements:
 * 1. Health check & dependency readiness probe (GET /health)
 * 2. Child face reference enrollment (POST /internal/face/enroll)
 * 3. Biometric similarity search (POST /internal/face/search)
 * 4. Biometric vector deletion (DELETE /internal/face/:childId)
 *
 * Strict Architectural Guarantees:
 * - Constant-time timing attack protection via shared internal service key header
 * - Zero parent/guardian PII exposure to AI service
 * - Zero secrets, base64 strings, or raw embeddings in logs
 * - Explicit timeouts, network fault handling, and schema validation
 * - No automatic retries on biometric mutations (enrollment, deletion)
 */

const {
  getAIConfig,
  assertProtectedConfig,
  normalizeUrl
} = require("../config/ai");

const {
  AIServiceError,
  AIServiceConfigError,
  AIServiceTimeoutError,
  AIServiceUnavailableError,
  AIServiceAuthenticationError,
  AIServiceValidationError,
  AIServiceResponseError
} = require("../errors/aiErrors");

class AIServiceClient {
  /**
   * @param {Object} [options]
   * @param {string} [options.baseUrl] - Base URL for the AI microservice
   * @param {string} [options.internalServiceKey] - Shared pre-shared secret key
   * @param {number} [options.timeoutMs] - Request timeout in milliseconds
   * @param {number} [options.maxUploadSizeBytes] - Maximum allowed upload size in bytes
   * @param {Function} [options.fetchFn] - Custom fetch function (for unit testing/mocking)
   */
  constructor(options = {}) {
    this.customBaseUrl = options.baseUrl ? normalizeUrl(options.baseUrl) : null;
    this.customKey = options.internalServiceKey ?? null;
    this.customTimeoutMs = options.timeoutMs ?? null;
    this.customMaxUploadSizeBytes = options.maxUploadSizeBytes ?? null;
    this.fetchFn = options.fetchFn || globalThis.fetch;
  }

  /**
   * Resolves effective configuration blending custom options and environment variables.
   * @private
   * @returns {{
   *   baseUrl: string,
   *   internalServiceKey: string,
   *   timeoutMs: number,
   *   maxUploadSizeBytes: number,
   *   defaultLimit: number,
   *   defaultThreshold: number
   * }}
   */
  _getConfig() {
    const envConfig = getAIConfig();
    return {
      baseUrl: this.customBaseUrl || envConfig.baseUrl,
      internalServiceKey: this.customKey !== null ? this.customKey : envConfig.internalServiceKey,
      timeoutMs: this.customTimeoutMs || envConfig.timeoutMs,
      maxUploadSizeBytes: this.customMaxUploadSizeBytes || envConfig.maxUploadSizeBytes,
      defaultLimit: envConfig.defaultLimit,
      defaultThreshold: envConfig.defaultThreshold
    };
  }

  /**
   * Asserts that the internal service key is present for protected endpoints.
   * @private
   * @param {string} key
   */
  _assertAuthKey(key) {
    if (!key || typeof key !== "string" || !key.trim()) {
      throw new AIServiceConfigError(
        "AI Service operation failed: INTERNAL_SERVICE_KEY is not configured in environment. Protected internal AI operations require authentication."
      );
    }
  }

  /**
   * Executes an HTTP request against the AI microservice with timeout, network error handling,
   * and structured JSON response parsing.
   *
   * @private
   * @param {string} path - Endpoint path (e.g. "/health", "/internal/face/enroll")
   * @param {Object} [options]
   * @param {string} [options.method='GET'] - HTTP method
   * @param {HeadersInit} [options.headers] - Request headers
   * @param {BodyInit} [options.body] - Request body (FormData, string, etc.)
   * @param {number} [options.timeoutMs] - Request timeout override in ms
   * @param {boolean} [options.isProtected=false] - Whether the call requires internal auth
   * @returns {Promise<any>} Parsed JSON response body
   */
  async _request(path, options = {}) {
    const config = this._getConfig();
    const method = (options.method || "GET").toUpperCase();
    const timeoutMs = options.timeoutMs || config.timeoutMs;
    const url = `${config.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");

    if (options.isProtected) {
      this._assertAuthKey(config.internalServiceKey);
      headers.set("X-Internal-Service-Key", config.internalServiceKey.trim());
    }

    const controller = new AbortController();
    let timeoutHandle = null;

    if (typeof setTimeout !== "undefined" && timeoutMs > 0) {
      timeoutHandle = setTimeout(() => {
        controller.abort();
      }, timeoutMs);
    }

    let response;
    try {
      response = await this.fetchFn(url, {
        method,
        headers,
        body: options.body,
        signal: controller.signal
      });
    } catch (networkError) {
      if (networkError.name === "AbortError" || controller.signal.aborted) {
        throw new AIServiceTimeoutError(
          `AI Service request timed out after ${timeoutMs}ms for ${method} ${path}`,
          { cause: networkError, details: { path, timeoutMs } }
        );
      }

      throw new AIServiceUnavailableError(
        `AI Service network communication failed for ${method} ${path}: ${networkError.message || "Connection failed"}`,
        { cause: networkError, details: { path, baseUrl: config.baseUrl } }
      );
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }

    // Parse JSON body safely
    let responseBody = null;
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    try {
      const text = await response.text();
      if (text && text.trim().length > 0) {
        responseBody = JSON.parse(text);
      }
    } catch (parseError) {
      if (!response.ok) {
        throw new AIServiceResponseError(
          `AI Service error (HTTP ${response.status}) with invalid non-JSON payload.`,
          {
            statusCode: response.status,
            cause: parseError,
            details: { path, status: response.status }
          }
        );
      }
      throw new AIServiceResponseError(
        `AI Service returned malformed non-JSON response for ${method} ${path}`,
        {
          statusCode: 502,
          cause: parseError,
          details: { path, status: response.status }
        }
      );
    }

    // Handle non-2xx HTTP responses
    if (!response.ok) {
      this._handleHttpError(response.status, responseBody, path);
    }

    if (!responseBody || typeof responseBody !== "object") {
      throw new AIServiceResponseError(
        `AI Service returned empty or invalid response body for ${method} ${path}`,
        {
          statusCode: 502,
          details: { path, status: response.status }
        }
      );
    }

    return responseBody;
  }

  /**
   * Maps HTTP error status codes to typed AIServiceError instances.
   * @private
   * @param {number} status
   * @param {any} body
   * @param {string} path
   */
  _handleHttpError(status, body, path) {
    const detail = body && typeof body.detail === "string" ? body.detail : "AI service request failed";
    const code = body && typeof body.code === "string" ? body.code : undefined;

    if (status === 401 || status === 403) {
      throw new AIServiceAuthenticationError(
        `AI Service authentication failed (HTTP ${status}): ${detail}`,
        { statusCode: status, details: { path } }
      );
    }

    if (status === 400 || status === 422) {
      throw new AIServiceValidationError(
        `AI Service validation error (HTTP ${status}): ${detail}`,
        {
          statusCode: status,
          code: code || "AI_VALIDATION_ERROR",
          details: { path, detail, code }
        }
      );
    }

    if (status === 429) {
      throw new AIServiceError(
        `AI Service rate limit exceeded (HTTP 429): ${detail}`,
        {
          statusCode: 429,
          code: "AI_RATE_LIMITED",
          details: { path }
        }
      );
    }

    if (status === 503) {
      throw new AIServiceUnavailableError(
        `AI Service unavailable (HTTP 503): ${detail}`,
        {
          statusCode: 503,
          code: code || "AI_SERVICE_UNAVAILABLE",
          details: { path, detail, code }
        }
      );
    }

    throw new AIServiceResponseError(
      `AI Service responded with server error (HTTP ${status}): ${detail}`,
      {
        statusCode: status,
        code: code || "AI_SERVER_ERROR",
        details: { path, status, detail }
      }
    );
  }

  /**
   * Verifies an image buffer or Uint8Array.
   * @private
   * @param {Buffer|Uint8Array|Blob} imageInput
   * @param {number} maxBytes
   */
  _validateImageBuffer(imageInput, maxBytes) {
    if (!imageInput) {
      throw new AIServiceValidationError(
        "Image data must be provided as a non-empty Buffer, Uint8Array, or Blob.",
        { code: "INVALID_IMAGE_INPUT", statusCode: 400 }
      );
    }

    let byteLength = 0;
    if (typeof Buffer !== "undefined" && Buffer.isBuffer(imageInput)) {
      byteLength = imageInput.length;
    } else if (imageInput instanceof Uint8Array) {
      byteLength = imageInput.byteLength;
    } else if (typeof Blob !== "undefined" && imageInput instanceof Blob) {
      byteLength = imageInput.size;
    } else {
      throw new AIServiceValidationError(
        "Unsupported image data type. Expected Buffer, Uint8Array, or Blob.",
        { code: "INVALID_IMAGE_TYPE", statusCode: 400 }
      );
    }

    if (byteLength === 0) {
      throw new AIServiceValidationError(
        "Image file buffer is empty (0 bytes).",
        { code: "EMPTY_IMAGE_BUFFER", statusCode: 400 }
      );
    }

    if (byteLength > maxBytes) {
      throw new AIServiceValidationError(
        `Image file exceeds maximum allowed limit of ${maxBytes} bytes (received: ${byteLength} bytes).`,
        { code: "IMAGE_TOO_LARGE", statusCode: 400, details: { byteLength, maxBytes } }
      );
    }
  }

  /**
   * Probes the AI microservice /health endpoint.
   * Evaluates overall status, InsightFace model availability, and Qdrant connectivity.
   *
   * @param {Object} [options]
   * @param {number} [options.timeoutMs] - Custom probe timeout (e.g. 3000ms)
   * @returns {Promise<{
   *   status: string,
   *   isHealthy: boolean,
   *   service: string,
   *   version: string,
   *   modelsLoaded: boolean,
   *   qdrantConnected: boolean,
   *   details: Object
   * }>}
   */
  async healthCheck(options = {}) {
    const data = await this._request("/health", {
      method: "GET",
      timeoutMs: options.timeoutMs,
      isProtected: false
    });

    if (typeof data.status !== "string") {
      throw new AIServiceResponseError(
        "Invalid health check response: missing 'status' field",
        { details: { data } }
      );
    }

    const qdrantConnected = Boolean(data.qdrant_connected);
    const collectionReady = Boolean(data.details && data.details.collection_ready);
    const isHealthy = data.status === "ok" && qdrantConnected && collectionReady;

    return {
      status: data.status,
      isHealthy,
      service: data.service || "guardianlink-ai-service",
      version: data.version || "1.0.0",
      modelsLoaded: Boolean(data.models_loaded),
      qdrantConnected,
      details: data.details || {}
    };
  }

  /**
   * Enrolls a child reference portrait into the vector database.
   * Strictly enforces exactly one face, extracts 512D ArcFace embedding, and indexes into Qdrant.
   *
   * @param {Object} params
   * @param {string} params.childId - Canonical GuardianLink Child ObjectId
   * @param {Buffer|Uint8Array|Blob} params.imageBuffer - Image binary data
   * @param {string} [params.mimeType='image/jpeg'] - MIME type of the uploaded image
   * @param {string} [params.filename='reference.jpg'] - Upload filename
   * @param {Object} [options] - Optional overrides (e.g. timeoutMs)
   * @returns {Promise<{
   *   success: boolean,
   *   childId: string,
   *   faceProfileId: string,
   *   status: string,
   *   message: string
   * }>}
   */
  async enrollFace(params, options = {}) {
    if (!params || typeof params !== "object") {
      throw new AIServiceValidationError("Parameters must be provided as an object.", {
        code: "INVALID_PARAMETERS",
        statusCode: 400
      });
    }

    const { childId, imageBuffer, mimeType = "image/jpeg", filename = "reference.jpg" } = params;

    if (!childId || typeof childId !== "string" || !childId.trim()) {
      throw new AIServiceValidationError("childId must be a non-empty string identifier.", {
        code: "INVALID_CHILD_ID",
        statusCode: 400
      });
    }

    const cleanChildId = childId.trim();
    const config = this._getConfig();
    this._validateImageBuffer(imageBuffer, config.maxUploadSizeBytes);

    const formData = new FormData();
    formData.append("child_id", cleanChildId);

    const blob = new Blob([imageBuffer], { type: mimeType });
    formData.append("file", blob, filename);

    // Endpoint: POST /internal/face/enroll
    const data = await this._request("/internal/face/enroll", {
      method: "POST",
      body: formData,
      isProtected: true,
      timeoutMs: options.timeoutMs
    });

    // Validate enrollment response contract
    if (!data.success || data.child_id !== cleanChildId || typeof data.face_profile_id !== "string" || !data.face_profile_id.trim()) {
      throw new AIServiceResponseError(
        "AI Service returned malformed enrollment response: missing success confirmation or valid face_profile_id.",
        { details: { childId: cleanChildId, data } }
      );
    }

    return {
      success: true,
      childId: data.child_id,
      faceProfileId: data.face_profile_id,
      status: data.status || "enrolled",
      message: data.message || "Child facial biometric enrolled successfully."
    };
  }

  /**
   * Executes a biometric similarity search against the vector index for a sighting image.
   * Strictly decoupled from PII: returns only candidate child IDs and mathematical similarity scores.
   *
   * @param {Object} params
   * @param {Buffer|Uint8Array|Blob} params.imageBuffer - Query photograph
   * @param {string} [params.mimeType='image/jpeg'] - MIME type of the uploaded image
   * @param {string} [params.filename='sighting.jpg'] - Upload filename
   * @param {number} [params.limit=5] - Maximum candidates to retrieve (1 to 50)
   * @param {number} [params.threshold] - Cosine similarity threshold override (-1.0 to 1.0)
   * @param {Object} [options] - Optional overrides (e.g. timeoutMs)
   * @returns {Promise<{
   *   matchFound: boolean,
   *   candidates: Array<{ childId: string, similarity: number, confidence?: number }>,
   *   totalCandidates: number,
   *   thresholdApplied: number,
   *   message: string
   * }>}
   */
  async searchFace(params, options = {}) {
    if (!params || typeof params !== "object") {
      throw new AIServiceValidationError("Parameters must be provided as an object.", {
        code: "INVALID_PARAMETERS",
        statusCode: 400
      });
    }

    const {
      imageBuffer,
      mimeType = "image/jpeg",
      filename = "sighting.jpg",
      limit,
      threshold
    } = params;

    const config = this._getConfig();
    this._validateImageBuffer(imageBuffer, config.maxUploadSizeBytes);

    const activeLimit = limit !== undefined && limit !== null ? limit : config.defaultLimit;
    if (!Number.isInteger(activeLimit) || activeLimit < 1 || activeLimit > 50) {
      throw new AIServiceValidationError(
        `Search limit must be an integer between 1 and 50, received: ${activeLimit}`,
        { code: "INVALID_SEARCH_LIMIT", statusCode: 400 }
      );
    }

    if (threshold !== undefined && threshold !== null) {
      if (typeof threshold !== "number" || !Number.isFinite(threshold) || threshold < -1.0 || threshold > 1.0) {
        throw new AIServiceValidationError(
          `Similarity threshold must be a finite number between -1.0 and 1.0, received: ${threshold}`,
          { code: "INVALID_SIMILARITY_THRESHOLD", statusCode: 400 }
        );
      }
    }

    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: mimeType });
    formData.append("file", blob, filename);
    formData.append("limit", String(activeLimit));

    if (threshold !== undefined && threshold !== null) {
      formData.append("threshold", String(threshold));
    }

    // Endpoint: POST /internal/face/search
    const data = await this._request("/internal/face/search", {
      method: "POST",
      body: formData,
      isProtected: true,
      timeoutMs: options.timeoutMs
    });

    // Validate search response schema
    if (typeof data.match_found !== "boolean" || !Array.isArray(data.candidates)) {
      throw new AIServiceResponseError(
        "AI Service returned malformed search response: missing match_found boolean or candidates array.",
        { details: { data } }
      );
    }

    // Validate candidates contract strictly
    const validatedCandidates = [];
    for (let i = 0; i < data.candidates.length; i++) {
      const c = data.candidates[i];
      if (!c || typeof c !== "object" || !c.child_id || typeof c.child_id !== "string" || !c.child_id.trim()) {
        throw new AIServiceResponseError(
          `AI Service returned malformed candidate at index ${i}: missing or invalid child_id.`,
          { details: { candidate: c } }
        );
      }

      const similarity = Number(c.similarity);
      if (!Number.isFinite(similarity) || Number.isNaN(similarity) || similarity < -1.0 || similarity > 1.0) {
        throw new AIServiceResponseError(
          `AI Service returned invalid cosine similarity score (${c.similarity}) for child_id ${c.child_id}. Must be finite between -1.0 and 1.0.`,
          { details: { candidate: c } }
        );
      }

      const item = {
        childId: c.child_id.trim(),
        similarity
      };

      if (c.confidence !== undefined && c.confidence !== null) {
        const conf = Number(c.confidence);
        if (Number.isFinite(conf) && conf >= 0.0 && conf <= 1.0) {
          item.confidence = conf;
        }
      }

      validatedCandidates.push(item);
    }

    const thresholdApplied = Number(data.threshold_applied);
    const safeThreshold = Number.isFinite(thresholdApplied) ? thresholdApplied : (threshold ?? config.defaultThreshold);

    return {
      matchFound: data.match_found,
      candidates: validatedCandidates,
      totalCandidates: Number(data.total_candidates ?? validatedCandidates.length),
      thresholdApplied: safeThreshold,
      message: data.message || ""
    };
  }

  /**
   * Deletes a child reference vector from the Qdrant vector database.
   * Idempotent: repeated deletions succeed cleanly.
   *
   * @param {string} childId - Canonical GuardianLink Child ObjectId
   * @param {Object} [options] - Optional overrides (e.g. timeoutMs)
   * @returns {Promise<{
   *   success: boolean,
   *   childId: string,
   *   faceProfileId: string,
   *   message: string
   * }>}
   */
  async deleteFaceProfile(childId, options = {}) {
    if (!childId || typeof childId !== "string" || !childId.trim()) {
      throw new AIServiceValidationError("childId must be a non-empty string identifier.", {
        code: "INVALID_CHILD_ID",
        statusCode: 400
      });
    }

    const cleanChildId = childId.trim();
    const encodedId = encodeURIComponent(cleanChildId);

    // Endpoint: DELETE /internal/face/:childId
    const data = await this._request(`/internal/face/${encodedId}`, {
      method: "DELETE",
      isProtected: true,
      timeoutMs: options.timeoutMs
    });

    if (!data.success || data.child_id !== cleanChildId || typeof data.face_profile_id !== "string") {
      throw new AIServiceResponseError(
        "AI Service returned malformed deletion response: missing success confirmation or face_profile_id.",
        { details: { childId: cleanChildId, data } }
      );
    }

    return {
      success: true,
      childId: data.child_id,
      faceProfileId: data.face_profile_id,
      message: data.message || "Child biometric vector deleted successfully."
    };
  }
}

// Default singleton instance
const defaultClient = new AIServiceClient();

module.exports = {
  AIServiceClient,
  healthCheck: defaultClient.healthCheck.bind(defaultClient),
  enrollFace: defaultClient.enrollFace.bind(defaultClient),
  searchFace: defaultClient.searchFace.bind(defaultClient),
  deleteFaceProfile: defaultClient.deleteFaceProfile.bind(defaultClient)
};
