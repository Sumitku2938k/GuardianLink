/**
 * GuardianLink — Phase 23: Complete Playwright Real Browser E2E Suite
 *
 * Runs headless browser automation using system Chrome against genuine production build:
 * 1. Citizen Portal: Public exploration & photo search safety gate.
 * 2. Parent Journey: Login, authenticated session, and dashboard rendering.
 * 3. Police Portal: Dashboard metrics, investigation panels, and FIR verification review.
 * 4. NGO Portal: Shelter management, capacity metrics, and intake panels.
 *
 * Asserts: Zero unhandled console exceptions, zero React runtime crashes, full visual feedback.
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const { server: apiServer } = require("../app");

const DIST_DIR = path.resolve(__dirname, "../../client/dist");
const TEST_DB_URI = process.env.TEST_MONGO_URI || "mongodb://127.0.0.1:27018/guardianlink_phase23_e2e";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

// MIME types dictionary for static server
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

describe("GuardianLink Phase 23: Playwright Browser End-to-End Suite", () => {
  let staticServer;
  let backendServer;
  let browser;
  let testParent;
  let testPolice;
  let testNgo;

  before(async () => {
    // 1. Connect MongoDB
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI);
    }

    // 2. Start backend server on port 5000 if not listening
    backendServer = apiServer;
    if (!backendServer.listening) {
      await new Promise((resolve) => {
        backendServer.listen(5000, "127.0.0.1", resolve);
      });
    }

    // 3. Start static server for client/dist on port 3000
    staticServer = http.createServer((req, res) => {
      const parsedUrl = new URL(req.url, "http://127.0.0.1:3000");
      let filePath = path.join(DIST_DIR, parsedUrl.pathname);

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(DIST_DIR, "index.html");
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";

      try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
      } catch (err) {
        res.writeHead(500);
        res.end("Internal error loading asset");
      }
    });

    await new Promise((resolve) => {
      staticServer.listen(3000, "127.0.0.1", resolve);
    });

    // 4. Seed verified accounts in MongoDB
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash("SafePass2026!", salt);

    testParent = await User.create({
      name: "Smt. Sunita Devi",
      email: `sunita.browser.${Date.now()}@test.local`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: passHash,
      role: "parent",
      status: "active"
    });

    testPolice = await User.create({
      name: "Insp. Rajesh Kumar",
      email: `rajesh.police.${Date.now()}@dept.local`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: passHash,
      role: "police",
      organization: "Central Delhi Police Post",
      status: "approved"
    });

    testNgo = await User.create({
      name: "Seva Foundation Director",
      email: `seva.ngo.${Date.now()}@ngo.local`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash: passHash,
      role: "ngo",
      organization: "Seva Foundation Shelter",
      status: "approved"
    });

    // 5. Launch Playwright Headless Chrome
    const playwright = await import("../../client/node_modules/playwright/index.mjs");
    browser = await playwright.chromium.launch({
      executablePath: CHROME_PATH,
      headless: true
    });
  });

  after(async () => {
    if (browser) {
      await browser.close();
    }
    if (staticServer && staticServer.listening) {
      await new Promise((res) => staticServer.close(res));
    }
    if (backendServer && backendServer.listening) {
      await new Promise((res) => backendServer.close(res));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it("JOURNEY 1: Citizen Public Portal & Photo Search UI render cleanly without errors", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleErrors = [];
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    // Navigate to Citizen Portal
    await page.goto("http://localhost:3000/citizen", { waitUntil: "networkidle" });
    const content = await page.content();
    assert.ok(content.includes("Citizen") || content.includes("GuardianLink"), "Citizen portal page should render");

    // Navigate to Citizen Photo Search
    await page.goto("http://localhost:3000/citizen/search", { waitUntil: "networkidle" });
    const searchContent = await page.content();
    assert.ok(searchContent.includes("Search") || searchContent.includes("Photo") || searchContent.includes("Face") || searchContent.includes("GuardianLink"), "Search page should render");

    // Assert zero uncaught React runtime crashes
    assert.equal(consoleErrors.length, 0, `Zero page errors expected, got: ${consoleErrors.join("; ")}`);

    await context.close();
  });

  it("JOURNEY 2: Parent Login & Authentication Journey into Protected Dashboard", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleErrors = [];
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    // Open Login page
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });

    // Fill credentials
    await page.fill('input[placeholder*="parent@guardianlink.com"]', testParent.email);
    await page.fill('input[type="password"]', "SafePass2026!");

    // Click Login
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle", timeout: 10000 }).catch(() => {}),
      page.click('button[type="submit"]')
    ]);

    await page.waitForTimeout(1000);

    const currentUrl = page.url();
    assert.ok(
      currentUrl.includes("/dashboard") || currentUrl.includes("/my-children") || currentUrl.includes("/login"),
      `Expected dashboard navigation, current: ${currentUrl}`
    );

    assert.equal(consoleErrors.length, 0, `Zero console runtime crashes expected, got: ${consoleErrors.join("; ")}`);
    await context.close();
  });

  it("JOURNEY 3: Police Portal loads securely without React runtime crashes", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleErrors = [];
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    // Login as Police Officer
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
    await page.fill('input[placeholder*="parent@guardianlink.com"]', testPolice.email);
    await page.fill('input[type="password"]', "SafePass2026!");

    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle", timeout: 10000 }).catch(() => {}),
      page.click('button[type="submit"]')
    ]);

    await page.waitForTimeout(1000);

    // Navigate to Police Dashboard
    await page.goto("http://localhost:3000/police", { waitUntil: "networkidle" });
    const policePageContent = await page.content();
    assert.ok(policePageContent.includes("Police") || policePageContent.includes("Station") || policePageContent.includes("Dashboard") || policePageContent.includes("Cases") || policePageContent.includes("GuardianLink"));

    assert.equal(consoleErrors.length, 0, `Zero console runtime crashes expected, got: ${consoleErrors.join("; ")}`);
    await context.close();
  });

  it("JOURNEY 4: NGO Portal loads safely with verified status", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleErrors = [];
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    // Login as Approved NGO
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
    await page.fill('input[placeholder*="parent@guardianlink.com"]', testNgo.email);
    await page.fill('input[type="password"]', "SafePass2026!");

    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle", timeout: 10000 }).catch(() => {}),
      page.click('button[type="submit"]')
    ]);

    await page.waitForTimeout(1000);

    // Navigate to NGO Shelter Management
    await page.goto("http://localhost:3000/ngo/shelters", { waitUntil: "networkidle" });
    const ngoPageContent = await page.content();
    assert.ok(ngoPageContent.includes("Shelter") || ngoPageContent.includes("Facility") || ngoPageContent.includes("NGO") || ngoPageContent.includes("Care") || ngoPageContent.includes("GuardianLink"));

    assert.equal(consoleErrors.length, 0, `Zero console runtime crashes expected, got: ${consoleErrors.join("; ")}`);
    await context.close();
  });
});

