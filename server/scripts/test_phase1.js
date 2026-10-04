const mongoose = require("mongoose");
const http = require("http");
const { execSync } = require("child_process");

// Import models
const { User, Child, MissingCase } = require("../models");

function httpRequest(method, path, data = null, cookies = '') {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const headers = { 'Cookie': cookies };
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = body ? JSON.parse(body) : null;
        } catch {
          parsed = body;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runPhase1Audit() {
  console.log("==================================================================");
  console.log("GUARDIANLINK PHASE 1: COMPREHENSIVE BACKEND & DATABASE AUDIT");
  console.log("==================================================================\n");

  const connectDB = require("../config/db");
  const { initRedis, getSession, delSession } = require("../config/redis");
  await connectDB();
  await initRedis();

  const timestamp = Date.now();
  const testEmailParentA = `audit.parent.a.${timestamp}@example.com`;
  const testPhoneParentA = `98${timestamp.toString().slice(-8)}`;
  const testEmailParentB = `audit.parent.b.${timestamp}@example.com`;
  const testPhoneParentB = `97${timestamp.toString().slice(-8)}`;

  // =========================================================================
  // 1. AUTHENTICATION & REDIS LIFECYCLE AUDIT (REGISTER, /ME, LOGOUT)
  // =========================================================================
  console.log(">>> [AUDIT 1] User Registration, Cookie & Redis Session Creation");
  const regResA = await httpRequest("POST", "/api/auth/register", {
    fullName: "Parent Alpha",
    email: testEmailParentA,
    phone: testPhoneParentA,
    password: "SecurePassword123!",
    role: "parent"
  });

  console.log(`  Register HTTP Status: ${regResA.status}`);
  if (regResA.status !== 201 || !regResA.data?.success) {
    throw new Error(`Register failed: ${JSON.stringify(regResA.data)}`);
  }
  const parentAUser = regResA.data.user;
  console.log(`  Created User: ${parentAUser.name} (${parentAUser.id}) Role: ${parentAUser.role}`);

  // Verify HttpOnly cookie header
  const rawSetCookie = regResA.headers["set-cookie"] || [];
  const cookieString = rawSetCookie.join("; ");
  const isHttpOnly = cookieString.toLowerCase().includes("httponly");
  console.log(`  HttpOnly Cookie Present in Response Header? ${isHttpOnly ? "YES (Secure)" : "NO"}`);
  if (!isHttpOnly) throw new Error("Cookie must be HttpOnly!");

  // Verify safe response: no passwordHash
  if (parentAUser.passwordHash || regResA.data.passwordHash) {
    throw new Error("Security Violation: passwordHash exposed in response!");
  }
  console.log("  Security Check: passwordHash is not exposed in registration payload (PASS)");

  // Verify Redis session retrieval using redis internal client
  const sessionData = await getSession(`session:${parentAUser.id}`);
  console.log(`  Redis Session Data Retrieved from Cache? ${sessionData && sessionData.userId === parentAUser.id ? "YES (Active)" : "NO"}`);
  if (!sessionData || sessionData.userId !== parentAUser.id) throw new Error("Redis session was not found in cache!");

  // Verify GET /api/auth/me
  console.log("\n>>> [AUDIT 2] Session Verification via GET /api/auth/me");
  const meRes = await httpRequest("GET", "/api/auth/me", null, cookieString);
  console.log(`  GET /api/auth/me Status: ${meRes.status}`);
  if (meRes.status !== 200 || meRes.data?.user?.id !== parentAUser.id) {
    throw new Error(`GET /me failed: ${JSON.stringify(meRes.data)}`);
  }
  console.log(`  Authenticated User: ${meRes.data.user.name} (${meRes.data.user.email})`);

  // Verify Logout & Session Destruction
  console.log("\n>>> [AUDIT 3] Logout & Redis Session Destruction");
  const logoutRes = await httpRequest("POST", "/api/auth/logout", null, cookieString);
  console.log(`  POST /api/auth/logout Status: ${logoutRes.status}`);

  const redisAfterLogout = await getSession(`session:${parentAUser.id}`);
  console.log(`  Redis Session Exists After Logout? ${redisAfterLogout === null ? "NO (Cleaned up - PASS)" : "YES (Leaked!)"}`);
  if (redisAfterLogout !== null) throw new Error("Redis session leaked after logout!");

  const meAfterLogout = await httpRequest("GET", "/api/auth/me", null, cookieString);
  console.log(`  GET /api/auth/me After Logout Status: ${meAfterLogout.status} (Expected 401 Unauthorized)`);
  if (meAfterLogout.status !== 401) throw new Error("User was still authenticated after logout!");

  // Register Parent B for ownership validation and RBAC testing
  const regResB = await httpRequest("POST", "/api/auth/register", {
    fullName: "Parent Beta",
    email: testEmailParentB,
    phone: testPhoneParentB,
    password: "SecurePassword123!",
    role: "parent"
  });
  const parentBUser = regResB.data.user;
  const parentBCookie = (regResB.headers["set-cookie"] || []).join("; ");

  // =========================================================================
  // RBAC AUTHORIZATION AUDIT (PARENT ACCESSING ADMIN RESOURCE)
  // =========================================================================
  console.log("\n>>> [AUDIT 3.5] RBAC Authorization Check (Parent calling Admin Endpoint)");
  const forbiddenAdminRes = await httpRequest("GET", "/api/admin/users", null, parentBCookie);
  console.log(`  Parent calling /api/admin/users HTTP Status: ${forbiddenAdminRes.status} (Expected 403 Forbidden)`);
  console.log(`  Rejection Code: ${forbiddenAdminRes.data?.code}`);
  if (forbiddenAdminRes.status !== 403) throw new Error("RBAC failed: Parent was not rejected with 403!");
  // 2. USER MODEL VALIDATION AUDIT (DUPLICATES, ENUMS, REQUIRED FIELDS)
  // =========================================================================
  console.log("\n>>> [AUDIT 4] User Validation & Negative Tests");

  // Duplicate email test
  const dupEmailRes = await httpRequest("POST", "/api/auth/register", {
    fullName: "Duplicate Email Test",
    email: testEmailParentA,
    phone: `99${timestamp.toString().slice(-8)}`,
    password: "Password123!"
  });
  console.log(`  Duplicate Email Rejection Status: ${dupEmailRes.status} (Code: ${dupEmailRes.data?.code})`);
  if (dupEmailRes.status !== 400) throw new Error("Duplicate email must return 400!");

  // Duplicate phone test
  const dupPhoneRes = await httpRequest("POST", "/api/auth/register", {
    fullName: "Duplicate Phone Test",
    email: `unique.${timestamp}@example.com`,
    phone: testPhoneParentA,
    password: "Password123!"
  });
  console.log(`  Duplicate Phone Rejection Status: ${dupPhoneRes.status} (Code: ${dupPhoneRes.data?.code})`);
  if (dupPhoneRes.status !== 400) throw new Error("Duplicate phone must return 400!");

  // Invalid role test
  const invalidRoleRes = await httpRequest("POST", "/api/auth/register", {
    fullName: "Invalid Role",
    email: `role.${timestamp}@example.com`,
    phone: `91${timestamp.toString().slice(-8)}`,
    password: "Password123!",
    role: "superuser"
  });
  console.log(`  Invalid Role Rejection Status: ${invalidRoleRes.status} (Code: ${invalidRoleRes.data?.code})`);
  if (invalidRoleRes.status !== 400) throw new Error("Invalid role must return 400!");

  // Missing fields test
  const missingFieldRes = await httpRequest("POST", "/api/auth/register", {
    fullName: "",
    email: "notanemail",
    password: ""
  });
  console.log(`  Missing Required Fields Status: ${missingFieldRes.status} (Code: ${missingFieldRes.data?.code})`);
  if (missingFieldRes.status !== 400) throw new Error("Missing required fields must return 400!");

  // =========================================================================
  // 3. CHILD MODEL & DATA INTEGRITY AUDIT
  // =========================================================================
  console.log("\n>>> [AUDIT 5] Child Model & Validation Audit");

  // Valid child creation for Parent A
  const dob = new Date(Date.now() - 8 * 365.25 * 24 * 60 * 60 * 1000); // 8 years old
  const childA = new Child({
    guardianId: parentAUser.id,
    fullName: "Aarav Sharma",
    dateOfBirth: dob,
    gender: "male",
    description: "Brown eyes, curly black hair, birthmark on left wrist.",
    photoUrl: "https://example.com/photos/aarav.jpg",
    cloudinaryPublicId: "guardianlink/children/aarav_001",
    faceProfileId: "face_vec_emb_991823",
    status: "active"
  });
  await childA.save();
  console.log(`  Created Child: ${childA.fullName} (ID: ${childA._id})`);
  console.log(`  Calculated Age Virtual: ${childA.age} years old`);
  if (childA.age !== 8) throw new Error(`Age virtual mismatch! Expected 8, got ${childA.age}`);

  // Test isOwnedBy method
  console.log(`  Child ownership check for Parent A: ${childA.isOwnedBy(parentAUser.id)} (Expected true)`);
  console.log(`  Child ownership check for Parent B: ${childA.isOwnedBy(parentBUser.id)} (Expected false)`);
  if (!childA.isOwnedBy(parentAUser.id) || childA.isOwnedBy(parentBUser.id)) {
    throw new Error("Ownership validation check failed!");
  }

  // Negative test: Future Date of Birth
  let futureDobFailed = false;
  try {
    const invalidChild = new Child({
      guardianId: parentAUser.id,
      fullName: "Future Child",
      dateOfBirth: new Date(Date.now() + 86400000), // Tomorrow
      gender: "female"
    });
    await invalidChild.save();
  } catch (err) {
    futureDobFailed = true;
    console.log(`  Negative Test (Future DOB Rejected): ${err.message}`);
  }
  if (!futureDobFailed) throw new Error("Child with future DOB should have been rejected!");

  // Negative test: Invalid gender
  let invalidGenderFailed = false;
  try {
    const invalidGenderChild = new Child({
      guardianId: parentAUser.id,
      fullName: "Invalid Gender Child",
      dateOfBirth: dob,
      gender: "unspecified_alien"
    });
    await invalidGenderChild.save();
  } catch (err) {
    invalidGenderFailed = true;
    console.log(`  Negative Test (Invalid Gender Rejected): ${err.message}`);
  }
  if (!invalidGenderFailed) throw new Error("Child with invalid gender should have been rejected!");

  // =========================================================================
  // 4. MISSING CASE MODEL & INCIDENT AUDIT
  // =========================================================================
  console.log("\n>>> [AUDIT 6] MissingCase Model & Normalized Response Audit");
  const missingDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
  const missingCase1 = new MissingCase({
    childId: childA._id,
    reportedBy: parentAUser.id,
    missingDate: missingDate,
    lastSeenLocation: {
      address: "Near Metro Gate #3, Sector 12",
      city: "Faridabad",
      state: "Haryana",
      pinCode: "121005",
      latitude: 28.4089,
      longitude: 77.3178
    },
    lastSeenDescription: "Wearing blue school uniform and black sneakers.",
    status: "active",
    policeCaseNumber: "FIR-FBD-2026-4412",
    firNumber: "FIR/4412/26"
  });
  await missingCase1.save();
  console.log(`  Created MissingCase: ID ${missingCase1._id} for Child ${missingCase1.childId}`);
  console.log(`  Case Status: ${missingCase1.status}`);

  // Test isReportedBy method
  console.log(`  Case isReportedBy Parent A: ${missingCase1.isReportedBy(parentAUser.id)} (Expected true)`);
  console.log(`  Case isReportedBy Parent B: ${missingCase1.isReportedBy(parentBUser.id)} (Expected false)`);
  if (!missingCase1.isReportedBy(parentAUser.id) || missingCase1.isReportedBy(parentBUser.id)) {
    throw new Error("MissingCase reporter validation check failed!");
  }

  // Test Normalized Response Generator (composing Child + MissingCase)
  const normalizedResponse = missingCase1.toPublicResponse(childA);
  console.log("\n  Generated Normalized Public Response (Composed Child + MissingCase):");
  console.log(JSON.stringify(normalizedResponse, null, 2));

  if (normalizedResponse.name !== "Aarav Sharma" || normalizedResponse.age !== 8 || normalizedResponse.status !== "active") {
    throw new Error("Normalized response composition mismatch!");
  }

  // Verify Independence: Child remains separate entity even if MissingCase is closed
  missingCase1.status = "reunited";
  missingCase1.reunitedAt = new Date();
  await missingCase1.save();
  console.log(`\n  Case status updated to 'reunited'. Child document is NOT modified.`);
  const refreshedChild = await Child.findById(childA._id);
  console.log(`  Child status remains: ${refreshedChild.status}`);
  if (refreshedChild.status !== "active") throw new Error("Child entity was unexpectedly mutated!");

  // Negative test: Invalid status enum
  let invalidStatusFailed = false;
  try {
    const invalidCase = new MissingCase({
      childId: childA._id,
      reportedBy: parentAUser.id,
      missingDate: missingDate,
      status: "mysterious_abduction"
    });
    await invalidCase.save();
  } catch (err) {
    invalidStatusFailed = true;
    console.log(`  Negative Test (Invalid Status Rejected): ${err.message}`);
  }
  if (!invalidStatusFailed) throw new Error("MissingCase with invalid status should have been rejected!");

  // =========================================================================
  // 5. DATABASE INTEGRITY & RELATIONSHIPS AUDIT
  // =========================================================================
  console.log("\n>>> [AUDIT 7] Direct MongoDB Database & Collection Verification");
  const collections = await mongoose.connection.db.listCollections().toArray();
  const colNames = collections.map(c => c.name);
  console.log(`  MongoDB Collections in 'guardianlink': ${colNames.join(', ')}`);
  if (!colNames.includes("users") || !colNames.includes("children") || !colNames.includes("missingcases")) {
    throw new Error("Expected collections (users, children, missingcases) not found in MongoDB!");
  }

  const childCount = await Child.countDocuments();
  const caseCount = await MissingCase.countDocuments();
  console.log(`  Documents in 'children': ${childCount}`);
  console.log(`  Documents in 'missingcases': ${caseCount}`);

  console.log("\n==================================================================");
  console.log("PHASE 1 AUDIT & VERIFICATION COMPLETED WITH 100% SUCCESS!");
  console.log("==================================================================");
}

runPhase1Audit().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error("\n❌ PHASE 1 AUDIT FAILED:", err);
  process.exit(1);
});
