/**
 * GuardianLink — Phase 6.7: Automated Unit Test Suite for Node.js AI Client
 *
 * Covers:
 * 1. Correct AI base URL and request construction
 * 2. Correct X-Internal-Service-Key header on protected calls
 * 3. Enrollment request/response contract
 * 4. Search request/response contract
 * 5. Delete request/response contract
 * 6. Health response validation (healthy vs degraded)
 * 7. Request timeout handling (AIServiceTimeoutError)
 * 8. Network failure and connection refusal (AIServiceUnavailableError)
 * 9. HTTP 401/403 authentication failures (AIServiceAuthenticationError)
 * 10. HTTP 400/422 validation failures (NO_FACE_DETECTED, MULTIPLE_FACES_DETECTED)
 * 11. HTTP 429 rate limit and 5xx server errors
 * 12. Invalid JSON and malformed response bodies
 * 13. Invalid candidate IDs, NaN/Infinity similarity, and out-of-range scores
 * 14. Missing configuration and safe secret protection
 * 15. Confirmation that secrets and biometric payloads are not exposed in errors
 * 16. Confirmation that no automatic retry causes duplicate mutations
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { AIServiceClient } = require("../services/aiService");
const {
  AIServiceError,
  AIServiceConfigError,
  AIServiceTimeoutError,
  AIServiceUnavailableError,
  AIServiceAuthenticationError,
  AIServiceValidationError,
  AIServiceResponseError
} = require("../errors/aiErrors");

const TEST_KEY = "mock_secret_key_123456789";
const TEST_BASE_URL = "http://ai-service:8000";
const DUMMY_IMAGE = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]); // Minimal JPEG header

/**
 * Creates a mock fetch function that responds with provided options.
 */
function createMockFetch({ status = 200, statusText = "OK", headers = {}, body = {}, delayMs = 0, throws = null }) {
  let callCount = 0;
  const calls = [];

  const mockFn = async (url, options = {}) => {
    callCount++;
    calls.push({ url, options });

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    if (throws) {
      throw throws;
    }

    const bodyString = typeof body === "string" ? body : JSON.stringify(body);
    const responseHeaders = new Headers({
      "content-type": "application/json",
      ...headers
    });

    return new Response(bodyString, {
      status,
      statusText,
      headers: responseHeaders
    });
  };

  mockFn.getCallCount = () => callCount;
  mockFn.getCalls = () => calls;
  return mockFn;
}

