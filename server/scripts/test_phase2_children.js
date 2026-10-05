/**
 * GuardianLink Phase 2: Child Management Backend & Security Test Suite
 *
 * Verifies:
 * 1. Authentication Enforcement (Unauthenticated 401 across all endpoints)
 * 2. Role Access Control (Citizen, Police, NGO, Admin blocked from parent child endpoints with 403)
 * 3. Parent CRUD Lifecycle (Create, List, Get, Update, Deactivate/Reactivate)
 * 4. Strict Ownership Isolation & IDOR Prevention (Parent A cannot read/update/deactivate Parent B's child)
 * 5. Mass Assignment Protection (Client-supplied guardianId ignored on POST and PATCH)
 * 6. Validation & Error Handling (Missing fields, future DOB, invalid gender, invalid ObjectId)
 * 7. Soft Deactivation (Status changes to 'inactive', record preserved in MongoDB)
 * 8. Response Sanitization & Safe Object Serialization
 * 9. Direct Database Persistence & Cleanup
 */

const mongoose = require("mongoose");
const { createClient } = require("redis");
const { User, Child } = require("../models");

const API_BASE = "http://localhost:5000";
const MONGO_URI = process.env.MONGO_URI || "mongodb://mongo:27017/guardianlink";
const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";

const ts = Date.now();
const testUsersCreated = [];
const testChildrenCreated = [];
const testSessionsCreated = [];
const testResults = [];

function record(name, passed, details = "") {
  testResults.push({ test: name, status: passed ? "PASS" : "FAIL", details });
  if (passed) {
    console.log(`  ✓ [PASS] ${name}${details ? ` (${details})` : ""}`);
  } else {
    console.error(`  ✗ [FAIL] ${name}${details ? ` (${details})` : ""}`);
  }
}

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    "Content-Type": "application/json",
    "x-test-suite": "true",
    ...(options.headers || {})
  };
  return fetch(url, { ...options, headers });
}

async function registerAndLogin(role, prefix) {
  const email = `p2.${prefix}.${ts}@example.com`;
  const phone = `93${String(ts).slice(-6)}${Math.floor(10 + Math.random() * 89)}`;
  const password = "SecurePassword123!";

  const regRes = await apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      fullName: `Test ${prefix} User`,
      email,
      phone,
      password,
      role
    })
  });
  const regData = await regRes.json();
  const userId = regData?.user?.id;
  if (userId) testUsersCreated.push(userId);

  // If role is police or ngo, approve first so login works
  if (role === "police" || role === "ngo") {
    await User.findByIdAndUpdate(userId, { status: "approved", isVerified: true, isActive: true });
  }

  const loginRes = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: email, password })
  });
  const loginData = await loginRes.json();
  const cookieHeader = loginRes.headers.get("set-cookie") || "";
  const tokenMatch = cookieHeader.match(/(?:guardianlink_token|token)=([^;]+)/);
  const cookie = tokenMatch ? tokenMatch[0] : "";

  if (userId) testSessionsCreated.push(userId);
  return { userId, email, cookie, data: loginData };
}

