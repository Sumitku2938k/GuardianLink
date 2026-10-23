/**
 * GuardianLink — Realtime & Notification Context (Phase 10)
 *
 * Centralized state provider for authenticated Socket.IO communication:
 * 1. Manages real-time socket connection lifecycle tied to AuthContext.
 * 2. Hydrates persistent notifications from MongoDB and updates live on socket events.
 * 3. Synchronizes unread notification counts across pages and navbars.
 * 4. Executes automatic REST catch-up sync after network reconnection.
 * 5. Provides toast/banner trigger state for critical alerts.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import notificationService from "@/services/notificationService";
import socketService from "@/services/socketService";

const RealtimeContext = createContext();

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }
  return context;
};

export const RealtimeProvider = ({ children }) => {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [latestAlert, setLatestAlert] = useState(null);

  // Maintain reference to current notification IDs to prevent duplicate socket appends
  const seenIdsRef = useRef(new Set());

  // Initial fetch of persisted notifications
  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      const [notifsData, count] = await Promise.all([
        notificationService.getNotifications({ limit: 50 }).catch(() => ({ notifications: [] })),
        notificationService.getUnreadCount().catch(() => 0)
      ]);

      const list = notifsData.notifications || [];
      setNotifications(list);
      setUnreadCount(count);

      // Re-populate seen IDs
      const newSeen = new Set();
      list.forEach((n) => newSeen.add(n.id));
      seenIdsRef.current = newSeen;
    } catch (err) {
      console.warn("[RealtimeContext] Failed to load notification history:", err.message);
      setError("Unable to sync notifications history.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId) => {
    if (!notificationId) return;

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await notificationService.markAsRead(notificationId);
    } catch (err) {
      console.warn("[RealtimeContext] Error marking notification as read:", err.message);
      // Revert if API failed
      refreshNotifications();
    }
  }, [refreshNotifications]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
    setUnreadCount(0);

    try {
      await notificationService.markAllAsRead();
    } catch (err) {
      console.warn("[RealtimeContext] Error marking all notifications as read:", err.message);
      refreshNotifications();
    }
  }, [refreshNotifications]);

  // Lifecycle effect tied to user authentication session
  useEffect(() => {
    if (!user) {
      socketService.disconnectSocket();
      setNotifications([]);
      setUnreadCount(0);
      setIsConnected(false);
      seenIdsRef.current.clear();
      return;
    }

    // 1. Initial REST hydration
    refreshNotifications();

    // 2. Establish authenticated Socket connection
    socketService.connectSocket();
    setIsConnected(socketService.isSocketConnected());

    // 3. Connect/Disconnect state listeners
    const unbindConnect = socketService.onSocketConnect(() => {
      setIsConnected(true);
    });

    // 4. Socket Event Listeners
    const unbindNewNotification = socketService.onSocketEvent("notification:new", (rawPayload) => {
      console.info("[RealtimeContext] Live notification received:", rawPayload?.type);
      const normalized = notificationService.normalizeNotification(rawPayload);
      if (!normalized) return;

      // Duplicate prevention
      if (seenIdsRef.current.has(normalized.id)) {
        return;
      }
      seenIdsRef.current.add(normalized.id);

      // Prepend to notifications list
      setNotifications((prev) => [normalized, ...prev]);

      // Increment unread count
      setUnreadCount((prev) => prev + 1);

      // Trigger temporary toast alert
      setLatestAlert(normalized);
      setTimeout(() => {
        setLatestAlert((current) => (current?.id === normalized.id ? null : current));
      }, 6000);
    });

    const unbindReadNotification = socketService.onSocketEvent("notification:read", ({ notificationId, readAt }) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true, readAt } : n))
      );
    });

    const unbindReadAll = socketService.onSocketEvent("notification:read-all", () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    });

    const unbindUnreadCount = socketService.onSocketEvent("notification:unread-count", ({ unreadCount: count }) => {
      if (typeof count === "number") {
        setUnreadCount(Math.max(0, count));
      }
    });

    // 5. Catch-up sync upon network reconnection
    const unbindReconnect = socketService.onSocketReconnect(() => {
      setIsConnected(true);
      refreshNotifications();
    });

    return () => {
      unbindConnect();
      unbindNewNotification();
      unbindReadNotification();
      unbindReadAll();
      unbindUnreadCount();
      unbindReconnect();
    };
  }, [user, refreshNotifications]);

  const value = {
    notifications,
    unreadCount,
    isConnected,
    isLoading,
    error,
    latestAlert,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    clearLatestAlert: () => setLatestAlert(null)
  };

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
};

export default RealtimeContext;
