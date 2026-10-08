/**
 * GuardianLink Phase 4: Missing Case Management Backend & Security Test Suite
 *
 * Verifies:
 * 1. Authentication Enforcement (Unauthenticated 401 across all case endpoints)
 * 2. Role-Based Access Scoping (Citizen denied 403, Police/NGO/Admin role authorization)
 * 3. Strict Parent Child Ownership & IDOR Protection (Parent cannot report other parent's child)
 * 4. Validation Rules (Missing date non-future, valid childId, normalized location)
 * 5. Mass Assignment Protection (Client cannot forge reportedBy or initial status)
 * 6. Active Case Policy Enforcement (Conflict 409 if child already has active case)
 * 7. Query Scoping by Role (Parent isolated to own children, Police operational, Admin full)
 * 8. Case Detail IDOR Isolation (Parent B cannot view Parent A's case)
 * 9. Controlled Status Lifecycle State Machine (Valid transitions vs 400 Invalid transitions)
 * 10. Role-Restricted Status Transitions (Parent restricted, Police/Admin lifecycle, NGO milestones)
 * 11. Incident History Preservation (New case allowed once previous case is closed/reunited)
 * 12. Direct MongoDB Persistence & Test Data Cleanup
 */

const mongoose = require("mongoose");
const { createClient } = require("redis");
const { User, Child, MissingCase } = require("../models");

const API_BASE = "http://localhost:5000";
const MONGO_URI = process.env.MONGO_URI || "mongodb://mongo:27017/guardianlink";
const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";

const ts = Date.now();
const testUsersCreated = [];
const testChildrenCreated = [];
const testCasesCreated = [];
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
  const email = `p4.${prefix}.${ts}@example.com`;
  const phone = `94${String(ts).slice(-6)}${Math.floor(10 + Math.random() * 89)}`;
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

  // If role is police or ngo, approve first so login and access work
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

  return { userId, email, cookie, data: loginData };
}

