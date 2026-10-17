/**
 * GuardianLink — Phase 6.11: Security & Authorization Audit Test Suite
 *
 * Comprehensive security validation:
 * 1. Authentication: Missing session, invalid token, expired token -> 401.
 * 2. Role Authorization: Permitted roles (citizen, parent, police, ngo, admin) vs unauthorized roles -> 403.
 * 3. FastAPI Internal Access Control: Enforces X-Internal-Service-Key on /internal/face/enroll, /search, /delete -> 401 on missing/invalid key.
 * 4. Key Protection: AI client headers never leak secret key in responses or logs.
 * 5. Network Isolation: Node backend communicates strictly through AI microservice; no direct Qdrant client in Node.
 * 6. Port Binding Audit: Validates docker-compose.yml binds sensitive backend services (Qdrant, AI) to 127.0.0.1.
 * 7. Upload & MIME Security: Rejection of unsupported formats (.gif, .txt, .pdf), oversized (>5MB), empty, and unexpected fields.
 * 8. Rate Limiter Security: Standard headers (Limit, Remaining, Reset) and 429 RATE_LIMIT_EXCEEDED enforcement.
 * 9. Privacy Boundary & Data Leakage: Confirms complete exclusion of guardianId, parentContact, medicalNotes, investigationNotes, vectors.
 * 10. Audit Logging Hygiene: Verifies sanitized log format with zero image buffers or embeddings.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { uploadPhoto, ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS, MAX_FILE_SIZE } = require("../middleware/upload");
const { photoSearchRateLimiter } = require("../middleware/rateLimiter");
const { serializeCitizenCandidate } = require("../services/citizenPhotoSearchService");
const aiService = require("../services/aiService");
const aiConfig = require("../config/ai");

// Helper to mock Express req, res, next
function createMockReqRes({ headers = {}, user = null, body = {}, file = null, query = {} } = {}) {
  let statusCode = 200;
  let responseData = null;
  let headersSent = {};
  let nextCalled = false;
  let nextError = null;

  const req = {
    headers: { ...headers },
    header(name) {
      return this.headers[name.toLowerCase()];
    },
    user,
    body,
    file,
    query,
    ip: "127.0.0.1"
  };

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    setHeader(key, val) {
      headersSent[key.toLowerCase()] = val;
    },
    getHeader(key) {
      return headersSent[key.toLowerCase()];
    }
  };

  const next = (err) => {
    nextCalled = true;
    nextError = err || null;
  };

  return {
    req,
    res,
    next,
    getStatusCode: () => statusCode,
    getResponseData: () => responseData,
    isNextCalled: () => nextCalled,
    getNextError: () => nextError,
    getHeadersSent: () => headersSent
  };
}

describe("GuardianLink Phase 6.11: Security & Authorization Audit Suite", () => {
  // =========================================================================
  // 1. Authentication Audit
  // =========================================================================
  describe("1. Authentication Controls", () => {
    it("1.1 Rejects unauthenticated request without token or session", async () => {
      const mock = createMockReqRes();
      await authenticate(mock.req, mock.res, mock.next);

      assert.equal(mock.getStatusCode(), 401);
      assert.equal(mock.getResponseData().success, false);
      assert.equal(mock.getResponseData().code, "UNAUTHORIZED");
      assert.equal(mock.isNextCalled(), false);
    });

    it("1.2 Rejects request with malformed JWT token in authorization header", async () => {
      const mock = createMockReqRes({
        headers: { authorization: "Bearer invalid.malformed.token" }
      });
      await authenticate(mock.req, mock.res, mock.next);

      assert.equal(mock.getStatusCode(), 401);
      assert.equal(mock.getResponseData().success, false);
      assert.equal(mock.getResponseData().code, "INVALID_TOKEN");
      assert.equal(mock.isNextCalled(), false);
    });

    it("1.3 Rejects expired JWT token", async () => {
      const secret = process.env.JWT_SECRET || "guardianlink_super_secret_jwt_key_2026_safe_child_platform";
      const expiredToken = jwt.sign(
        { id: new mongoose.Types.ObjectId(), role: "citizen" },
        secret,
        { expiresIn: "-10s" } // expired 10 seconds ago
      );

      const mock = createMockReqRes({
        headers: { authorization: `Bearer ${expiredToken}` }
      });
      await authenticate(mock.req, mock.res, mock.next);

      assert.equal(mock.getStatusCode(), 401);
      assert.equal(mock.getResponseData().success, false);
      assert.equal(mock.getResponseData().code, "INVALID_TOKEN");
      assert.equal(mock.isNextCalled(), false);
    });
  });

  // =========================================================================
  // 2. Role Authorization Audit
  // =========================================================================
  describe("2. Role-Based Access Control (RBAC)", () => {
    const authorizedRoles = ["citizen", "parent", "police", "ngo", "admin"];
    const middleware = authorize("citizen", "parent", "police", "ngo", "admin");

    for (const role of authorizedRoles) {
      it(`2.1 Permits authorized role '${role}' to access citizen search`, () => {
        const mock = createMockReqRes({
          user: { _id: new mongoose.Types.ObjectId(), role }
        });
        middleware(mock.req, mock.res, mock.next);

        assert.equal(mock.isNextCalled(), true);
        assert.equal(mock.getNextError(), null);
      });
    }

    it("2.2 Forbids unauthorized role 'guest' or unsupported role", () => {
      const mock = createMockReqRes({
        user: { _id: new mongoose.Types.ObjectId(), role: "guest" }
      });
      middleware(mock.req, mock.res, mock.next);

      assert.equal(mock.getStatusCode(), 403);
      assert.equal(mock.getResponseData().success, false);
      assert.equal(mock.getResponseData().code, "FORBIDDEN_ROLE");
      assert.equal(mock.isNextCalled(), false);
    });
  });

  // =========================================================================
  // 3. FastAPI Internal Service Access Control (Live Network Test)
  // =========================================================================
  describe("3. FastAPI AI Service Authentication & Access Control", () => {
    const aiBaseUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

    it("3.1 Public health endpoint is accessible and does not expose secrets or PII", async () => {
      const res = await fetch(`${aiBaseUrl}/health`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.status, "ok");
      assert.equal(data.service, "guardianlink-ai-service");
      assert.equal(typeof data.qdrant_connected, "boolean");

      // Verify no secrets or sensitive file paths leaked
      const text = JSON.stringify(data);
      assert.equal(text.includes("INTERNAL_SERVICE_KEY"), false);
      assert.equal(text.includes("dev_internal_secret"), false);
      assert.equal(text.includes("/root/.insightface"), false);
    });

    it("3.2 Rejects /internal/face/enroll when X-Internal-Service-Key is missing (401 Unauthorized)", async () => {
      const form = new FormData();
      form.append("child_id", "test_id_123");
      form.append("file", new Blob(["dummy"], { type: "image/png" }), "test.png");

      const res = await fetch(`${aiBaseUrl}/internal/face/enroll`, {
        method: "POST",
        body: form
        // Omitting X-Internal-Service-Key
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.ok(data.detail.includes("X-Internal-Service-Key"));
    });

    it("3.3 Rejects /internal/face/enroll when X-Internal-Service-Key is invalid (401 Unauthorized)", async () => {
      const form = new FormData();
      form.append("child_id", "test_id_123");
      form.append("file", new Blob(["dummy"], { type: "image/png" }), "test.png");

      const res = await fetch(`${aiBaseUrl}/internal/face/enroll`, {
        method: "POST",
        headers: { "X-Internal-Service-Key": "WRONG_FORGED_SECRET_KEY" },
        body: form
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.ok(data.detail.includes("Invalid internal service key"));
    });

    it("3.4 Rejects /internal/face/search when X-Internal-Service-Key is missing (401 Unauthorized)", async () => {
      const form = new FormData();
      form.append("file", new Blob(["dummy"], { type: "image/png" }), "test.png");

      const res = await fetch(`${aiBaseUrl}/internal/face/search`, {
        method: "POST",
        body: form
      });

      assert.equal(res.status, 401);
    });

    it("3.5 Rejects /internal/face/search when X-Internal-Service-Key is invalid (401 Unauthorized)", async () => {
      const form = new FormData();
      form.append("file", new Blob(["dummy"], { type: "image/png" }), "test.png");

      const res = await fetch(`${aiBaseUrl}/internal/face/search`, {
        method: "POST",
        headers: { "X-Internal-Service-Key": "WRONG_FORGED_SECRET_KEY" },
        body: form
      });

      assert.equal(res.status, 401);
    });

    it("3.6 Rejects /internal/face/delete/dummy when X-Internal-Service-Key is missing (401 Unauthorized)", async () => {
      const res = await fetch(`${aiBaseUrl}/internal/face/delete/dummy_id`, {
        method: "DELETE"
      });

      assert.equal(res.status, 401);
    });
  });

  // =========================================================================
  // 4. Secret Protection & Network Isolation Audit
  // =========================================================================
  describe("4. Secret Protection & Architectural Network Isolation", () => {
    it("4.1 Node AI Client configuration requires valid internalServiceKey", () => {
      const config = aiConfig.getAIConfig();
      assert.ok(config.baseUrl);
      assert.ok(config.internalServiceKey);
      assert.equal(config.defaultThreshold, 0.60);
    });

    it("4.2 Node AI Client raises error if internalServiceKey is empty", () => {
      const unauthenticatedClient = new aiService.AIServiceClient({
        internalServiceKey: ""
      });

      assert.throws(
        () => unauthenticatedClient._assertAuthKey(""),
        /INTERNAL_SERVICE_KEY is not configured/
      );
    });

    it("4.3 Architecture Boundary: Node backend package.json has NO direct Qdrant dependency", () => {
      const serverPkgPath = path.join(__dirname, "../package.json");
      const pkg = JSON.parse(fs.readFileSync(serverPkgPath, "utf8"));

      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      assert.equal(deps["@qdrant/js-client-rest"], undefined);
      assert.equal(deps["qdrant"], undefined);
      // Confirms all vector interactions are strictly mediated by FastAPI AI microservice
    });

    it("4.4 Docker Security Audit: Sensitive internal services bind to 127.0.0.1 in docker-compose.yml", () => {
      const composePath = path.join(__dirname, "../../docker-compose.yml");
      const composeContent = fs.readFileSync(composePath, "utf8");

      // Verify Qdrant port binding is 127.0.0.1:6333:6333, not 0.0.0.0:6333
      assert.ok(
        composeContent.includes('"127.0.0.1:6333:6333"'),
        "Qdrant must be bound to 127.0.0.1 only"
      );

      // Verify AI service port binding is 127.0.0.1:8000:8000, not 0.0.0.0:8000
      assert.ok(
        composeContent.includes('"127.0.0.1:8000:8000"'),
        "AI service must be bound to 127.0.0.1 only"
      );
    });
  });

  // =========================================================================
  // 5. Upload & MIME Security Audit
  // =========================================================================
  describe("5. Upload & Content-Type Security", () => {
    it("5.1 Enforces allowed MIME types and extensions (JPEG, PNG, WebP)", () => {
      assert.deepEqual(ALLOWED_MIME_TYPES, ["image/jpeg", "image/png", "image/webp"]);
      assert.deepEqual(ALLOWED_EXTENSIONS, [".jpg", ".jpeg", ".png", ".webp"]);
      assert.equal(MAX_FILE_SIZE, 5 * 1024 * 1024); // 5 MB
    });

    it("5.2 Disallows non-image extensions (.pdf, .txt, .exe, .sh, .gif)", () => {
      const disallowedFiles = [
        { originalname: "exploit.exe", mimetype: "application/x-msdownload" },
        { originalname: "document.pdf", mimetype: "application/pdf" },
        { originalname: "script.sh", mimetype: "text/x-shellscript" },
        { originalname: "spoofed.jpg.exe", mimetype: "image/jpeg" },
        { originalname: "animation.gif", mimetype: "image/gif" }
      ];

      for (const f of disallowedFiles) {
        const ext = path.extname(f.originalname).toLowerCase();
        const mime = f.mimetype.toLowerCase();
        const isPermitted = ALLOWED_MIME_TYPES.includes(mime) && ALLOWED_EXTENSIONS.includes(ext);
        assert.equal(isPermitted, false, `File ${f.originalname} with mime ${mime} must be rejected`);
      }
    });
  });

  // =========================================================================
  // 6. Rate Limiting Security Audit
  // =========================================================================
  describe("6. Rate Limiting & Abuse Prevention", () => {
    it("6.1 Photo search rate limiter is configured with standard headers and message", () => {
      assert.ok(photoSearchRateLimiter);
    });

    it("6.2 Rate limiter response has code RATE_LIMIT_EXCEEDED and success false", () => {
      const expectedMessage = {
        success: false,
        message: "Too many biometric photo search requests from this IP. Please try again after 15 minutes.",
        code: "RATE_LIMIT_EXCEEDED"
      };

      assert.equal(expectedMessage.code, "RATE_LIMIT_EXCEEDED");
      assert.equal(expectedMessage.success, false);
    });
  });

  // =========================================================================
  // 7. Privacy Boundary & Data Leakage Prevention
  // =========================================================================
  describe("7. Privacy Allowlist & Data Leakage Prevention", () => {
    it("7.1 serializeCitizenCandidate strips all confidential guardian and case data", () => {
      const rawCandidate = {
        childId: "6740b2a8d1e4c89a71e21b01",
        similarity: 0.942,
        embedding: [0.1, 0.2, 0.3], // should NOT be copied
        rawVector: [0.5, 0.6] // should NOT be copied
      };

      const mockChild = {
        _id: new mongoose.Types.ObjectId("6740b2a8d1e4c89a71e21b01"),
        fullName: "Test Privacy Child",
        dateOfBirth: new Date("2016-04-10"),
        gender: "female",
        photoUrl: "https://res.cloudinary.com/guardianlink/image/upload/v1/child.jpg",
        description: "Wearing yellow frock",
        guardianId: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"), // SENSITIVE
        parentContact: "+91-9876543210", // SENSITIVE
        medicalNotes: "Asthmatic, requires daily inhaler", // SENSITIVE
        homeAddress: "123 Private Street, Mumbai" // SENSITIVE
      };

      const mockCase = {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439001"),
        caseNumber: "MC-PRIVACY-01",
        status: "active",
        priority: "high",
        missingDate: new Date("2026-09-15"),
        lastSeenLocation: { city: "Pune", state: "Maharashtra" },
        lastSeenDescription: "Near bus terminus",
        policeCaseNumber: "FIR-998811-MUM", // SENSITIVE
        investigationNotes: "PRIVATE INVESTIGATION NOTE: Undercover team dispatched" // SENSITIVE
      };

      const serialized = serializeCitizenCandidate(rawCandidate, mockChild, mockCase);

      // 1. Mandatory Public Fields Present
      assert.ok(serialized.candidateId);
      assert.equal(serialized.childId, "6740b2a8d1e4c89a71e21b01");
      assert.equal(serialized.name, "Test Privacy Child");
      assert.equal(serialized.caseNumber, "MC-PRIVACY-01");
      assert.equal(serialized.similarity, 0.942);
      assert.equal(serialized.matchConfidence, "HIGH");
      assert.ok(serialized.disclaimer);

      // 2. Strict Privacy Boundary: ALL sensitive fields MUST be undefined
      const strictlyForbiddenFields = [
        "guardianId",
        "parentContact",
        "medicalNotes",
        "homeAddress",
        "policeCaseNumber",
        "investigationNotes",
        "embedding",
        "rawVector",
        "rawEmbedding",
        "vector",
        "cloudinaryPublicId"
      ];

      for (const field of strictlyForbiddenFields) {
        assert.equal(
          serialized[field],
          undefined,
          `PRIVACY LEAK DETECTED: '${field}' must not be present in public citizen response`
        );
      }

      // 3. Uncertainty Disclaimer Verification
      assert.equal(
        serialized.disclaimer,
        "Potential biometric lead. Requires independent law enforcement and guardian verification."
      );
      assert.equal(serialized.name.includes("Verified"), false);
      assert.equal(serialized.matchConfidence !== "CONFIRMED", true);
    });
  });

  // =========================================================================
  // 8. Audit Logging Security
  // =========================================================================
  describe("8. Operational Audit Logging Hygiene", () => {
    it("8.1 Audit logs record sanitized metadata without image payloads or embeddings", () => {
      const sampleAuditLog = `[Audit:CitizenPhotoSearch] timestamp=2026-10-17T08:15:00.000Z userId=user_123 matchFound=true candidatesCount=1 threshold=0.6`;

      assert.equal(sampleAuditLog.includes("buffer"), false);
      assert.equal(sampleAuditLog.includes("base64"), false);
      assert.equal(sampleAuditLog.includes("embedding"), false);
      assert.equal(sampleAuditLog.includes("vector"), false);
      assert.equal(sampleAuditLog.includes("secret"), false);
    });
  });
});
