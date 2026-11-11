/**
 * GuardianLink — Centralized Environment Configuration & Secret Validator
 * Phase 15 Production Readiness
 *
 * Enforces fail-closed configuration in production while preserving seamless
 * local development and testing workflows.
 */

const KNOWN_PLACEHOLDERS = new Set([
  "your_jwt_secret_here",
  "your_session_secret_here",
  "your_cookie_secret_here",
  "your_secure_internal_service_key_here",
  "guardianlink_super_secret_jwt_key_2026_safe_child_platform",
  "guardianlink_cookie_secret_key_774411",
  "dev_internal_secret_change_in_production",
  "admin123",
  "password",
  "changeme"
]);

const DEV_FALLBACK_JWT_SECRET = "guardianlink_super_secret_jwt_key_2026_safe_child_platform";
const DEV_FALLBACK_COOKIE_SECRET = "guardianlink_cookie_secret_key_774411";

class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigurationError";
    this.code = "INVALID_PRODUCTION_CONFIG";
  }
}

/**
 * Returns true if running in production mode.
 */
const isProduction = () => {
  return (process.env.NODE_ENV || "").toLowerCase() === "production";
};

/**
 * Retrieve validated JWT secret.
 * Throws ConfigurationError in production if missing, empty, or using a known placeholder.
 */
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (isProduction()) {
    if (!secret || secret.trim() === "") {
      throw new ConfigurationError("FATAL: JWT_SECRET environment variable is missing or empty in production mode.");
    }
    if (KNOWN_PLACEHOLDERS.has(secret.trim())) {
      throw new ConfigurationError("FATAL: Insecure placeholder JWT_SECRET detected in production mode.");
    }
    if (secret.length < 32) {
      throw new ConfigurationError("FATAL: JWT_SECRET must be at least 32 characters in production mode.");
    }
    return secret;
  }
  return secret || DEV_FALLBACK_JWT_SECRET;
};

/**
 * Retrieve validated Cookie secret.
 * Throws ConfigurationError in production if missing, empty, or using a known placeholder.
 */
const getCookieSecret = () => {
  const secret = process.env.COOKIE_SECRET;
  if (isProduction()) {
    if (!secret || secret.trim() === "") {
      throw new ConfigurationError("FATAL: COOKIE_SECRET environment variable is missing or empty in production mode.");
    }
    if (KNOWN_PLACEHOLDERS.has(secret.trim())) {
      throw new ConfigurationError("FATAL: Insecure placeholder COOKIE_SECRET detected in production mode.");
    }
    return secret;
  }
  return secret || DEV_FALLBACK_COOKIE_SECRET;
};

/**
 * Centralized startup validation for production environments.
 * Checks all mandatory production environment variables and fails fast.
 */
const validateProductionEnv = () => {
  if (!isProduction()) {
    return { valid: true, warnings: [] };
  }

  const errors = [];

  // 1. JWT Secret Validation
  try {
    getJwtSecret();
  } catch (err) {
    errors.push(err.message);
  }

  // 2. Cookie Secret Validation
  try {
    getCookieSecret();
  } catch (err) {
    errors.push(err.message);
  }

  // 3. Session Secret Validation
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret.trim() === "") {
    errors.push("FATAL: SESSION_SECRET is missing or empty in production.");
  } else if (KNOWN_PLACEHOLDERS.has(sessionSecret.trim())) {
    errors.push("FATAL: Insecure placeholder SESSION_SECRET detected in production.");
  }

  // 4. Internal AI Service Key Validation
  const internalKey = process.env.INTERNAL_SERVICE_KEY;
  if (!internalKey || internalKey.trim() === "") {
    errors.push("FATAL: INTERNAL_SERVICE_KEY is missing or empty in production.");
  } else if (KNOWN_PLACEHOLDERS.has(internalKey.trim())) {
    errors.push("FATAL: Insecure placeholder INTERNAL_SERVICE_KEY detected in production.");
  }

  // 5. Database Connection URI
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri || mongoUri.trim() === "") {
    errors.push("FATAL: MONGO_URI is missing or empty in production.");
  }

  // 6. Redis Connection URL
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl || redisUrl.trim() === "") {
    errors.push("FATAL: REDIS_URL is missing or empty in production.");
  }

  // 7. Client URL for CORS
  const clientUrl = process.env.CLIENT_URL;
  if (!clientUrl || clientUrl.trim() === "") {
    errors.push("FATAL: CLIENT_URL must be explicitly configured in production for CORS allowlisting.");
  }

  if (errors.length > 0) {
    const errorSummary = `\n🚨 CRITICAL PRODUCTION CONFIGURATION ERRORS:\n` + errors.map((e) => `   - ${e}`).join("\n");
    throw new ConfigurationError(errorSummary);
  }

  return { valid: true, errors: [] };
};

module.exports = {
  isProduction,
  getJwtSecret,
  getCookieSecret,
  validateProductionEnv,
  ConfigurationError,
  KNOWN_PLACEHOLDERS
};
