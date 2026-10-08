const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const {
  createCase,
  getCases,
  getCaseById,
  updateCaseStatus
} = require("../controllers/caseController");

// All case operations require authentication
router.use(authenticate);

// 1. Create a new case (Parent only) & Query cases (Parent, Police, NGO, Admin)
router
  .route("/")
  .post(authorize("parent"), createCase)
  .get(authorize("parent", "police", "ngo", "admin"), getCases);

// 2. Fetch specific case details
router
  .route("/:caseId")
  .get(authorize("parent", "police", "ngo", "admin"), getCaseById);

// 3. Update case lifecycle status (Restricted controlled state machine)
router
  .route("/:caseId/status")
  .patch(authorize("parent", "police", "ngo", "admin"), updateCaseStatus);

module.exports = router;
