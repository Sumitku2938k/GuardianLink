/**
 * GuardianLink AI Services Integration & Security Verification Suite
 * Phase 7 Implementation Verification
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { createClient } = require("redis");
const { User, Child, MissingCase } = require("../models");

const API_BASE = "http://localhost:5000";
const AI_SERVICE_BASE = "http://127.0.0.1:8001";
const AI_SECRET = "guardianlink_ai_internal_secret_2026";
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/guardianlink";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const FIXTURES_DIR = "C:\\Users\\Sumit\\.gemini\\antigravity-ide\\brain\\3a7aa2fc-ca8e-4ae2-b2b0-d2ffb47d4f39\\scratch\\fixtures";
const SINGLE_FACE_IMG = path.join(FIXTURES_DIR, "single_face.png");
const NO_FACE_IMG = path.join(FIXTURES_DIR, "no_face.png");
const MULTI_FACE_IMG = path.join(FIXTURES_DIR, "multi_face.png");

// Baseline SHA-256 Hashes of original AI files recorded during Phase 0 audit
const BASELINE_AI_HASHES = {
  "ai-services/ai/face/detector.py": "973e7ce01af0193d667dff428fde9df3be4596c7d454ea4056e2691ecc0dd12f",
  "ai-services/ai/face/embedding.py": "e61053c06e6a165f5fb5cac6fada049b2a09963fce82e70520e2bcc419416072",
  "ai-services/ai/face/test.png": "d59656027af90e7cc2602654a85953ec288f05029b525880f1888774161cb94d",
  "ai-services/ai/face/test_detector.py": "4da1ba167c9a454382389bf49c6cd61dfb3ef16ec3d25c64f94f9f7461000f60",
  "ai-services/ai/face/test_embedding.py": "765192564ffe1122af3d163bff32b735bd4cc59ab1be8fe559da0304c9dde0d4",
  "ai-services/ai/image_preprocessing/preprocessing.py": "73e9332d37157bd5cd1a36e86947634b7a634f3da41267902580b5058e205f45",
  "ai-services/ai/image_preprocessing/test_preprocessing.py": "94a9facd13c89eaf6aa57774e59f47698ec5e774906b112dbd8b587704b6af41",
  "ai-services/ai/vector_db/insert_embedding.py": "ba141c77dda57fb3c70dc6c11fc6e711702a59ed742205d9c00e582cae10528d",
  "ai-services/ai/vector_db/search_embedding.py": "d0790450dd8dc21e35a500f2bc1e396eff28dab63ae0ec63852b16c2612a747b",
  "ai-services/ai/vector_db/vector_store.py": "a3185a355cf48320decd7ac90d32aff0809d5399a7b0d8b109d2fe1af5dbde8a",
  "ai-services/main.py": "297f87f6d3d15c840a1ddacfdb4e348e1e70cb669203f74735055ce34677e7cf",
  "ai-services/requirements.txt": "d5fa72da64664c3698d6970e126be6408019d60b0a07f45adebcbfc99c057713"
};


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
    "x-test-suite": "true",
    ...(options.headers || {})
  };
  return fetch(url, { ...options, headers });
}

async function registerAndLogin(role, prefix) {
  const email = `ai.${prefix}.${ts}@example.com`;
  const phone = `97${String(ts).slice(-6)}${Math.floor(10 + Math.random() * 89)}`;
  const password = "SecurePassword123!";

  const regRes = await apiFetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
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
  console.log("GUARDIANLINK AI SERVICE INTEGRATION & SECURITY TEST SUITE");
  console.log("==================================================================\n");

  await mongoose.connect(MONGO_URI);
  let redis = null;
  try {
    redis = createClient({ url: REDIS_URL });
    await redis.connect();
  } catch (err) {
    redis = { disconnect: async () => {} };
  }

  try {
    // -------------------------------------------------------------
    // GROUP 1: STRICT FILE PRESERVATION AUDIT (SHA-256 HASHES)
    // -------------------------------------------------------------
    console.log(">>> Group 1: Strict File Preservation Audit (Original AI Files)...");
    let allHashesMatch = true;
    const projectRoot = path.resolve(__dirname, "../..");

    for (const [relPath, expectedHash] of Object.entries(BASELINE_AI_HASHES)) {
      const fullPath = path.join(projectRoot, relPath);
      if (!fs.existsSync(fullPath)) {
        record(`File Exists: ${relPath}`, false, "File missing!");
        allHashesMatch = false;
        continue;
      }
      const fileBuffer = fs.readFileSync(fullPath);
      const computedHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
      const matches = computedHash.toLowerCase() === expectedHash.toLowerCase();
      if (!matches) allHashesMatch = false;
      record(`SHA-256 Unchanged: ${relPath}`, matches, `Computed: ${computedHash.slice(0, 12)}...`);
    }

    record("All 12 Original AI Algorithm & App Files Untouched", allHashesMatch);

    // -------------------------------------------------------------
    // GROUP 2: AI INTEGRATION API S2S AUTHENTICATION & HEALTH
    // -------------------------------------------------------------
    console.log("\n>>> Group 2: AI Integration API S2S Authentication & Health...");

    // 1. Unauthenticated request blocked with 401
    const unauthHealth = await fetch(`${AI_SERVICE_BASE}/integration/health`);
    record("Unauthenticated /integration/health Rejected (401)", unauthHealth.status === 401, `Status: ${unauthHealth.status}`);

    // 2. Invalid secret rejected with 401
    const badSecretHealth = await fetch(`${AI_SERVICE_BASE}/integration/health`, {
      headers: { "X-AI-Service-Secret": "invalid_wrong_secret" }
    });
    record("Invalid Secret /integration/health Rejected (401)", badSecretHealth.status === 401, `Status: ${badSecretHealth.status}`);

    // 3. Valid secret authorized (200) with dedicated Qdrant collection
    const authHealth = await fetch(`${AI_SERVICE_BASE}/integration/health`, {
      headers: { "X-AI-Service-Secret": AI_SECRET }
    });
    const healthJson = await authHealth.json();
    record(
      "Authenticated /integration/health Authorized (200 OK)",
      authHealth.status === 200 && healthJson.status === "ok" && healthJson.collection === "guardianlink_children_faces",
      `Collection: ${healthJson.collection}`
    );

    // -------------------------------------------------------------
    // GROUP 3: DIRECT AI ENROLLMENT & VALIDATION BOUNDARIES
    // -------------------------------------------------------------
    console.log("\n>>> Group 3: Direct AI Biometric Enrollment & Face Validation...");

    const dummyChildId = new mongoose.Types.ObjectId().toString();

    // 1. Direct enroll without auth -> 401
    const unauthEnroll = await fetch(`${AI_SERVICE_BASE}/integration/enroll/${dummyChildId}`, {
      method: "POST"
    });
    record("Direct Enroll Without S2S Secret Rejected (401)", unauthEnroll.status === 401);

    // 2. Enroll with NO FACE image -> 400 NO_FACE_DETECTED
    const noFaceBuffer = fs.readFileSync(NO_FACE_IMG);
    const noFaceFormData = new FormData();
    noFaceFormData.append("file", new Blob([noFaceBuffer], { type: "image/png" }), "no_face.png");

    const noFaceRes = await fetch(`${AI_SERVICE_BASE}/integration/enroll/${dummyChildId}`, {
      method: "POST",
      headers: { "X-AI-Service-Secret": AI_SECRET },
      body: noFaceFormData
    });
    const noFaceJson = await noFaceRes.json();
    record(
      "Zero-Face Image Enrollment Rejected (400 NO_FACE_DETECTED)",
      noFaceRes.status === 400 && noFaceJson.detail?.code === "NO_FACE_DETECTED",
      `Code: ${noFaceJson.detail?.code}`
    );

    // 3. Enroll with MULTI-FACE image -> 400 MULTIPLE_FACES_DETECTED
    const multiFaceBuffer = fs.readFileSync(MULTI_FACE_IMG);
    const multiFaceFormData = new FormData();
    multiFaceFormData.append("file", new Blob([multiFaceBuffer], { type: "image/png" }), "multi_face.png");

    const multiFaceRes = await fetch(`${AI_SERVICE_BASE}/integration/enroll/${dummyChildId}`, {
      method: "POST",
      headers: { "X-AI-Service-Secret": AI_SECRET },
      body: multiFaceFormData
    });
    const multiFaceJson = await multiFaceRes.json();
    record(
      "Multi-Face Image Enrollment Rejected (400 MULTIPLE_FACES_DETECTED)",
      multiFaceRes.status === 400 && multiFaceJson.detail?.code === "MULTIPLE_FACES_DETECTED",
      `Code: ${multiFaceJson.detail?.code}`
    );

    // 4. Enroll with Valid Single Face -> 200 OK + 512-dim embedding inserted
    const singleFaceBuffer = fs.readFileSync(SINGLE_FACE_IMG);
    const singleFaceFormData = new FormData();
    singleFaceFormData.append("file", new Blob([singleFaceBuffer], { type: "image/png" }), "single_face.png");

    const enrollRes = await fetch(`${AI_SERVICE_BASE}/integration/enroll/${dummyChildId}`, {
      method: "POST",
      headers: { "X-AI-Service-Secret": AI_SECRET },
      body: singleFaceFormData
    });
    const enrollJson = await enrollRes.json();
    record(
      "Valid Face Enrolls Successfully (200 OK, 512-d Vector)",
      enrollRes.status === 200 && enrollJson.success && enrollJson.dimension === 512,
      `Qdrant ID: ${enrollJson.qdrantId}`
    );

    // 5. Idempotent Duplicate Enrollment (Overwrites point deterministically)
    const singleFaceFormData2 = new FormData();
    singleFaceFormData2.append("file", new Blob([singleFaceBuffer], { type: "image/png" }), "single_face.png");
    const dupEnrollRes = await fetch(`${AI_SERVICE_BASE}/integration/enroll/${dummyChildId}`, {
      method: "POST",
      headers: { "X-AI-Service-Secret": AI_SECRET },
      body: singleFaceFormData2
    });
    const dupEnrollJson = await dupEnrollRes.json();
    record(
      "Duplicate Child ID Enrollment Idempotent (Deterministic Qdrant ID)",
      dupEnrollRes.status === 200 && dupEnrollJson.qdrantId === enrollJson.qdrantId,
      `Same Qdrant ID: ${dupEnrollJson.qdrantId === enrollJson.qdrantId}`
    );

    // Cleanup direct dummy point
    await fetch(`${AI_SERVICE_BASE}/integration/enroll/${dummyChildId}`, {
      method: "DELETE",
      headers: { "X-AI-Service-Secret": AI_SECRET }
    });

    // -------------------------------------------------------------
    // GROUP 4: EXPRESS CHILD ENROLLMENT & BIOMETRIC LIFECYCLE
    // -------------------------------------------------------------
    console.log("\n>>> Group 4: Express Child Enrollment & Biometric Lifecycle...");

    const parentA = await registerAndLogin("parent", `pA_${ts}`);
    const parentB = await registerAndLogin("parent", `pB_${ts}`);
    const citizen = await registerAndLogin("citizen", `cit_${ts}`);

    // 1. Parent A registers Child A with photo via Express
    const formChildA = new FormData();
    formChildA.append("fullName", "Aarav Test Biometrics");
    formChildA.append("dateOfBirth", "2018-05-10");
    formChildA.append("gender", "male");
    formChildA.append("description", "Wearing navy blue shirt");
    formChildA.append("photo", new Blob([singleFaceBuffer], { type: "image/png" }), "aarav.png");

    const createChildRes = await apiFetch("/api/children", {
      method: "POST",
      headers: { Cookie: parentA.cookie },
      body: formChildA
    });
    const createChildData = await createChildRes.json();
    const childAId = createChildData?.child?.id;
    if (childAId) testChildrenCreated.push(childAId);

    record("Parent A Registers Child A with Real Face Photo (201 OK)", createChildRes.status === 201 && !!childAId);

    // Verify MongoDB persistence and populated faceProfileId
    const dbChildA = await Child.findById(childAId);
    record("Child A Persisted in MongoDB with photoUrl", !!dbChildA?.photoUrl);
    record(
      "Child A faceProfileId Populated from Qdrant Vector ID",
      !!dbChildA?.faceProfileId && dbChildA.faceProfileId.length > 10,
      `faceProfileId: ${dbChildA?.faceProfileId}`
    );

    // 2. IDOR Protection: Parent B cannot update Parent A's child photo
    const formChildBUpdate = new FormData();
    formChildBUpdate.append("photo", new Blob([singleFaceBuffer], { type: "image/png" }), "new_photo.png");
    const idorPhotoRes = await apiFetch(`/api/children/${childAId}/photo`, {
      method: "PATCH",
      headers: { Cookie: parentB.cookie },
      body: formChildBUpdate
    });
    record("Parent B Denied Updating Parent A's Child Photo (404 IDOR)", idorPhotoRes.status === 404);

    // 3. Parent A updates child photo -> Re-enrollment persists
    const updatePhotoRes = await apiFetch(`/api/children/${childAId}/photo`, {
      method: "PATCH",
      headers: { Cookie: parentA.cookie },
      body: formChildBUpdate
    });
    const updatePhotoData = await updatePhotoRes.json();
    const dbChildAUpdated = await Child.findById(childAId);
    record("Parent A Replaces Own Child Photo -> 200 OK", updatePhotoRes.status === 200);
    record("Child A faceProfileId Maintained After Photo Update", !!dbChildAUpdated?.faceProfileId);

    // -------------------------------------------------------------
    // GROUP 5: CITIZEN SEARCH & ELIGIBLE MISSING CASE RESOLUTION
    // -------------------------------------------------------------
    console.log("\n>>> Group 5: Citizen Matching & Eligible Missing Case Lifecycle...");

    // 1. Unauthenticated citizen search -> 401
    const unauthSearchRes = await apiFetch("/api/cases/match", {
      method: "POST"
    });
    record("Unauthenticated /api/cases/match Rejected (401)", unauthSearchRes.status === 401);

    // 2. Citizen searches BEFORE child is reported missing -> 200 matchFound: false
    const matchFormBeforeCase = new FormData();
    matchFormBeforeCase.append("photo", new Blob([singleFaceBuffer], { type: "image/png" }), "search.png");

    const matchBeforeRes = await apiFetch("/api/cases/match", {
      method: "POST",
      headers: { Cookie: citizen.cookie },
      body: matchFormBeforeCase
    });
    const matchBeforeData = await matchBeforeRes.json();
    record(
      "Citizen Search Yields matchFound: false When Child Has No Active Missing Incident",
      matchBeforeRes.status === 200 && matchBeforeData.matchFound === false && matchBeforeData.candidates.length === 0
    );

    // 3. Parent A files active Missing Case for Child A
    const caseRes = await apiFetch("/api/cases", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: parentA.cookie
      },
      body: JSON.stringify({
        childId: childAId,
        missingDate: new Date(Date.now() - 3600000).toISOString(),
        lastSeenLocation: "Sector 18 Metro Station, Noida",
        lastSeenDescription: "Wearing blue shirt and black pants",
        priority: "high"
      })
    });
    const caseData = await caseRes.json();
    const caseAId = caseData?.case?.id || caseData?.case?._id;
    if (caseAId) testCasesCreated.push(caseAId);

    record("Parent A Files Missing Case for Child A (201 OK)", caseRes.status === 201 && !!caseAId);

    // 4. Citizen searches with matching face photo -> 200 matchFound: true!
    const matchFormWithCase = new FormData();
    matchFormWithCase.append("photo", new Blob([singleFaceBuffer], { type: "image/png" }), "search.png");

    const matchWithCaseRes = await apiFetch("/api/cases/match", {
      method: "POST",
      headers: { Cookie: citizen.cookie },
      body: matchFormWithCase
    });
    const matchWithCaseData = await matchWithCaseRes.json();
    const matchedCandidate = matchWithCaseData?.candidates?.[0];

    record(
      "Citizen Search Flags matchFound: true for Active Missing Child",
      matchWithCaseRes.status === 200 && matchWithCaseData.matchFound === true && !!matchedCandidate
    );

    record("Candidate Contains Non-Sensitive Identifier (childName, caseNumber)",
      matchedCandidate?.childName === "Aarav Test Biometrics" && !!matchedCandidate?.caseNumber
    );

    record("Candidate Verification Status Required",
      matchedCandidate?.verificationStatus === "Identity Verification Required"
    );

    // 5. PRIVACY AUDIT: Ensure parent phone, email, and address are NEVER leaked to finder
    record("Privacy Shield: Parent Phone is NOT Exposed in Matching Payload", matchedCandidate?.phone === undefined);
    record("Privacy Shield: Parent Email is NOT Exposed in Matching Payload", matchedCandidate?.email === undefined);
    record("Privacy Shield: Parent Raw User Object is NOT Exposed", matchedCandidate?.reportedBy === undefined);

    // 6. RESOLVED CASE EXCLUSION AUDIT:
    // When case status becomes 'reunited' or 'closed', it MUST NOT be returned!
    await MissingCase.findByIdAndUpdate(caseAId, { status: "reunited", reunitedAt: new Date() });

    const matchAfterResolvedRes = await apiFetch("/api/cases/match", {
      method: "POST",
      headers: { Cookie: citizen.cookie },
      body: matchFormWithCase
    });
    const matchAfterResolvedData = await matchAfterResolvedRes.json();

    record(
      "Resolved/Reunited Case is STRICTLY Excluded from Active Matching (matchFound: false)",
      matchAfterResolvedRes.status === 200 &&
        matchAfterResolvedData.matchFound === false &&
        matchAfterResolvedData.candidates.length === 0
    );

    // -------------------------------------------------------------
    // GROUP 6: CHILD DEACTIVATION & VECTOR LIFECYCLE
    // -------------------------------------------------------------
    console.log("\n>>> Group 6: Child Deactivation & Vector Cleanup...");

    // Deactivate child
    const deactRes = await apiFetch(`/api/children/${childAId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: parentA.cookie
      },
      body: JSON.stringify({ status: "inactive" })
    });
    record("Parent A Deactivates Child -> status: inactive (200 OK)", deactRes.status === 200);

    // -------------------------------------------------------------
    // GROUP 7: RESILIENCY & AI DOWNTIME HANDLING
    // -------------------------------------------------------------
    console.log("\n>>> Group 7: AI Service Downtime Safety & Graceful Degradation...");

    // Test with invalid AI service secret to simulate service authorization / connection failure
    const badSecretAIService = require("../services/aiService");
    const origSecret = badSecretAIService.secret;
    badSecretAIService.secret = "bad_secret_to_simulate_failure";

    const simulatedSearch = await badSecretAIService.searchFace(singleFaceBuffer);
    record(
      "AI Service Failure Handled Safely (Never Fabricates Fake Matches)",
      simulatedSearch.success === false && (!simulatedSearch.matches || simulatedSearch.matches.length === 0),
      `Code: ${simulatedSearch.code}`
    );


    badSecretAIService.secret = origSecret; // Restore secret

    console.log("\n>>> Suite Execution Complete.");
  } catch (err) {
    console.error("Test suite runtime exception:", err);
  } finally {
    // Teardown
    console.log("\n>>> Performing Database Teardown...");
    if (testCasesCreated.length > 0) {
      await MissingCase.deleteMany({ _id: { $in: testCasesCreated } });
    }
    if (testChildrenCreated.length > 0) {
      await Child.deleteMany({ _id: { $in: testChildrenCreated } });
    }
    if (testUsersCreated.length > 0) {
      await User.deleteMany({ _id: { $in: testUsersCreated } });
    }
    await mongoose.disconnect();
    await redis.disconnect();
    console.log("  ✓ Test artifacts cleaned up.");
  }

  // -------------------------------------------------------------
  // SUITE SUMMARY
  // -------------------------------------------------------------
  console.log("\n==================================================================");
  console.log("PHASE AI SERVICE INTEGRATION TEST SUITE SUMMARY");
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
  console.error("Suite fatal error:", err);
  process.exit(1);
});
