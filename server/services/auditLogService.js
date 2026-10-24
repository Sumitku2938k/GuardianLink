/**
 * GuardianLink — Centralized Audit Log Service (Phase 11)
 *
 * Implements server-side, privacy-preserving activity recording:
 * 1. Derives actor identity strictly from authenticated session/req.user.
 * 2. Enforces strict metadata allowlisting (strips secrets, passwords, biometrics, raw GPS).
 * 3. Enforces reliability policy (critical actions throw on audit persistence failure).
 * 4. Provides filtered, paginated query capabilities for the Admin API.
 */

const mongoose = require("mongoose");
const AuditLog = require("../models/AuditLog");

// Prohibited keys that must NEVER be persisted in audit metadata
const BLACKLISTED_METADATA_KEYS = [
  "password",
  "passwordhash",
  "token",
  "accesstoken",
  "refreshtoken",
  "jwt",
  "secret",
  "cookie",
  "authorization",
  "vector",
  "vectors",
  "embedding",
  "embeddings",
  "imagebuffer",
  "buffer",
  "coordinates",
  "lat",
  "latitude",
  "lng",
  "longitude",
  "phonenumber",
  "phone",
  "email",
  "guardianphone",
  "medicalnotes",
  "medicalconditions",
  "allergies",
  "medications",
  "notes"
];

/**
 * Recursively sanitizes metadata by removing any prohibited keys
 * and truncating oversized string values.
 *
 * @param {Object} input - Raw event metadata
 * @returns {Object} Sanitized allowlisted metadata
 */
const sanitizeMetadata = (input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  const clean = {};

  for (const [key, value] of Object.entries(input)) {
    const lowerKey = key.toLowerCase();

    // Reject blacklisted security or private PII fields
    if (BLACKLISTED_METADATA_KEYS.some((b) => lowerKey.includes(b))) {
      continue;
    }

    if (value === null || value === undefined) {
      continue;
    }

    // String truncation to protect database sizing
    if (typeof value === "string") {
      clean[key] = value.slice(0, 500);
    } else if (typeof value === "number" || typeof value === "boolean") {
      clean[key] = value;
    } else if (value instanceof mongoose.Types.ObjectId) {
      clean[key] = value.toString();
    } else if (typeof value === "object" && !(value instanceof Date)) {
      // Sub-object shallow sanitize
      const sub = {};
      for (const [subKey, subVal] of Object.entries(value)) {
        const subLower = subKey.toLowerCase();
        if (
          !BLACKLISTED_METADATA_KEYS.some((b) => subLower.includes(b)) &&
          (typeof subVal === "string" || typeof subVal === "number" || typeof subVal === "boolean")
        ) {
          sub[subKey] = typeof subVal === "string" ? subVal.slice(0, 300) : subVal;
        }
      }
      clean[key] = sub;
    } else if (value instanceof Date) {
      clean[key] = value.toISOString();
    }
  }

  return clean;
};

/**
 * Records an immutable audit log event.
 *
 * @param {Object} options
 * @param {Object} [options.req] - Express request for context extraction
 * @param {Object} [options.actor] - Explicit actor if req is unavailable (system/cli)
 * @param {string} options.action - Validated event action from AUDIT_ACTIONS
 * @param {string} options.entityType - Target resource type
 * @param {string} [options.entityId] - Target resource ID
 * @param {string} [options.outcome='success'] - 'success', 'failure', or 'denied'
 * @param {Object} [options.metadata={}] - Event-specific details
 * @param {boolean} [options.critical=false] - If true, throws when DB write fails
 * @returns {Promise<Object>} Persisted audit log safe object
 */
