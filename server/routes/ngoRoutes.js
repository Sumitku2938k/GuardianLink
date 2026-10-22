const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/authenticate");
const { requireRole } = require("../middleware/role");
const ngoController = require("../controllers/ngoController");

// Scoped Dashboard Stats
router.get(
  "/dashboard-stats",
  authenticate,
  requireRole(["ngo", "admin"]),
  ngoController.getDashboardStats
);

// Authorized Referrals
router.get(
  "/referrals",
  authenticate,
  requireRole(["ngo", "admin"]),
  ngoController.getReferrals
);

// Care Records (Intake & Scoped Queries)
router
  .route("/care-records")
  .get(authenticate, requireRole(["ngo", "admin"]), ngoController.getCareRecords)
  .post(authenticate, requireRole(["ngo", "admin"]), ngoController.createCareRecord);

router.get(
  "/care-records/:careRecordId",
  authenticate,
  requireRole(["ngo", "police", "admin"]),
  ngoController.getCareRecordById
);

router.patch(
  "/care-records/:careRecordId/status",
  authenticate,
  requireRole(["ngo", "admin"]),
  ngoController.updateCareRecordStatus
);

router.post(
  "/care-records/:careRecordId/notes",
  authenticate,
  requireRole(["ngo", "admin"]),
  ngoController.addCareNote
);

router.patch(
  "/care-records/:careRecordId/medical-status",
  authenticate,
  requireRole(["ngo", "admin"]),
  ngoController.updateMedicalStatus
);

router.post(
  "/care-records/:careRecordId/placement",
  authenticate,
  requireRole(["ngo", "admin"]),
  ngoController.assignPlacement
);

router.post(
  "/care-records/:careRecordId/handovers",
  authenticate,
  requireRole(["ngo", "admin"]),
  ngoController.requestHandover
);

// Shelter Management
router
  .route("/shelters")
  .get(authenticate, requireRole(["ngo", "admin"]), ngoController.getShelters)
  .post(authenticate, requireRole(["ngo", "admin"]), ngoController.createShelter);

router.patch(
  "/shelters/:shelterId",
  authenticate,
  requireRole(["ngo", "admin"]),
  ngoController.updateShelter
);

// Handover Management
router.get(
  "/handovers",
  authenticate,
  requireRole(["ngo", "police", "admin"]),
  ngoController.getHandovers
);

router.get(
  "/handovers/:handoverId",
  authenticate,
  requireRole(["ngo", "police", "admin"]),
  ngoController.getHandoverById
);

router.patch(
  "/handovers/:handoverId/approve",
  authenticate,
  requireRole(["police", "admin"]),
  ngoController.approveHandover
);

router.patch(
  "/handovers/:handoverId/reject",
  authenticate,
  requireRole(["police", "admin"]),
  ngoController.rejectHandover
);

router.patch(
  "/handovers/:handoverId/complete",
  authenticate,
  requireRole(["ngo", "police", "admin"]),
  ngoController.completeHandover
);

module.exports = router;
