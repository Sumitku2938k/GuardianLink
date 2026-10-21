const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const {
  createCase,
  getCases,
  getCaseById,
  updateCaseStatus,
  getPoliceDashboardStats,
  updateInvestigationDetails,
  assignOfficer,
  addInvestigationNote,
  createTask,
  toggleTask,
  reviewAIMatch
} = require("../controllers/caseController");

// All case operations require authentication
router.use(authenticate);

// 1. Police Station Dashboard aggregated analytics (Must precede /:caseId)
router
  .route("/police/dashboard-stats")
  .get(authorize("police", "admin"), getPoliceDashboardStats);

// 2. Create a new case (Parent only) & Query cases (Parent, Police, NGO, Admin)
router
  .route("/")
  .post(authorize("parent"), createCase)
  .get(authorize("parent", "police", "ngo", "admin"), getCases);

// 3. Update case lifecycle status (Restricted controlled state machine)
router
  .route("/:caseId/status")
  .patch(authorize("parent", "police", "ngo", "admin"), updateCaseStatus);

// 4. Update police case number, FIR number, or priority
router
  .route("/:caseId/investigation")
  .patch(authorize("police", "admin"), updateInvestigationDetails);

// 5. Squad Lead Assignment
router
  .route("/:caseId/assign")
  .patch(authorize("police", "admin"), assignOfficer);

// 6. Internal Investigation Notes
router
  .route("/:caseId/notes")
  .post(authorize("police", "admin"), addInvestigationNote);

// 7. Investigation Tasks Checklist
router
  .route("/:caseId/tasks")
  .post(authorize("police", "admin"), createTask);

router
  .route("/:caseId/tasks/:taskId")
  .patch(authorize("police", "admin"), toggleTask);

// 8. Officer Human AI Match Verification Decision
router
  .route("/:caseId/matches/:matchId/review")
  .post(authorize("police", "admin"), reviewAIMatch);

// 9. Fetch specific case details (Parameter match placed after specific subroutes)
router
  .route("/:caseId")
  .get(authorize("parent", "police", "ngo", "admin"), getCaseById);

module.exports = router;

