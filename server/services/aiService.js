/**
 * GuardianLink AI Integration Service Adapter
 * 
 * Provides server-to-server HTTP integration between GuardianLink Express API
 * and the dedicated FastAPI AI Face-Recognition microservice.
 * 
 * Security & Reliability guarantees:
 * - Internal S2S credential authentication (X-AI-Service-Secret)
 * - Safe network error & timeout handling via AbortController
 * - Never fabricates fake biometric matches when AI service is unavailable
 * - Reuses existing 512-d InsightFace vectors via dedicated Qdrant collection
 */

const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || "http://127.0.0.1:8001").replace(/\/$/, "");
const AI_SERVICE_SECRET = process.env.AI_SERVICE_SECRET || "guardianlink_ai_internal_secret_2026";
const AI_MATCH_THRESHOLD = Number(process.env.AI_MATCH_THRESHOLD) || 0.55;
const DEFAULT_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 15000;

class AIService {
  constructor() {
    this.baseUrl = AI_SERVICE_URL;
    this.secret = AI_SERVICE_SECRET;
    this.threshold = AI_MATCH_THRESHOLD;
    this.timeoutMs = DEFAULT_TIMEOUT_MS;
  }

  /**
   * Health verification
   */
  async checkHealth() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${this.baseUrl}/integration/health`, {
        method: "GET",
        headers: {
          "X-AI-Service-Secret": this.secret
        },
        signal: controller.signal
      });

      clearTimeout(timer);
      const data = await response.json();
      return {
        isHealthy: response.ok,
        status: response.status,
        data
      };
    } catch (error) {
      clearTimeout(timer);
      return {
        isHealthy: false,
        status: 503,
        error: error.name === "AbortError" ? "AI service connection timed out" : error.message
      };
    }
  }

  /**
   * Enroll a child's face embedding into dedicated GuardianLink Qdrant collection
   * @param {string} childId - MongoDB Child ObjectId
   * @param {Buffer} imageBuffer - Raw image buffer
   * @param {string} mimeType - e.g. "image/jpeg"
   */
  async enrollChildFace(childId, imageBuffer, mimeType = "image/jpeg") {
    if (!childId || !imageBuffer) {
      return {
        success: false,
        code: "INVALID_INPUT",
        message: "Child ID and image buffer are required for biometric enrollment."
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const formData = new FormData();
      const blob = new Blob([imageBuffer], { type: mimeType });
      formData.append("file", blob, `child_${childId}.jpg`);

      const response = await fetch(`${this.baseUrl}/integration/enroll/${childId}`, {
        method: "POST",
        headers: {
          "X-AI-Service-Secret": this.secret
        },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timer);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorDetail = data.detail || {};
        return {
          success: false,
          status: response.status,
          code: errorDetail.code || "ENROLLMENT_FAILED",
          message: errorDetail.message || "Failed to enroll child biometric profile."
        };
      }

      return {
        success: true,
        childId: data.childId,
        qdrantId: data.qdrantId,
        dimension: data.dimension,
        status: data.status
      };
    } catch (error) {
      clearTimeout(timer);
      const isTimeout = error.name === "AbortError";
      console.warn(`[AIService] Biometric enrollment error for child ${childId}:`, error.message);
      return {
        success: false,
        status: 503,
        code: isTimeout ? "AI_SERVICE_TIMEOUT" : "AI_SERVICE_UNAVAILABLE",
        message: isTimeout
          ? "AI biometric service timed out during enrollment."
          : `AI biometric service unreachable: ${error.message}`
      };
    }
  }

  /**
   * Delete biometric vector for a child (e.g. photo deletion or profile deactivation)
   * @param {string} childId - MongoDB Child ObjectId
   */
  async deleteChildFace(childId) {
    if (!childId) return { success: false, code: "INVALID_CHILD_ID" };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${this.baseUrl}/integration/enroll/${childId}`, {
        method: "DELETE",
        headers: {
          "X-AI-Service-Secret": this.secret
        },
        signal: controller.signal
      });

      clearTimeout(timer);
      const data = await response.json().catch(() => ({}));

      return {
        success: response.ok,
        status: response.status,
        data
      };
    } catch (error) {
      clearTimeout(timer);
      console.warn(`[AIService] Biometric unenroll error for child ${childId}:`, error.message);
      return {
        success: false,
        status: 503,
        code: "AI_SERVICE_UNAVAILABLE",
        message: error.message
      };
    }
  }

  /**
   * Perform 1:N neural face search against enrolled GuardianLink missing children
   * @param {Buffer} imageBuffer - Query photo buffer
   * @param {Object} options - { limit, threshold, mimeType }
   */
  async searchFace(imageBuffer, options = {}) {
    if (!imageBuffer) {
      return {
        success: false,
        code: "INVALID_IMAGE",
        message: "Image buffer is required for facial search."
      };
    }

    const {
      limit = 5,
      threshold = this.threshold,
      mimeType = "image/jpeg"
    } = options;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const formData = new FormData();
      const blob = new Blob([imageBuffer], { type: mimeType });
      formData.append("file", blob, "query_face.jpg");
      formData.append("limit", String(limit));
      formData.append("threshold", String(threshold));

      const response = await fetch(`${this.baseUrl}/integration/search`, {
        method: "POST",
        headers: {
          "X-AI-Service-Secret": this.secret
        },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timer);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorDetail = data.detail || {};
        return {
          success: false,
          status: response.status,
          code: errorDetail.code || "SEARCH_FAILED",
          message: errorDetail.message || "Face search could not be processed.",
          matches: []
        };
      }


      return {
        success: true,
        totalCandidates: data.total_candidates || 0,
        matches: data.matches || []
      };
    } catch (error) {
      clearTimeout(timer);
      const isTimeout = error.name === "AbortError";
      console.warn("[AIService] Face search error:", error.message);
      return {
        success: false,
        status: 503,
        code: isTimeout ? "AI_SERVICE_TIMEOUT" : "AI_SERVICE_UNAVAILABLE",
        message: isTimeout
          ? "AI facial search timed out."
          : `AI facial search service unreachable: ${error.message}`,
        matches: []
      };
    }
  }
}

module.exports = new AIService();
