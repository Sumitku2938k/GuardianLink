/**
 * GuardianLink — AI Microservice Configuration Module
 *
 * Centralizes configuration for connecting to the FastAPI biometric engine.
 * Ensures strict secret sanitization and validates environment boundaries.
 */

const { AIServiceConfigError } = require("../errors/aiErrors");

/**
 * Normalizes a base URL by removing any trailing slashes.
 * @param {string} url
 * @returns {string}
 */
const normalizeUrl = (url) => {
  if (!url || typeof url !== "string") return "http://127.0.0.1:8000";
  return url.trim().replace(/\/+$/, "");
};

/**
 * Returns the current runtime AI service configuration.
 * @returns {{
 *   baseUrl: string,
 *   internalServiceKey: string,
 *   timeoutMs: number,
 *   maxUploadSizeBytes: number,
 *   defaultLimit: number,
 *   defaultThreshold: number
 * }}
 */
const getAIConfig = () => {
  const baseUrl = normalizeUrl(process.env.AI_SERVICE_URL || "http://127.0.0.1:8000");
  const internalServiceKey = (process.env.INTERNAL_SERVICE_KEY || "").trim();
  const timeoutMs = parseInt(process.env.AI_SERVICE_TIMEOUT_MS || "20000", 10);
  const maxUploadSizeBytes = parseInt(process.env.MAX_UPLOAD_SIZE_BYTES || "10485760", 10);
  const defaultLimit = parseInt(process.env.AI_DEFAULT_SEARCH_LIMIT || "5", 10);
  const defaultThreshold = parseFloat(process.env.AI_FACE_MATCH_THRESHOLD || "0.60");

  return {
    baseUrl,
    internalServiceKey,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 20000,
    maxUploadSizeBytes: Number.isFinite(maxUploadSizeBytes) && maxUploadSizeBytes > 0 ? maxUploadSizeBytes : 10485760,
    defaultLimit: Number.isFinite(defaultLimit) && defaultLimit > 0 ? defaultLimit : 5,
    defaultThreshold: Number.isFinite(defaultThreshold) ? defaultThreshold : 0.60
  };
};

/**
 * Checks if the AI service URL is present and valid.
 * @returns {boolean}
 */
const isConfigured = () => {
  const config = getAIConfig();
  return Boolean(config.baseUrl && config.baseUrl.startsWith("http"));
};

/**
 * Checks if an internal service key is currently available.
 * @returns {boolean}
 */
const hasInternalKey = () => {
  const config = getAIConfig();
  return Boolean(config.internalServiceKey && config.internalServiceKey.length > 0);
};

/**
 * Asserts that the internal service key is configured before protected operations.
 * Throws AIServiceConfigError with a safe message that never exposes secret data.
 * @throws {AIServiceConfigError}
 */
const assertProtectedConfig = () => {
  if (!hasInternalKey()) {
    throw new AIServiceConfigError(
      "AI Service operation failed: INTERNAL_SERVICE_KEY is not configured in environment. Protected internal AI operations require authentication."
    );
  }
};

/**
 * Returns sanitized config metadata suitable for diagnostics and logging.
 * The secret key is never printed or included.
 * @returns {Object}
 */
const getSafeConfigSummary = () => {
  const config = getAIConfig();
  return {
    baseUrl: config.baseUrl,
    timeoutMs: config.timeoutMs,
    maxUploadSizeBytes: config.maxUploadSizeBytes,
    hasInternalKey: Boolean(config.internalServiceKey),
    defaultLimit: config.defaultLimit,
    defaultThreshold: config.defaultThreshold
  };
};

module.exports = {
  getAIConfig,
  isConfigured,
  hasInternalKey,
  assertProtectedConfig,
  getSafeConfigSummary,
  normalizeUrl
};
