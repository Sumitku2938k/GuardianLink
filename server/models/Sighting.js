const mongoose = require("mongoose");

const sightingSchema = new mongoose.Schema(
  {
    caseId: {
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
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reporting user reference is required"],
      index: true
    },
    sightingNumber: {
      type: String,
      unique: true,
      index: true,
      default: () => `SR-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`
    },
    observedAt: {
      type: Date,
      required: [true, "Observation date and time is required"],
      default: Date.now,
      validate: {
        validator: function (val) {
          // Allow up to 5 minutes clock drift into the future
          const fiveMinsFuture = new Date(Date.now() + 5 * 60 * 1000);
          return val && val <= fiveMinsFuture;
        },
        message: "Observation date cannot be in the future"
      }
    },
    location: {
      address: {
        type: String,
        trim: true,
        default: "",
        maxlength: [500, "Address cannot exceed 500 characters"]
      },
      city: {
        type: String,
        trim: true,
        default: "",
        maxlength: [100, "City cannot exceed 100 characters"]
      },
      state: {
        type: String,
        trim: true,
        default: "",
        maxlength: [100, "State cannot exceed 100 characters"]
      },
      landmark: {
        type: String,
        trim: true,
        default: "",
        maxlength: [200, "Landmark cannot exceed 200 characters"]
      },
      pinCode: {
        type: String,
        trim: true,
        default: "",
        maxlength: [20, "Postal code cannot exceed 20 characters"]
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
    description: {
      type: String,
      required: [true, "Observation description details are required"],
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"]
    },
    appearance: {
      approxAge: {
        type: String,
        trim: true,
        default: "",
        maxlength: [50, "Approximate age cannot exceed 50 characters"]
      },
      approxGender: {
        type: String,
        trim: true,
        default: "",
        maxlength: [50, "Approximate gender cannot exceed 50 characters"]
      },
      clothing: {
        type: String,
        trim: true,
        default: "",
        maxlength: [500, "Clothing description cannot exceed 500 characters"]
      },
      distinctiveFeatures: {
        type: String,
        trim: true,
        default: "",
        maxlength: [500, "Distinctive features cannot exceed 500 characters"]
      }
    },
    safetyState: {
      type: String,
      trim: true,
      default: "Safe",
      maxlength: [200, "Safety state cannot exceed 200 characters"]
    },
    safetyConfirmed: {
      type: Boolean,
      required: [true, "Explicit safety confirmation is required"],
      validate: {
        validator: function (val) {
          return val === true;
        },
        message: "You must confirm that you will not confront or detain anyone and will allow authorized responders to assess the report"
      }
    },
    status: {
      type: String,
      enum: {
        values: ["submitted", "under_review", "verified", "dismissed"],
        message: "Status must be submitted, under_review, verified, or dismissed"
      },
      default: "submitted",
      index: true
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    reviewNotes: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "Review notes cannot exceed 1000 characters"]
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual: canonical reportNumber format
sightingSchema.virtual("reportNumber").get(function () {
  return this.sightingNumber || `SR-${this._id.toString().slice(-6).toUpperCase()}`;
});

// Auto-generate unique sightingNumber before validation if not already set
sightingSchema.pre("validate", function () {
  if (!this.sightingNumber) {
    const timestampPart = Date.now().toString().slice(-6);
    const randomPart = Math.floor(100 + Math.random() * 900);
    this.sightingNumber = `SR-${timestampPart}-${randomPart}`;
  }
});

// Compound indexes for fast lookups
sightingSchema.index({ caseId: 1, status: 1 });
sightingSchema.index({ childId: 1, status: 1 });
sightingSchema.index({ reportedBy: 1, createdAt: -1 });
sightingSchema.index({ createdAt: -1 });

/**
 * Returns a sanitized response suitable for the reporting citizen
 * or authorized responder. Prevents leakage of internal credentials.
 */
sightingSchema.methods.toSafeObject = function (options = {}) {
  const isAuthorizedResponder = options.isAuthorizedResponder || false;
  const isReporter = options.isReporter || false;

  const obj = this.toObject({ virtuals: true });
  delete obj.__v;
  obj.id = obj._id.toString();
  obj.reportNumber = this.reportNumber;

  // Protect exact coordinates if not reporter and not authorized responder
  if (!isAuthorizedResponder && !isReporter && obj.location) {
    delete obj.location.latitude;
    delete obj.location.longitude;
  }

  return obj;
};

const Sighting = mongoose.model("Sighting", sightingSchema);

module.exports = Sighting;
