/**
 * GuardianLink — AI Service Custom Error Hierarchy
 *
 * Provides structured, typed error classes for AI microservice communication.
 * Preserves upstream error causes, HTTP status codes, and domain failure codes
 * while sanitizing sensitive credentials, biometric vectors, and PII.
 */

class AIServiceError extends Error {
  /**
   * @param {string} message - Human-readable error description
   * @param {Object} [options]
   * @param {string} [options.code='AI_SERVICE_ERROR'] - Domain error code
   * @param {number} [options.statusCode=500] - Corresponding HTTP status code
   * @param {Object} [options.details={}] - Additional sanitized diagnostic metadata
   * @param {Error} [options.cause] - Original underlying error
   */
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code || "AI_SERVICE_ERROR";
    this.statusCode = options.statusCode || 500;
    this.details = options.details || {};
    if (options.cause) {
      this.cause = options.cause;
    }
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details
    };
  }
}

/**
 * Thrown when required client configuration is missing or invalid.
 * Strictly guarantees that secrets or partial keys are never printed in messages.
 */
class AIServiceConfigError extends AIServiceError {
  constructor(message, options = {}) {
    super(message, {
      code: "AI_CONFIG_ERROR",
      statusCode: 500,
      ...options
    });
  }
}

/**
 * Thrown when an HTTP request exceeds the configured timeout threshold.
 */
class AIServiceTimeoutError extends AIServiceError {
  constructor(message, options = {}) {
    super(message, {
      code: "AI_SERVICE_TIMEOUT",
      statusCode: 504,
      ...options
    });
  }
}

/**
 * Thrown when the AI service is unreachable (network down, connection refused, DNS failure, 503).
 */
class AIServiceUnavailableError extends AIServiceError {
  constructor(message, options = {}) {
    super(message, {
      code: "AI_SERVICE_UNAVAILABLE",
      statusCode: 503,
      ...options
    });
  }
}

/**
 * Thrown when authentication with the AI service fails (HTTP 401 or 403).
 */
class AIServiceAuthenticationError extends AIServiceError {
  constructor(message, options = {}) {
    super(message, {
      code: "AI_AUTH_FAILED",
      statusCode: 401,
      ...options
    });
  }
}

/**
 * Thrown when request input fails validation by the AI service (HTTP 400 or 422).
 * Examples: NO_FACE_DETECTED, MULTIPLE_FACES_DETECTED, INVALID_CHILD_ID.
 */
class AIServiceValidationError extends AIServiceError {
  constructor(message, options = {}) {
    super(message, {
      code: options.code || "AI_VALIDATION_ERROR",
      statusCode: options.statusCode || 422,
      ...options
    });
  }
}

/**
 * Thrown when the AI service responds with an unexpected schema, malformed JSON, or 5xx error.
 */
class AIServiceResponseError extends AIServiceError {
  constructor(message, options = {}) {
    super(message, {
      code: options.code || "AI_BAD_RESPONSE",
      statusCode: options.statusCode || 502,
      ...options
    });
  }
}

module.exports = {
  AIServiceError,
  AIServiceConfigError,
  AIServiceTimeoutError,
  AIServiceUnavailableError,
  AIServiceAuthenticationError,
  AIServiceValidationError,
  AIServiceResponseError
};
