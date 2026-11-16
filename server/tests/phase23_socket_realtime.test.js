/**
 * GuardianLink — Phase 23: Socket.IO Real-Time & Notification Delivery Suite
 *
 * Validates real-time Socket.IO behaviors against genuine server instance:
 * 1. Authenticated connection handshake using JWT and Redis session.
 * 2. Room isolation to private user rooms (`user:<userId>`).
 * 3. Anti-arbitrary room join rejection (`UNAUTHORIZED_ROOM_JOIN`).
 * 4. Real-time event dispatch upon notification creation (`notification:new` and `notification:unread-count`).
 * 5. Rejection of unauthenticated connection attempts.
 *
 * Database: Dedicated Isolated Test Database (mongodb://127.0.0.1:27018/guardianlink_phase23_e2e)
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const ioClient = require("socket.io-client");

const User = require("../models/User");
const Notification = require("../models/Notification");
const { initSocket, closeSocket } = require("../config/socket");
const { setSession } = require("../config/redis");
const { getJwtSecret } = require("../config/envValidator");
const notificationService = require("../services/notificationService");

const TEST_DB_URI = process.env.TEST_MONGO_URI || "mongodb://127.0.0.1:27018/guardianlink_phase23_e2e";

describe("GuardianLink Phase 23: Socket.IO Real-Time & Notification Suite", () => {
  let server;
  let serverPort;
  let testPoliceUser;
  let testParentUser;
  let policeToken;
  let parentToken;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI);
    }

    // 1. Create HTTP server and attach Socket.IO
    server = http.createServer();
    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        serverPort = server.address().port;
        resolve();
      });
    });

    initSocket(server);

    // 2. Create test users in DB
    testPoliceUser = await User.create({
      name: "Insp. Socket Police",
      email: `police.socket.${Date.now()}@dept.local`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: "dummyHash123",
      role: "police",
      status: "approved"
    });

    testParentUser = await User.create({
      name: "Parent Socket User",
      email: `parent.socket.${Date.now()}@test.local`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: "dummyHash123",
      role: "parent",
      status: "active"
    });

    const secret = getJwtSecret();
    policeToken = jwt.sign(
      { id: testPoliceUser._id.toString(), role: testPoliceUser.role, email: testPoliceUser.email },
      secret,
      { expiresIn: "1h" }
    );
    parentToken = jwt.sign(
      { id: testParentUser._id.toString(), role: testParentUser.role, email: testParentUser.email },
      secret,
      { expiresIn: "1h" }
    );

    // Seed Redis/memory session state
    await setSession(`session:${testPoliceUser._id}`, { userId: testPoliceUser._id.toString() }, 3600);
    await setSession(`session:${testParentUser._id}`, { userId: testParentUser._id.toString() }, 3600);
  });

  after(async () => {
    await closeSocket();
    if (server && server.listening) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it("authenticates and connects Police Socket client via handshake auth payload", async () => {
    const client = ioClient(`http://127.0.0.1:${serverPort}`, {
      auth: { token: policeToken },
      transports: ["websocket"]
    });

    await new Promise((resolve, reject) => {
      client.on("connect", () => {
        assert.ok(client.connected);
        client.disconnect();
        resolve();
      });
      client.on("connect_error", (err) => {
        client.disconnect();
        reject(err);
      });
    });
  });

  it("rejects unauthenticated connection handshake with UNAUTHORIZED", async () => {
    const client = ioClient(`http://127.0.0.1:${serverPort}`, {
      transports: ["websocket"]
    });

    await new Promise((resolve) => {
      client.on("connect", () => {
        client.disconnect();
        assert.fail("Unauthenticated connection should have been rejected");
      });
      client.on("connect_error", (err) => {
        assert.match(err.message, /UNAUTHORIZED/);
        client.disconnect();
        resolve();
      });
    });
  });

  it("rejects arbitrary room join attempt from client with UNAUTHORIZED_ROOM_JOIN", async () => {
    const client = ioClient(`http://127.0.0.1:${serverPort}`, {
      auth: { token: policeToken },
      transports: ["websocket"]
    });

    await new Promise((resolve, reject) => {
      client.on("connect", () => {
        client.emit("join", { room: "admin:top-secret" });
      });

      client.on("error", (payload) => {
        assert.equal(payload.code, "UNAUTHORIZED_ROOM_JOIN");
        client.disconnect();
        resolve();
      });

      setTimeout(() => {
        client.disconnect();
        reject(new Error("Timeout waiting for unauthorized room error"));
      }, 3000);
    });
  });

  it("delivers notification:new and notification:unread-count in real time to the recipient's room exclusively", async () => {
    const policeClient = ioClient(`http://127.0.0.1:${serverPort}`, {
      auth: { token: policeToken },
      transports: ["websocket"]
    });

    const parentClient = ioClient(`http://127.0.0.1:${serverPort}`, {
      auth: { token: parentToken },
      transports: ["websocket"]
    });

    let policeReceivedNotif = null;
    let policeReceivedCount = null;
    let parentLeakedNotif = null;

    await Promise.all([
      new Promise((res) => policeClient.on("connect", res)),
      new Promise((res) => parentClient.on("connect", res))
    ]);

    policeClient.on("notification:new", (data) => {
      policeReceivedNotif = data;
    });

    policeClient.on("notification:unread-count", (data) => {
      policeReceivedCount = data;
    });

    parentClient.on("notification:new", (data) => {
      parentLeakedNotif = data; // Should NEVER happen
    });

    // Create a real database notification for police officer
    await notificationService.createNotification({
      recipientId: testPoliceUser._id,
      senderId: testParentUser._id,
      recipientRole: "police",
      type: "sighting_reported",
      title: "Real-Time Sighting Alert Phase23",
      message: "A citizen sighting has arrived."
    });

    // Wait 500ms for websocket delivery
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Police client must receive both events
    assert.ok(policeReceivedNotif, "Police client must receive notification:new event");
    assert.equal(policeReceivedNotif.title, "Real-Time Sighting Alert Phase23");
    assert.ok(policeReceivedCount, "Police client must receive notification:unread-count event");
    assert.ok(policeReceivedCount.unreadCount >= 1);

    // Parent client must NOT receive police notification (Room isolation)
    assert.equal(parentLeakedNotif, null, "Parent client room must remain isolated with zero leakage");

    policeClient.disconnect();
    parentClient.disconnect();
  });
});

