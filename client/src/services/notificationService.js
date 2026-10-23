/**
 * GuardianLink — Notification Service (Client Phase 10)
 *
 * REST API Client for persistent user notifications:
 * - Query notifications history with unread filters
 * - Retrieve unread notification counts
 * - Mark individual or all notifications as read
 * - Normalizes notification records for clean UI presentation
 */

import api from "../lib/axios.js";

/**
 * Formats a timestamp into a user-friendly relative time string.
 *
 * @param {Date|string|number} timestamp
 * @returns {string} e.g. "Just now", "5m ago", "2h ago", "1d ago"
 */
export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return "Just now";
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (isNaN(date.getTime())) return "Recently";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "Just now";

  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

/**
 * Normalizes notification payload from server schema to UI representation
 *
 * @param {Object} n - Raw server notification object
 * @returns {Object} Normalized UI notification
 */
export const normalizeNotification = (n) => {
  if (!n) {
    return {
      id: "",
      notificationId: "",
      type: "system_alert",
      title: "Notification",
      message: "",
      data: {},
      isRead: false,
      readAt: null,
      time: "Just now",
      timeAgo: "Just now",
      variant: "info",
      createdAt: new Date().toISOString()
    };
  }

  const id = n.id || n._id || (n.data && n.data.id) || `notif-${Date.now()}`;
  const rawCreatedAt = n.createdAt ? new Date(n.createdAt) : new Date();
  const validDate = isNaN(rawCreatedAt.getTime()) ? null : rawCreatedAt;
  const timeStr = formatRelativeTime(validDate || n.createdAt);

  // Derive visual variant
  let variant = "info";
  const type = (n.type || "").toLowerCase();
  if (type.includes("approved") || type.includes("reunited") || type.includes("completed")) {
    variant = "success";
  } else if (type.includes("rejected") || type.includes("critical") || type.includes("alert")) {
    variant = "warning";
  } else if (type.includes("match_flagged") || type.includes("sighting")) {
    variant = "primary";
  }

  return {
    id,
    notificationId: id,
    type: n.type || "system_alert",
    title: n.title || "Alert Notification",
    message: n.message || "",
    data: n.data || {},
    isRead: Boolean(n.isRead),
    readAt: n.readAt || null,
    time: timeStr,
    timeAgo: timeStr,
    variant,
    createdAt: validDate ? validDate.toISOString() : new Date().toISOString()
  };
};

/**
 * Fetches notifications for the authenticated user.
 *
 * @param {Object} [params] - Optional query params: { limit, unreadOnly }
 * @returns {Promise<{ notifications: Array, count: number }>}
 */
export const getNotifications = async (params = {}) => {
  const res = await api.get("/api/notifications", { params });
  const rawList = res.data?.notifications || [];
  return {
    count: res.data?.count || rawList.length,
    notifications: rawList.map(normalizeNotification)
  };
};

/**
 * Retrieves unread notification count for the authenticated user.
 *
 * @returns {Promise<number>} Unread count
 */
export const getUnreadCount = async () => {
  const res = await api.get("/api/notifications/unread-count");
  return Number(res.data?.unreadCount) || 0;
};

/**
 * Marks a single notification as read.
 *
 * @param {string} notificationId
 * @returns {Promise<Object>} Updated notification
 */
export const markAsRead = async (notificationId) => {
  if (!notificationId) return null;
  const res = await api.patch(`/api/notifications/${notificationId}/read`);
  return normalizeNotification(res.data?.notification);
};

/**
 * Marks all notifications as read for current user.
 *
 * @returns {Promise<{ modifiedCount: number }>}
 */
export const markAllAsRead = async () => {
  const res = await api.patch("/api/notifications/read-all");
  return {
    modifiedCount: res.data?.modifiedCount || 0
  };
};

export default {
  normalizeNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};
