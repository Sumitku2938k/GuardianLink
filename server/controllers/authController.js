const User = require("../models/User");
const { sendTokenResponse, clearTokenCookie } = require("../utils/cookies");
const { delSession } = require("../config/redis");

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { fullName, email, phone, password, role, city, state, pinCode, adminSecret } = req.body;

    const requestedRole = (role || "parent").toLowerCase();

    // Prevent unrestricted public admin registration
    if (requestedRole === "admin") {
      const validAdminSecret = process.env.ADMIN_REGISTRATION_SECRET || "guardianlink_admin_dev_pass_2026";
      if (!adminSecret || adminSecret !== validAdminSecret) {
        return res.status(403).json({
          success: false,
          message: "Unrestricted public administrator signup is prohibited. Administrator accounts must be provisioned by existing authorities.",
          code: "ADMIN_SIGNUP_RESTRICTED"
        });
      }
    }

    // Check for existing user with duplicate email or phone
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone: phone.trim() }]
    });

    if (existingUser) {
      const isEmailMatch = existingUser.email.toLowerCase() === email.toLowerCase();
      return res.status(400).json({
        success: false,
        message: isEmailMatch
          ? "An account with this email address already exists."
          : "An account with this phone number already exists.",
        code: "DUPLICATE_ACCOUNT"
      });
    }

    // Role-based status & verification policy
    let accountStatus = "active";
    let isVerified = true;

    if (requestedRole === "police" || requestedRole === "ngo") {
      accountStatus = "pending";
      isVerified = false;
    }

    // Create MongoDB User Document
    const user = new User({
      name: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      passwordHash: password,
      role: requestedRole,
      status: accountStatus,
      isVerified: isVerified,
      city: city || "",
      state: state || "",
      pinCode: pinCode || "",
      lastLogin: new Date()
    });

    await user.save();

    // Send HttpOnly Cookie & Return Safe User Payload
    await sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get session
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    const trimmedIdentifier = identifier.trim().toLowerCase();

    // Search user by email or phone (include passwordHash)
    const user = await User.findOne({
      $or: [{ email: trimmedIdentifier }, { phone: identifier.trim() }]
    }).select("+passwordHash");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email/phone or password is incorrect.",
        code: "INVALID_CREDENTIALS"
      });
    }

    // Check if user is suspended
    if (user.status === "suspended") {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended. Please contact platform support.",
        code: "ACCOUNT_SUSPENDED"
      });
    }

    // Verify Password Hash
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Email/phone or password is incorrect.",
        code: "INVALID_CREDENTIALS"
      });
    }

    // Update lastLogin timestamp
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Send HttpOnly Cookie & Return Safe User
    await sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get current authenticated user session
// @route   GET /api/auth/me
// @access  Private (Authenticated)
exports.getMe = async (req, res, next) => {
  try {
    const safeUser = req.user.toSafeObject();
    return res.status(200).json({
      success: true,
      user: safeUser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user & clear session cookie
// @route   POST /api/auth/logout
// @access  Private (Authenticated)
exports.logout = async (req, res, next) => {
  try {
    if (req.user) {
      await delSession(`session:${req.user._id.toString()}`);
    }
    clearTokenCookie(res);
    return res.status(200).json({
      success: true,
      message: "Logged out successfully."
    });
  } catch (error) {
    next(error);
  }
};
