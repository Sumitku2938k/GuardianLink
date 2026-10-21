/**
 * GuardianLink — Sighting Routes (Phase 7)
 *
 * Endpoints for citizen sighting report submission and law enforcement review:
 * - POST   /api/sightings          — Submit a sighting report (citizen, parent, police, ngo, admin)
 * - GET    /api/sightings/mine     — List current user's submitted sightings
 * - GET    /api/sightings/:id      — View single sighting details (reporter, police, admin, case guardian)
 * - PATCH  /api/sightings/:id/review — Update review status (police, admin only)
 * - GET    /api/sightings/case/:caseId — View all sightings for a case (police, admin, case guardian)
 */

const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { sightingRateLimiter } = require("../middleware/rateLimiter");
const {
  submitSighting,
  getMySightings,
  getSightingById,
  reviewSighting,
  getCaseSightings,
  getAllSightings
} = require("../controllers/sightingController");

// All sighting routes require authenticated session/token
router.use(authenticate);

// Sighting Submission & Police Desk Queue
router
  .route("/")
  .post(
    sightingRateLimiter,
    authorize("citizen", "parent", "police", "ngo", "admin"),
    submitSighting
  )
  .get(
    authorize("police", "admin", "ngo"),
    getAllSightings
  );

// List authenticated citizen's submitted reports
router.get(
  "/mine",
  authorize("citizen", "parent", "police", "ngo", "admin"),
  getMySightings
);

// Get all sightings for a specific case (Law enforcement, admin, case guardian)
router.get(
  "/case/:caseId",
  authorize("police", "admin", "ngo", "parent"),
  getCaseSightings
);

// Get single sighting by ID
router.get(
  "/:id",
  getSightingById
);

// Police / Admin desk review status update
router.patch(
  "/:id/review",
  authorize("police", "admin"),
  reviewSighting
);

module.exports = router;
