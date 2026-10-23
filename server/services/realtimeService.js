/**
 * GuardianLink — Realtime Service (Phase 10)
 *
 * Provides a clean, decoupled bridge between business services/controllers
 * and Socket.IO delivery rooms.
 *
 * Guarantees:
 * 1. Safe payload serialization (strips sensitive Mongoose internals, coordinates, KYC).
 * 2. Scoped delivery exclusively to authorized user rooms (`user:<userId>`).
 * 3. Graceful failure: Socket delivery failure or offline status never rolls back database transactions.
 */

const { getIO } = require("../config/socket");

/**
 * Serializes a notification into a safe client payload.
 *
 * @param {Object} notification
 * @returns {Object} Safe client notification payload
 */
const serializeNotificationPayload = (notification) => {
  if (!notification) return null;

  const raw = typeof notification.toSafeObject === "function" ? notification.toSafeObject() : notification;
  const id = raw.id || (raw._id ? raw._id.toString() : "");

  return {
    id,
    notificationId: id,
    recipientId: raw.recipientId ? (raw.recipientId._id || raw.recipientId).toString() : "",
    type: raw.type,
    title: raw.title,
    message: raw.message,
    data: {
      caseId: raw.data?.caseId ? (raw.data.caseId._id || raw.data.caseId).toString() : null,
      childId: raw.data?.childId ? (raw.data.childId._id || raw.data.childId).toString() : null,
      sightingId: raw.data?.sightingId ? (raw.data.sightingId._id || raw.data.sightingId).toString() : null,
      careRecordId: raw.data?.careRecordId ? (raw.data.careRecordId._id || raw.data.careRecordId).toString() : null,
      handoverId: raw.data?.handoverId ? (raw.data.handoverId._id || raw.data.handoverId).toString() : null,
      shelterId: raw.data?.shelterId ? (raw.data.shelterId._id || raw.data.shelterId).toString() : null,
      caseNumber: raw.data?.caseNumber || "",
      reportNumber: raw.data?.reportNumber || "",
      locationSummary: raw.data?.locationSummary || ""
    },
    isRead: Boolean(raw.isRead),
    readAt: raw.readAt || null,
    deliveryStatus: raw.deliveryStatus || "confirmed",
    createdAt: raw.createdAt || new Date().toISOString()
  };
};

/**
 * Emits an event to a single user's private room.
 *
 * @param {string|ObjectId} userId
 * @param {string} event
 * @param {Object} payload
 * @returns {boolean} Whether emission was attempted
 */
const emitToUser = (userId, event, payload) => {
  if (!userId) return false;
  const io = getIO();
  if (!io) {
    // Socket.IO server not active (e.g. CLI script or isolated unit test)
    return false;
  }

  const userRoom = `user:${userId.toString()}`;
  try {
    io.to(userRoom).emit(event, payload);
    return true;
  } catch (err) {
    console.warn(`[RealtimeService] Failed to emit '${event}' to room ${userRoom}:`, err.message);
    return false;
  }
};

/**
 * Emits an event to multiple user rooms.
 *
 * @param {Array<string|ObjectId>} userIds
 * @param {string} event
 * @param {Object} payload
 * @returns {number} Number of rooms emitted to
 */
const realtimeService = {
  serializeNotificationPayload,
  emitToUser,
  emitToUsers,
  emitNotification,
  emitNotificationRead,
  emitAllNotificationsRead,
  emitUnreadCount
};

// Implementations delegating through realtimeService object
function emitToUsers(userIds, event, payload) {
  if (!Array.isArray(userIds) || userIds.length === 0) return 0;
  let count = 0;
  userIds.forEach((uid) => {
    if (realtimeService.emitToUser(uid, event, payload)) count++;
  });
  return count;
}

function emitNotification(notification) {
  if (!notification) return false;
  const recipientId = notification.recipientId?._id || notification.recipientId;
  if (!recipientId) return false;

  const payload = realtimeService.serializeNotificationPayload(notification);
  return realtimeService.emitToUser(recipientId, "notification:new", payload);
}

function emitNotificationRead(userId, notificationId, readAt = new Date().toISOString()) {
  return realtimeService.emitToUser(userId, "notification:read", {
    notificationId: notificationId ? notificationId.toString() : "",
    isRead: true,
    readAt
  });
}

function emitAllNotificationsRead(userId, modifiedCount) {
  return realtimeService.emitToUser(userId, "notification:read-all", {
    modifiedCount: Number(modifiedCount) || 0,
    isRead: true,
    readAt: new Date().toISOString()
  });
}

function emitUnreadCount(userId, unreadCount) {
  return realtimeService.emitToUser(userId, "notification:unread-count", {
    unreadCount: Math.max(0, Number(unreadCount) || 0)
  });
}

module.exports = realtimeService;

