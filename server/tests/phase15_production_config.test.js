const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert");
const {
  isProduction,
  getJwtSecret,
  getCookieSecret,
  validateProductionEnv,
  ConfigurationError,
  KNOWN_PLACEHOLDERS
} = require("../config/envValidator");

describe("GuardianLink Phase 15: Production Environment Configuration Tests", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("1.1 Detects production environment correctly based on NODE_ENV", () => {
    process.env.NODE_ENV = "production";
    assert.strictEqual(isProduction(), true);

    process.env.NODE_ENV = "development";
    assert.strictEqual(isProduction(), false);

    delete process.env.NODE_ENV;
    assert.strictEqual(isProduction(), false);
  });

  it("1.2 Throws ConfigurationError when JWT_SECRET is missing in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.JWT_SECRET;

    assert.throws(
      () => getJwtSecret(),
      (err) => err instanceof ConfigurationError && err.message.includes("JWT_SECRET")
    );
  });

  it("1.3 Throws ConfigurationError when JWT_SECRET is shorter than 32 characters in production", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "short_secret_123";

    assert.throws(
      () => getJwtSecret(),
      (err) => err instanceof ConfigurationError && err.message.includes("at least 32 characters")
    );
  });

  it("1.4 Throws ConfigurationError when JWT_SECRET is a known insecure placeholder in production", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "your_jwt_secret_here";

    assert.throws(
      () => getJwtSecret(),
      (err) => err instanceof ConfigurationError && err.message.includes("placeholder")
    );
  });

  it("1.5 Successfully returns validated JWT_SECRET in production when valid", () => {
    process.env.NODE_ENV = "production";
    const validSecret = "a_super_strong_cryptographic_production_jwt_secret_64_bytes_long";
    process.env.JWT_SECRET = validSecret;

    const retrieved = getJwtSecret();
    assert.strictEqual(retrieved, validSecret);
  });

  it("1.6 Provides safe fallback JWT_SECRET in development without throwing", () => {
    process.env.NODE_ENV = "development";
    delete process.env.JWT_SECRET;

    const retrieved = getJwtSecret();
    assert.ok(retrieved.length > 0);
  });

  it("1.7 Throws ConfigurationError when COOKIE_SECRET is missing in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.COOKIE_SECRET;

    assert.throws(
      () => getCookieSecret(),
      (err) => err instanceof ConfigurationError && err.message.includes("COOKIE_SECRET")
    );
  });

  it("1.8 validateProductionEnv() rejects incomplete production environment", () => {
    process.env.NODE_ENV = "production";
    delete process.env.JWT_SECRET;
    delete process.env.SESSION_SECRET;
    delete process.env.COOKIE_SECRET;
    delete process.env.INTERNAL_SERVICE_KEY;
    delete process.env.MONGO_URI;
    delete process.env.REDIS_URL;
    delete process.env.CLIENT_URL;

    assert.throws(
      () => validateProductionEnv(),
      (err) => err instanceof ConfigurationError && err.message.includes("CRITICAL PRODUCTION CONFIGURATION ERRORS")
    );
  });

  it("1.9 validateProductionEnv() passes when all required production variables are set", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "production_jwt_secret_key_with_at_least_32_characters_length";
    process.env.SESSION_SECRET = "production_session_secret_key_at_least_32_characters_length";
    process.env.COOKIE_SECRET = "production_cookie_secret_key_at_least_32_characters_length";
    process.env.INTERNAL_SERVICE_KEY = "production_internal_key_at_least_32_characters_length";
    process.env.MONGO_URI = "mongodb+srv://admin:pass@cluster.mongodb.net/guardianlink";
    process.env.REDIS_URL = "rediss://default:pass@redis-managed.cloud:6379";
    process.env.CLIENT_URL = "https://guardianlink.org";

    const result = validateProductionEnv();
    assert.strictEqual(result.valid, true);
  });

  it("1.10 In non-production mode, validateProductionEnv() returns valid without throwing", () => {
    process.env.NODE_ENV = "development";
    delete process.env.JWT_SECRET;

    const result = validateProductionEnv();
    assert.strictEqual(result.valid, true);
  });
});
