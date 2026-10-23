# GUARDIANLINK — PHASE 10 REAL-TIME NOTIFICATION AUDIT REPORT
**System:** GuardianLink AI-Assisted Child Safety Platform  
**Phase:** Phase 10 — Notifications & Real-Time Communication  
**Date:** October 2026  
**Auditor:** Antigravity Senior Engineering Pair  

---

## 1. Executive Summary

A comprehensive architectural and codebase audit was conducted across the GuardianLink platform (`server/` and `client/`) prior to implementing Phase 10. The core objective of Phase 10 is to connect GuardianLink's existing persistent notification infrastructure with an authenticated, room-isolated Socket.IO delivery layer, integrate missing business events across all roles (Citizen, Police, Parent, NGO, Admin), and provide seamless live dashboard updates without full page reloads or UI redesigns.

### Core Architectural Boundaries Enforced:
1. **Database as Authoritative Source of Truth:** MongoDB remains the authoritative persistent store for all notifications. Socket.IO serves strictly as a low-latency real-time delivery transport, never a replacement for database persistence.
2. **Strict Server-Side Recipient Isolation:** Notifications are delivered to authenticated private rooms (`user:<userId>`). Broad broadcasts to entire roles (e.g. broadcasting to all police or all citizens) are strictly prohibited for sensitive operational data.
3. **Decoupled AI Boundaries:** The NGO module never communicates directly with InsightFace, Qdrant, or the AI microservice. AI potential matches remain investigatory leads requiring authorized human verification before case milestones advance or parent recovery alerts are emitted.
4. **No Simulated Fallbacks:** Mock arrays, `setTimeout` delivery delays, and fake unread counters are completely removed from client contexts and replaced with live Socket.IO events and persistent REST APIs.

---

## 2. Component Inventory & Classification

Each platform component is evaluated and classified into one of four categories:
1. **Already implemented and reusable**
2. **Partially implemented and needing changes**
3. **Missing and requiring implementation**
4. **Blocked by a missing prerequisite**

### 2.1 Backend Data & Socket Infrastructure

| Component | Status | Existing Location / Contract | Notes & Findings |
|:---|:---|:---|:---|
| `Notification` Model | **Already implemented and reusable** | `server/models/Notification.js` | Schema tracks `recipientId`, `senderId`, `recipientRole`, `type`, `title`, `message`, `data` references (`sightingId`, `caseId`, `childId`, `careRecordId`, `handoverId`, `shelterId`), `isRead`, `readAt`, and `deliveryStatus`. Indexes exist on `{ recipientId: 1, isRead: 1, createdAt: -1 }`. |
| `notificationService.js` | **Partially implemented and needing changes** | `server/services/notificationService.js` | Supports `createNotification`, `notifyAuthorizedRespondersForSighting`, `getUserNotifications`, `markNotificationAsRead`, and `markAllNotificationsAsRead`. Lacks real-time Socket.IO emission bridge, unread counts calculation, and idempotent notification deduplication. |
| `notificationController.js` | **Partially implemented and needing changes** | `server/controllers/notificationController.js` | Exposes `getNotifications`, `markNotificationRead`, and `markAllNotificationsRead`. Missing `getUnreadCount` endpoint. |
| `notificationRoutes.js` | **Partially implemented and needing changes** | `server/routes/notificationRoutes.js` | Mounted at `/api/notifications`. Needs route registration for `/unread-count`. |
| HTTP Server & Entry Point | **Partially implemented and needing changes** | `server/app.js` | Calls `app.listen(PORT, ...)` directly. Needs refactoring to wrap Express `app` with Node's native `http.createServer(app)` so that `socket.io` can attach to the shared HTTP listener. |
| Socket.IO Backend Package | **Missing and requiring implementation** | `server/package.json` | `socket.io` is not listed in `dependencies`. Needs installation (`npm install socket.io`). |
| Socket.IO Server Configuration | **Missing and requiring implementation** | Needs `server/config/socket.js` | Required module to initialize Socket.IO, attach JWT/session authentication middleware, manage room joins (`user:<userId>`), and handle disconnection. |
| Real-time Notification Bridge | **Missing and requiring implementation** | Needs `server/services/realtimeService.js` | Decoupled delivery service enabling business services to emit `notification:new`, `notification:read`, and `notification:unread-count` without circular dependencies. |
| Sighting Notifications | **Already implemented and reusable** | `server/services/sightingService.js` | `notifyAuthorizedRespondersForSighting` already resolves assigned police and child guardians on citizen sighting creation. |
| Case & AI Match Notifications | **Partially implemented and needing changes** | `server/controllers/caseController.js` | Officer AI match confirmations (`reviewAIMatch`) and case lifecycle status updates (`updateCaseStatus`, `assignOfficer`) currently modify records without triggering persistent notifications to guardians or officers. |
| NGO Care & Handover Notifications | **Partially implemented and needing changes** | `server/services/ngoService.js` | Already generates in-app notifications for care intake, handover request, approval, and completion, but does not yet emit them via real-time sockets. |

