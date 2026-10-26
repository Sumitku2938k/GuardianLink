const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { uploadPhoto } = require("../middleware/upload");
const {
  createCase,
  getCases,
  getCaseById,
  updateCaseStatus,
  matchMissingChild
} = require("../controllers/caseController");

// All case operations require authentication
router.use(authenticate);

// 1. Biometric Citizen & Authority face match search against enrolled missing children
router
  .route("/match")
  .post(authorize("citizen", "police", "ngo", "admin", "parent"), uploadPhoto, matchMissingChild);

// 2. Create a new case (Parent only) & Query cases (Parent, Police, NGO, Admin)
router
  .route("/")
  .post(authorize("parent"), createCase)
  .get(authorize("parent", "police", "ngo", "admin"), getCases);

// 3. Fetch specific case details
router
  .route("/:caseId")
  .get(authorize("parent", "police", "ngo", "admin"), getCaseById);

// 4. Update case lifecycle status (Restricted controlled state machine)
router
  .route("/:caseId/status")
  .patch(authorize("parent", "police", "ngo", "admin"), updateCaseStatus);

module.exports = router;