async function runSuite() {
  console.log("==================================================================");
  console.log("GUARDIANLINK PHASE 2: CHILD MANAGEMENT BACKEND & SECURITY SUITE");
  console.log("==================================================================\n");

  await mongoose.connect(MONGO_URI);
  const redis = createClient({ url: REDIS_URL });
  await redis.connect();

  // Create actors
  console.log(">>> Provisioning Test Actors...");
  const parentA = await registerAndLogin("parent", `parentA_${ts}`);
  const parentB = await registerAndLogin("parent", `parentB_${ts}`);
  const citizen = await registerAndLogin("citizen", `citizen_${ts}`);
  const police = await registerAndLogin("police", `police_${ts}`);
  const ngo = await registerAndLogin("ngo", `ngo_${ts}`);

  // Admin login via bootstrap credentials
  const adminEmail = process.env.ADMIN_EMAIL || "admin@guardianlink.local";
  const adminPass = process.env.ADMIN_PASSWORD || "AdminDev@GuardianLink2026!";
  const adminLoginRes = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: adminEmail, password: adminPass })
  });
  const adminCookieHeader = adminLoginRes.headers.get("set-cookie") || "";
  const adminTokenMatch = adminCookieHeader.match(/(?:guardianlink_token|token)=([^;]+)/);
  const adminCookie = adminTokenMatch ? adminTokenMatch[0] : "";

  console.log("  ✓ Actors provisioned successfully.\n");

  // =========================================================================
  // 1. AUTHENTICATION ENFORCEMENT (401)
  // =========================================================================
  console.log(">>> SECTION 1: Authentication Enforcement (Anonymous Requests)");

  const fakeId = new mongoose.Types.ObjectId().toString();

  const anonPost = await apiFetch("/api/children", { method: "POST", body: JSON.stringify({}) });
  record("Anonymous POST /api/children -> 401", anonPost.status === 401, `status=${anonPost.status}`);

  const anonGetList = await apiFetch("/api/children", { method: "GET" });
  record("Anonymous GET /api/children -> 401", anonGetList.status === 401, `status=${anonGetList.status}`);

  const anonGetOne = await apiFetch(`/api/children/${fakeId}`, { method: "GET" });
  record("Anonymous GET /api/children/:id -> 401", anonGetOne.status === 401, `status=${anonGetOne.status}`);

  const anonPatch = await apiFetch(`/api/children/${fakeId}`, { method: "PATCH", body: JSON.stringify({}) });
  record("Anonymous PATCH /api/children/:id -> 401", anonPatch.status === 401, `status=${anonPatch.status}`);

  const anonStatus = await apiFetch(`/api/children/${fakeId}/status`, { method: "PATCH", body: JSON.stringify({}) });
  record("Anonymous PATCH /api/children/:id/status -> 401", anonStatus.status === 401, `status=${anonStatus.status}`);

  // =========================================================================
  // 2. ROLE ACCESS CONTROL (403)
  // =========================================================================
  console.log("\n>>> SECTION 2: Role Access Control (Non-Parent Roles Blocked)");

  const citizenPost = await apiFetch("/api/children", {
    method: "POST",
    headers: { Cookie: citizen.cookie },
    body: JSON.stringify({ fullName: "Citizen Child", dateOfBirth: "2018-01-01", gender: "male" })
  });
  record("Citizen POST /api/children -> 403 Forbidden", citizenPost.status === 403, `status=${citizenPost.status}`);

  const policePost = await apiFetch("/api/children", {
    method: "POST",
    headers: { Cookie: police.cookie },
    body: JSON.stringify({ fullName: "Police Child", dateOfBirth: "2018-01-01", gender: "male" })
  });
  record("Police POST /api/children -> 403 Forbidden", policePost.status === 403, `status=${policePost.status}`);

  const ngoPost = await apiFetch("/api/children", {
    method: "POST",
    headers: { Cookie: ngo.cookie },
    body: JSON.stringify({ fullName: "NGO Child", dateOfBirth: "2018-01-01", gender: "male" })
  });
  record("NGO POST /api/children -> 403 Forbidden", ngoPost.status === 403, `status=${ngoPost.status}`);

  const adminPost = await apiFetch("/api/children", {
    method: "POST",
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ fullName: "Admin Child", dateOfBirth: "2018-01-01", gender: "male" })
  });
  record("Admin POST /api/children -> 403 Forbidden", adminPost.status === 403, `status=${adminPost.status}`);

  // =========================================================================
  // 3. PARENT CRUD LIFECYCLE & MASS ASSIGNMENT PROTECTION
  // =========================================================================
  console.log("\n>>> SECTION 3: Parent CRUD Lifecycle & Ownership Derivation");

  // Parent A registers Child A1 (with malicious client guardianId trying to assign to Parent B)
  const childA1Payload = {
    fullName: "Aarav Sharma",
    dateOfBirth: "2018-05-12",
    gender: "Male",
    nickname: "Aaru",
    height: "128 cm",
    weight: "26 kg",
    bloodGroup: "O+",
    schoolName: "Greenwood High School",
    languages: "Hindi, English",
    guardianId: parentB.userId // Malicious attempt to assign ownership to Parent B
  };

  const createA1Res = await apiFetch("/api/children", {
    method: "POST",
    headers: { Cookie: parentA.cookie },
    body: JSON.stringify(childA1Payload)
  });
  const createA1Data = await createA1Res.json();
  const childA1 = createA1Data.child;
  if (childA1?.id) testChildrenCreated.push(childA1.id);

  const a1CreatedOk = createA1Res.status === 201 &&
    childA1?.fullName === "Aarav Sharma" &&
    childA1?.gender === "male" &&
    childA1?.guardianId.toString() === parentA.userId;

  record("Parent A Creates Child A1 -> 201 OK", a1CreatedOk, `id=${childA1?.id}, gender=${childA1?.gender}`);
  record("Server Overrides Client-Supplied guardianId", childA1?.guardianId.toString() === parentA.userId, `actual=${childA1?.guardianId}`);

  // Parent A registers Child A2
  const createA2Res = await apiFetch("/api/children", {
    method: "POST",
    headers: { Cookie: parentA.cookie },
    body: JSON.stringify({
      fullName: "Ananya Sharma",
      dateOfBirth: "2021-09-04",
      gender: "female",
      bloodGroup: "A+"
    })
  });
  const createA2Data = await createA2Res.json();
  const childA2 = createA2Data.child;
  if (childA2?.id) testChildrenCreated.push(childA2.id);
  record("Parent A Creates Child A2 -> 201 OK", createA2Res.status === 201, `id=${childA2?.id}`);

  // Parent B registers Child B1
  const createB1Res = await apiFetch("/api/children", {
    method: "POST",
    headers: { Cookie: parentB.cookie },
    body: JSON.stringify({
      fullName: "Kabir Mehta",
      dateOfBirth: "2016-02-18",
      gender: "male",
      bloodGroup: "B+"
    })
  });
  const createB1Data = await createB1Res.json();
  const childB1 = createB1Data.child;
  if (childB1?.id) testChildrenCreated.push(childB1.id);
  record("Parent B Creates Child B1 -> 201 OK", createB1Res.status === 201, `id=${childB1?.id}`);

  // Parent A retrieves their children list
  const listARes = await apiFetch("/api/children", {
    headers: { Cookie: parentA.cookie }
  });
  const listAData = await listARes.json();
  const listAIds = (listAData.children || []).map((c) => c.id);
  const listAOk = listARes.status === 200 &&
    listAIds.includes(childA1.id) &&
    listAIds.includes(childA2.id) &&
    !listAIds.includes(childB1.id);
  record("Parent A GET /api/children Returns Only Own Children", listAOk, `Count: ${listAData.children?.length}`);

  // Parent B retrieves their children list
  const listBRes = await apiFetch("/api/children", {
    headers: { Cookie: parentB.cookie }
  });
  const listBData = await listBRes.json();
  const listBIds = (listBData.children || []).map((c) => c.id);
  const listBOk = listBRes.status === 200 &&
    listBIds.includes(childB1.id) &&
    !listBIds.includes(childA1.id) &&
    !listBIds.includes(childA2.id);
  record("Parent B GET /api/children Returns Only Own Children", listBOk, `Count: ${listBData.children?.length}`);

  // Parent A gets Child A1 details
  const getA1Res = await apiFetch(`/api/children/${childA1.id}`, {
    headers: { Cookie: parentA.cookie }
  });
  const getA1Data = await getA1Res.json();
  record("Parent A GET /api/children/:id -> 200 OK", getA1Res.status === 200 && getA1Data.child?.id === childA1.id);

  // Response sanitization: verify __v is not exposed
  record("Child Safe Object Omits __v Internal Field", getA1Data.child?.__v === undefined);

  // Parent A updates Child A1
  const updateA1Res = await apiFetch(`/api/children/${childA1.id}`, {
    method: "PATCH",
    headers: { Cookie: parentA.cookie },
    body: JSON.stringify({
      height: "132 cm",
      weight: "28 kg",
      medicalNotes: "Seasonal allergy updated by parent",
      guardianId: parentB.userId // Tampering attempt on PATCH
    })
  });
  const updateA1Data = await updateA1Res.json();
  const updateA1Ok = updateA1Res.status === 200 &&
    updateA1Data.child?.height === "132 cm" &&
    updateA1Data.child?.medicalNotes === "Seasonal allergy updated by parent" &&
    updateA1Data.child?.guardianId.toString() === parentA.userId;
  record("Parent A Updates Own Child Profile -> 200 OK", updateA1Ok, `height=${updateA1Data.child?.height}`);
  record("PATCH Cannot Mutate guardianId Ownership", updateA1Data.child?.guardianId.toString() === parentA.userId);

  // =========================================================================
  // 4. CROSS-PARENT ISOLATION & IDOR DEFENSE
  // =========================================================================
  console.log("\n>>> SECTION 4: Cross-Parent Isolation & IDOR Defense");

  // Parent A attempts to GET Child B1
  const crossGet = await apiFetch(`/api/children/${childB1.id}`, {
    headers: { Cookie: parentA.cookie }
  });
  record("Parent A Cannot Read Child B1 (404 Not Found)", crossGet.status === 404, `status=${crossGet.status}`);

  // Parent A attempts to PATCH Child B1
  const crossPatch = await apiFetch(`/api/children/${childB1.id}`, {
    method: "PATCH",
    headers: { Cookie: parentA.cookie },
    body: JSON.stringify({ fullName: "Hijacked Child Name" })
  });
  record("Parent A Cannot Update Child B1 (404 Not Found)", crossPatch.status === 404, `status=${crossPatch.status}`);

  // Parent A attempts to DEACTIVATE Child B1
  const crossDeactivate = await apiFetch(`/api/children/${childB1.id}/status`, {
    method: "PATCH",
    headers: { Cookie: parentA.cookie },
    body: JSON.stringify({ status: "inactive" })
  });
  record("Parent A Cannot Deactivate Child B1 (404 Not Found)", crossDeactivate.status === 404, `status=${crossDeactivate.status}`);

  // Verify Child B1 in DB was NOT tampered with
  const freshB1 = await Child.findById(childB1.id);
  record("Child B1 Remains Untouched in MongoDB", freshB1.fullName === "Kabir Mehta" && freshB1.status === "active");

  // =========================================================================
  // 5. DEACTIVATION & LIFECYCLE (SOFT STATE CHANGE)
  // =========================================================================
  console.log("\n>>> SECTION 5: Child Soft Deactivation & Reactivation");

  // Parent A deactivates Child A2
  const deactRes = await apiFetch(`/api/children/${childA2.id}/status`, {
    method: "PATCH",
    headers: { Cookie: parentA.cookie },
    body: JSON.stringify({ status: "inactive" })
  });
  const deactData = await deactRes.json();
  const deactOk = deactRes.status === 200 && deactData.child?.status === "inactive";
  record("Parent A Deactivates Child A2 -> status: inactive", deactOk, `status=${deactData.child?.status}`);

  // Verify document still exists in MongoDB (no hard deletion)
  const dbA2Doc = await Child.findById(childA2.id);
  record("Child A2 Persists in MongoDB (Not Hard-Deleted)", dbA2Doc !== null && dbA2Doc.status === "inactive");

  // Parent A reactivates Child A2
  const reactRes = await apiFetch(`/api/children/${childA2.id}/status`, {
    method: "PATCH",
    headers: { Cookie: parentA.cookie },
    body: JSON.stringify({ status: "active" })
  });
  const reactData = await reactRes.json();
  const reactOk = reactRes.status === 200 && reactData.child?.status === "active";
  record("Parent A Reactivates Child A2 -> status: active", reactOk, `status=${reactData.child?.status}`);

  // =========================================================================
  // 6. VALIDATION & NEGATIVE TESTS
  // =========================================================================
  console.log("\n>>> SECTION 6: Input Validation & Boundary Checks");

  // Missing full name
  const missingName = await apiFetch("/api/children", {
    method: "POST",
    headers: { Cookie: parentA.cookie },
    body: JSON.stringify({ dateOfBirth: "2019-01-01", gender: "male" })
  });
  record("Missing Name Rejected (400)", missingName.status === 400, `status=${missingName.status}`);

  // Missing date of birth
  const missingDob = await apiFetch("/api/children", {
    method: "POST",
    headers: { Cookie: parentA.cookie },
    body: JSON.stringify({ fullName: "Valid Name", gender: "male" })
  });
  record("Missing Date of Birth Rejected (400)", missingDob.status === 400, `status=${missingDob.status}`);

  // Future date of birth
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const futureDob = await apiFetch("/api/children", {
    method: "POST",
    headers: { Cookie: parentA.cookie },
    body: JSON.stringify({ fullName: "Time Traveler", dateOfBirth: tomorrow, gender: "male" })
  });
  record("Future Date of Birth Rejected (400)", futureDob.status === 400, `status=${futureDob.status}`);

  // Invalid gender
  const invalidGender = await apiFetch("/api/children", {
    method: "POST",
    headers: { Cookie: parentA.cookie },
    body: JSON.stringify({ fullName: "Valid Name", dateOfBirth: "2019-01-01", gender: "alien" })
  });
  record("Invalid Gender Rejected (400)", invalidGender.status === 400, `status=${invalidGender.status}`);

  // Invalid ObjectId format
  const badIdRes = await apiFetch("/api/children/not-a-valid-object-id", {
    headers: { Cookie: parentA.cookie }
  });
  record("Malformed ObjectId Returns Controlled 400", badIdRes.status === 400, `status=${badIdRes.status}`);

  // Invalid status value
  const badStatusRes = await apiFetch(`/api/children/${childA1.id}/status`, {
    method: "PATCH",
    headers: { Cookie: parentA.cookie },
    body: JSON.stringify({ status: "permanently_obliterated" })
  });
  record("Invalid Status Value Rejected (400)", badStatusRes.status === 400, `status=${badStatusRes.status}`);

  // =========================================================================
  // 7. DIRECT DATABASE & INDEX AUDIT
  // =========================================================================
  console.log("\n>>> SECTION 7: Direct MongoDB Collection & Index Audit");

  const childIndexes = await Child.collection.getIndexes();
  const hasCompoundIndex = Object.keys(childIndexes).some(
    (name) => name.includes("guardianId") && name.includes("status")
  );
  record("Child Compound Index { guardianId: 1, status: 1 } Exists", hasCompoundIndex);

  const virtualAgeTest = await Child.findById(childA1.id);
  record("Virtual Age Calculated Dynamically", virtualAgeTest.age >= 6 && virtualAgeTest.age <= 10, `age=${virtualAgeTest.age}`);

  // =========================================================================
  // 8. TEARDOWN & CLEANUP
  // =========================================================================
  console.log("\n>>> SECTION 8: Teardown & Test Cleanup");

  if (testChildrenCreated.length > 0) {
    const delChildren = await Child.deleteMany({ _id: { $in: testChildrenCreated.map((id) => new mongoose.Types.ObjectId(id)) } });
    console.log(`  🧹 Deleted ${delChildren.deletedCount} temporary test children from MongoDB.`);
  }

  if (testUsersCreated.length > 0) {
    const delUsers = await User.deleteMany({ _id: { $in: testUsersCreated.map((id) => new mongoose.Types.ObjectId(id)) } });
    console.log(`  🧹 Deleted ${delUsers.deletedCount} temporary test users from MongoDB.`);
  }

  for (const uid of testSessionsCreated) {
    await redis.del(`session:${uid}`);
  }
  console.log(`  🧹 Invalidated ${testSessionsCreated.length} temporary Redis test sessions.`);

  await mongoose.disconnect();
  await redis.quit();

  // Summary Table
  console.log("\n==================================================================");
  console.log("            PHASE 2 CHILD MANAGEMENT TEST SUMMARY");
  console.log("==================================================================");
  console.table(testResults);

  const failedTests = testResults.filter((t) => t.status === "FAIL");
  if (failedTests.length === 0) {
    console.log(`\n🎉 ALL ${testResults.length} PHASE 2 CHILD MANAGEMENT TESTS PASSED!\n`);
    process.exit(0);
  } else {
    console.error(`\n❌ ${failedTests.length} TEST(S) FAILED.\n`);
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("\n❌ Test Suite Aborted with Unhandled Exception:", err);
  process.exit(1);
});