const recordAuditEvent = async ({
  req = null,
  actor = null,
  action,
  entityType,
  entityId = null,
  outcome = "success",
  metadata = {},
  critical = false
}) => {
  try {
    // 1. Resolve server-derived Actor Identity
    let actorId = null;
    let actorName = "System";
    let actorRole = "system";
    let organization = null;

    if (req && req.user) {
      actorId = req.user._id || req.user.id || null;
      actorName = req.user.name || "Authenticated User";
      actorRole = req.user.role || "anonymous";
      organization = req.user.organization || null;
    } else if (actor) {
      actorId = actor._id || actor.id || null;
      actorName = actor.name || "System";
      actorRole = actor.role || "system";
      organization = actor.organization || null;
    } else if (req) {
      // Unauthenticated / Anonymous attempt (e.g. failed login)
      actorRole = "anonymous";
      actorName = "Anonymous Visitor";
    }

    // 2. Extract Request Context
    let ipAddress = null;
    let userAgent = null;
    let requestId = null;

    if (req) {
      const forwarded = req.headers ? req.headers["x-forwarded-for"] : null;
      ipAddress = forwarded ? forwarded.split(",")[0].trim() : req.ip || req.connection?.remoteAddress || null;
      userAgent = req.headers && req.headers["user-agent"] ? req.headers["user-agent"].slice(0, 300) : null;
      requestId = req.id || (req.headers && req.headers["x-request-id"]) || null;
    }

    // 3. Sanitize Metadata
    const safeMeta = sanitizeMetadata(metadata);

    // 4. Construct Audit Document
    const auditDoc = new AuditLog({
      actorId,
      actorName,
      actorRole,
      action,
      entityType,
      entityId: entityId ? entityId.toString() : null,
      outcome,
      metadata: safeMeta,
      ipAddress,
      userAgent,
      requestId,
      organization,
      timestamp: new Date()
    });

    if (mongoose.connection && mongoose.connection.readyState === 0) {
      if (critical) {
        const critError = new Error("AUDIT_PERSISTENCE_FAILED: Database connection offline.");
        critError.status = 500;
        critError.code = "AUDIT_PERSISTENCE_FAILED";
        throw critError;
      }
      return null;
    }

    await auditDoc.save();
    return auditDoc.toSafeObject();
  } catch (error) {
    console.error(`[AuditService:Error] Failed to persist audit log for ${action}:`, error.message);

    // For critical operations (e.g., account approvals, suspensions, case closures),
    // we refuse to silently complete without audit compliance.
    if (critical) {
      const critError = new Error("AUDIT_PERSISTENCE_FAILED: Mandatory security audit write failed.");
      critError.status = 500;
      critError.code = "AUDIT_PERSISTENCE_FAILED";
      throw critError;
    }

    return null;
  }
};

/**
 * Queries persisted audit logs with filtering, sorting, and pagination.
 *
 * @param {Object} options - Query filters and pagination
 * @returns {Promise<{ auditLogs: Array, pagination: Object }>}
 */
const getAuditLogs = async (options = {}) => {
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const query = {};

  if (options.action && options.action !== "all" && options.action !== "All") {
    query.action = options.action.trim();
  }

  if (options.actorRole && options.actorRole !== "all" && options.actorRole !== "All") {
    query.actorRole = options.actorRole.toLowerCase().trim();
  }

  if (options.entityType && options.entityType !== "all" && options.entityType !== "All") {
    query.entityType = options.entityType.trim();
  }

  if (options.entityId && options.entityId.trim()) {
    query.entityId = options.entityId.trim();
  }

  if (options.outcome && options.outcome !== "all" && options.outcome !== "All") {
    query.outcome = options.outcome.toLowerCase().trim();
  }

  if (options.actorId && mongoose.Types.ObjectId.isValid(options.actorId)) {
    query.actorId = options.actorId;
  }

  // Date range filtering
  if (options.from || options.to) {
    query.timestamp = {};
    if (options.from) {
      const fromDate = new Date(options.from);
      if (!isNaN(fromDate.getTime())) {
        query.timestamp.$gte = fromDate;
      }
    }
    if (options.to) {
      const toDate = new Date(options.to);
      if (!isNaN(toDate.getTime())) {
        query.timestamp.$lte = toDate;
      }
    }
  }

  // Text search on entityId, actorName, or action
  if (options.search && options.search.trim()) {
    const s = options.search.trim();
    const regex = new RegExp(s, "i");
    query.$or = [{ action: regex }, { entityId: regex }, { actorName: regex }, { organization: regex }];
  }

  const [total, records] = await Promise.all([
    AuditLog.countDocuments(query),
    AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit)
  ]);

  const auditLogs = records.map((r) => r.toSafeObject());

  return {
    auditLogs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
};

module.exports = {
  recordAuditEvent,
  getAuditLogs,
  sanitizeMetadata
};
