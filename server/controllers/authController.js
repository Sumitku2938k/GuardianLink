const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendTokenResponse, clearTokenCookie, COOKIE_NAME } = require("../utils/cookies");
const { delSession } = require("../config/redis");
const auditLogService = require("../services/auditLogService");

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { fullName, email, phone, password, role, city, state, pinCode, organization } = req.body || {};

    const safeName = (fullName || "").trim();
    const safeEmail = (email || "").toLowerCase().trim();
    const safePhone = (phone || "").trim();
    const safePassword = password || "";
    const requestedRole = (role || "parent").toLowerCase().trim();

    if (!safeName || !safeEmail || !safePhone || !safePassword) {
      return res.status(400).json({
        success: false,
        message: "Full name, email address, phone number, and password are required.",
        code: "MISSING_REQUIRED_FIELDS"
      });
    }

    // Forbid public administrator registration
    if (requestedRole === "admin") {
      return res.status(403).json({
        success: false,
        message: "Administrator accounts cannot be created via public registration.",
        code: "ADMIN_REGISTRATION_FORBIDDEN"
      });
    }

    // Check for existing user with duplicate email or phone
    const existingUser = await User.findOne({
      $or: [{ email: safeEmail }, { phone: safePhone }]
    });

    if (existingUser) {
      const isEmailMatch = existingUser.email && existingUser.email.toLowerCase() === safeEmail;
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
      name: safeName,
      email: safeEmail,
      phone: safePhone,
      passwordHash: safePassword,
      role: requestedRole,
      status: accountStatus,
      isVerified: isVerified,
      organization: (organization || "").trim(),
      city: (city || "").trim(),
      state: (state || "").trim(),
      pinCode: (pinCode || "").trim(),
      lastLogin: new Date()
    });

    await user.save();

    await auditLogService.recordAuditEvent({
      actor: { _id: user._id, name: user.name, role: user.role, organization: user.organization },
      action: "USER_REGISTRATION_COMPLETED",
      entityType: "User",
      entityId: user._id,
      outcome: "success",
      metadata: {
        registeredRole: user.role,
        initialStatus: user.status,
        city: user.city || null,
        state: user.state || null
      }
    });

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
    const { identifier, password } = req.body || {};

    const rawIdentifier = (identifier || "").trim();
    const safePassword = password || "";

    if (!rawIdentifier || !safePassword) {
      return res.status(400).json({
        success: false,
        message: "Email/phone and password are required.",
        code: "MISSING_CREDENTIALS"
      });
    }

    const lowerIdentifier = rawIdentifier.toLowerCase();

    // Search user by email or phone (include passwordHash)
    const user = await User.findOne({
      $or: [{ email: lowerIdentifier }, { phone: rawIdentifier }]
    }).select("+passwordHash");

    if (!user) {
      await auditLogService.recordAuditEvent({
        req,
        action: "USER_LOGIN_FAILED",
        entityType: "User",
        outcome: "failure",
        metadata: {
          reason: "USER_NOT_FOUND",
          identifierType: lowerIdentifier.includes("@") ? "email" : "phone"
        }
      });

      return res.status(401).json({
        success: false,
        message: "Email/phone or password is incorrect.",
        code: "INVALID_CREDENTIALS"
      });
    }

    // Check if user is suspended or deactivated
    if (user.status === "suspended") {
      await auditLogService.recordAuditEvent({
        req,
        actor: { _id: user._id, name: user.name, role: user.role, organization: user.organization },
        action: "USER_LOGIN_FAILED",
        entityType: "User",
        entityId: user._id,
        outcome: "denied",
        metadata: {
          reason: "ACCOUNT_SUSPENDED",
          targetRole: user.role
        }
      });

      return res.status(403).json({
        success: false,
        message: "Your account has been suspended. Please contact platform support.",
        code: "ACCOUNT_SUSPENDED"
      });
    }

    if (user.status === "deactivated") {
      await auditLogService.recordAuditEvent({
        req,
        actor: { _id: user._id, name: user.name, role: user.role, organization: user.organization },
        action: "USER_LOGIN_FAILED",
        entityType: "User",
        entityId: user._id,
        outcome: "denied",
        metadata: {
          reason: "ACCOUNT_DEACTIVATED",
          targetRole: user.role
        }
      });

      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact platform support.",
        code: "ACCOUNT_DEACTIVATED"
      });
    }

    // Verify Password Hash
    const isMatch = await user.comparePassword(safePassword);
    if (!isMatch) {
      await auditLogService.recordAuditEvent({
        req,
        actor: { _id: user._id, name: user.name, role: user.role, organization: user.organization },
        action: "USER_LOGIN_FAILED",
        entityType: "User",
        entityId: user._id,
        outcome: "failure",
        metadata: {
          reason: "INVALID_PASSWORD",
          targetRole: user.role
        }
      });

      return res.status(401).json({
        success: false,
        message: "Email/phone or password is incorrect.",
        code: "INVALID_CREDENTIALS"
      });
    }

    // Update lastLogin timestamp
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    await auditLogService.recordAuditEvent({
      req,
      actor: { _id: user._id, name: user.name, role: user.role, organization: user.organization },
      action: "USER_LOGIN_SUCCESS",
      entityType: "User",
      entityId: user._id,
      outcome: "success",
      metadata: {
        role: user.role,
        organization: user.organization || null
      }
    });

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
// @access  Public / Private
exports.logout = async (req, res, next) => {
  try {
    let userId = req.user ? req.user._id.toString() : null;

    if (!userId) {
      let token = null;
      if (req.cookies && req.cookies[COOKIE_NAME]) {
        token = req.cookies[COOKIE_NAME];
      } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
      }

      if (token) {
        try {
          const decoded = jwt.decode(token);
          if (decoded && decoded.id) {
            userId = decoded.id;
          }
        } catch (e) {
          // Ignore decode error
        }
      }
    }

    if (userId) {
      await delSession(`session:${userId}`);

      await auditLogService.recordAuditEvent({
        req,
        actor: req.user || { _id: userId, name: "User", role: "citizen" },
        action: "USER_LOGOUT",
        entityType: "User",
        entityId: userId,
        outcome: "success"
      });
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
