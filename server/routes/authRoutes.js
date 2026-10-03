const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { COOKIE_NAME } = require("../utils/cookies");
const { register, login, getMe, logout } = require("../controllers/authController");
const authenticate = require("../middleware/authenticate");
const { validateRegisterInput, validateLoginInput } = require("../validators/authValidator");
const { loginRateLimiter, registerRateLimiter } = require("../middleware/rateLimiter");

// Optional authenticate for logout so cookies & Redis sessions are always cleaned up safely
const optionalAuthenticate = async (req, res, next) => {
  try {
    let token = null;
    if (req.cookies && req.cookies[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
    } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      const secret = process.env.JWT_SECRET || "guardianlink_super_secret_jwt_key_2026_safe_child_platform";
      const decoded = jwt.verify(token, secret);
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
      }
    }
  } catch (err) {
    // Proceed to logout even if token verification fails
  }
  next();
};

// Authentication Routes
router.post("/register", registerRateLimiter, validateRegisterInput, register);
router.post("/login", loginRateLimiter, validateLoginInput, login);
router.get("/me", authenticate, getMe);
router.post("/logout", optionalAuthenticate, logout);

module.exports = router;
