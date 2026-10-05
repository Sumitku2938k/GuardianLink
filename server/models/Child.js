const mongoose = require("mongoose");

const childSchema = new mongoose.Schema(
  {
    guardianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Guardian reference is required"],
      index: true
    },
    fullName: {
      type: String,
      required: [true, "Child full name is required"],
      trim: true,
      minlength: [2, "Full name must be at least 2 characters long"],
      maxlength: [100, "Full name cannot exceed 100 characters"]
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
      validate: {
        validator: function (value) {
          return value && value <= new Date();
        },
        message: "Date of birth cannot be in the future"
      }
    },
    gender: {
      type: String,
      enum: {
        values: ["male", "female", "other", "prefer_not_to_say"],
        message: "Gender must be male, female, other, or prefer_not_to_say"
      },
      required: [true, "Gender is required"],
      set: (val) => (val ? val.toLowerCase().trim() : val)
    },
    nickname: {
      type: String,
      trim: true,
      default: ""
    },
    bloodGroup: {
      type: String,
      trim: true,
      default: "Unknown"
    },
    height: {
      type: String,
      trim: true,
      default: "N/A"
    },
    weight: {
      type: String,
      trim: true,
      default: "N/A"
    },
    schoolName: {
      type: String,
      trim: true,
      default: ""
    },
    languages: {
      type: String,
      trim: true,
      default: "Hindi, English"
    },
    lastLocation: {
      type: String,
      trim: true,
      default: ""
    },
    emergencyPin: {
      type: String,
      trim: true,
      default: ""
    },
    distinctiveMarks: {
      type: String,
      trim: true,
      default: "None"
    },
    scars: {
      type: String,
      trim: true,
      default: "None"
    },
    birthmarks: {
      type: String,
      trim: true,
      default: "None"
    },
    otherMarks: {
      type: String,
      trim: true,
      default: "None"
    },
    hasMedicalInfo: {
      type: Boolean,
      default: false
    },
    medicalConditions: {
      type: String,
      trim: true,
      default: "None"
    },
    allergies: {
      type: String,
      trim: true,
      default: "None"
    },
    medications: {
      type: String,
      trim: true,
      default: "None"
    },
    doctorName: {
      type: String,
      trim: true,
      default: ""
    },
    doctorContact: {
      type: String,
      trim: true,
      default: ""
    },
    medicalNotes: {
      type: String,
      trim: true,
      default: ""
    },
    emergencyContacts: [
      {
        name: { type: String, trim: true, default: "" },
        relationship: { type: String, trim: true, default: "" },
        phone: { type: String, trim: true, default: "" },
        alternatePhone: { type: String, trim: true, default: "" },
        isPrimary: { type: Boolean, default: false }
      }
    ],
    photos: {
      type: [String],
      default: []
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: ""
    },
    photoUrl: {
      type: String,
      default: ""
    },
    cloudinaryPublicId: {
      type: String,
      default: ""
    },
    faceProfileId: {
      type: String,
      default: "",
      index: true,
      sparse: true
    },
    status: {
      type: String,
      enum: {
        values: ["active", "inactive"],
        message: "Status must be active or inactive"
      },
      default: "active",
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index for fast parent-scoped queries
childSchema.index({ guardianId: 1, status: 1 });

// Virtual: age calculated from dateOfBirth
childSchema.virtual("age").get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
});

// Virtual: dob alias for dateOfBirth (YYYY-MM-DD)
childSchema.virtual("dob")
  .get(function () {
    return this.dateOfBirth ? this.dateOfBirth.toISOString().split("T")[0] : "";
  })
  .set(function (val) {
    if (val) this.dateOfBirth = new Date(val);
  });

// Virtual: photo alias for photoUrl
childSchema.virtual("photo")
  .get(function () {
    return this.photoUrl || (this.photos && this.photos[0]) || "";
  })
  .set(function (val) {
    this.photoUrl = val;
  });

// Virtual: name alias for fullName
childSchema.virtual("name")
  .get(function () {
    return this.fullName;
  })
  .set(function (val) {
    this.fullName = val;
  });

// Ownership verification helper
childSchema.methods.isOwnedBy = function (userOrId) {
  if (!userOrId) return false;
  const targetId = userOrId._id ? userOrId._id.toString() : userOrId.toString();
  return this.guardianId.toString() === targetId;
};

// Safe JSON serialization
childSchema.methods.toSafeObject = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.__v;
  obj.id = obj._id.toString();
  return obj;
};

const Child = mongoose.model("Child", childSchema);

module.exports = Child;
