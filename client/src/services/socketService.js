/**
 * GuardianLink — Socket Service (Client Phase 10)
 *
 * Singleton Socket.IO client manager:
 * - Managed connection lifecycle tied to authenticated user sessions
 * - Automatic reconnection with exponential backoff
 * - Reconnection hooks to trigger REST catch-up sync
 * - Strict listener cleanup on logout or component unmount
 */

import { io } from "socket.io-client";

let socket = null;
const reconnectListeners = new Set();
const connectListeners = new Set();
const disconnectListeners = new Set();

/**
 * Resolves the Socket.IO server endpoint from configuration
 */
export const getSocketUrl = () => {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "http://localhost:5000";
};

/**
 * Initializes and connects the Socket.IO client.
 *
 * @param {Object} [options]
 * @param {string} [options.token] - Optional token to pass in auth payload
 * @returns {Socket} Active socket instance
 */
export const connectSocket = (options = {}) => {
  // If socket exists and is connected, return it
  if (socket && socket.connected) {
    return socket;
  }

  // If socket exists but disconnected, update auth and reconnect
  if (socket) {
    if (options.token) {
      socket.auth = { token: options.token };
    }
    socket.connect();
    return socket;
  }

  const socketUrl = getSocketUrl();

  socket = io(socketUrl, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    auth: options.token ? { token: options.token } : {}
  });

  socket.on("connect", () => {
    console.info(`[Socket:Client] Connected successfully (id=${socket.id})`);
    connectListeners.forEach((fn) => {
      try {
        fn(socket.id);
      } catch (err) {
        console.warn("[Socket:Client] Connect listener error:", err);
      }
    });
  });

  socket.on("disconnect", (reason) => {
    console.info(`[Socket:Client] Disconnected (reason=${reason})`);
    disconnectListeners.forEach((fn) => {
      try {
        fn(reason);
      } catch (err) {
        console.warn("[Socket:Client] Disconnect listener error:", err);
      }
    });
  });

  socket.on("connect_error", (error) => {
    console.warn("[Socket:Client] Connection error:", error.message);
  });

  // Reconnection recovery hook (triggers catch-up fetch)
  socket.io.on("reconnect", (attempt) => {
    console.info(`[Socket:Client] Reconnected after ${attempt} attempts. Triggering catch-up sync...`);
    reconnectListeners.forEach((fn) => {
      try {
        fn(attempt);
      } catch (err) {
        console.warn("[Socket:Client] Reconnect listener error:", err);
      }
    });
  });

  return socket;
};

/**
 * Disconnects and destroys the Socket.IO instance.
 */
export const disconnectSocket = () => {
  if (socket) {
    try {
      socket.removeAllListeners();
      socket.disconnect();
    } catch (_) {}
    socket = null;
  }
};

/**
 * Registers an event listener on the active socket.
 *
 * @param {string} event
 * @param {Function} callback
 * @returns {Function} Cleanup unbind function
 */
export const onSocketEvent = (event, callback) => {
  if (!socket) {
    // If not yet connected, connect first
    connectSocket();
  }

  socket.on(event, callback);

  return () => {
    if (socket) {
      socket.off(event, callback);
    }
  };
};

/**
 * Registers a reconnect callback for REST catch-up synchronization.
 *
 * @param {Function} callback
 * @returns {Function} Unsubscribe function
 */
export const onSocketReconnect = (callback) => {
  if (typeof callback === "function") {
    reconnectListeners.add(callback);
  }
  return () => {
    reconnectListeners.delete(callback);
  };
};

/**
 * Registers a connection status listener.
 *
 * @param {Function} callback
 * @returns {Function} Unsubscribe function
 */
export const onSocketConnect = (callback) => {
  if (typeof callback === "function") {
    connectListeners.add(callback);
  }
  return () => {
    connectListeners.delete(callback);
  };
};

/**
 * Checks whether socket is currently connected.
 *
 * @returns {boolean}
 */
export const isSocketConnected = () => {
  return Boolean(socket && socket.connected);
};

/**
 * Returns active socket instance or null.
 */
export const getActiveSocket = () => {
  return socket;
};

export const socketService = {
  connect: connectSocket,
  disconnect: disconnectSocket,
  isConnected: isSocketConnected,
  getSocket: getActiveSocket,
  on: onSocketEvent,
  onReconnect: onSocketReconnect,
  onConnect: onSocketConnect,
  onNewNotification: (callback) => onSocketEvent("notification:new", callback),
  onNotificationRead: (callback) => onSocketEvent("notification:read", callback),
  onAllNotificationsRead: (callback) => onSocketEvent("notification:read-all", callback),
  onUnreadCountUpdate: (callback) => onSocketEvent("notification:unread-count", callback)
};

export default {
  connectSocket,
  disconnectSocket,
  onSocketEvent,
  onSocketReconnect,
  onSocketConnect,
  isSocketConnected,
  getActiveSocket,
  getSocketUrl,
  socketService
};