async function runSuite() {
  console.log("==================================================================");
  console.log("GUARDIANLINK PHASE 4: MISSING CASE MANAGEMENT BACKEND TEST SUITE");
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

  // Admin credentials
  const adminEmail = process.env.ADMIN_EMAIL || "admin@guardianlink.local";
  const adminPass = process.env.ADMIN_PASSWORD || "AdminDev@GuardianLink2026!";
  const adminLoginRes = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: adminEmail, password: adminPass })
  });
  const adminCookieHeader = adminLoginRes.headers.get("set-cookie") || "";
  const adminTokenMatch = adminCookieHeader.match(/(?:guardianlink_token|token)=([^;]+)/);
  const adminCookie = adminTokenMatch ? adminTokenMatch[0] : "";

  console.log("  ✓ Test actors provisioned successfully.\n");

  // =========================================================================
  // 1. AUTHENTICATION ENFORCEMENT (401)
  // =========================================================================
  console.log(">>> SECTION 1: Authentication Enforcement (Anonymous Requests)");

  const fakeId = new mongoose.Types.ObjectId().toString();

  const anonPost = await apiFetch("/api/cases", { method: "POST", body: JSON.stringify({}) });
  record("Anonymous POST /api/cases -> 401", anonPost.status === 401, `status=${anonPost.status}`);

  const anonGetList = await apiFetch("/api/cases", { method: "GET" });
  record("Anonymous GET /api/cases -> 401", anonGetList.status === 401, `status=${anonGetList.status}`);

  const anonGetOne = await apiFetch(`/api/cases/${fakeId}`, { method: "GET" });
  record("Anonymous GET /api/cases/:id -> 401", anonGetOne.status === 401, `status=${anonGetOne.status}`);

  const anonPatch = await apiFetch(`/api/cases/${fakeId}/status`, { method: "PATCH", body: JSON.stringify({}) });
  record("Anonymous PATCH /api/cases/:id/status -> 401", anonPatch.status === 401, `status=${anonPatch.status}`);

  // =========================================================================
  // 2. ROLE ACCESS CONTROL & CREATION AUTHORIZATION
  // =========================================================================
  console.log("\n>>> SECTION 2: Role Access Control & Creation Authorization");

  const citizenPost = await apiFetch("/api/cases", {
    method: "POST",
    headers: { Cookie: citizen.cookie },
    body: JSON.stringify({ childId: fakeId })
  });
  record("Citizen POST /api/cases -> 403 Forbidden", citizenPost.status === 403, `status=${citizenPost.status}`);

  const policePost = await apiFetch("/api/cases", {
    method: "POST",
    headers: { Cookie: police.cookie },
    body: JSON.stringify({ childId: fakeId })
  });
  record("Police POST /api/cases -> 403 Forbidden (Only Parent can report)", policePost.status === 403, `status=${policePost.status}`);

  const citizenGet = await apiFetch("/api/cases", {
    method: "GET",
    headers: { Cookie: citizen.cookie }
  });
  record("Citizen GET /api/cases -> 403 Forbidden", citizenGet.status === 403, `status=${citizenGet.status}`);

  // =========================================================================
  // 3. CHILD REGISTRATION & OWNERSHIP VALIDATION
  // =========================================================================
  console.log("\n>>> SECTION 3: Child Registration & Ownership IDOR Enforcement");

  // Register Child A under Parent A
  const childARes = await apiFetch("/api/children", {
    method: "POST",
    headers: { Cookie: parentA.cookie },
    body: JSON.stringify({
      fullName: `Aarav Sharma ${ts}`,
      dateOfBirth: "2016-04-12",
      gender: "male",
      photoUrl: "https://example.com/aarav.jpg"
    })
  });
  const childAData = await childARes.json();
  const childAId = childAData?.child?.id;
  if (childAId) testChildrenCreated.push(childAId);

  // Register Child B under Parent B
  const childBRes = await apiFetch("/api/children", {
    method: "POST",
    headers: { Cookie: parentB.cookie },
    body: JSON.stringify({
      fullName: `Diya Patel ${ts}`,
      dateOfBirth: "2018-09-20",
      gender: "female",
      photoUrl: "https://example.com/diya.jpg"
    })
  });
  const childBData = await childBRes.json();
  const childBId = childBData?.child?.id;
  if (childBId) testChildrenCreated.push(childBId);

  record("Parent A Child A registered", !!childAId, `childAId=${childAId}`);
  record("Parent B Child B registered", !!childBId, `childBId=${childBId}`);

  // Parent B attempts to report Parent A's Child A missing (IDOR attack)
  const idorReportRes = await apiFetch("/api/cases", {
    method: "POST",
    headers: { Cookie: parentB.cookie },
    body: JSON.stringify({
      childId: childAId,
      missingDate: new Date(Date.now() - 3600000).toISOString(),
      lastSeenLocation: "City Mall Gate 2"
    })
  });
  record("Parent B reporting Parent A's child -> 404 Denied", idorReportRes.status === 404, `status=${idorReportRes.status}`);

  // Invalid childId format
  const badChildIdRes = await apiFetch("/api/cases", {
    method: "POST",
    headers: { Cookie: parentA.cookie },
    body: JSON.stringify({
      childId: "invalid-id-123",
      missingDate: new Date().toISOString()
    })
  });
  record("Invalid Child ID format -> 400 Bad Request", badChildIdRes.status === 400, `status=${badChildIdRes.status}`);

  // =========================================================================
  // 4. VALIDATION RULES & MASS-ASSIGNMENT PROTECTION
  // =========================================================================
  console.log("\n>>> SECTION 4: Validation Rules & Mass Assignment Protection");

  // Missing Date in the future
  const futureDate = new Date(Date.now() + 86400000).toISOString();
  const futureDateRes = await apiFetch("/api/cases", {
    method: "POST",
    headers: { Cookie: parentA.cookie },
    body: JSON.stringify({
      childId: childAId,
      missingDate: futureDate,
      lastSeenLocation: "Metro Station"
    })
  });
  record("Future Missing Date -> 400 Bad Request", futureDateRes.status === 400, `status=${futureDateRes.status}`);

  // Missing Date omitted
  const missingDateRes = await apiFetch("/api/cases", {
    method: "POST",
    headers: { Cookie: parentA.cookie },
    body: JSON.stringify({
      childId: childAId,
      lastSeenLocation: "Metro Station"
    })
  });
  record("Missing Date omitted -> 400 Bad Request", missingDateRes.status === 400, `status=${missingDateRes.status}`);

  // Successful Case Creation by Parent A with malicious injection fields
  const pastDate = new Date(Date.now() - 7200000).toISOString();
  const validCaseRes = await apiFetch("/api/cases", {
    method: "POST",
    headers: { Cookie: parentA.cookie },
    body: JSON.stringify({
      childId: childAId,
      missingDate: pastDate,
      lastSeenLocation: {
        address: "Sector 14 Central Park Gate 3",
        city: "New Delhi",
        state: "Delhi",
        pinCode: "110001",
        latitude: 28.6139,
        longitude: 77.2090
      },
      lastSeenDescription: "Wearing yellow t-shirt and dark blue shorts",
      priority: "critical",
      // Malicious mass assignment injection:
      reportedBy: parentB.userId,
      status: "closed"
    })
  });

  const validCaseData = await validCaseRes.json();
  const caseA = validCaseData?.case;
  if (caseA?.id) testCasesCreated.push(caseA.id);

  record("Parent A reports Child A missing -> 201 Created", validCaseRes.status === 201, `caseId=${caseA?.id}`);
  record("Status initializes strictly to 'reported'", caseA?.status === "reported", `status=${caseA?.status}`);
  record("ReportedBy strictly derived from session (Mass assignment prevented)", caseA?.reportedBy?._id === parentA.userId || caseA?.reportedBy === parentA.userId, `reportedBy=${caseA?.reportedBy}`);
  record("Canonical caseNumber generated", /^MC-/.test(caseA?.caseNumber || caseA?.policeCaseNumber), `caseNumber=${caseA?.caseNumber || caseA?.policeCaseNumber}`);

  // =========================================================================
  // 5. ACTIVE CASE POLICY ENFORCEMENT (409 CONFLICT)
  // =========================================================================
  console.log("\n>>> SECTION 5: Active Case Policy Enforcement (409 Conflict)");

  const duplicateCaseRes = await apiFetch("/api/cases", {
    method: "POST",
    headers: { Cookie: parentA.cookie },
    body: JSON.stringify({
      childId: childAId,
      missingDate: pastDate,
      lastSeenLocation: "Another location"
    })
  });
  const dupData = await duplicateCaseRes.json();
  record("Duplicate active case for Child A -> 409 Conflict", duplicateCaseRes.status === 409, `code=${dupData?.code}`);

  // =========================================================================
  // 6. QUERY SCOPING BY ROLE
  // =========================================================================
  console.log("\n>>> SECTION 6: Query Scoping by Role");

  // Parent A queries cases: should see Case A
  const parentAListRes = await apiFetch("/api/cases", {
    method: "GET",
    headers: { Cookie: parentA.cookie }
  });
  const parentAListData = await parentAListRes.json();
  const parentAHasCase = (parentAListData?.cases || []).some((c) => c.id === caseA.id);
  record("Parent A queries /api/cases -> Sees Child A case", parentAListRes.status === 200 && parentAHasCase, `count=${parentAListData?.count}`);

  // Parent B queries cases: should see 0 cases (isolation)
  const parentBListRes = await apiFetch("/api/cases", {
    method: "GET",
    headers: { Cookie: parentB.cookie }
  });
  const parentBListData = await parentBListRes.json();
  const parentBHasCase = (parentBListData?.cases || []).some((c) => c.id === caseA.id);
  record("Parent B queries /api/cases -> Isolated (0 cases from Parent A)", parentBListRes.status === 200 && !parentBHasCase, `count=${parentBListData?.count}`);

  // Police queries cases: should see Case A (status is reported)
  const policeListRes = await apiFetch("/api/cases", {
    method: "GET",
    headers: { Cookie: police.cookie }
  });
  const policeListData = await policeListRes.json();
  const policeHasCase = (policeListData?.cases || []).some((c) => c.id === caseA.id);
  record("Police queries /api/cases -> Sees operational case", policeListRes.status === 200 && policeHasCase, `count=${policeListData?.count}`);

  // Admin queries cases: should see Case A
  const adminListRes = await apiFetch("/api/cases", {
    method: "GET",
    headers: { Cookie: adminCookie }
  });
  const adminListData = await adminListRes.json();
  const adminHasCase = (adminListData?.cases || []).some((c) => c.id === caseA.id);
  record("Admin queries /api/cases -> Sees all cases", adminListRes.status === 200 && adminHasCase, `count=${adminListData?.count}`);

  // =========================================================================
  // 7. CASE DETAIL & IDOR PROTECTION
  // =========================================================================
  console.log("\n>>> SECTION 7: Case Detail & IDOR Protection");

  // Parent A views own case detail
  const parentAGetRes = await apiFetch(`/api/cases/${caseA.id}`, {
    method: "GET",
    headers: { Cookie: parentA.cookie }
  });
  record("Parent A views own case detail -> 200 OK", parentAGetRes.status === 200);

  // Parent B attempts to view Parent A's case detail -> IDOR 404
  const parentBGetRes = await apiFetch(`/api/cases/${caseA.id}`, {
    method: "GET",
    headers: { Cookie: parentB.cookie }
  });
  record("Parent B views Parent A's case detail -> 404 IDOR Protected", parentBGetRes.status === 404, `status=${parentBGetRes.status}`);

  // Police views case detail -> 200 OK
  const policeGetRes = await apiFetch(`/api/cases/${caseA.id}`, {
    method: "GET",
    headers: { Cookie: police.cookie }
  });
  record("Police views case detail -> 200 OK", policeGetRes.status === 200);

  // Citizen views case detail -> 403 Forbidden
  const citizenGetDetail = await apiFetch(`/api/cases/${caseA.id}`, {
    method: "GET",
    headers: { Cookie: citizen.cookie }
  });
  record("Citizen views case detail -> 403 Forbidden", citizenGetDetail.status === 403);

  // =========================================================================
  // 8. CONTROLLED STATUS LIFECYCLE STATE MACHINE
  // =========================================================================
  console.log("\n>>> SECTION 8: Controlled Status Lifecycle State Machine");

  // Parent attempts arbitrary status transition to 'active' -> 403
  const parentPatchActive = await apiFetch(`/api/cases/${caseA.id}/status`, {
    method: "PATCH",
    headers: { Cookie: parentA.cookie },
    body: JSON.stringify({ status: "active" })
  });
  record("Parent arbitrary status update to 'active' -> 403 Restricted", parentPatchActive.status === 403);

  // Invalid transition from 'reported' to 'reunited' -> 400
  const invalidTransitionRes = await apiFetch(`/api/cases/${caseA.id}/status`, {
    method: "PATCH",
    headers: { Cookie: police.cookie },
    body: JSON.stringify({ status: "reunited" })
  });
  record("Invalid transition 'reported' -> 'reunited' -> 400 Bad Request", invalidTransitionRes.status === 400);

  // Police progresses: reported -> under_verification -> 200 OK
  const toUnderVerification = await apiFetch(`/api/cases/${caseA.id}/status`, {
    method: "PATCH",
    headers: { Cookie: police.cookie },
    body: JSON.stringify({ status: "under_verification" })
  });
  const dataUV = await toUnderVerification.json();
  record("Police transitions 'reported' -> 'under_verification' -> 200 OK", toUnderVerification.status === 200 && dataUV?.case?.status === "under_verification");

  // Police progresses: under_verification -> active -> 200 OK
  const toActive = await apiFetch(`/api/cases/${caseA.id}/status`, {
    method: "PATCH",
    headers: { Cookie: police.cookie },
    body: JSON.stringify({ status: "active" })
  });
  const dataActive = await toActive.json();
  record("Police transitions 'under_verification' -> 'active' -> 200 OK", toActive.status === 200 && dataActive?.case?.status === "active");

  // NGO progresses: active -> found -> 200 OK
  const toFound = await apiFetch(`/api/cases/${caseA.id}/status`, {
    method: "PATCH",
    headers: { Cookie: ngo.cookie },
    body: JSON.stringify({ status: "found" })
  });
  const dataFound = await toFound.json();
  record("NGO transitions 'active' -> 'found' -> 200 OK", toFound.status === 200 && dataFound?.case?.status === "found");
  record("Milestone foundAt timestamp persisted", !!dataFound?.case?.foundAt);

  // NGO progresses: found -> reunited -> 200 OK
  const toReunited = await apiFetch(`/api/cases/${caseA.id}/status`, {
    method: "PATCH",
    headers: { Cookie: ngo.cookie },
    body: JSON.stringify({ status: "reunited" })
  });
  const dataReunited = await toReunited.json();
  record("NGO transitions 'found' -> 'reunited' -> 200 OK", toReunited.status === 200 && dataReunited?.case?.status === "reunited");
  record("Milestone reunitedAt timestamp persisted", !!dataReunited?.case?.reunitedAt);

  // Police progresses: reunited -> closed -> 200 OK
  const toClosed = await apiFetch(`/api/cases/${caseA.id}/status`, {
    method: "PATCH",
    headers: { Cookie: police.cookie },
    body: JSON.stringify({ status: "closed" })
  });
  const dataClosed = await toClosed.json();
  record("Police transitions 'reunited' -> 'closed' -> 200 OK (Terminal state)", toClosed.status === 200 && dataClosed?.case?.status === "closed");

  // Terminal state check: attempt to reopen closed case -> 400
  const terminalReopen = await apiFetch(`/api/cases/${caseA.id}/status`, {
    method: "PATCH",
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ status: "active" })
  });
  record("Attempt transition out of terminal state 'closed' -> 400 Bad Request", terminalReopen.status === 400);

  // =========================================================================
  // 9. INCIDENT HISTORY PRESERVATION & RE-REPORTING
  // =========================================================================
  console.log("\n>>> SECTION 9: Incident History Preservation & Re-Reporting");

  // Since Case A is now closed, Parent A can report a new missing incident for Child A
  const secondIncidentRes = await apiFetch("/api/cases", {
    method: "POST",
    headers: { Cookie: parentA.cookie },
    body: JSON.stringify({
      childId: childAId,
      missingDate: new Date().toISOString(),
      lastSeenLocation: "Bus Terminal Platform 4",
      lastSeenDescription: "Second incident report after safe return from first incident",
      priority: "high"
    })
  });
  const secondIncidentData = await secondIncidentRes.json();
  const caseA2 = secondIncidentData?.case;
  if (caseA2?.id) testCasesCreated.push(caseA2.id);

  record("Parent reports new incident after first case closed -> 201 Created", secondIncidentRes.status === 201, `newCaseId=${caseA2?.id}`);

  // Verify multiple incident records exist in DB for Child A
  const allIncidentsInDb = await MissingCase.find({ childId: childAId });
  record("Child A has multiple historical case records in DB", allIncidentsInDb.length === 2, `count=${allIncidentsInDb.length}`);

  // Parent A cancels the second newly reported case
  const parentCancelRes = await apiFetch(`/api/cases/${caseA2.id}/status`, {
    method: "PATCH",
    headers: { Cookie: parentA.cookie },
    body: JSON.stringify({ status: "cancelled" })
  });
  const dataCancel = await parentCancelRes.json();
  record("Parent cancels newly reported draft incident -> 200 OK", parentCancelRes.status === 200 && dataCancel?.case?.status === "cancelled");

  // =========================================================================
  // CLEANUP
  // =========================================================================
  console.log("\n>>> Cleaning up test fixtures from DB & Redis...");
  if (testCasesCreated.length > 0) {
    await MissingCase.deleteMany({ _id: { $in: testCasesCreated } });
  }
  if (testChildrenCreated.length > 0) {
    await Child.deleteMany({ _id: { $in: testChildrenCreated } });
  }
  if (testUsersCreated.length > 0) {
    await User.deleteMany({ _id: { $in: testUsersCreated } });
    for (const uid of testUsersCreated) {
      await redis.del(`session:${uid}`);
    }
  }
  await mongoose.disconnect();
  await redis.disconnect();
  console.log("  ✓ Cleanup completed successfully.\n");

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log("==================================================================");
  const total = testResults.length;
  const passed = testResults.filter((r) => r.status === "PASS").length;
  const failed = testResults.filter((r) => r.status === "FAIL").length;

  console.log(`PHASE 4 TEST SUMMARY: Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log("==================================================================");

  if (failed > 0) {
    console.error(`\n❌ [TEST FAILURE]: ${failed} tests failed!`);
    process.exit(1);
  } else {
    console.log("\n🎉 [ALL TESTS PASSED]: Phase 4 Missing Case Management verification succeeded!");
    process.exit(0);
  }
}

runSuite().catch((err) => {
  console.error("Unexpected test suite error:", err);
  process.exit(1);
});
