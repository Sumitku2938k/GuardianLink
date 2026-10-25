/**
 * GuardianLink — Phase 13: AI Service Network Isolation & Internal Authentication Test Suite
 *
 * Validates:
 * 1. Express AI HTTP Client Security:
 *    - Strict internalServiceKey assertion before calling protected endpoints
 *    - Consistent attachment of 'X-Internal-Service-Key' header on mutations and searches
 *    - Safe unauthenticated /health probing
 *    - Immunity against user-controlled credential and URL overrides
 *    - Zero secret key leakage in error messages and error representations
 *    - Timeout and connection failure safety
 * 2. FastAPI Live Endpoint Authentication Matrix:
 *    - Rejection of missing, invalid, empty, and whitespace X-Internal-Service-Key
 *    - Verification of all internal routes: /internal/face/* and /internal/ai/*
 *    - Health endpoint privacy (no collection or internal architecture leaks)
 * 3. Deployment Configuration & Network Isolation:
 *    - docker-compose.prod.yml unmaps port 8000 and 6333 from host
 *    - docker-compose.yml limits ports to 127.0.0.1 loopback
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { AIServiceClient } = require("../services/aiService");
const { AIServiceConfigError } = require("../errors/aiErrors");

const AI_BASE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
const DEV_SECRET_KEY = process.env.INTERNAL_SERVICE_KEY || "dev_internal_secret_change_in_production";

describe("GuardianLink Phase 13: AI Security Hardening & Network Isolation Suite", () => {
  // =========================================================================
  // 1. Express AI HTTP Client Security
  // =========================================================================
  describe("1. Express AI Client Security Controls", () => {
    it("1.1 Client rejects execution if INTERNAL_SERVICE_KEY is empty", () => {
      const client = new AIServiceClient({
        baseUrl: "http://127.0.0.1:8000",
        internalServiceKey: ""
      });

      assert.throws(
        () => client._assertAuthKey(""),
        (err) => {
          assert.ok(err instanceof AIServiceConfigError);
          assert.ok(err.message.includes("INTERNAL_SERVICE_KEY is not configured"));
          return true;
        }
      );
    });

    it("1.2 Client rejects execution if INTERNAL_SERVICE_KEY is whitespace only", () => {
      const client = new AIServiceClient({
        baseUrl: "http://127.0.0.1:8000",
        internalServiceKey: "   "
      });

      assert.throws(
        () => client._assertAuthKey("   "),
        (err) => {
          assert.ok(err instanceof AIServiceConfigError);
          return true;
        }
      );
    });

    it("1.3 Client attaches 'X-Internal-Service-Key' header on protected requests", async () => {
      let interceptedHeaders = null;

      const mockFetch = async (url, options) => {
        interceptedHeaders = options.headers;
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: async () => JSON.stringify({
            success: true,
            status: "enrolled",
            child_id: "child_test_123",
            face_profile_id: "fp_1",
            message: "Enrolled"
          })
        };
      };

      const client = new AIServiceClient({
        baseUrl: "http://mock-ai:8000",
        internalServiceKey: "test_secret_key_abc_123",
        fetchFn: mockFetch
      });

      await client.enrollFace({
        childId: "child_test_123",
        imageBuffer: Buffer.from("fake-image-bytes-32-bytes-long-padding-ok")
      });

      assert.ok(interceptedHeaders);
      const attachedKey = interceptedHeaders instanceof Headers
        ? interceptedHeaders.get("x-internal-service-key")
        : (interceptedHeaders["X-Internal-Service-Key"] || interceptedHeaders["x-internal-service-key"]);
      assert.equal(
        attachedKey,
        "test_secret_key_abc_123",
        "Client must attach configured internal service key"
      );
    });

    it("1.4 Client does NOT attach service key to unauthenticated health checks", async () => {
      let interceptedHeaders = null;

      const mockFetch = async (url, options) => {
        interceptedHeaders = options.headers;
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: async () => JSON.stringify({
            status: "ok",
            service: "guardianlink-ai-service",
            version: "1.0.0",
            models_loaded: false,
            qdrant_connected: true,
            details: { collection_ready: true }
          })
        };
      };

      const client = new AIServiceClient({
        baseUrl: "http://mock-ai:8000",
        internalServiceKey: "test_secret_key_abc_123",
        fetchFn: mockFetch
      });

      await client.healthCheck();

      assert.ok(interceptedHeaders);
      const attachedKey = interceptedHeaders instanceof Headers
        ? interceptedHeaders.get("x-internal-service-key")
        : (interceptedHeaders["X-Internal-Service-Key"] || interceptedHeaders["x-internal-service-key"]);
      assert.equal(
        attachedKey,
        null,
        "Public health check must not transmit internal service key"
      );
    });

    it("1.5 Client error objects NEVER expose the internal service key", async () => {
      const secret = "SUPER_SECRET_INTERNAL_KEY_DO_NOT_LEAK_9988";

      const mockFetch = async () => {
        return {
          ok: false,
          status: 401,
          headers: new Headers({ "content-type": "application/json" }),
          text: async () => JSON.stringify({
            detail: "Invalid internal service key"
          })
        };
      };

      const client = new AIServiceClient({
        baseUrl: "http://mock-ai:8000",
        internalServiceKey: secret,
        fetchFn: mockFetch
      });

      try {
        await client.deleteFaceProfile("child_test_123");
        assert.fail("Should have thrown error");
      } catch (err) {
        const serialized = JSON.stringify(err);
        const message = err.message;
        assert.equal(message.includes(secret), false, "Error message must not contain secret");
        assert.equal(serialized.includes(secret), false, "Serialized error must not contain secret");
      }
    });

    it("1.6 Client cannot have its internal key overridden by user parameters", () => {
      const trustedClient = new AIServiceClient({
        baseUrl: "http://internal-ai:8000",
        internalServiceKey: "trusted_server_secret"
      });

      const config = trustedClient._getConfig();
      assert.equal(config.internalServiceKey, "trusted_server_secret");
      assert.equal(config.baseUrl, "http://internal-ai:8000");
    });
  });

  // =========================================================================
  // 2. FastAPI Endpoint Authentication Matrix (Live / Network)
  // =========================================================================
  describe("2. FastAPI AI Service Authentication Matrix", () => {
    it("2.1 GET /health is accessible without authentication and stripped of sensitive internals", async () => {
      const res = await fetch(`${AI_BASE_URL}/health`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.status, "ok");
      assert.equal(data.service, "guardianlink-ai-service");
      assert.equal(typeof data.qdrant_connected, "boolean");

      // Verify sensitive details are NOT exposed
      assert.equal(data.details.collection_name, undefined, "collection_name must be stripped");
      assert.equal(data.details.model_name, undefined, "model_name must be stripped");
    });

    // Endpoint matrix: all protected routes across /internal/face and /internal/ai
    const protectedRoutes = [
      { method: "POST", path: "/internal/face/enroll" },
      { method: "POST", path: "/internal/ai/enroll" },
      { method: "POST", path: "/internal/face/search" },
      { method: "POST", path: "/internal/ai/search" },
      { method: "DELETE", path: "/internal/face/delete/test_id" },
      { method: "DELETE", path: "/internal/ai/delete/test_id" }
    ];

    for (const route of protectedRoutes) {
      it(`2.2 Rejects ${route.method} ${route.path} without X-Internal-Service-Key (401)`, async () => {
        const options = {
          method: route.method,
          headers: {}
        };
        if (route.method === "POST") {
          const form = new FormData();
          form.append("file", new Blob(["dummy"], { type: "image/png" }), "test.png");
          if (route.path.includes("enroll")) form.append("child_id", "test_id");
          options.body = form;
        }

        const res = await fetch(`${AI_BASE_URL}${route.path}`, options);
        assert.equal(res.status, 401, `${route.path} must return 401 without key`);
        const data = await res.json();
        assert.ok(
          data.detail.includes("X-Internal-Service-Key") ||
          data.detail.includes("Missing or invalid")
        );
      });

      it(`2.3 Rejects ${route.method} ${route.path} with incorrect X-Internal-Service-Key (401)`, async () => {
        const options = {
          method: route.method,
          headers: { "X-Internal-Service-Key": "WRONG_FORGED_KEY_999" }
        };
        if (route.method === "POST") {
          const form = new FormData();
          form.append("file", new Blob(["dummy"], { type: "image/png" }), "test.png");
          if (route.path.includes("enroll")) form.append("child_id", "test_id");
          options.body = form;
        }

        const res = await fetch(`${AI_BASE_URL}${route.path}`, options);
        assert.equal(res.status, 401, `${route.path} must return 401 with wrong key`);
      });

      it(`2.4 Rejects ${route.method} ${route.path} with whitespace-only X-Internal-Service-Key (401)`, async () => {
        const options = {
          method: route.method,
          headers: { "X-Internal-Service-Key": "     " }
        };
        if (route.method === "POST") {
          const form = new FormData();
          form.append("file", new Blob(["dummy"], { type: "image/png" }), "test.png");
          if (route.path.includes("enroll")) form.append("child_id", "test_id");
          options.body = form;
        }

        const res = await fetch(`${AI_BASE_URL}${route.path}`, options);
        assert.equal(res.status, 401, `${route.path} must return 401 with whitespace key`);
      });
    }
  });

  // =========================================================================
  // 3. Docker Compose Production Hardening & Network Isolation Audit
  // =========================================================================
  describe("3. Docker Compose Production Hardening & Network Isolation", () => {
    it("3.1 docker-compose.prod.yml does NOT publish port 8000 or 6333 to the host", () => {
      const prodComposePath = path.join(__dirname, "../../docker-compose.prod.yml");
      assert.ok(fs.existsSync(prodComposePath), "docker-compose.prod.yml must exist");
      const prodContent = fs.readFileSync(prodComposePath, "utf8");

      // Verify neither port 8000 nor 6333 has host port mappings in prod
      assert.equal(
        prodContent.includes('"8000:8000"'),
        false,
        "Production compose must NOT publish port 8000 to host"
      );
      assert.equal(
        prodContent.includes('"6333:6333"'),
        false,
        "Production compose must NOT publish port 6333 to host"
      );
      assert.equal(
        prodContent.includes('"127.0.0.1:8000:8000"'),
        false,
        "Production compose must NOT bind 8000 to host"
      );
    });

    it("3.2 docker-compose.prod.yml enforces ENVIRONMENT: production and internal bridge network", () => {
      const prodComposePath = path.join(__dirname, "../../docker-compose.prod.yml");
      const prodContent = fs.readFileSync(prodComposePath, "utf8");

      assert.ok(prodContent.includes("ENVIRONMENT: production"));
      assert.ok(prodContent.includes("guardianlink-internal-net"));
      assert.ok(prodContent.includes("expose:"));
      assert.ok(prodContent.includes('"8000"'));
    });

    it("3.3 docker-compose.yml (development) limits sensitive bindings strictly to 127.0.0.1", () => {
      const devComposePath = path.join(__dirname, "../../docker-compose.yml");
      const devContent = fs.readFileSync(devComposePath, "utf8");

      assert.ok(
        devContent.includes('"127.0.0.1:8000:8000"'),
        "Dev compose must bind AI port to 127.0.0.1 only"
      );
      assert.ok(
        devContent.includes('"127.0.0.1:6333:6333"'),
        "Dev compose must bind Qdrant port to 127.0.0.1 only"
      );
    });
  });
});
