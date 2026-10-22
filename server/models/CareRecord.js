const mongoose = require("mongoose");

const careRecordSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MissingCase",
      required: [true, "Missing case reference is required"],
      index: true
    },
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: [true, "Child reference is required"]
    },
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owning NGO organization reference is required"],
      index: true
    },
    shelterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shelter",
      default: null,
      index: true
    },
    intakeNumber: {
      type: String,
      required: [true, "Intake number is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    status: {
      type: String,
      enum: {
        values: [
          "pending_intake",
          "in_care",
          "awaiting_handover",
          "handed_over",
          "closed"
        ],
        message: "Status must be pending_intake, in_care, awaiting_handover, handed_over, or closed"
      },
      default: "in_care",
      index: true
    },
    receivedAt: {
      type: Date,
      default: Date.now
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Receiving NGO staff user identity is required"]
    },
    initialCondition: {
      visibleInjuries: {
        type: String,
        trim: true,
        maxlength: [1000, "Visible injuries observation cannot exceed 1000 characters"],
        default: "None observed"
      },
      medicalNeeded: {
        type: Boolean,
        default: false
      },
      emotionalState: {
        type: String,
        trim: true,
        maxlength: [200, "Emotional state cannot exceed 200 characters"],
        default: "Calm"
      },
      immediateNeeds: {
        type: String,
        trim: true,
        maxlength: [500, "Immediate needs cannot exceed 500 characters"],
        default: "Food & Shelter"
      },
      physicalState: {
        type: String,
        trim: true,
        default: "Stable"
      },
      intakeSource: {
        type: String,
        trim: true,
        maxlength: [300, "Intake source cannot exceed 300 characters"],
        default: "Citizen / Police Escort"
      }
    },
    careNotes: [
      {
        text: {
          type: String,
          required: [true, "Note text is required"],
          trim: true,
          maxlength: [2000, "Note text cannot exceed 2000 characters"]
        },
        category: {
          type: String,
          enum: [
            "Nutrition",
            "Medical Care",
            "Emotional Support",
            "Clothing",
            "General Wellbeing"
          ],
          default: "General Wellbeing"
        },
        staffId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        staffName: {
          type: String,
          trim: true,
          default: "NGO Staff"
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    medicalStatus: {
      type: String,
      enum: {
        values: ["stable", "monitoring", "attention_required", "emergency"],
        message: "Medical status must be stable, monitoring, attention_required, or emergency"
      },
      default: "stable",
      index: true
    },
    policeCoordination: {
      policeStation: {
        type: String,
        trim: true,
        default: ""
      },
      assignedOfficer: {
        type: String,
        trim: true,
        default: ""
      },
      officerPhone: {
        type: String,
        trim: true,
        default: ""
      },
      badgeNumber: {
        type: String,
        trim: true,
        default: ""
      },
      coordinatedAt: {
        type: Date,
        default: null
      }
    },
    provisions: {
      foodProvided: { type: Boolean, default: true },
      waterProvided: { type: Boolean, default: true },
      clothingProvided: { type: Boolean, default: true },
      restingAreaProvided: { type: Boolean, default: true }
    },
    assignedDorm: {
      type: String,
      trim: true,
      default: "Main Dorm"
    },
    handoverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Handover",
      default: null
    },
    closedAt: {
      type: Date,
      default: null
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    closureReason: {
      type: String,
      trim: true,
      maxlength: [1000, "Closure reason cannot exceed 1000 characters"],
      default: ""
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
careRecordSchema.index({ caseId: 1, ngoId: 1 });
careRecordSchema.index({ ngoId: 1, status: 1 });
careRecordSchema.index({ childId: 1 });

// Helper to serialize into safe UI-friendly format
careRecordSchema.methods.toSafeObject = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.__v;
  obj.id = obj._id.toString();

  // Convenience aliases for frontend components
  if (obj.childId && typeof obj.childId === "object") {
    obj.childReference = obj.childId.fullName || obj.childId.name || "Child";
    obj.approxAge = obj.childId.age;
    obj.gender = obj.childId.gender;
    obj.photo = obj.childId.photoUrl || obj.childId.photo || "";
  }

  if (obj.caseId && typeof obj.caseId === "object") {
    obj.caseNumber = obj.caseId.caseNumber || (obj.caseId._id ? `MC-${obj.caseId._id.toString().slice(-6).toUpperCase()}` : "");
  }

  // Calculate elapsed time in shelter
  if (obj.receivedAt) {
    const diffMs = Date.now() - new Date(obj.receivedAt).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays >= 1) {
      obj.timeInShelter = `${diffDays} day${diffDays > 1 ? "s" : ""} in care`;
    } else {
      obj.timeInShelter = `${Math.max(1, diffHours)} hour${diffHours > 1 ? "s" : ""} in care`;
    }
  } else {
    obj.timeInShelter = "Just Received";
  }

  // Format careStatus string matching frontend badges
  const statusBadgeMap = {
    pending_intake: "Newly Received",
    in_care: "Stable",
    awaiting_handover: "Awaiting Verification",
    handed_over: "Released",
    closed: "Released"
  };
  obj.careStatus = statusBadgeMap[obj.status] || "Stable";

  // Format medicalStatus string matching frontend badges
  const medicalBadgeMap = {
    stable: "Stable",
    monitoring: "Monitoring",
    attention_required: "Medical Attention Required",
    emergency: "Emergency"
  };
  obj.medicalStatusFormatted = medicalBadgeMap[obj.medicalStatus] || "Stable";

  return obj;
};

module.exports = mongoose.model("CareRecord", careRecordSchema);
