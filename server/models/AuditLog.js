/**
 * GuardianLink — AuditLog Model (Phase 11)
 *
 * Immutable, append-only security activity trail recording:
 * - Administrative operations and account approvals
 * - Child registration and biometric updates
 * - Missing-case status lifecycle and officer assignments
 * - Citizen sightings and review workflows
 * - AI similarity search requests and match review outcomes
 * - NGO care records, shelter placements, and handovers
 *
 * Immutability Protections:
 * - Update and delete operations are rejected at the Mongoose middleware layer.
 * - Server-generated timestamps and server-derived actor identity.
 */

const mongoose = require("mongoose");

const AUDIT_ACTIONS = [
  // Authentication & Account Security
  "USER_REGISTRATION_COMPLETED",
  "USER_LOGIN_SUCCESS",
  "USER_LOGIN_FAILED",
  "USER_LOGOUT",
  "USER_ACCOUNT_SUSPENDED",
  "USER_ACCOUNT_ACTIVATED",
  "USER_ACCOUNT_REACTIVATED",

  // Administrative Actions
  "ADMIN_APPROVED_USER",
  "ADMIN_REJECTED_USER",
  "ADMIN_ROLE_UPDATED",
  "ADMIN_CHANGED_USER_ROLE",
  "ADMIN_SUSPENDED_USER",
  "ADMIN_REACTIVATED_USER",

  // Child & Missing Case Workflows
  "CHILD_CREATED",
  "CHILD_UPDATED",
  "CHILD_PHOTO_UPLOADED",
  "CHILD_PHOTO_REPLACED",
  "CHILD_PHOTO_DELETED",
  "CASE_REPORTED",
  "CASE_STATUS_CHANGED",
  "CASE_ACTIVATED",
  "CASE_ASSIGNED",
  "CASE_INVESTIGATION_UPDATED",
  "CASE_NOTE_ADDED",
  "CASE_TASK_UPDATED",
  "FOUND_REPORT_CREATED",
  "REUNIFICATION_CONFIRMED",
  "CASE_CLOSED",
  "CASE_CANCELLED",

  // Citizen Sightings
  "SIGHTING_CREATED",
  "SIGHTING_REVIEWED",
  "SIGHTING_STATUS_CHANGED",
  "SIGHTING_ACCESS_DENIED",

  // AI Photo-Search & Biometric Workflows
  "AI_MATCH_REQUESTED",
  "AI_MATCH_RETURNED",
  "AI_MATCH_REVIEWED",
  "AI_MATCH_REJECTED",
  "AI_MATCH_EVIDENCE_REQUESTED",

  // NGO Care, Shelters & Handovers
  "CARE_RECORD_CREATED",
  "CARE_STATUS_CHANGED",
  "SHELTER_CREATED",
  "SHELTER_UPDATED",
  "CHILD_PLACEMENT_CREATED",
  "HANDOVER_REQUESTED",
  "HANDOVER_APPROVED",
  "HANDOVER_REJECTED",
  "HANDOVER_COMPLETED",

  // Security Access Events
  "CASE_VIEWED",
  "CHILD_RECORD_VIEWED",
  "SENSITIVE_RECORD_ACCESSED",
  "AUDIT_LOG_ACCESS_DENIED"
];

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    actorName: {
      type: String,
      trim: true,
      default: "System"
    },
    actorRole: {
      type: String,
      enum: ["admin", "police", "ngo", "parent", "citizen", "system", "anonymous"],
      required: [true, "Actor role is required"],
      index: true
    },
    action: {
      type: String,
      required: [true, "Audit action is required"],
      enum: {
        values: AUDIT_ACTIONS,
        message: "Invalid or unsupported audit action: {VALUE}"
      },
      index: true
    },
    entityType: {
      type: String,
      required: [true, "Entity type is required"],
      enum: [
        "User",
        "Child",
        "MissingCase",
        "Sighting",
        "CareRecord",
        "Shelter",
        "Handover",
        "AI_SEARCH",
        "System"
      ],
      index: true
    },
    entityId: {
      type: String,
      default: null,
      trim: true,
      index: true
    },
    outcome: {
      type: String,
      enum: ["success", "failure", "denied"],
      default: "success",
      required: true,
      index: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      trim: true,
      default: null
    },
    userAgent: {
      type: String,
      trim: true,
      default: null,
      maxlength: [300, "User-Agent string exceeds maximum allowed length"]
    },
    requestId: {
      type: String,
      trim: true,
      default: null,
      index: true
    },
    organization: {
      type: String,
      trim: true,
      default: null
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true
    }
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false }, // Append-only (no updatedAt)
    versionKey: false
  }
);

// High-Performance Query Indexes
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ actorId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ outcome: 1, timestamp: -1 });

// Immutability Protection Hooks: Prevent updates or deletions at the Mongoose layer
const blockMutation = function (next) {
  const err = new Error("AuditLog records are append-only and cannot be modified or deleted.");
  err.code = "AUDIT_LOG_IMMUTABLE";
  err.status = 403;
  if (typeof next === "function") {
    return next(err);
  }
  throw err;
};

auditLogSchema.pre("updateOne", blockMutation);
auditLogSchema.pre("updateMany", blockMutation);
auditLogSchema.pre("findOneAndUpdate", blockMutation);
auditLogSchema.pre("findOneAndReplace", blockMutation);
auditLogSchema.pre("replaceOne", blockMutation);
auditLogSchema.pre("deleteOne", blockMutation);
auditLogSchema.pre("deleteMany", blockMutation);
auditLogSchema.pre("findOneAndDelete", blockMutation);

/**
 * Serializes AuditLog record to safe JSON object
 */
auditLogSchema.methods.toSafeObject = function () {
  return {
    id: this._id ? this._id.toString() : "",
    actorId: this.actorId ? this.actorId.toString() : null,
    actorName: this.actorName || "System",
    actorRole: this.actorRole,
    action: this.action,
    entityType: this.entityType,
    entityId: this.entityId || null,
    outcome: this.outcome,
    metadata: this.metadata || {},
    ipAddress: this.ipAddress,
    userAgent: this.userAgent,
    requestId: this.requestId,
    organization: this.organization,
    timestamp: this.timestamp ? this.timestamp.toISOString() : new Date().toISOString()
  };
};

module.exports = mongoose.model("AuditLog", auditLogSchema);
module.exports.AUDIT_ACTIONS = AUDIT_ACTIONS;
