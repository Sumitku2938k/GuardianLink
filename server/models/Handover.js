const mongoose = require("mongoose");

const handoverSchema = new mongoose.Schema(
  {
    careRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CareRecord",
      required: [true, "Care record reference is required"],
      index: true
    },
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MissingCase",
      required: [true, "Missing case reference is required"],
      index: true
    },
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: [true, "Child reference is required"],
      index: true
    },
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owning NGO reference is required"],
      index: true
    },
    handoverType: {
      type: String,
      enum: {
        values: [
          "guardian_reunification",
          "police_custody",
          "medical_facility",
          "specialized_shelter"
        ],
        message: "Handover type must be guardian_reunification, police_custody, medical_facility, or specialized_shelter"
      },
      default: "guardian_reunification"
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "approved", "completed", "rejected"],
        message: "Handover status must be pending, approved, completed, or rejected"
      },
      default: "pending",
      index: true
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Requesting NGO staff identity is required"]
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    completedAt: {
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
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [1000, "Rejection reason cannot exceed 1000 characters"],
      default: ""
    },
    receivingOfficer: {
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
      station: {
        type: String,
        trim: true,
        default: ""
      },
      phone: {
        type: String,
        trim: true,
        default: ""
      }
    },
    guardianDetails: {
      name: {
        type: String,
        trim: true,
        default: ""
      },
      relationship: {
        type: String,
        trim: true,
        default: ""
      },
      phone: {
        type: String,
        trim: true,
        default: ""
      },
      verifiedByPolice: {
        type: Boolean,
        default: false
      }
    },
    handoverLocation: {
      type: String,
      trim: true,
      default: ""
    },
    handoverNotes: {
      type: String,
      trim: true,
      maxlength: [2000, "Handover notes cannot exceed 2000 characters"],
      default: ""
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

handoverSchema.index({ caseId: 1, status: 1 });
handoverSchema.index({ ngoId: 1, status: 1 });

handoverSchema.methods.toSafeObject = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.__v;
  obj.id = obj._id.toString();
  return obj;
};

module.exports = mongoose.model("Handover", handoverSchema);
