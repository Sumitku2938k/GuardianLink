import { describe, it } from "node:test";
import assert from "node:assert/strict";

import * as notificationService from "../src/services/notificationService.js";
import { socketService } from "../src/services/socketService.js";

describe("Phase 10: Real-Time Notification UI & Service Test Suite", () => {
  it("1. notificationService exports all required persistence & formatting methods", () => {
    assert.strictEqual(typeof notificationService.getNotifications, "function");
    assert.strictEqual(typeof notificationService.getUnreadCount, "function");
    assert.strictEqual(typeof notificationService.markAsRead, "function");
    assert.strictEqual(typeof notificationService.markAllAsRead, "function");
    assert.strictEqual(typeof notificationService.normalizeNotification, "function");
    assert.strictEqual(typeof notificationService.formatRelativeTime, "function");
  });

  it("2. normalizeNotification maps backend Mongoose/API schema into unified client format", () => {
    const raw = {
      _id: "67b8a1c8f1a23b0012e84123",
      recipientId: "67b8a1c8f1a23b0012e84199",
      type: "sighting_reported",
      title: "New Citizen Sighting Reported",
      message: "A citizen submitted a new sighting lead for case MC-4412.",
      data: {
        caseId: "67b8a1c8f1a23b0012e84100",
        sightingId: "67b8a1c8f1a23b0012e84111",
        caseNumber: "MC-4412",
        locationSummary: "Connaught Place, New Delhi"
      },
      isRead: false,
      readAt: null,
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5 minutes ago
    };

    const normalized = notificationService.normalizeNotification(raw);

    assert.strictEqual(normalized.id, "67b8a1c8f1a23b0012e84123");
    assert.strictEqual(normalized.type, "sighting_reported");
    assert.strictEqual(normalized.title, "New Citizen Sighting Reported");
    assert.strictEqual(normalized.message, "A citizen submitted a new sighting lead for case MC-4412.");
    assert.strictEqual(normalized.isRead, false);
    assert.strictEqual(normalized.data.caseNumber, "MC-4412");
    assert.strictEqual(normalized.data.locationSummary, "Connaught Place, New Delhi");
    assert.strictEqual(normalized.timeAgo, "5m ago");
  });

  it("3. normalizeNotification gracefully handles empty, null, or fallback payloads", () => {
    const emptyNormalized = notificationService.normalizeNotification(null);
    assert.strictEqual(emptyNormalized.id, "");
    assert.strictEqual(emptyNormalized.title, "Notification");
    assert.strictEqual(emptyNormalized.isRead, false);
    assert.strictEqual(emptyNormalized.timeAgo, "Just now");

    const fallbackRaw = {
      id: "notif-abc-123",
      title: "Care Record Updated",
      message: "Child medical triage recorded.",
      createdAt: "invalid-date-string"
    };
    const fallbackNormalized = notificationService.normalizeNotification(fallbackRaw);
    assert.strictEqual(fallbackNormalized.id, "notif-abc-123");
    assert.strictEqual(fallbackNormalized.timeAgo, "Recently");
  });

  it("4. formatRelativeTime generates human-friendly relative timestamps", () => {
    const now = Date.now();
    assert.strictEqual(notificationService.formatRelativeTime(new Date(now - 10 * 1000)), "Just now");
    assert.strictEqual(notificationService.formatRelativeTime(new Date(now - 120 * 1000)), "2m ago");
    assert.strictEqual(notificationService.formatRelativeTime(new Date(now - 3 * 3600 * 1000)), "3h ago");
    assert.strictEqual(notificationService.formatRelativeTime(new Date(now - 2 * 86400 * 1000)), "2d ago");
  });

  it("5. socketService provides singleton lifecycle and listener registration APIs", () => {
    assert.strictEqual(typeof socketService.connect, "function");
    assert.strictEqual(typeof socketService.disconnect, "function");
    assert.strictEqual(typeof socketService.isConnected, "function");
    assert.strictEqual(typeof socketService.onNewNotification, "function");
    assert.strictEqual(typeof socketService.onNotificationRead, "function");
    assert.strictEqual(typeof socketService.onAllNotificationsRead, "function");
    assert.strictEqual(typeof socketService.onUnreadCountUpdate, "function");
    assert.strictEqual(typeof socketService.onReconnect, "function");

    // Initially disconnected
    assert.strictEqual(socketService.isConnected(), false);
  });
});
