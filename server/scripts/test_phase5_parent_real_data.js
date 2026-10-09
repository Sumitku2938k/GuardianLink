/**
 * GuardianLink Phase 5: Parent Real Data Backend & Security Verification Suite
 *
 * Verifies:
 * 1. Authentication Enforcement (Unauthenticated 401 across child and case endpoints)
 * 2. Parent A Child Creation with Authenticated Identity (POST /api/children)
 * 3. Real Child Persistence & Refresh Verification (GET /api/children)
 * 4. Child Detail Retrieval & Persistence (GET /api/children/:id)
 * 5. Child Profile Update & Persistence (PATCH /api/children/:id)
 * 6. Real Child Photo Upload & Persistence (PATCH /api/children/:id/photo - Cloudinary / backend storage)
 * 7. Photo Persistence Across Subsequent Re-fetch (No fake blob or temporary preview)
 * 8. Parent A Missing Case Creation for Own Child (POST /api/cases)
 * 9. Missing Case Persistence & Refresh Verification (GET /api/cases)
 * 10. Direct Case Detail Navigation & Persistence (GET /api/cases/:caseId)
 * 11. Active Case Conflict Enforcement (POST /api/cases returns 409 ACTIVE_CASE_EXISTS for duplicate)
 * 12. Parent Data Isolation - Children (Parent B cannot see Parent A's children via GET /api/children or GET /api/children/:id)
 * 13. Parent Data Isolation - Cases (Parent B cannot see Parent A's cases via GET /api/cases or GET /api/cases/:caseId)
 * 14. Parent B Cannot Report Missing Incident for Parent A's Child (Ownership validation)
 * 15. RBAC & Security Integrity (Citizen denied 403 on protected parent routes)
 * 16. Clean Database Teardown
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
  const email = `p5.${prefix}.${ts}@example.com`;
  const phone = `95${String(ts).slice(-6)}${Math.floor(10 + Math.random() * 89)}`;
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
  console.log("GUARDIANLINK PHASE 5: PARENT REAL DATA E2E & SECURITY TEST SUITE");
  console.log("==================================================================\n");

  await mongoose.connect(MONGO_URI);
  const redis = createClient({ url: REDIS_URL });
  await redis.connect();

  console.log(">>> Provisioning Test Actors...");
  const parentA = await registerAndLogin("parent", `parentA_${ts}`);
  const parentB = await registerAndLogin("parent", `parentB_${ts}`);
  const citizen = await registerAndLogin("citizen", `citizen_${ts}`);

  let childAId = null;
  let caseAId = null;
  let initialPhotoUrl = null;

  // -------------------------------------------------------------
  // TEST GROUP 1: Authentication & Unauthorized Protections
  // -------------------------------------------------------------
  console.log("\n>>> Test Group 1: Authentication Enforcement (401 Blocks)...");
  {
    const unauthChildren = await apiFetch("/api/children");
    record(
      "Unauthenticated GET /api/children is blocked with 401",
      unauthChildren.status === 401
    );

    const unauthCases = await apiFetch("/api/cases");
    record(
      "Unauthenticated GET /api/cases is blocked with 401",
      unauthCases.status === 401
    );

    const unauthCreateChild = await apiFetch("/api/children", {
      method: "POST",
      body: JSON.stringify({ fullName: "Ghost Child", dateOfBirth: "2018-05-10", gender: "Male" })
    });
    record(
      "Unauthenticated POST /api/children is blocked with 401",
      unauthCreateChild.status === 401
    );

    const unauthCreateCase = await apiFetch("/api/cases", {
      method: "POST",
      body: JSON.stringify({ childId: new mongoose.Types.ObjectId().toString() })
    });
    record(
      "Unauthenticated POST /api/cases is blocked with 401",
      unauthCreateCase.status === 401
    );
  }

  // -------------------------------------------------------------
  // TEST GROUP 2: Parent Real Child Management Flow
  // -------------------------------------------------------------
  console.log("\n>>> Test Group 2: Parent Real Child Management Flow...");
  {
    // Initially empty
    const initialGet = await apiFetch("/api/children", {
      headers: { cookie: parentA.cookie }
    });
    const initialData = await initialGet.json();
    record(
      "Parent A initial children list is empty real array",
      initialGet.status === 200 && Array.isArray(initialData.children) && initialData.children.length === 0
    );

    // Create child with JSON (or multipart)
    const createChildRes = await apiFetch("/api/children", {
      method: "POST",
      headers: { cookie: parentA.cookie },
      body: JSON.stringify({
        fullName: `Rohan Sharma ${ts}`,
        dateOfBirth: "2016-08-15",
        gender: "Male",
        bloodGroup: "O+",
        schoolName: "Delhi Public School, Sector 12",
        emergencyContacts: [
          { name: "Parent Guardian", phone: "9876543210", relationship: "Parent", isPrimary: true }
        ],
        medicalNotes: "No known allergies"
      })
    });
    const createChildData = await createChildRes.json();
    const createdChild = createChildData.child;
    childAId = createdChild?._id || createdChild?.id;

    if (childAId) testChildrenCreated.push(childAId);

    record(
      "Parent A can create real Child document with authentic ID",
      createChildRes.status === 201 && Boolean(childAId) && createdChild.fullName === `Rohan Sharma ${ts}`
    );

    // Verify guardianId matches authenticated parent
    const dbChild = await Child.findById(childAId);
    record(
      "Child document guardianId strictly matches authenticated Parent A ID in MongoDB",
      dbChild && dbChild.guardianId.toString() === parentA.userId
    );

    // Refresh simulation: subsequent GET /api/children returns the child
    const refreshGet = await apiFetch("/api/children", {
      headers: { cookie: parentA.cookie }
    });
    const refreshData = await refreshGet.json();
    const foundChild = refreshData.children?.find((c) => (c._id || c.id) === childAId);

    record(
      "Simulated browser refresh: GET /api/children still returns created child from MongoDB",
      refreshGet.status === 200 && Boolean(foundChild) && foundChild.fullName === `Rohan Sharma ${ts}`
    );

    // Direct detail retrieval: GET /api/children/:id
    const detailGet = await apiFetch(`/api/children/${childAId}`, {
      headers: { cookie: parentA.cookie }
    });
    const detailData = await detailGet.json();
    record(
      "Parent A can fetch real child detail via GET /api/children/:id",
      detailGet.status === 200 && (detailData.child?._id || detailData.child?.id) === childAId
    );

    // Update child profile: PATCH /api/children/:id
    const updateRes = await apiFetch(`/api/children/${childAId}`, {
      method: "PATCH",
      headers: { cookie: parentA.cookie },
      body: JSON.stringify({
        schoolName: "Modern Model Academy, Sector 14",
        medicalNotes: "Mild asthma, carry inhaler"
      })
    });
    const updateData = await updateRes.json();
    record(
      "Parent A can update child profile via PATCH /api/children/:id",
      updateRes.status === 200 && updateData.child?.schoolName === "Modern Model Academy, Sector 14"
    );

    // Refresh simulation after update
    const reFetchAfterUpdate = await apiFetch(`/api/children/${childAId}`, {
      headers: { cookie: parentA.cookie }
    });
    const reFetchData = await reFetchAfterUpdate.json();
    record(
      "Profile update persists across re-fetch",
      reFetchData.child?.medicalNotes === "Mild asthma, carry inhaler"
    );
  }

  // -------------------------------------------------------------
  // TEST GROUP 3: Child Photo Real Data Persistence
  // -------------------------------------------------------------
  console.log("\n>>> Test Group 3: Child Photo Real Data Persistence...");
  {
    // Upload real photo via multipart FormData
    // Create a 1x1 valid PNG buffer
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    const boundary = "---------------------------" + Date.now();
    let body = "";
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="photo"; filename="test_child.png"\r\n`;
    body += `Content-Type: image/png\r\n\r\n`;

    const bodyHead = Buffer.from(body, "utf-8");
    const bodyTail = Buffer.from(`\r\n--${boundary}--\r\n`, "utf-8");
    const multipartBody = Buffer.concat([bodyHead, pngBuffer, bodyTail]);

    const photoRes = await fetch(`${API_BASE}/api/children/${childAId}/photo`, {
      method: "PATCH",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "x-test-suite": "true",
        cookie: parentA.cookie
      },
      body: multipartBody
    });
    const photoData = await photoRes.json();
    initialPhotoUrl = photoData.child?.photoUrl;

    record(
      "Child photo upload succeeds and returns valid persisted URL",
      photoRes.status === 200 && Boolean(initialPhotoUrl) && !initialPhotoUrl.startsWith("blob:")
    );

    // Verify MongoDB stores real photo URL
    const dbChildWithPhoto = await Child.findById(childAId);
    record(
      "MongoDB stores persistent child photoUrl (not mock or blob URL)",
      Boolean(dbChildWithPhoto.photoUrl) && !dbChildWithPhoto.photoUrl.startsWith("blob:")
    );

    // Refresh simulation: subsequent GET /api/children confirms photo remains
    const getChildrenAfterPhoto = await apiFetch("/api/children", {
      headers: { cookie: parentA.cookie }
    });
    const dataAfterPhoto = await getChildrenAfterPhoto.json();
    const childWithPhoto = dataAfterPhoto.children?.find((c) => (c._id || c.id) === childAId);

    record(
      "Child photo URL survives subsequent GET /api/children re-fetch",
      Boolean(childWithPhoto?.photoUrl) && childWithPhoto.photoUrl === initialPhotoUrl
    );
  }

  // -------------------------------------------------------------
  // TEST GROUP 4: Missing Case Real Data Flow
  // -------------------------------------------------------------
  console.log("\n>>> Test Group 4: Missing Case Real Data Flow...");
  {
    // Initially empty for Parent A
    const initialCases = await apiFetch("/api/cases", {
      headers: { cookie: parentA.cookie }
    });
    const initialCasesData = await initialCases.json();
    record(
      "Parent A initial cases list is empty real array",
      initialCases.status === 200 && Array.isArray(initialCasesData.cases) && initialCasesData.cases.length === 0
    );

    // Create Missing Case (POST /api/cases)
    const createCaseRes = await apiFetch("/api/cases", {
      method: "POST",
      headers: { cookie: parentA.cookie },
      body: JSON.stringify({
        childId: childAId,
        missingDate: new Date(Date.now() - 3600000).toISOString(),
        lastSeenLocation: {
          address: "Sector 18 Metro Station Exit 2, Noida",
          latitude: 28.5708,
          longitude: 77.3261
        },
        lastSeenDescription: "Wearing blue shirt and khaki trousers. Walking towards bus stop.",
        priority: "high"
      })
    });
    const createCaseData = await createCaseRes.json();
    const createdCase = createCaseData.case;
    caseAId = createdCase?._id || createdCase?.id;

    if (caseAId) testCasesCreated.push(caseAId);

    record(
      "Parent A can report missing case for registered child with real case ID",
      createCaseRes.status === 201 && Boolean(caseAId) && createdCase.caseNumber?.startsWith("MC-")
    );

    // Verify MongoDB storage
    const dbCase = await MissingCase.findById(caseAId);
    record(
      "MissingCase document exists in MongoDB with reportedBy strictly bound to Parent A",
      dbCase && dbCase.reportedBy.toString() === parentA.userId && dbCase.childId.toString() === childAId
    );

    // Refresh simulation: subsequent GET /api/cases returns the case
    const refreshCases = await apiFetch("/api/cases", {
      headers: { cookie: parentA.cookie }
    });
    const refreshCasesData = await refreshCases.json();
    const foundCase = refreshCasesData.cases?.find((c) => (c._id || c.id) === caseAId);

    record(
      "Simulated browser refresh: GET /api/cases returns the newly created incident",
      refreshCases.status === 200 && Boolean(foundCase) && foundCase.caseNumber === createdCase.caseNumber
    );

    // Direct detail navigation: GET /api/cases/:caseId
    const directCaseDetail = await apiFetch(`/api/cases/${caseAId}`, {
      headers: { cookie: parentA.cookie }
    });
    const directCaseDetailData = await directCaseDetail.json();

    record(
      "Direct URL navigation: GET /api/cases/:caseId loads real case with populated child data",
      directCaseDetail.status === 200 &&
        (directCaseDetailData.case?._id || directCaseDetailData.case?.id) === caseAId &&
        Boolean(directCaseDetailData.case?.childId)
    );
  }

  // -------------------------------------------------------------
  // TEST GROUP 5: Active Case Conflict (409) Enforcement
  // -------------------------------------------------------------
  console.log("\n>>> Test Group 5: Active Case Policy & Duplicate Conflict (409)...");
  {
    const duplicateCaseRes = await apiFetch("/api/cases", {
      method: "POST",
      headers: { cookie: parentA.cookie },
      body: JSON.stringify({
        childId: childAId,
        missingDate: new Date(Date.now() - 1800000).toISOString(),
        lastSeenLocation: { address: "Another location" },
        priority: "high"
      })
    });
    const duplicateData = await duplicateCaseRes.json();

    record(
      "Creating second missing case for child with active case returns 409 Conflict (ACTIVE_CASE_EXISTS)",
      duplicateCaseRes.status === 409 &&
        (duplicateData.code === "ACTIVE_CASE_EXISTS" || duplicateData.message?.toLowerCase().includes("active"))
    );
  }

  // -------------------------------------------------------------
  // TEST GROUP 6: Parent Isolation & IDOR Protection
  // -------------------------------------------------------------
  console.log("\n>>> Test Group 6: Parent Data Isolation & IDOR Protection...");
  {
    // Parent B cannot see Parent A's children via GET /api/children
    const parentBChildren = await apiFetch("/api/children", {
      headers: { cookie: parentB.cookie }
    });
    const parentBChildrenData = await parentBChildren.json();
    const leakedChild = parentBChildrenData.children?.find((c) => (c._id || c.id) === childAId);

    record(
      "Parent B cannot see Parent A's children via GET /api/children",
      parentBChildren.status === 200 && !leakedChild
    );

    // Parent B cannot access Parent A's child profile via GET /api/children/:id
    const parentBAccessChildA = await apiFetch(`/api/children/${childAId}`, {
      headers: { cookie: parentB.cookie }
    });
    record(
      "Parent B direct access to Parent A's child returns 403 or 404 (IDOR Protection)",
      parentBAccessChildA.status === 403 || parentBAccessChildA.status === 404
    );

    // Parent B cannot see Parent A's cases via GET /api/cases
    const parentBCases = await apiFetch("/api/cases", {
      headers: { cookie: parentB.cookie }
    });
    const parentBCasesData = await parentBCases.json();
    const leakedCase = parentBCasesData.cases?.find((c) => (c._id || c.id) === caseAId);

    record(
      "Parent B cannot see Parent A's missing case via GET /api/cases",
      parentBCases.status === 200 && !leakedCase
    );

    // Parent B cannot access Parent A's case details via GET /api/cases/:caseId
    const parentBAccessCaseA = await apiFetch(`/api/cases/${caseAId}`, {
      headers: { cookie: parentB.cookie }
    });
    record(
      "Parent B direct access to Parent A's case details returns 403 or 404 (IDOR Protection)",
      parentBAccessCaseA.status === 403 || parentBAccessCaseA.status === 404
    );

    // Parent B cannot report a missing case for Parent A's child
    const parentBReportChildA = await apiFetch("/api/cases", {
      method: "POST",
      headers: { cookie: parentB.cookie },
      body: JSON.stringify({
        childId: childAId,
        missingDate: new Date().toISOString(),
        lastSeenLocation: { address: "Malicious submission" }
      })
    });
    record(
      "Parent B reporting missing case for Parent A's child is rejected (Ownership Validation)",
      parentBReportChildA.status === 403 || parentBReportChildA.status === 404
    );
  }

  // -------------------------------------------------------------
  // TEST GROUP 7: RBAC Scoping
  // -------------------------------------------------------------
  console.log("\n>>> Test Group 7: RBAC Access Scoping...");
  {
    const citizenCases = await apiFetch("/api/cases", {
      headers: { cookie: citizen.cookie }
    });
    record(
      "Citizen role is denied access to parent missing cases management (403)",
      citizenCases.status === 403
    );

    const citizenChildren = await apiFetch("/api/children", {
      headers: { cookie: citizen.cookie }
    });
    record(
      "Citizen role is denied access to children management (403)",
      citizenChildren.status === 403
    );
  }

  // -------------------------------------------------------------
  // CLEANUP & TEARDOWN
  // -------------------------------------------------------------
  console.log("\n>>> Performing Test Data Cleanup...");
  try {
    if (testCasesCreated.length > 0) {
      await MissingCase.deleteMany({ _id: { $in: testCasesCreated } });
    }
    if (testChildrenCreated.length > 0) {
      await Child.deleteMany({ _id: { $in: testChildrenCreated } });
    }
    if (testUsersCreated.length > 0) {
      await User.deleteMany({ _id: { $in: testUsersCreated } });
    }
    console.log("  ✓ Test artifacts cleaned up from MongoDB.");
  } catch (err) {
    console.warn("  ⚠ Cleanup encountered error:", err.message);
  } finally {
    await mongoose.disconnect();
    await redis.disconnect();
  }

  // -------------------------------------------------------------
  // SUITE SUMMARY
  // -------------------------------------------------------------
  console.log("\n==================================================================");
  console.log("PHASE 5 TEST SUITE RESULTS SUMMARY");
  console.log("==================================================================");
  const total = testResults.length;
  const passed = testResults.filter((r) => r.status === "PASS").length;
  const failed = testResults.filter((r) => r.status === "FAIL").length;

  console.log(`Total Assertions: ${total}`);
  console.log(`Passed:           ${passed}`);
  console.log(`Failed:           ${failed}`);
  console.log(`Status:           ${failed === 0 ? "PASSED" : "FAILED"}`);
  console.log("==================================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite().catch((err) => {
  console.error("Phase 5 Test Suite execution error:", err);
  process.exit(1);
});
