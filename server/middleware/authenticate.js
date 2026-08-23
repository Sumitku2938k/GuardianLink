const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { getSession } = require("../config/redis");
const { COOKIE_NAME } = require("../utils/cookies");

const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check HttpOnly Cookie first
    if (req.cookies && req.cookies[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
    }
    // 2. Fallback to Authorization Header
    else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in to access this resource.",
        code: "UNAUTHORIZED"
      });
    }

    // Verify JWT
    const secret = process.env.JWT_SECRET || "guardianlink_super_secret_jwt_key_2026_safe_child_platform";
    const decoded = jwt.verify(token, secret);

    // Verify session in Redis/Session cache
    const session = await getSession(`session:${decoded.id}`);
    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Session expired or invalidated. Please log in again.",
        code: "SESSION_EXPIRED"
      });
    }

    // Retrieve active user from DB
    let user = await User.findById(decoded.id);

    // Development Fallback User if MongoDB is not populated with mock user
    if (!user) {
      // If MongoDB is running and user was deleted or not found
      return res.status(401).json({
        success: false,
        message: "User account no longer exists.",
        code: "USER_NOT_FOUND"
      });
    }

    if (user.status === "suspended") {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended. Please contact platform support.",
        code: "ACCOUNT_SUSPENDED"
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
      code: "INVALID_TOKEN"
    });
  }
};

module.exports = authenticate;
