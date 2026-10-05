/**
 * GuardianLink Phase 2: Manual E2E Workflow Verification Script
 * 
 * Executes the exact 21-step workflow mandated in Section 35:
 * 1. Login as Parent A
 * 2. Open Parent Dashboard (GET /api/children)
 * 3. Add Child (POST /api/children)
 * 4. Submit form & verify API request returns 201
 * 5. Verify MongoDB document created with correct fields
 * 6. Verify child appears in dashboard (GET /api/children returns Child A)
 * 7. Refresh browser simulation (New GET /api/children request)
 * 8. Verify child remains persisted
 * 9. Open child details (GET /api/children/:id)
 * 10. Edit child (PATCH /api/children/:id)
 * 11. Verify MongoDB update persisted
 * 12. Refresh simulation (GET /api/children/:id)
 * 13. Verify update persists
 * 14. Deactivate child (PATCH /api/children/:id/status, { status: "inactive" })
 * 15. Verify status changes to inactive
 * 16. Verify child is NOT permanently deleted from MongoDB
 * 17. Login as Parent B
 * 18. Verify Parent A's child is completely invisible to Parent B (GET /api/children returns empty/only B)
 * 19. Attempt direct Child A URL/API as Parent B (GET /api/children/:childAId)
 * 20. Verify access is denied with safe 404 (IDOR blocked)
 * 21. Clean up test users & children
 */

const mongoose = require("mongoose");
const { User, Child } = require("../models");

const API_BASE = "http://localhost:5000";
const MONGO_URI = process.env.MONGO_URI || "mongodb://mongo:27017/guardianlink";

const ts = Date.now();
const testUsers = [];
const testChildren = [];

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    "Content-Type": "application/json",
    "x-test-suite": "true",
    ...(options.headers || {})
  };
  return fetch(url, { ...options, headers });
}

async function registerAndLogin(name, emailPrefix) {
  const email = `${emailPrefix}.${ts}@example.com`;
  const phone = `94${String(ts).slice(-6)}${Math.floor(10 + Math.random() * 89)}`;
  const password = "Password123!";

  const regRes = await apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ fullName: name, email, phone, password, role: "parent" })
  });
  const regData = await regRes.json();
  const userId = regData?.user?.id;
  if (userId) testUsers.push(userId);

  const loginRes = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: email, password })
  });
  const cookieHeader = loginRes.headers.get("set-cookie") || "";
  const tokenMatch = cookieHeader.match(/(?:guardianlink_token|token)=([^;]+)/);
  const cookie = tokenMatch ? tokenMatch[0] : "";

  return { userId, email, cookie };
}

