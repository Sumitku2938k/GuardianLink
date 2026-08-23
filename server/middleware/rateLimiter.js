const rateLimit = require("express-rate-limit");

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per IP
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
  max: 15, // 15 accounts per hour per IP
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
