const mongoose = require("mongoose");

const shelterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Shelter name is required"],
      trim: true,
      maxlength: [200, "Shelter name cannot exceed 200 characters"]
    },
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owning NGO organization reference is required"],
      index: true
    },
    address: {
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
      }
    },
    capacity: {
      type: Number,
      required: [true, "Shelter bed capacity is required"],
      min: [1, "Shelter capacity must be at least 1"]
    },
    activePlacements: {
      type: Number,
      default: 0,
      min: [0, "Active placements cannot be negative"]
    },
    status: {
      type: String,
      enum: {
        values: ["active", "inactive"],
        message: "Status must be either active or inactive"
      },
      default: "active",
      index: true
    },
    facilities: [
      {
        name: {
          type: String,
          trim: true,
          required: true
        },
        status: {
          type: String,
          trim: true,
          default: "Operational"
        }
      }
    ],
    staffCount: {
      type: Number,
      default: 1,
      min: [0, "Staff count cannot be negative"]
    },
    contactPhone: {
      type: String,
      trim: true,
      default: ""
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: ""
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual: Available spaces
shelterSchema.virtual("availableSpaces").get(function () {
  return Math.max(0, this.capacity - (this.activePlacements || 0));
});

// Virtual: Occupancy percentage
shelterSchema.virtual("occupancyRate").get(function () {
  if (!this.capacity || this.capacity <= 0) return 0;
  return Math.min(100, Math.round(((this.activePlacements || 0) / this.capacity) * 100));
});

// Compound index for querying active shelters by NGO
shelterSchema.index({ ngoId: 1, status: 1 });

// Safe JSON serialization
shelterSchema.methods.toSafeObject = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.__v;
  obj.id = obj._id.toString();
  return obj;
};

module.exports = mongoose.model("Shelter", shelterSchema);
