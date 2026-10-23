/**
 * GuardianLink — Notification Service (Phase 7 & Phase 10)
 *
 * Implements persistent in-app notifications with real-time Socket.IO delivery:
 * 1. Alerts verified police personnel and law enforcement desks on new citizen sightings.
 * 2. Alerts verified guardians of active missing cases without exposing their private PII.
 * 3. Bridges database persistence to real-time socket room emission.
 * 4. Ensures notification failures or socket disconnection never roll back database mutations.
 * 5. Provides unread count tracking and synchronization across active sessions.
 */

const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const User = require("../models/User");
const realtimeService = require("./realtimeService");

/**
 * Creates, persists, and real-time dispatches a single in-app notification.
 *
 * @param {Object} params
 * @returns {Promise<Object>} Persisted Notification safe object
 */
const createNotification = async ({
  recipientId,
  senderId = null,
  recipientRole = "police",
  type,
  title,
  message,
  data = {},
  deliveryChannel = "in_app"
}) => {
  if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
    throw new Error("Invalid or missing notification recipient ID.");
  }

  const notification = new Notification({
    recipientId,
    senderId,
    recipientRole,
    type,
    title,
    message,
    data,
    deliveryStatus: "confirmed",
    deliveryChannel
  });

  await notification.save();
  const safeObj = notification.toSafeObject();

  // Real-time Socket.IO emission (non-blocking)
  try {
    realtimeService.emitNotification(safeObj);
    const canQueryCount = (mongoose.connection && mongoose.connection.readyState === 1) ||
      (Notification.countDocuments !== mongoose.Model.countDocuments);
    if (canQueryCount) {
      const unreadCount = await Notification.countDocuments({
        recipientId,
        isRead: false
      });
      realtimeService.emitUnreadCount(recipientId, unreadCount);
    }
  } catch (emitErr) {
    console.warn("[NotificationService] Realtime emission warning:", emitErr.message);
  }

  return safeObj;
};

/**
 * Dispatches authorized in-app notifications for a newly registered sighting.
 *
 * RECIPIENT SELECTION RULES:
 * 1. Verified police officers (role: 'police', status: 'approved' | 'active').
 * 2. Platform administrators (role: 'admin', status: 'approved' | 'active').
 * 3. Verified guardian of the child / reporter of the missing case (role: 'parent').
 *
 * PRIVACY GUARANTEE:
 * Guardian phone numbers, emails, and home addresses are NEVER included in notifications.
 *
 * @param {Object} params
 * @param {Object} params.sighting - Sighting Mongoose document
 * @param {Object} params.missingCase - MissingCase Mongoose document
 * @param {Object} params.child - Child Mongoose document
 * @returns {Promise<{ policeNotified: number, guardianNotified: boolean, notificationIds: string[] }>}
 */
