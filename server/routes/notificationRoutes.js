/**
 * GuardianLink — Notification Routes (Phase 7 & Phase 10)
 *
 * Endpoints for user in-app notification center:
 * - GET    /api/notifications              — List current user's notifications
 * - GET    /api/notifications/unread-count — Get count of unread notifications
 * - PATCH  /api/notifications/:id/read     — Mark single notification read
 * - PATCH  /api/notifications/read-all     — Mark all user notifications read
 */

const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead
} = require("../controllers/notificationController");

// Guard all notification routes with session/token authentication
router.use(authenticate);

// Get user notifications
router.get("/", getNotifications);

// Get unread notification count
router.get("/unread-count", getUnreadCount);

// Mark single notification read
router.patch("/:id/read", markNotificationRead);

// Mark all user notifications read
router.patch("/read-all", markAllNotificationsRead);

module.exports = router;
