const mongoose = require("mongoose");

const missingCaseSchema = new mongoose.Schema(
  {
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: [true, "Child reference is required"],
      index: true
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reporting user reference is required"],
      index: true
    },
    missingDate: {
      type: Date,
      required: [true, "Missing date is required"],
      validate: {
        validator: function (value) {
          return value && value <= new Date();
        },
        message: "Missing date cannot be in the future"
      }
    },
    lastSeenLocation: {
      address: {
        type: String,
        trim: true,
        default: ""
      },
      city: {
        type: String,
        trim: true,
        default: ""
      },
      state: {
        type: String,
        trim: true,
        default: ""
      },
      pinCode: {
        type: String,
        trim: true,
        default: ""
      },
      latitude: {
        type: Number,
        min: [-90, "Latitude must be between -90 and 90"],
        max: [90, "Latitude must be between -90 and 90"]
      },
      longitude: {
        type: Number,
        min: [-180, "Longitude must be between -180 and 180"],
        max: [180, "Longitude must be between -180 and 180"]
      }
    },
    lastSeenDescription: {
      type: String,
      trim: true,
      maxlength: [2000, "Last seen description cannot exceed 2000 characters"],
      default: ""
    },
    status: {
      type: String,
      enum: {
        values: [
          "reported",
          "under_verification",
          "active",
          "found",
          "reunited",
          "closed",
          "cancelled"
        ],
        message: "Status must be reported, under_verification, active, found, reunited, closed, or cancelled"
      },
      default: "reported",
      index: true
    },
    priority: {
      type: String,
      enum: {
        values: ["low", "medium", "high", "critical"],
        message: "Priority must be low, medium, high, or critical"
      },
      default: "high",
      set: (val) => (val ? val.toLowerCase().trim() : "high")
    },
    policeCaseNumber: {
      type: String,
      trim: true,
      default: ""
    },
    firNumber: {
      type: String,
      trim: true,
      default: ""
    },
    firDocumentUrl: {
      type: String,
      default: ""
    },
    cloudinaryPublicId: {
      type: String,
      default: ""
    },
    foundAt: {
      type: Date
    },
    reunitedAt: {
      type: Date
    },
    assignedOfficer: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      name: {
        type: String,
        trim: true,
        default: ""
      },
      badgeNumber: {
        type: String,
        trim: true,
        default: ""
      },
      assignedAt: {
        type: Date,
        default: null
      }
    },
    investigationNotes: {
      type: mongoose.Schema.Types.Mixed,
      default: []
    },
    investigationTasks: [
      {
        label: {
          type: String,
          required: [true, "Task label is required"],
          trim: true,
          maxlength: [500, "Task label cannot exceed 500 characters"]
        },
        completed: {
          type: Boolean,
          default: false
        },
        assignedTo: {
          type: String,
          trim: true,
          default: ""
        },
        completedAt: {
          type: Date,
          default: null
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    potentialMatchReviews: [
      {
        matchId: {
          type: String,
          trim: true,
          default: ""
        },
        candidateId: {
          type: String,
          trim: true,
          default: ""
        },
        decision: {
          type: String,
          enum: ["confirm", "reject", "request_evidence"],
          required: true
        },
        verificationStatus: {
          type: String,
          trim: true,
          default: "Pending"
        },
        notes: {
          type: String,
          trim: true,
          default: "",
          maxlength: [1000, "Notes cannot exceed 1000 characters"]
        },
        reviewedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        reviewedAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual: canonical caseNumber format
missingCaseSchema.virtual("caseNumber").get(function () {
  return this.policeCaseNumber || `MC-${this._id.toString().slice(-6).toUpperCase()}`;
});

// Targeted Compound Indexes for efficient querying
missingCaseSchema.index({ childId: 1, status: 1 });
missingCaseSchema.index({ "lastSeenLocation.city": 1, status: 1 });
missingCaseSchema.index({ reportedBy: 1, status: 1 });
missingCaseSchema.index({ "assignedOfficer.id": 1, status: 1 });
missingCaseSchema.index({ createdAt: -1 });

// Ownership check helper
missingCaseSchema.methods.isReportedBy = function (userOrId) {
  if (!userOrId) return false;
  const targetId = userOrId._id ? userOrId._id.toString() : userOrId.toString();
  return this.reportedBy.toString() === targetId;
};

// Safe JSON serialization
missingCaseSchema.methods.toSafeObject = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.__v;
  obj.id = obj._id.toString();
  obj.caseNumber = this.caseNumber;

  if (Array.isArray(obj.investigationNotes)) {
    obj.investigationNotes = obj.investigationNotes.map((n, idx) => {
      if (typeof n === "string") {
        return {
          id: `note-${idx}`,
          officerName: "Investigating Officer",
          badge: "DL-POL-0000",
          text: n,
          createdAt: obj.createdAt
        };
      }
      return {
        ...n,
        id: (n._id || n.id || `note-${idx}`).toString()
      };
    });
  } else if (typeof obj.investigationNotes === "string" && obj.investigationNotes.trim()) {
    obj.investigationNotes = [
      {
        id: "note-0",
        officerName: "Investigating Officer",
        badge: "DL-POL-0000",
        text: obj.investigationNotes,
        createdAt: obj.createdAt
      }
    ];
  } else {
    obj.investigationNotes = [];
  }

  if (Array.isArray(obj.investigationTasks)) {
    obj.investigationTasks = obj.investigationTasks.map((t) => ({
      ...t,
      id: t._id ? t._id.toString() : t.id
    }));
  }

  if (Array.isArray(obj.potentialMatchReviews)) {
    obj.potentialMatchReviews = obj.potentialMatchReviews.map((r) => ({
      ...r,
      id: r._id ? r._id.toString() : r.id
    }));
  }

  // Populate helper convenience aliases for police dashboard/table views
  if (obj.childId && typeof obj.childId === "object") {
    obj.childName = obj.childId.fullName || obj.childId.name || "";
    obj.childAge = obj.childId.age;
    obj.childGender = obj.childId.gender;
    obj.childPhoto = obj.childId.photoUrl || obj.childId.photo || "";
  }

  if (obj.assignedOfficer) {
    obj.assignedOfficerId = obj.assignedOfficer.id ? obj.assignedOfficer.id.toString() : "";
    obj.assignedOfficerName = obj.assignedOfficer.name || "";
    obj.assignedOfficerBadge = obj.assignedOfficer.badgeNumber || "";
  }

  return obj;
};

/**
 * Generates a normalized response conforming to the missing person contract
 * by composing MissingCase incident details with Child identity fields.
 * Compatible with future AI matching payloads and external search responses.
 */
missingCaseSchema.methods.toPublicResponse = function (childDoc = null) {
  const child = childDoc || (this.populated("childId") ? this.childId : null);

  const loc = this.lastSeenLocation || {};
  const locationParts = [loc.address, loc.city, loc.state, loc.pinCode].filter(Boolean);
  const locationString = locationParts.join(", ") || loc.city || "";

  return {
    id: this._id.toString(),
    caseId: this._id.toString(),
    childId: child?._id ? child._id.toString() : this.childId.toString(),
    name: child?.fullName || "",
    age: child?.age !== undefined ? child.age : null,
    gender: child?.gender || "",
    description: this.lastSeenDescription || child?.description || "",
    last_seen_location: locationString,
    missing_date: this.missingDate ? this.missingDate.toISOString() : "",
    image_url: child?.photoUrl || "",
    cloudinary_public_id: this.cloudinaryPublicId || child?.cloudinaryPublicId || "",
    status: this.status,
    policeCaseNumber: this.policeCaseNumber || "",
    firNumber: this.firNumber || ""
  };
};

const MissingCase = mongoose.model("MissingCase", missingCaseSchema);

module.exports = MissingCase;
