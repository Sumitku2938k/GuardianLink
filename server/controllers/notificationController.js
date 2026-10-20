/**
 * GuardianLink — Notification Controller (Phase 7)
 *
 * Exposes in-app alert endpoints:
 * 1. GET /api/notifications — Retrieve user's in-app notifications
 * 2. PATCH /api/notifications/:id/read — Mark single notification read
 * 3. PATCH /api/notifications/read-all — Mark all user notifications read
 */

const notificationService = require("../services/notificationService");

/**
 * @desc    Get authenticated user's notifications
 * @route   GET /api/notifications
 * @access  Private (All authenticated roles)
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationService.getUserNotifications(
      req.user._id,
      {
        limit: req.query.limit,
        unreadOnly: req.query.unreadOnly
      }
    );

    return res.status(200).json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark a notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private (Recipient user)
 */
exports.markNotificationRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markNotificationAsRead(
      req.params.id,
      req.user._id
    );

    return res.status(200).json({
      success: true,
      notification
    });
  } catch (error) {
    if (error.code === "NOTIFICATION_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }

    next(error);
  }
};

/**
 * @desc    Mark all user notifications as read
 * @route   PATCH /api/notifications/read-all
 * @access  Private (Recipient user)
 */
exports.markAllNotificationsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllNotificationsAsRead(req.user._id);

    return res.status(200).json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read.`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    next(error);
  }
};
