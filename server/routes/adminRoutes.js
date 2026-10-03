const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const adminController = require("../controllers/adminController");

// Enforce both Authentication and Admin Authorization on all /api/admin/* endpoints
router.use(authenticate, authorize("admin"));

// User management & verification routes
router.get("/users", adminController.getUsers);
router.get("/users/:id", adminController.getUserById);
router.patch("/users/:id/approve", adminController.approveUser);
router.patch("/users/:id/reject", adminController.rejectUser);
router.patch("/users/:id/suspend", adminController.suspendUser);
router.patch("/users/:id/activate", adminController.activateUser);
router.patch("/users/:id/role", adminController.updateUserRole);

module.exports = router;
