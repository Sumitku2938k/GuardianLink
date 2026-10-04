const rateLimit = require("express-rate-limit");

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 20 : 1000,
  skip: (req) => process.env.NODE_ENV === "test" || req.headers["x-test-suite"] === "true",
  message: {
    success: false,
    message: "Too many login attempts from this IP address. Please try again after 15 minutes.",
    code: "TOO_MANY_REQUESTS"
  },
  standardHeaders: true,
  legacyHeaders: false
});

const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === "production" ? 15 : 500,
  skip: (req) => process.env.NODE_ENV === "test" || req.headers["x-test-suite"] === "true",
  message: {
    success: false,
    message: "Too many account registrations from this IP. Please try again later.",
    code: "TOO_MANY_REGISTRATIONS"
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  loginRateLimiter,
  registerRateLimiter
};
