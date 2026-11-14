/**
 * GuardianLink — FIR (First Information Report) Model (Phase 18)
 *
 * Implements dedicated official FIR management with:
 * - Station-scoped unique FIR numbering ({ policeStation: 1, firNumber: 1 })
 * - Immutable document versioning (v1, v2, ...) with SHA-256 integrity checksums
 * - Strict verification state machine (pending_review, verified, rejected)
 * - Append-only verification history recording officer badge, station, notes, and rejection reasons
 * - Role-scoped data serialization (toSafeObject) preventing private storageKey leaks and redacting PII
 */

const mongoose = require("mongoose");

const documentVersionSchema = new mongoose.Schema(
  {
    version: {
      type: Number,
      required: [true, "Document version number is required"],
      min: [1, "Version number must be at least 1"]
    },
    originalFilename: {
      type: String,
      required: [true, "Original filename is required"],
      trim: true,
      maxlength: [255, "Filename exceeds maximum length"]
    },
    storageKey: {
      type: String,
      required: [true, "Private storage key is required"],
      trim: true
    },
    fileExtension: {
      type: String,
      required: [true, "File extension is required"],
      trim: true,
      lowercase: true
    },
    mimeType: {
      type: String,
      required: [true, "MIME type is required"],
      trim: true,
      lowercase: true
    },
    fileSizeBytes: {
      type: Number,
      required: [true, "File size is required"],
      min: [1, "File size must be greater than 0"]
    },
    sha256Checksum: {
      type: String,
      required: [true, "SHA-256 checksum is required"],
      trim: true,
      match: [/^[a-f0-9]{64}$/i, "Invalid SHA-256 checksum format"]
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Uploader user reference is required"]
    },
    isActive: {
      type: Boolean,
      default: true
    },
    replacementReason: {
      type: String,
      trim: true,
      default: null,
      maxlength: [1000, "Replacement reason exceeds maximum length"]
    }
  },
  { _id: true }
);

const verificationRecordSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["verified", "rejected", "resubmitted"],
      required: [true, "Verification action is required"]
    },
    actionAt: {
      type: Date,
      default: Date.now
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reviewing officer reference is required"]
    },
    officerName: {
      type: String,
      required: [true, "Officer name is required"],
      trim: true
    },
    officerBadge: {
      type: String,
      trim: true,
      default: ""
    },
    officerStation: {
      type: String,
      trim: true,
      default: ""
    },
    reviewNotes: {
      type: String,
      required: [true, "Review notes are required"],
      trim: true,
      maxlength: [2000, "Review notes exceed maximum length"]
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
      maxlength: [1000, "Rejection reason exceeds maximum length"]
    },
    documentVersion: {
      type: Number,
      required: [true, "Associated document version is required"]
    }
  },
  { _id: true }
);