### 2.2 Frontend Contexts & UI Layer

| Component | Status | Existing Location | Notes & Findings |
|:---|:---|:---|:---|
| Socket.IO Client Package | **Missing and requiring implementation** | `client/package.json` | `socket.io-client` is not listed in `dependencies`. Needs installation (`npm install socket.io-client`). |
| `socketService.js` | **Missing and requiring implementation** | Needs `client/src/services/socketService.js` | Singleton Socket.IO client manager providing authenticated connection lifecycle, reconnect logic, and event listener registration. |
| `notificationService.js` (Client) | **Missing and requiring implementation** | Needs `client/src/services/notificationService.js` | Dedicated Axios API client for notifications history, mark-read, mark-all-read, and unread count queries. |
| `RealtimeContext.jsx` | **Missing and requiring implementation** | Needs `client/src/context/RealtimeContext.jsx` | React context providing real-time socket connection state, unread counter, incoming toast alerts, and automatic reconnect sync across all role layouts. |
| `PoliceContext.jsx` | **Partially implemented and needing changes** | `client/src/context/PoliceContext.jsx` | Fetches notifications on mount via `policeService.getPoliceNotifications()`. Needs listener for incoming `notification:new` events to update state and badges without page refresh. |
| `NgoContext.jsx` | **Partially implemented and needing changes** | `client/src/context/NgoContext.jsx` | Fetches notifications on mount. Needs listener for real-time handover and intake alerts. |
| `CitizenContext.jsx` | **Partially implemented and needing changes** | `client/src/context/CitizenContext.jsx` | Contains hardcoded mock notifications array (`cn-1`, `cn-2`, `cn-3`). Needs integration with real API and live socket events. |
| `Dashboard.jsx` (Parent) | **Partially implemented and needing changes** | `client/src/pages/Dashboard.jsx` | Synthesizes fake notifications from `activeCases` and `childrenList`. Needs connection to real user notifications. |
| Top Navbars & Sidebars | **Partially implemented and needing changes** | `PoliceTopNavbar.jsx`, `NgoTopNavbar.jsx`, `PoliceSidebar.jsx`, `NgoSidebar.jsx` | Static or poll-derived notification badge indicators need binding to live unread counts. |

---

## 3. Detailed Architectural Gap Analysis

### 3.1 HTTP Server & Socket.IO Attachment
- **Current State:** `server/app.js` calls `app.listen(PORT, ...)` directly.
- **Remediation:** Refactor `app.js` to create an `http.Server` via `http.createServer(app)`. Socket.IO attaches to this HTTP server with appropriate CORS settings matching `allowedOrigins` (`CLIENT_URL`, `http://localhost:3000`, `http://localhost:5173`, credentials enabled).

### 3.2 Authentication & Session Guard for WebSockets
- **Current State:** HTTP requests use `server/middleware/authenticate.js`, reading tokens from `req.cookies.guardianlink_token` or `req.headers.authorization`, verifying with `jwt.verify`, checking MongoDB `User.findById`, and validating the Redis session `session:<id>`.
- **Gap:** WebSockets establish connection via an initial HTTP handshake.
- **Remediation:** Implement a Socket.IO connection middleware in `server/config/socket.js`:
  1. Extract token from `socket.handshake.auth.token`, `socket.handshake.headers.cookie` (parsed with `cookie`), or `socket.handshake.headers.authorization`.
  2. Cryptographically verify JWT using `process.env.JWT_SECRET`.
  3. Load user from MongoDB; reject if user does not exist or `user.status === "suspended"`.
  4. Verify active Redis/Memory session (`session:<id>`).
  5. Attach `socket.user = user`.
  6. Join server-derived private room `user:<userId>`.

### 3.3 Business Event Notification Coverage Gaps
1. **AI Match Confirmations (`reviewAIMatch` in `caseController.js`):**
   - When an officer confirms an AI match and marks a child `found`, the child's verified guardian (`Child.guardianId` / `MissingCase.reportedBy`) must receive a verified recovery alert. Currently no notification is generated.
