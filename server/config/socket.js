/**
 * GuardianLink — Socket.IO Server Configuration (Phase 10)
 *
 * Implements authenticated, room-isolated real-time communication:
 * 1. Attaches to HTTP server with CORS matching Express configuration.
 * 2. Authenticates connections via JWT cookie, auth payload, or Bearer header.
 * 3. Verifies active Redis/memory session state.
 * 4. Isolates delivery to private user rooms (`user:<userId>`).
 * 5. Rejects unauthorized subscriptions and arbitrary room joining.
 */

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { getSession } = require("./redis");
const { COOKIE_NAME } = require("../utils/cookies");

let io = null;

/**
 * Lightweight cookie string parser for handshake headers
 */
const parseCookieString = (cookieHeader) => {
  const cookies = {};
  if (!cookieHeader || typeof cookieHeader !== "string") return cookies;

  cookieHeader.split(";").forEach((pair) => {
    const parts = pair.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join("=").trim();
      cookies[key] = decodeURIComponent(value);
    }
  });

  return cookies;
};

/**
 * Extracts authentication token from socket handshake
 */
const extractToken = (socket) => {
  // 1. Auth payload from Socket.IO client (recommended)
  if (socket.handshake.auth && socket.handshake.auth.token) {
    let token = socket.handshake.auth.token;
    if (token.startsWith("Bearer ")) token = token.slice(7).trim();
    return token;
  }

  // 2. HttpOnly Cookie from handshake headers
  if (socket.handshake.headers && socket.handshake.headers.cookie) {
    const parsedCookies = parseCookieString(socket.handshake.headers.cookie);
    if (parsedCookies[COOKIE_NAME]) {
      return parsedCookies[COOKIE_NAME];
    }
  }

  // 3. Authorization header
  if (socket.handshake.headers && socket.handshake.headers.authorization) {
    const authHeader = socket.handshake.headers.authorization;
    if (authHeader.startsWith("Bearer ")) {
      return authHeader.slice(7).trim();
    }
  }

  // 4. Query parameter (fallback for specialized environments)
  if (socket.handshake.query && socket.handshake.query.token) {
    return socket.handshake.query.token;
  }

  return null;
};

/**
 * Initializes Socket.IO on the provided HTTP server.
 *
 * @param {import("http").Server} httpServer
 * @returns {Server}
 */
const initSocket = (httpServer) => {
  if (io) {
    return io;
  }

  const allowedOrigins = [
    process.env.CLIENT_URL,
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173"
  ].filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
          return callback(null, origin);
        }
        return callback(null, origin);
      },
      credentials: true
    },
    transports: ["websocket", "polling"],
    pingTimeout: 20000,
    pingInterval: 25000
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = extractToken(socket);

      if (!token) {
        return next(new Error("UNAUTHORIZED: Missing authentication token."));
      }

      const secret = process.env.JWT_SECRET || "guardianlink_super_secret_jwt_key_2026_safe_child_platform";
      let decoded;
      try {
        decoded = jwt.verify(token, secret);
      } catch (err) {
        return next(new Error("UNAUTHORIZED: Invalid or expired token."));
      }

      if (!decoded || !decoded.id) {
        return next(new Error("UNAUTHORIZED: Malformed token payload."));
      }

      // Check active user in MongoDB
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error("USER_NOT_FOUND: User account does not exist."));
      }

      if (user.status === "suspended") {
        return next(new Error("ACCOUNT_SUSPENDED: User account has been suspended."));
      }

      // Check session state in Redis/Memory
      const session = await getSession(`session:${decoded.id}`);
      if (!session) {
        return next(new Error("SESSION_EXPIRED: Session has expired or user logged out."));
      }

      // Attach authenticated user identity to socket
      socket.user = {
        _id: user._id.toString(),
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        organization: user.organization
      };

      next();
    } catch (err) {
      console.error("[SocketAuth] Connection handshake error:", err.message);
      return next(new Error("INTERNAL_AUTH_ERROR"));
    }
  });

  // Connection Handler
  io.on("connection", (socket) => {
    const userId = socket.user.id;
    const userRole = socket.user.role;
    const userRoom = `user:${userId}`;

    // Join private user room exclusively
    socket.join(userRoom);

    console.info(`[Socket:Connect] socketId=${socket.id} userId=${userId} role=${userRole} room=${userRoom}`);

    // Reject arbitrary client-originated room join attempts
    socket.on("join", () => {
      socket.emit("error", {
        code: "UNAUTHORIZED_ROOM_JOIN",
        message: "Clients cannot join arbitrary rooms directly. Room assignment is server-authorized."
      });
    });

    // Handle disconnection cleanly
    socket.on("disconnect", (reason) => {
      console.info(`[Socket:Disconnect] socketId=${socket.id} userId=${userId} reason=${reason}`);
    });
  });

  return io;
};

/**
 * Returns active Socket.IO server instance or null if not yet initialized
 *
 * @returns {Server|null}
 */
const getIO = () => {
  return io;
};

/**
 * Closes Socket.IO server (useful for test teardown)
 */
const closeSocket = async () => {
  if (io) {
    await new Promise((resolve) => {
      io.close(() => {
        io = null;
        resolve();
      });
    });
  }
};

module.exports = {
  initSocket,
  getIO,
  closeSocket
};
