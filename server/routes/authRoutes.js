const express = require("express");
const router = express.Router();
const { register, login, getMe, logout } = require("../controllers/authController");
const authenticate = require("../middleware/authenticate");
const { validateRegisterInput, validateLoginInput } = require("../validators/authValidator");
const { loginRateLimiter, registerRateLimiter } = require("../middleware/rateLimiter");

// Authentication Routes
router.post("/register", registerRateLimiter, validateRegisterInput, register);
router.post("/login", loginRateLimiter, validateLoginInput, login);
router.get("/me", authenticate, getMe);
router.post("/logout", authenticate, logout);

module.exports = router;
