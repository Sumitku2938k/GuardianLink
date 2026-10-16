/**
 * GuardianLink — Citizen Routes (Phase 6.9)
 *
 * Exposes privacy-safe public sighting endpoints for missing child identification:
 * - POST /api/citizen/search-missing-child (Primary search route)
 * - POST /api/citizen/search (Route alias)
 *
 * Security:
 * - Requires active session authentication (authenticate)
 * - Restricts to authorized platform roles (citizen, parent, police, ngo, admin)
 * - Applies photo search rate limiter (photoSearchRateLimiter)
 * - Validates single image file upload in memory (uploadPhoto)
 */

const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { uploadPhoto } = require("../middleware/upload");
const { photoSearchRateLimiter } = require("../middleware/rateLimiter");
const { searchMissingChild } = require("../controllers/citizenController");

// Guard all citizen routes: Authenticated platform users only
router.use(authenticate, authorize("citizen", "parent", "police", "ngo", "admin"));

// Primary citizen search endpoint
router.post(
  "/search-missing-child",
  photoSearchRateLimiter,
  uploadPhoto,
  searchMissingChild
);

// Route alias for frontend convenience
router.post(
  "/search",
  photoSearchRateLimiter,
  uploadPhoto,
  searchMissingChild
);

module.exports = router;