2. **Case Status Milestone Transitions (`updateCaseStatus` in `caseController.js`):**
   - Status transitions (e.g. `active` $\to$ `found` $\to$ `reunited`) should notify the child's guardian and assigned police officer.
3. **Officer Assignment (`assignOfficer` in `caseController.js`):**
   - When a squad lead or officer is assigned to a case, that officer should receive an assignment notification.

### 3.4 Multi-Instance & Redis Adapter Evaluation
- **Analysis:** GuardianLink uses Redis for session token invalidation, but includes an in-memory fallback when Redis is absent (e.g. standalone test runs).
- **Decision:** Implement a robust single-instance Socket.IO architecture as the primary operational target with clean modular architecture. Document single-instance operational guarantees and provide seamless upgrade path for `@socket.io/redis-adapter` for horizontal multi-pod clusters.

---

## 4. Socket Event Contracts & Room Isolation Rules

### 4.1 Room Architecture
- `user:<userId>`: Private room joined automatically on socket connection. Every user receives only notifications intended specifically for them.
- **Anti-Pattern Prohibited:** No global `broadcast` to all connected clients or broad role rooms (`police`, `citizen`, `parent`, `ngo`) for sensitive case, child, or medical events.

### 4.2 Server-to-Client Event Specifications

| Event Name | Trigger | Target Room | Payload Schema |
|:---|:---|:---|:---|
| `notification:new` | After successful MongoDB notification persistence | `user:<recipientId>` | `{ id, type, title, message, data: { caseId, childId, sightingId, careRecordId, handoverId, caseNumber, reportNumber, locationSummary }, isRead: false, createdAt }` |
| `notification:read` | When a notification is marked as read via REST API | `user:<recipientId>` | `{ notificationId, isRead: true, readAt }` |
| `notification:read-all` | When all notifications are marked read via REST API | `user:<recipientId>` | `{ modifiedCount }` |
| `notification:unread-count` | When unread count changes | `user:<recipientId>` | `{ unreadCount }` |

### 4.3 Client-to-Server Event Rules
- **Rule:** Clients **must not** emit business mutations or notification generation events over sockets. All data modifications continue through authenticated HTTP endpoints (`POST /api/sightings`, `PATCH /api/cases/:id/status`, `PATCH /api/notifications/:id/read`). The server persists the change and emits socket events to authorized rooms.

---

## 5. Step-by-Step Implementation Plan

1. **Dependencies:**
   - Install `socket.io` in `server/`.
   - Install `socket.io-client` in `client/`.
2. **Server Architecture:**
   - Create `server/config/socket.js` (initialization, CORS, JWT/session authentication, room isolation).
   - Create `server/services/realtimeService.js` (event emitter singleton bridging database mutations to socket rooms).
   - Update `server/app.js` to bind HTTP server with Socket.IO.
3. **Notification Service Extensions:**
   - Update `server/services/notificationService.js` to emit `notification:new` and `notification:unread-count` upon persistence.
   - Add `getUnreadNotificationCount` query.
   - Update `server/controllers/notificationController.js` and `server/routes/notificationRoutes.js` with `GET /api/notifications/unread-count`.
4. **Business Workflow Integration:**
   - Wire `caseController.js` (`reviewAIMatch`, `updateCaseStatus`, `assignOfficer`) to generate persistent notifications.
   - Connect `sightingService.js` and `ngoService.js` through `realtimeService`.
5. **Frontend Real-Time Layer:**
   - Create `client/src/services/socketService.js`.
   - Create `client/src/services/notificationService.js`.
   - Create `client/src/context/RealtimeContext.jsx` and wrap `App.jsx`.
   - Update `PoliceContext.jsx`, `NgoContext.jsx`, `CitizenContext.jsx`, and `Dashboard.jsx` to consume live socket events and update notification lists, unread counters, and navigation badges.
6. **Automated Testing & Regression:**
   - Create `server/tests/phase10_realtime_notifications.test.js` validating socket auth, room isolation, persistence order, IDOR, and business alerts.
   - Create client tests verifying socket hooks, normalizers, and reconnect handling.
   - Run Phase 0–9 regression suite and Vite production build.
7. **Final Report:**
   - Create `PHASE_10_REALTIME_NOTIFICATION_IMPLEMENTATION_REPORT.md`.

---
*Audit Report Complete. Proceeding to implementation.*
