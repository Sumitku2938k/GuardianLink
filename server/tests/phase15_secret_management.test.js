const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert");
const jwt = require("jsonwebtoken");
const { getJwtSecret, ConfigurationError, KNOWN_PLACEHOLDERS } = require("../config/envValidator");
const bootstrapAdmin = require("../utils/bootstrapAdmin");

describe("GuardianLink Phase 15: Secret Management & Hardening Tests", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("2.1 JWT signed with production secret verifies successfully with identical secret", () => {
    process.env.NODE_ENV = "production";
    const prodSecret = "production_secure_jwt_signing_key_at_least_32_bytes_long";
    process.env.JWT_SECRET = prodSecret;

    const payload = { id: "user_123", role: "police" };
    const token = jwt.sign(payload, getJwtSecret(), { expiresIn: "1h" });

    const decoded = jwt.verify(token, getJwtSecret());
    assert.strictEqual(decoded.id, "user_123");
    assert.strictEqual(decoded.role, "police");
  });

  it("2.2 JWT verification fails when signed with wrong secret (Cryptographic Fail-Closed)", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "production_secure_jwt_signing_key_at_least_32_bytes_long";

    const attackerSecret = "malicious_forged_secret_key_at_least_32_bytes_long";
    const forgedToken = jwt.sign({ id: "hacker", role: "admin" }, attackerSecret);

    assert.throws(() => {
      jwt.verify(forgedToken, getJwtSecret());
    }, (err) => err.name === "JsonWebTokenError");
  });

  it("2.3 Configuration errors do NOT leak secret values in error text", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "your_jwt_secret_here";

    try {
      getJwtSecret();
      assert.fail("Should have thrown ConfigurationError");
    } catch (err) {
      assert.ok(err instanceof ConfigurationError);
      // Ensure error message does not echo the actual raw secret value
      assert.strictEqual(err.message.includes("your_jwt_secret_here"), false);
      assert.ok(err.message.includes("Insecure placeholder JWT_SECRET detected"));
    }
  });

  it("2.4 In production, known insecure default passwords are in the blocklist", () => {
    assert.ok(KNOWN_PLACEHOLDERS.has("admin123"));
    assert.ok(KNOWN_PLACEHOLDERS.has("password"));
    assert.ok(KNOWN_PLACEHOLDERS.has("changeme"));
    assert.ok(KNOWN_PLACEHOLDERS.has("your_jwt_secret_here"));
    assert.ok(KNOWN_PLACEHOLDERS.has("dev_internal_secret_change_in_production"));
  });

  it("2.5 Admin bootstrap safely aborts if weak/placeholder password is provided in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.ADMIN_PASSWORD = "admin123"; // weak & in blocklist
    process.env.ADMIN_EMAIL = "admin_test@test.local";

    let loggedError = false;
    const origError = console.error;
    console.error = (msg) => {
      if (typeof msg === "string" && msg.includes("Refusing to bootstrap Administrator with weak or placeholder password")) {
        loggedError = true;
      }
    };

    try {
      await bootstrapAdmin();
      assert.strictEqual(loggedError, true);
    } finally {
      console.error = origError;
    }
  });

  it("2.6 Admin bootstrap skips execution without error when ADMIN_PASSWORD is unset", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ADMIN_PASSWORD;

    let loggedWarning = false;
    const origWarn = console.warn;
    console.warn = (msg) => {
      if (typeof msg === "string" && msg.includes("ADMIN_PASSWORD environment variable not set")) {
        loggedWarning = true;
      }
    };

    try {
      await bootstrapAdmin();
      assert.strictEqual(loggedWarning, true);
    } finally {
      console.warn = origWarn;
    }
  });
});