const firSchema = new mongoose.Schema(
  {
    missingCaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MissingCase",
      required: [true, "MissingCase reference is required"],
      index: true
    },
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: [true, "Child reference is required"],
      index: true
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Submitting user reference is required"],
      index: true
    },
    firNumber: {
      type: String,
      required: [true, "FIR Number is required"],
      trim: true,
      uppercase: true,
      maxlength: [50, "FIR number exceeds maximum length"],
      index: true
    },
    policeStation: {
      type: String,
      required: [true, "Police station is required"],
      trim: true,
      maxlength: [150, "Police station name exceeds maximum length"],
      index: true
    },
    district: {
      type: String,
      required: [true, "District is required"],
      trim: true,
      maxlength: [100, "District name exceeds maximum length"]
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
      maxlength: [100, "State name exceeds maximum length"]
    },
    filingDate: {
      type: Date,
      required: [true, "FIR filing date is required"],
      validate: {
        validator: function (val) {
          return val && val <= new Date();
        },
        message: "Filing date cannot be in the future"
      }
    },
    incidentDate: {
      type: Date,
      default: null,
      validate: {
        validator: function (val) {
          return !val || val <= new Date();
        },
        message: "Incident date cannot be in the future"
      }
    },
    sections: {
      type: [String],
      default: []
    },
    complainantName: {
      type: String,
      required: [true, "Complainant name is required"],
      trim: true,
      maxlength: [120, "Complainant name exceeds maximum length"]
    },
    relationship: {
      type: String,
      required: [true, "Relationship to child is required"],
      trim: true,
      maxlength: [60, "Relationship field exceeds maximum length"]
    },
    contactPhone: {
      type: String,
      required: [true, "Contact phone is required"],
      trim: true,
      maxlength: [25, "Phone number exceeds maximum length"]
    },
    status: {
      type: String,
      enum: {
        values: ["pending_review", "verified", "rejected"],
        message: "Invalid FIR verification status: {VALUE}"
      },
      default: "pending_review",
      index: true
    },
    documents: {
      type: [documentVersionSchema],
      default: []
    },
    verificationHistory: {
      type: [verificationRecordSchema],
      default: []
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    rejectedAt: {
      type: Date,
      default: null
    },
    latestReviewNotes: {
      type: String,
      trim: true,
      default: ""
    },
    latestRejectionReason: {
      type: String,
      trim: true,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Station-scoped compound uniqueness index
firSchema.index({ policeStation: 1, firNumber: 1 }, { unique: true });

// Secondary lookup indexes
firSchema.index({ missingCaseId: 1, status: 1 });
firSchema.index({ status: 1, createdAt: -1 });

/**
 * Get active document entry
 */
firSchema.methods.getActiveDocument = function () {
  if (!this.documents || this.documents.length === 0) return null;
  const active = this.documents.find((d) => d.isActive);
  return active || this.documents[this.documents.length - 1];
};

/**
 * Return sanitized, role-safe presentation object.
 * NEVER exposes internal storageKey or private disk paths.
 * Redacts phone number for citizen/unauthorized viewer.
 */
firSchema.methods.toSafeObject = function (viewer = {}) {
  const viewerRole = viewer.role || "citizen";
  const viewerUserId = viewer.userId ? String(viewer.userId) : null;
  const isOwner = viewerUserId && String(this.submittedBy) === viewerUserId;
  const isPrivileged = viewerRole === "police" || viewerRole === "admin";

  const activeDoc = this.getActiveDocument();

  // Strip storageKey from document objects
  const sanitizedDocs = (this.documents || []).map((doc) => ({
    _id: doc._id,
    version: doc.version,
    originalFilename: doc.originalFilename,
    fileExtension: doc.fileExtension,
    mimeType: doc.mimeType,
    fileSizeBytes: doc.fileSizeBytes,
    sha256Checksum: doc.sha256Checksum,
    uploadedAt: doc.uploadedAt,
    uploadedBy: doc.uploadedBy,
    isActive: doc.isActive,
    replacementReason: doc.replacementReason
  }));

  // Scrub phone for citizen/NGO unless authorized
  let displayPhone = this.contactPhone;
  if (!isPrivileged && !isOwner) {
    displayPhone = displayPhone ? `${displayPhone.slice(0, 3)}****${displayPhone.slice(-3)}` : "";
  }

  return {
    _id: this._id,
    missingCaseId: this.missingCaseId,
    childId: this.childId,
    submittedBy: this.submittedBy,
    firNumber: this.firNumber,
    policeStation: this.policeStation,
    district: this.district,
    state: this.state,
    filingDate: this.filingDate,
    incidentDate: this.incidentDate,
    sections: this.sections || [],
    complainantName: this.complainantName,
    relationship: this.relationship,
    contactPhone: displayPhone,
    status: this.status,
    activeDocument: activeDoc
      ? {
          _id: activeDoc._id,
          version: activeDoc.version,
          originalFilename: activeDoc.originalFilename,
          fileExtension: activeDoc.fileExtension,
          mimeType: activeDoc.mimeType,
          fileSizeBytes: activeDoc.fileSizeBytes,
          sha256Checksum: activeDoc.sha256Checksum,
          uploadedAt: activeDoc.uploadedAt,
          isActive: activeDoc.isActive
        }
      : null,
    documents: sanitizedDocs,
    verificationHistory: this.verificationHistory || [],
    verifiedBy: this.verifiedBy,
    verifiedAt: this.verifiedAt,
    rejectedBy: this.rejectedBy,
    rejectedAt: this.rejectedAt,
    latestReviewNotes: this.latestReviewNotes,
    latestRejectionReason: this.latestRejectionReason,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model("FIR", firSchema);