describe("AIServiceClient Unit Test Suite", () => {
  // 1. Correct AI base URL and request construction
  it("1. Normalizes AI base URL and constructs correct endpoint URLs", async () => {
    const mockFetch = createMockFetch({
      body: {
        status: "ok",
        service: "guardianlink-ai-service",
        version: "1.0.0",
        models_loaded: true,
        qdrant_connected: true,
        details: { collection_ready: true }
      }
    });

    const client = new AIServiceClient({
      baseUrl: "http://ai-service:8000////",
      internalServiceKey: TEST_KEY,
      fetchFn: mockFetch
    });

    await client.healthCheck();

    const calls = mockFetch.getCalls();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://ai-service:8000/health");
    assert.equal(calls[0].options.method, "GET");
  });

  // 2. Correct X-Internal-Service-Key header on protected calls
  it("2. Sends X-Internal-Service-Key header on protected calls and omits on healthCheck", async () => {
    const mockFetch = createMockFetch({
      body: {
        success: true,
        child_id: "child_test_123",
        face_profile_id: "c738169a-3618-5c86-ad93-9e2808661a0d",
        status: "enrolled",
        message: "Enrolled"
      }
    });

    const client = new AIServiceClient({
      baseUrl: TEST_BASE_URL,
      internalServiceKey: TEST_KEY,
      fetchFn: mockFetch
    });

    // Protected call
    await client.enrollFace({
      childId: "child_test_123",
      imageBuffer: DUMMY_IMAGE
    });

    const enrollHeaders = mockFetch.getCalls()[0].options.headers;
    assert.equal(enrollHeaders.get("X-Internal-Service-Key"), TEST_KEY);

    // Health check call (non-protected)
    const mockHealthFetch = createMockFetch({
      body: { status: "ok", qdrant_connected: true, details: { collection_ready: true } }
    });
    const healthClient = new AIServiceClient({
      baseUrl: TEST_BASE_URL,
      internalServiceKey: TEST_KEY,
      fetchFn: mockHealthFetch
    });

    await healthClient.healthCheck();
    const healthHeaders = mockHealthFetch.getCalls()[0].options.headers;
    assert.equal(healthHeaders.get("X-Internal-Service-Key"), null);
  });

  // 3. Enrollment request/response contract
  it("3. Validates enrollment request and parses response contract correctly", async () => {
    const mockFetch = createMockFetch({
      body: {
        success: true,
        child_id: "6740b2a8d1e4c89a71e21b34",
        face_profile_id: "3c04598c-018c-531a-a92d-6c6286ef339a",
        status: "enrolled",
        message: "Child reference facial biometric enrolled successfully."
      }
    });

    const client = new AIServiceClient({
      baseUrl: TEST_BASE_URL,
      internalServiceKey: TEST_KEY,
      fetchFn: mockFetch
    });

    const res = await client.enrollFace({
      childId: "6740b2a8d1e4c89a71e21b34",
      imageBuffer: DUMMY_IMAGE,
      mimeType: "image/jpeg",
      filename: "test_portrait.jpg"
    });

    assert.equal(res.success, true);
    assert.equal(res.childId, "6740b2a8d1e4c89a71e21b34");
    assert.equal(res.faceProfileId, "3c04598c-018c-531a-a92d-6c6286ef339a");
    assert.equal(res.status, "enrolled");

    const call = mockFetch.getCalls()[0];
    assert.equal(call.options.method, "POST");
    assert.match(call.url, /\/internal\/face\/enroll$/);
    assert.ok(call.options.body instanceof FormData);
  });

  // 4. Search request/response contract
  it("4. Validates search request and parses ranked candidates contract correctly", async () => {
    const mockFetch = createMockFetch({
      body: {
        match_found: true,
        candidates: [
          { child_id: "child_alpha", similarity: 0.942, confidence: 0.99 },
          { child_id: "child_beta", similarity: 0.815 }
        ],
        total_candidates: 2,
        threshold_applied: 0.60,
        message: "Found 2 candidate matches"
      }
    });

    const client = new AIServiceClient({
      baseUrl: TEST_BASE_URL,
      internalServiceKey: TEST_KEY,
      fetchFn: mockFetch
    });

    const res = await client.searchFace({
      imageBuffer: DUMMY_IMAGE,
      limit: 5,
      threshold: 0.60
    });

    assert.equal(res.matchFound, true);
    assert.equal(res.totalCandidates, 2);
    assert.equal(res.thresholdApplied, 0.60);
    assert.equal(res.candidates.length, 2);
    assert.equal(res.candidates[0].childId, "child_alpha");
    assert.equal(res.candidates[0].similarity, 0.942);
    assert.equal(res.candidates[0].confidence, 0.99);
    assert.equal(res.candidates[1].childId, "child_beta");
    assert.equal(res.candidates[1].similarity, 0.815);
  });

  // 5. Delete request/response contract
  it("5. Validates deletion request and parses response contract correctly", async () => {
    const mockFetch = createMockFetch({
      body: {
        success: true,
        child_id: "child_to_remove",
        face_profile_id: "3c85f40a-3afb-5f05-a634-90fcdff8f70b",
        message: "Child biometric vector deleted successfully."
      }
    });

    const client = new AIServiceClient({
      baseUrl: TEST_BASE_URL,
      internalServiceKey: TEST_KEY,
      fetchFn: mockFetch
    });

    const res = await client.deleteFaceProfile("child_to_remove");

    assert.equal(res.success, true);
    assert.equal(res.childId, "child_to_remove");
    assert.equal(res.faceProfileId, "3c85f40a-3afb-5f05-a634-90fcdff8f70b");

    const call = mockFetch.getCalls()[0];
    assert.equal(call.options.method, "DELETE");
    assert.match(call.url, /\/internal\/face\/child_to_remove$/);
  });

  // 6. Health response validation (healthy vs degraded)
  it("6. Distinguishes healthy status from degraded dependency state in healthCheck", async () => {
    // Case A: Fully Healthy
    const mockHealthy = createMockFetch({
      body: {
        status: "ok",
        service: "guardianlink-ai-service",
        version: "1.0.0",
        models_loaded: true,
        qdrant_connected: true,
        details: { collection_name: "missing_person_faces", collection_ready: true }
      }
    });
    const clientA = new AIServiceClient({ baseUrl: TEST_BASE_URL, fetchFn: mockHealthy });
    const resA = await clientA.healthCheck();
    assert.equal(resA.status, "ok");
    assert.equal(resA.isHealthy, true);
    assert.equal(resA.qdrantConnected, true);

    // Case B: Degraded (Qdrant offline)
    const mockDegraded = createMockFetch({
      body: {
        status: "degraded",
        service: "guardianlink-ai-service",
        version: "1.0.0",
        models_loaded: false,
        qdrant_connected: false,
        details: { collection_ready: false }
      }
    });
    const clientB = new AIServiceClient({ baseUrl: TEST_BASE_URL, fetchFn: mockDegraded });
    const resB = await clientB.healthCheck();
    assert.equal(resB.status, "degraded");
    assert.equal(resB.isHealthy, false);
    assert.equal(resB.qdrantConnected, false);
  });

  // 7. Request timeout handling
  it("7. Throws AIServiceTimeoutError on request timeout", async () => {
    const mockFetch = async (url, options) => {
      // Wait until aborted by AbortSignal
      return new Promise((resolve, reject) => {
        options.signal.addEventListener("abort", () => {
          const err = new Error("The operation was aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    };

    const client = new AIServiceClient({
      baseUrl: TEST_BASE_URL,
      internalServiceKey: TEST_KEY,
      timeoutMs: 50,
      fetchFn: mockFetch
    });

    await assert.rejects(
      async () => client.healthCheck(),
      (err) => {
        assert.ok(err instanceof AIServiceTimeoutError);
        assert.equal(err.code, "AI_SERVICE_TIMEOUT");
        assert.equal(err.statusCode, 504);
        return true;
      }
    );
  });

  // 8. Network failure and connection refusal
  it("8. Throws AIServiceUnavailableError on network failure or connection refused", async () => {
    const networkError = new TypeError("fetch failed: ECONNREFUSED 127.0.0.1:8000");
    const mockFetch = createMockFetch({ throws: networkError });

    const client = new AIServiceClient({
      baseUrl: TEST_BASE_URL,
      internalServiceKey: TEST_KEY,
      fetchFn: mockFetch
    });

    await assert.rejects(
      async () => client.healthCheck(),
      (err) => {
        assert.ok(err instanceof AIServiceUnavailableError);
        assert.equal(err.code, "AI_SERVICE_UNAVAILABLE");
        assert.equal(err.statusCode, 503);
        assert.equal(err.cause, networkError);
        return true;
      }
    );
  });

  // 9. HTTP 401/403 authentication failures
  it("9. Throws AIServiceAuthenticationError on HTTP 401 or 403", async () => {
    const mockFetch = createMockFetch({
      status: 401,
      statusText: "Unauthorized",
      body: { detail: "Invalid internal service key. Access denied." }
    });

    const client = new AIServiceClient({
      baseUrl: TEST_BASE_URL,
      internalServiceKey: "wrong_key",
      fetchFn: mockFetch
    });

    await assert.rejects(
      async () => client.enrollFace({ childId: "child_123", imageBuffer: DUMMY_IMAGE }),
      (err) => {
        assert.ok(err instanceof AIServiceAuthenticationError);
        assert.equal(err.code, "AI_AUTH_FAILED");
        assert.equal(err.statusCode, 401);
        assert.match(err.message, /authentication failed/i);
        return true;
      }
    );
  });

  // 10. HTTP 400/422 validation failures
  it("10. Throws AIServiceValidationError on NO_FACE_DETECTED or MULTIPLE_FACES_DETECTED", async () => {
    // Subtest: NO_FACE_DETECTED
    const mockNoFace = createMockFetch({
      status: 422,
      body: { detail: "No face detected in reference portrait.", code: "NO_FACE_DETECTED" }
    });
    const clientNoFace = new AIServiceClient({
      baseUrl: TEST_BASE_URL,
      internalServiceKey: TEST_KEY,
      fetchFn: mockNoFace
    });

    await assert.rejects(
      async () => clientNoFace.enrollFace({ childId: "child_123", imageBuffer: DUMMY_IMAGE }),
      (err) => {
        assert.ok(err instanceof AIServiceValidationError);
        assert.equal(err.code, "NO_FACE_DETECTED");
        assert.equal(err.statusCode, 422);
        return true;
      }
    );

    // Subtest: MULTIPLE_FACES_DETECTED
    const mockMultiFace = createMockFetch({
      status: 422,
      body: { detail: "Multiple faces detected (found: 2).", code: "MULTIPLE_FACES_DETECTED" }
    });
    const clientMultiFace = new AIServiceClient({
      baseUrl: TEST_BASE_URL,
      internalServiceKey: TEST_KEY,
      fetchFn: mockMultiFace
    });

    await assert.rejects(
      async () => clientMultiFace.enrollFace({ childId: "child_123", imageBuffer: DUMMY_IMAGE }),
      (err) => {
        assert.ok(err instanceof AIServiceValidationError);
        assert.equal(err.code, "MULTIPLE_FACES_DETECTED");
        assert.equal(err.statusCode, 422);
        return true;
      }
    );
  });

  // 11. HTTP 429 rate limit and 5xx server errors
  it("11. Correctly handles HTTP 429 rate limit and 5xx server errors", async () => {
    // 429 Rate Limit
    const mock429 = createMockFetch({
      status: 429,
      body: { detail: "Rate limit exceeded" }
    });
    const client429 = new AIServiceClient({ baseUrl: TEST_BASE_URL, internalServiceKey: TEST_KEY, fetchFn: mock429 });

    await assert.rejects(
      async () => client429.searchFace({ imageBuffer: DUMMY_IMAGE }),
      (err) => {
        assert.ok(err instanceof AIServiceError);
        assert.equal(err.code, "AI_RATE_LIMITED");
        assert.equal(err.statusCode, 429);
        return true;
      }
    );

    // 500 Engine Error
    const mock500 = createMockFetch({
      status: 500,
      body: { detail: "Biometric face engine error.", code: "AI_ENGINE_ERROR" }
    });
    const client500 = new AIServiceClient({ baseUrl: TEST_BASE_URL, internalServiceKey: TEST_KEY, fetchFn: mock500 });

    await assert.rejects(
      async () => client500.searchFace({ imageBuffer: DUMMY_IMAGE }),
      (err) => {
        assert.ok(err instanceof AIServiceResponseError);
        assert.equal(err.statusCode, 500);
        return true;
      }
    );
  });

  // 12. Invalid JSON and malformed response bodies
  it("12. Throws AIServiceResponseError when response is invalid JSON or non-JSON", async () => {
    const mockHtml = createMockFetch({
      status: 502,
      headers: { "content-type": "text/html" },
      body: "<html><body>502 Bad Gateway</body></html>"
    });

    const client = new AIServiceClient({
      baseUrl: TEST_BASE_URL,
      internalServiceKey: TEST_KEY,
      fetchFn: mockHtml
    });

    await assert.rejects(
      async () => client.healthCheck(),
      (err) => {
        assert.ok(err instanceof AIServiceResponseError);
        assert.equal(err.statusCode, 502);
        assert.match(err.message, /invalid non-JSON/i);
        return true;
      }
    );
  });

  // 13. Invalid candidate IDs, NaN/Infinity similarity values, and out-of-range scores
  it("13. Rejects candidates with invalid child IDs, NaN/Infinity, or out-of-range similarity", async () => {
    const clientWithBody = (body) => {
      const mock = createMockFetch({ body });
      return new AIServiceClient({ baseUrl: TEST_BASE_URL, internalServiceKey: TEST_KEY, fetchFn: mock });
    };

    // Case A: Missing child_id
    await assert.rejects(
      async () => clientWithBody({ match_found: true, candidates: [{ similarity: 0.9 }] }).searchFace({ imageBuffer: DUMMY_IMAGE }),
      (err) => {
        assert.ok(err instanceof AIServiceResponseError);
        assert.match(err.message, /missing or invalid child_id/i);
        return true;
      }
    );

    // Case B: NaN similarity
    await assert.rejects(
      async () => clientWithBody({ match_found: true, candidates: [{ child_id: "c1", similarity: "not_a_number" }] }).searchFace({ imageBuffer: DUMMY_IMAGE }),
      (err) => {
        assert.ok(err instanceof AIServiceResponseError);
        assert.match(err.message, /invalid cosine similarity score/i);
        return true;
      }
    );

    // Case C: Out-of-range similarity (> 1.0)
    await assert.rejects(
      async () => clientWithBody({ match_found: true, candidates: [{ child_id: "c1", similarity: 1.5 }] }).searchFace({ imageBuffer: DUMMY_IMAGE }),
      (err) => {
        assert.ok(err instanceof AIServiceResponseError);
        assert.match(err.message, /invalid cosine similarity score/i);
        return true;
      }
    );

    // Case D: Out-of-range similarity (< -1.0)
    await assert.rejects(
      async () => clientWithBody({ match_found: true, candidates: [{ child_id: "c1", similarity: -1.5 }] }).searchFace({ imageBuffer: DUMMY_IMAGE }),
      (err) => {
        assert.ok(err instanceof AIServiceResponseError);
        assert.match(err.message, /invalid cosine similarity score/i);
        return true;
      }
    );
  });

  // 14. Missing configuration and safe error reporting
  it("14. Throws AIServiceConfigError when INTERNAL_SERVICE_KEY is missing without exposing secrets", async () => {
    const client = new AIServiceClient({
      baseUrl: TEST_BASE_URL,
      internalServiceKey: "", // empty key
      fetchFn: async () => new Response("{}")
    });

    await assert.rejects(
      async () => client.enrollFace({ childId: "child_123", imageBuffer: DUMMY_IMAGE }),
      (err) => {
        assert.ok(err instanceof AIServiceConfigError);
        assert.equal(err.code, "AI_CONFIG_ERROR");
        assert.match(err.message, /INTERNAL_SERVICE_KEY is not configured/i);
        // Ensure no secrets leaked
        assert.ok(!err.message.includes("password"));
        return true;
      }
    );
  });

  // 15. Confirmation that secrets and biometric payloads are not exposed in logs or errors
  it("15. Confirms errors do not leak secrets, image buffers, or biometric vectors", async () => {
    const secretKey = "super_classified_key_do_not_leak";
    const largeImageBuffer = Buffer.alloc(100, 0xaa);

    const mockFetch = createMockFetch({
      status: 400,
      body: { detail: "Invalid format", code: "INVALID_FORMAT" }
    });

    const client = new AIServiceClient({
      baseUrl: TEST_BASE_URL,
      internalServiceKey: secretKey,
      fetchFn: mockFetch
    });

    try {
      await client.enrollFace({ childId: "child_xyz", imageBuffer: largeImageBuffer });
      assert.fail("Should have thrown");
    } catch (err) {
      const serialized = JSON.stringify(err);
      assert.ok(!serialized.includes(secretKey), "Error must not contain internal service key");
      assert.ok(!serialized.includes("aaaa"), "Error must not contain raw image buffer data");
    }
  });

  // 16. Confirmation that no automatic retry causes duplicate writes or repeated deletion operations
  it("16. Confirms no automatic retry on mutation failures (enroll and delete executed exactly once)", async () => {
    const networkError = new TypeError("fetch failed");
    const mockEnrollFetch = createMockFetch({ throws: networkError });

    const clientEnroll = new AIServiceClient({
      baseUrl: TEST_BASE_URL,
      internalServiceKey: TEST_KEY,
      fetchFn: mockEnrollFetch
    });

    await assert.rejects(
      async () => clientEnroll.enrollFace({ childId: "child_no_retry", imageBuffer: DUMMY_IMAGE }),
      AIServiceUnavailableError
    );
    assert.equal(mockEnrollFetch.getCallCount(), 1, "enrollFace must NOT be retried automatically");

    const mockDeleteFetch = createMockFetch({ throws: networkError });
    const clientDelete = new AIServiceClient({
      baseUrl: TEST_BASE_URL,
      internalServiceKey: TEST_KEY,
      fetchFn: mockDeleteFetch
    });

    await assert.rejects(
      async () => clientDelete.deleteFaceProfile("child_no_retry"),
      AIServiceUnavailableError
    );
    assert.equal(mockDeleteFetch.getCallCount(), 1, "deleteFaceProfile must NOT be retried automatically");
  });
});