async function runE2E() {
  console.log("==================================================================");
  console.log("GUARDIANLINK PHASE 2: MANUAL E2E WORKFLOW VERIFICATION");
  console.log("==================================================================\n");

  await mongoose.connect(MONGO_URI);

  // Step 1: Login as Parent A
  console.log("[Step 1] Registering and authenticating Parent A...");
  const parentA = await registerAndLogin("Suman Sharma", "parentA_e2e");
  console.log(`  ✓ Parent A authenticated: ${parentA.email} (${parentA.userId})`);

  // Step 2: Open Parent Dashboard (GET /api/children)
  console.log("\n[Step 2] Opening Parent Dashboard (GET /api/children)...");
  const dash1 = await apiFetch("/api/children", { headers: { Cookie: parentA.cookie } });
  const dash1Data = await dash1.json();
  console.log(`  ✓ Parent A initial children count: ${dash1Data.children?.length} (HTTP ${dash1.status})`);

  // Step 3 & 4: Add Child (POST /api/children)
  console.log("\n[Step 3 & 4] Submitting Add Child form (POST /api/children)...");
  const childPayload = {
    fullName: "Reyansh Sharma",
    name: "Reyansh Sharma",
    dateOfBirth: "2019-04-10",
    dob: "2019-04-10",
    gender: "male",
    nickname: "Rey",
    height: "115 cm",
    weight: "20 kg",
    bloodGroup: "B+",
    schoolName: "St. Mary Public School",
    distinctiveMarks: "Small scar on chin",
    emergencyContacts: [
      { name: "Suman Sharma", relationship: "Mother", phone: "9876543210", isPrimary: true }
    ]
  };

  const createRes = await apiFetch("/api/children", {
    method: "POST",
    headers: { Cookie: parentA.cookie },
    body: JSON.stringify(childPayload)
  });
  const createData = await createRes.json();
  console.log(`  ✓ Create Child HTTP Status: ${createRes.status}`);
  if (createRes.status !== 201 || !createData.success) {
    throw new Error(`Child creation failed: ${JSON.stringify(createData)}`);
  }
  const childA = createData.child;
  testChildren.push(childA.id);
  console.log(`  ✓ Child created: ${childA.name} (ID: ${childA.id}), Guardian: ${childA.guardianId}`);

  // Step 5: Verify MongoDB document
  console.log("\n[Step 5] Direct MongoDB document verification...");
  const mongoDoc = await Child.findById(childA.id);
  if (!mongoDoc) throw new Error("Child document not found in MongoDB!");
  console.log(`  ✓ MongoDB Document verified: ${mongoDoc.fullName}, status: ${mongoDoc.status}, age virtual: ${mongoDoc.age}`);

  // Step 6: Verify child appears in dashboard
  console.log("\n[Step 6] Verifying child appears in Parent A dashboard...");
  const dash2 = await apiFetch("/api/children", { headers: { Cookie: parentA.cookie } });
  const dash2Data = await dash2.json();
  const foundA = dash2Data.children.find((c) => c.id === childA.id);
  if (!foundA) throw new Error("Created child not found in dashboard!");
  console.log(`  ✓ Child '${foundA.name}' successfully returned in dashboard list.`);

  // Step 7 & 8: Refresh browser simulation
  console.log("\n[Step 7 & 8] Simulating browser refresh (cold GET /api/children)...");
  const refreshDash = await apiFetch("/api/children", { headers: { Cookie: parentA.cookie } });
  const refreshData = await refreshDash.json();
  const refreshedChild = refreshData.children.find((c) => c.id === childA.id);
  if (!refreshedChild) throw new Error("Child did not persist across refresh!");
  console.log(`  ✓ Child remains after refresh. Total children: ${refreshData.children.length}`);

  // Step 9: Open child details (GET /api/children/:id)
  console.log("\n[Step 9] Opening child details view (GET /api/children/:id)...");
  const detailsRes = await apiFetch(`/api/children/${childA.id}`, { headers: { Cookie: parentA.cookie } });
  const detailsData = await detailsRes.json();
  console.log(`  ✓ Retrieved child details: ${detailsData.child?.name}, Blood Group: ${detailsData.child?.bloodGroup}`);

  // Step 10 & 11: Edit child
  console.log("\n[Step 10 & 11] Editing child profile (PATCH /api/children/:id)...");
  const updateRes = await apiFetch(`/api/children/${childA.id}`, {
    method: "PATCH",
    headers: { Cookie: parentA.cookie },
    body: JSON.stringify({
      height: "118 cm",
      weight: "22 kg",
      medicalNotes: "Prescribed spectacles for reading."
    })
  });
  const updateData = await updateRes.json();
  console.log(`  ✓ Edit Child HTTP Status: ${updateRes.status}`);
  const mongoUpdated = await Child.findById(childA.id);
  if (mongoUpdated.height !== "118 cm" || mongoUpdated.medicalNotes !== "Prescribed spectacles for reading.") {
    throw new Error("Update not persisted to MongoDB!");
  }
  console.log(`  ✓ MongoDB update confirmed: height=${mongoUpdated.height}, medicalNotes="${mongoUpdated.medicalNotes}"`);

  // Step 12 & 13: Refresh simulation for details
  console.log("\n[Step 12 & 13] Verifying update persistence after refresh...");
  const detailsRefreshed = await apiFetch(`/api/children/${childA.id}`, { headers: { Cookie: parentA.cookie } });
  const refData = await detailsRefreshed.json();
  if (refData.child?.height !== "118 cm") throw new Error("Updated fields did not persist!");
  console.log(`  ✓ Refreshed profile confirms updated height: ${refData.child?.height}`);

  // Step 14, 15 & 16: Deactivate child (soft state change, no hard deletion)
  console.log("\n[Step 14, 15 & 16] Deactivating child profile (PATCH /api/children/:id/status)...");
  const deactRes = await apiFetch(`/api/children/${childA.id}/status`, {
    method: "PATCH",
    headers: { Cookie: parentA.cookie },
    body: JSON.stringify({ status: "inactive" })
  });
  const deactData = await deactRes.json();
  console.log(`  ✓ Deactivate status HTTP ${deactRes.status}: status=${deactData.child?.status}`);

  const mongoDeact = await Child.findById(childA.id);
  if (!mongoDeact || mongoDeact.status !== "inactive") {
    throw new Error("Child was either hard-deleted or status not updated to inactive!");
  }
  console.log(`  ✓ MongoDB audit: Document exists with status='${mongoDeact.status}' (NOT hard-deleted).`);

  // Step 17: Login as Parent B
  console.log("\n[Step 17] Registering and authenticating Parent B...");
  const parentB = await registerAndLogin("Vikram Malhotra", "parentB_e2e");
  console.log(`  ✓ Parent B authenticated: ${parentB.email} (${parentB.userId})`);

  // Step 18: Verify Parent A's child is invisible to Parent B
  console.log("\n[Step 18] Verifying Parent A's child is invisible in Parent B's dashboard...");
  const dashB = await apiFetch("/api/children", { headers: { Cookie: parentB.cookie } });
  const dashBData = await dashB.json();
  const leakedChild = dashBData.children.find((c) => c.id === childA.id);
  if (leakedChild) throw new Error("CRITICAL SECURITY FLAW: Parent B can see Parent A's child!");
  console.log(`  ✓ Parent B dashboard has 0 of Parent A's children (Returned ${dashBData.children.length} records).`);

  // Step 19 & 20: Attempt direct Child A URL/API as Parent B (IDOR prevention)
  console.log("\n[Step 19 & 20] Parent B attempting direct access to Parent A's child (IDOR test)...");
  const idorGet = await apiFetch(`/api/children/${childA.id}`, { headers: { Cookie: parentB.cookie } });
  const idorPatch = await apiFetch(`/api/children/${childA.id}`, {
    method: "PATCH",
    headers: { Cookie: parentB.cookie },
    body: JSON.stringify({ fullName: "Malicious Takeover" })
  });
  const idorDeact = await apiFetch(`/api/children/${childA.id}/status`, {
    method: "PATCH",
    headers: { Cookie: parentB.cookie },
    body: JSON.stringify({ status: "inactive" })
  });

  console.log(`  ✓ Parent B GET Child A: HTTP ${idorGet.status} (Expected 404)`);
  console.log(`  ✓ Parent B PATCH Child A: HTTP ${idorPatch.status} (Expected 404)`);
  console.log(`  ✓ Parent B DEACTIVATE Child A: HTTP ${idorDeact.status} (Expected 404)`);

  if (idorGet.status !== 404 || idorPatch.status !== 404 || idorDeact.status !== 404) {
    throw new Error("IDOR Protection Failed! Parent B was not denied with 404.");
  }
  console.log("  ✓ IDOR Protection Confirmed: All cross-parent access denied with safe 404.");

  // Cleanup
  console.log("\n[Step 21] Teardown & cleanup...");
  await Child.deleteMany({ _id: { $in: testChildren } });
  await User.deleteMany({ _id: { $in: testUsers } });
  await mongoose.disconnect();
  console.log("  ✓ Cleaned up test records from database.");

  console.log("\n==================================================================");
  console.log("🎉 ALL 21 STEPS OF THE MANUAL E2E WORKFLOW PASSED WITH 100% SUCCESS!");
  console.log("==================================================================");
}

runE2E().catch((err) => {
  console.error("\n❌ E2E Workflow Failed:", err);
  process.exit(1);
});
