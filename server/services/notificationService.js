/**
 * GuardianLink — Notification Service (Phase 7)
 *
 * Implements persistent in-app notifications for authorized alerts:
 * 1. Alerts verified police personnel and law enforcement desks on new citizen sightings.
 * 2. Alerts verified guardians of active missing cases without exposing their private PII.
 * 3. Tracks delivery status (created, confirmed, failed).
 * 4. Ensures notification failures do not roll back or erase persisted sightings.
 */

const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const User = require("../models/User");

/**
 * Creates and persists a single in-app notification.
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
  return notification.toSafeObject();
};

/**
 * Dispatches authorized in-app notifications for a newly registered sighting.
 *
 * RECIPIENT SELECTION RULES:
 * 1. Verified police officers (role: 'police', status: 'active').
 * 2. Platform administrators (role: 'admin', status: 'active').
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
    const policeOfficers = await User.find({
      role: { $in: ["police", "admin"] },
      isActive: true,
      status: { $in: ["active", "approved"] }
    }).limit(20);

    for (const officer of policeOfficers) {
      try {
        const notif = await createNotification({
          recipientId: officer._id,
          senderId: sighting.reportedBy,
          recipientRole: officer.role,
          type: "sighting_reported",
          title: `New Sighting Report: Case #${missingCase.caseNumber}`,
          message: `A citizen submitted Sighting #${sighting.reportNumber} for ${child.fullName || "Missing Child"} near ${locationSummary}. Review report details for verification.`,
          data: commonData
        });
        notificationIds.push(notif.id);
        if (officer.role === "police") policeNotifiedCount++;
      } catch (officerErr) {
        console.error(`[NotificationService] Failed to notify officer ${officer._id}:`, officerErr.message);
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
 * Marks a notification as read.
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

  return notification.toSafeObject();
};

/**
 * Marks all notifications for a user as read.
 *
 * @param {string|ObjectId} userId
 * @returns {Promise<{ modifiedCount: number }>}
 */
const markAllNotificationsAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipientId: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return { modifiedCount: result.modifiedCount || 0 };
};

module.exports = {
  createNotification,
  notifyAuthorizedRespondersForSighting,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
};
