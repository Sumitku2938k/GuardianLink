const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Full name is required"],
      trim: true
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/, "Please enter a valid email address"]
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
      select: false
    },
    role: {
      type: String,
      enum: ["parent", "citizen", "police", "ngo", "admin"],
      default: "parent"
    },
    profilePhoto: {
      type: String,
      default: ""
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ["active", "pending", "suspended", "deactivated"],
      default: "active"
    },
    city: {
      type: String,
      default: ""
    },
    state: {
      type: String,
      default: ""
    },
    pinCode: {
      type: String,
      default: ""
    },
    lastLogin: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("passwordHash")) return;

  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

// Compare candidate password against stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Safe JSON serialization (omits passwordHash and internal fields)
userSchema.methods.toSafeObject = function () {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.__v;
  user.id = user._id.toString();
  return user;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