const notifyAuthorizedRespondersForSighting = async ({ sighting, missingCase, child }) => {
  const notificationIds = [];
  let policeNotifiedCount = 0;
  let guardianNotified = false;

  const loc = sighting.location || {};
  const locationSummary = [loc.landmark, loc.city, loc.state].filter(Boolean).join(", ") || loc.address || "Location on record";

  const commonData = {
    sightingId: sighting._id,
    caseId: missingCase._id,
    childId: child._id,
    caseNumber: missingCase.caseNumber,
    reportNumber: sighting.reportNumber,
    locationSummary
  };

  try {
    // 1. Resolve eligible police officers & admin responders
    // Prioritize officer assigned to case if exists
    const policeRecipients = [];
    if (missingCase.assignedOfficer?.id && mongoose.Types.ObjectId.isValid(missingCase.assignedOfficer.id)) {
      policeRecipients.push(missingCase.assignedOfficer.id);
    }

    const policeOfficers = await User.find({
      role: { $in: ["police", "admin"] },
      isActive: true,
      status: { $in: ["active", "approved"] }
    }).limit(20);

    policeOfficers.forEach((po) => {
      if (!policeRecipients.some((r) => r.toString() === po._id.toString())) {
        policeRecipients.push(po._id);
      }
    });

    for (const officerId of policeRecipients) {
      try {
        const notif = await createNotification({
          recipientId: officerId,
          senderId: sighting.reportedBy,
          recipientRole: "police",
          type: "sighting_reported",
          title: `New Sighting Report: Case #${missingCase.caseNumber}`,
          message: `A citizen submitted Sighting #${sighting.reportNumber} for ${child.fullName || "Missing Child"} near ${locationSummary}. Review report details for verification.`,
          data: commonData
        });
        notificationIds.push(notif.id);
        policeNotifiedCount++;
      } catch (officerErr) {
        console.error(`[NotificationService] Failed to notify officer ${officerId}:`, officerErr.message);
      }
    }

    // 2. Resolve verified guardian (Child.guardianId or MissingCase.reportedBy)
    const guardianId = child.guardianId || missingCase.reportedBy;
    if (guardianId && mongoose.Types.ObjectId.isValid(guardianId)) {
      try {
        const guardian = await User.findById(guardianId);
        if (guardian && guardian.isActive) {
          const guardianNotif = await createNotification({
            recipientId: guardian._id,
            senderId: sighting.reportedBy,
            recipientRole: "parent",
            type: "sighting_reported",
            title: `New Sighting Reported for ${child.fullName}`,
            message: `A citizen helper reported a potential sighting for ${child.fullName} near ${locationSummary}. Law enforcement officers have been alerted to assess the report.`,
            data: commonData
          });
          notificationIds.push(guardianNotif.id);
          guardianNotified = true;
        }
      } catch (guardianErr) {
        console.error(`[NotificationService] Failed to notify guardian ${guardianId}:`, guardianErr.message);
      }
    }
  } catch (err) {
    console.error("[NotificationService] Error during responder dispatch:", err.message);
  }

  return {
    policeNotified: policeNotifiedCount,
    guardianNotified,
    notificationIds
  };
};

/**
 * Fetches notifications for a specific user.
 *
 * @param {string|ObjectId} userId
 * @param {Object} [options]
 * @returns {Promise<Array<Object>>}
 */
const getUserNotifications = async (userId, options = {}) => {
  const limit = Math.min(Math.max(Number(options.limit) || 20, 1), 100);
  const unreadOnly = options.unreadOnly === true || options.unreadOnly === "true";

  const query = { recipientId: userId };
  if (unreadOnly) {
    query.isRead = false;
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(limit);

  return notifications.map((n) => n.toSafeObject());
};

/**
 * Gets count of unread notifications for a user.
 *
 * @param {string|ObjectId} userId
 * @returns {Promise<number>}
 */
const getUnreadNotificationCount = async (userId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return 0;
  }
  const canQuery = (mongoose.connection && mongoose.connection.readyState === 1) ||
    (Notification.countDocuments !== mongoose.Model.countDocuments);
  if (!canQuery) {
    return 0;
  }
  return await Notification.countDocuments({ recipientId: userId, isRead: false });
};

/**
 * Marks a notification as read and emits realtime synchronization.
 *
 * @param {string|ObjectId} notificationId
 * @param {string|ObjectId} userId
 * @returns {Promise<Object>}
 */
const markNotificationAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    recipientId: userId
  });

  if (!notification) {
    const error = new Error("Notification not found or access denied.");
    error.status = 404;
    error.code = "NOTIFICATION_NOT_FOUND";
    throw error;
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();
  const safeObj = notification.toSafeObject();

  // Emit realtime read status and updated count
  try {
    realtimeService.emitNotificationRead(userId, notification._id, notification.readAt);
    const unreadCount = await getUnreadNotificationCount(userId);
    realtimeService.emitUnreadCount(userId, unreadCount);
  } catch (emitErr) {
    console.warn("[NotificationService] Realtime sync warning:", emitErr.message);
  }

  return safeObj;
};

/**
 * Marks all notifications for a user as read and emits realtime synchronization.
 *
 * @param {string|ObjectId} userId
 * @returns {Promise<{ modifiedCount: number }>}
 */
const markAllNotificationsAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipientId: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  // Emit realtime sync
  try {
    realtimeService.emitAllNotificationsRead(userId, result.modifiedCount || 0);
    realtimeService.emitUnreadCount(userId, 0);
  } catch (emitErr) {
    console.warn("[NotificationService] Realtime sync warning:", emitErr.message);
  }

  return { modifiedCount: result.modifiedCount || 0 };
};

module.exports = {
  createNotification,
  notifyAuthorizedRespondersForSighting,
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead
};
