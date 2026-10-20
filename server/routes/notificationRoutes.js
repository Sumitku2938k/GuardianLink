/**
 * GuardianLink — Notification Routes (Phase 7)
 *
 * Endpoints for user in-app notification center:
 * - GET    /api/notifications         — List current user's notifications
 * - PATCH  /api/notifications/:id/read — Mark single notification read
 * - PATCH  /api/notifications/read-all — Mark all user notifications read
 */

const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
} = require("../controllers/notificationController");

// Guard all notification routes with session/token authentication
router.use(authenticate);

// Get user notifications
router.get("/", getNotifications);

// Mark single notification read
router.patch("/:id/read", markNotificationRead);

// Mark all user notifications read
router.patch("/read-all", markAllNotificationsRead);

module.exports = router;
