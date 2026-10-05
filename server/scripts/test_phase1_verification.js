/**
 * GuardianLink Phase 1: User & Organization Verification Test Suite
 * 
 * Verifies:
 * 1. Role Registration & Default Status (parent=active, citizen=active, police=pending, ngo=pending)
 * 2. Admin Public Registration Block (403 ADMIN_REGISTRATION_FORBIDDEN)
 * 3. Organization Information Storage for Police & NGO
 * 4. Duplicate Account Validation (Clean JSON, no raw stack traces)
 * 5. Admin Visibility & User Inspection (Sanitized safe responses, no passwordHash)
 * 6. Admin Approval Lifecycle (pending -> approved)
 * 7. Admin Rejection Lifecycle (pending -> rejected with reason)
 * 8. Strict RBAC on Admin Verification Endpoints (Parent, Citizen, Police, NGO, Anonymous blocked)
 * 9. Privilege Escalation Prevention & Self-Approval Block
 * 10. System Admin Protection (Self-suspension block, Admin demotion/rejection block)
 * 11. Clean DB & Redis session cleanup
 */

const mongoose = require('mongoose');
const { createClient } = require('redis');
const User = require('../models/User');

const API_BASE = 'http://localhost:5000';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/guardianlink';
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

const ts = Date.now();
const testUsersCreated = [];
const testSessionsCreated = [];
const testResults = [];

function record(name, passed, details = '') {
  testResults.push({ test: name, status: passed ? 'PASS' : 'FAIL', details });
  if (passed) {
    console.log(`  ✓ [PASS] ${name}${details ? ` (${details})` : ''}`);
  } else {
    console.error(`  ✗ [FAIL] ${name}${details ? ` (${details})` : ''}`);
  }
}

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'x-test-suite': 'true',
    ...(options.headers || {})
  };
  return fetch(url, { ...options, headers });
}

async function loginUser(email, password) {
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: email, email, password })
  });
  const data = await res.json();
  const cookieHeader = res.headers.get('set-cookie') || '';
  const tokenMatch = cookieHeader.match(/(?:guardianlink_token|token)=([^;]+)/);
  const cookie = tokenMatch ? `${tokenMatch[0]}` : '';
  if (data?.user?.id) {
    testSessionsCreated.push(data.user.id);
  }
  return { status: res.status, data, cookie };
}

async function runSuite() {
  console.log('==================================================================');
  console.log('GUARDIANLINK PHASE 1: USER & ORGANIZATION VERIFICATION TEST SUITE');
  console.log('==================================================================\n');

  await mongoose.connect(MONGO_URI);
  const redis = createClient({ url: REDIS_URL });
  await redis.connect();

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@guardianlink.local';
  const adminPass = process.env.ADMIN_PASSWORD || 'AdminDev@GuardianLink2026!';

  // =========================================================================
  // 1. USER ROLE & REGISTRATION AUDIT
  // =========================================================================
  console.log('>>> SECTION 1: User Role Registration & Initial Status');

  // Parent Registration -> status: active
  const parentPayload = {
    fullName: `Test Parent ${ts}`,
    email: `p1.parent.${ts}@example.com`,
    phone: `921${String(ts).slice(-7)}`,
    password: 'SecurePass123!',
    role: 'parent'
  };
  const regParentRes = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(parentPayload)
  });
  const parentData = await regParentRes.json();
  const parentOk = regParentRes.status === 201 && parentData.user?.role === 'parent' && parentData.user?.status === 'active';
  record('Parent Registration -> status: active', parentOk, `status=${parentData.user?.status}`);
  if (parentData.user?.id) testUsersCreated.push(parentData.user.id);

  // Citizen Registration -> status: active
  const citizenPayload = {
    fullName: `Test Citizen ${ts}`,
    email: `p1.citizen.${ts}@example.com`,
    phone: `922${String(ts).slice(-7)}`,
    password: 'SecurePass123!',
    role: 'citizen'
  };
  const regCitizenRes = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(citizenPayload)
  });
  const citizenData = await regCitizenRes.json();
  const citizenOk = regCitizenRes.status === 201 && citizenData.user?.role === 'citizen' && citizenData.user?.status === 'active';
  record('Citizen Registration -> status: active', citizenOk, `status=${citizenData.user?.status}`);
  if (citizenData.user?.id) testUsersCreated.push(citizenData.user.id);

  // Police Registration -> status: pending
  const policePayload = {
    fullName: `Officer Sharma ${ts}`,
    email: `p1.police.${ts}@delhipolice.gov.in`,
    phone: `923${String(ts).slice(-7)}`,
    password: 'SecurePass123!',
    role: 'police',
    organization: 'Central Delhi Police Headquarters',
    city: 'New Delhi',
    state: 'Delhi'
  };
  const regPoliceRes = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(policePayload)
  });
  const policeData = await regPoliceRes.json();
  const policeOk = regPoliceRes.status === 201 &&
    policeData.user?.role === 'police' &&
    policeData.user?.status === 'pending' &&
    policeData.user?.organization === policePayload.organization;
  record('Police Registration -> status: pending with Org data', policeOk, `status=${policeData.user?.status}, org=${policeData.user?.organization}`);
  if (policeData.user?.id) testUsersCreated.push(policeData.user.id);

  // NGO Registration -> status: pending
  const ngoPayload = {
    fullName: `Shelter Care Director ${ts}`,
    email: `p1.ngo.${ts}@childwelfare.org`,
    phone: `924${String(ts).slice(-7)}`,
    password: 'SecurePass123!',
    role: 'ngo',
    organization: 'Bachpan Bachao Care Home',
    city: 'New Delhi',
    state: 'Delhi'
  };
  const regNgoRes = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(ngoPayload)
  });
  const ngoData = await regNgoRes.json();
  const ngoOk = regNgoRes.status === 201 &&
    ngoData.user?.role === 'ngo' &&
    ngoData.user?.status === 'pending' &&
    ngoData.user?.organization === ngoPayload.organization;
  record('NGO Registration -> status: pending with Org data', ngoOk, `status=${ngoData.user?.status}, org=${ngoData.user?.organization}`);
  if (ngoData.user?.id) testUsersCreated.push(ngoData.user.id);

  // Public Admin Registration -> BLOCKED
  const adminPayload = {
    fullName: `Malicious Admin ${ts}`,
    email: `p1.hacker.${ts}@evil.com`,
    phone: `925${String(ts).slice(-7)}`,
    password: 'SecurePass123!',
    role: 'admin'
  };
  const regAdminRes = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(adminPayload)
  });
  const adminRegData = await regAdminRes.json();
  const adminBlocked = regAdminRes.status === 403 && adminRegData.code === 'ADMIN_REGISTRATION_FORBIDDEN';
  record('Public Admin Registration Blocked (403)', adminBlocked, `code=${adminRegData.code}`);

  // Duplicate email handling
  const dupEmailRes = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      ...parentPayload,
      phone: `926${String(ts).slice(-7)}`
    })
  });
  const dupEmailData = await dupEmailRes.json();
  const dupEmailOk = dupEmailRes.status === 400 && dupEmailData.code === 'DUPLICATE_ACCOUNT';
  record('Duplicate Email Validation (No Mongo Error Leak)', dupEmailOk, `status=${dupEmailRes.status}, code=${dupEmailData.code}`);

  // =========================================================================
  // 2. ADMIN AUTHENTICATION & USER MANAGEMENT INSPECTION
  // =========================================================================
  console.log('\n>>> SECTION 2: Admin Inspection & Sensitive Data Sanitization');

  const adminAuth = await loginUser(adminEmail, adminPass);
  const adminCookie = adminAuth.cookie;
  if (!adminCookie) {
    throw new Error('Admin login failed; cannot proceed with admin tests.');
  }

  // Admin retrieves user list
  const listRes = await apiFetch('/api/admin/users', {
    headers: { Cookie: adminCookie }
  });
  const listData = await listRes.json();
  const canListUsers = listRes.status === 200 && Array.isArray(listData.users) && listData.users.length > 0;
  record('Admin User List Retrieval', canListUsers, `Total Users: ${listData.users?.length}`);

  // Admin verifies safe data (no passwordHash, no session secrets)
  const usersWithHash = (listData.users || []).filter(u => u.passwordHash || u.salt || u.__v !== undefined);
  record('Admin API Excludes Sensitive Fields (passwordHash, salt, __v)', usersWithHash.length === 0, `Violations: ${usersWithHash.length}`);

  // Admin inspects police user details
  const policeUserId = policeData.user.id;
  const getPoliceRes = await apiFetch(`/api/admin/users/${policeUserId}`, {
    headers: { Cookie: adminCookie }
  });
  const getPoliceData = await getPoliceRes.json();
  const inspectPoliceOk = getPoliceRes.status === 200 &&
    getPoliceData.user?.role === 'police' &&
    getPoliceData.user?.status === 'pending' &&
    getPoliceData.user?.organization === policePayload.organization;
  record('Admin Inspects Police Details', inspectPoliceOk, `Role: ${getPoliceData.user?.role}, Status: ${getPoliceData.user?.status}`);

  // Admin inspects NGO user details
  const ngoUserId = ngoData.user.id;
  const getNgoRes = await apiFetch(`/api/admin/users/${ngoUserId}`, {
    headers: { Cookie: adminCookie }
  });
  const getNgoData = await getNgoRes.json();
  const inspectNgoOk = getNgoRes.status === 200 &&
    getNgoData.user?.role === 'ngo' &&
    getNgoData.user?.status === 'pending' &&
    getNgoData.user?.organization === ngoPayload.organization;
  record('Admin Inspects NGO Details', inspectNgoOk, `Role: ${getNgoData.user?.role}, Status: ${getNgoData.user?.status}`);

  // =========================================================================
  // 3. ADMIN APPROVAL WORKFLOW
  // =========================================================================
  console.log('\n>>> SECTION 3: Admin Approval Workflow (pending -> approved)');

  // Admin approves Police user
  const approvePoliceRes = await apiFetch(`/api/admin/users/${policeUserId}/approve`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie }
  });
  const approvePoliceData = await approvePoliceRes.json();
  const approvePoliceOk = approvePoliceRes.status === 200 &&
    approvePoliceData.user?.status === 'approved' &&
    approvePoliceData.user?.isVerified === true;
  record('Admin Approves Police User (pending -> approved)', approvePoliceOk, `status=${approvePoliceData.user?.status}`);

  // Admin approves NGO user
  const approveNgoRes = await apiFetch(`/api/admin/users/${ngoUserId}/approve`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie }
  });
  const approveNgoData = await approveNgoRes.json();
  const approveNgoOk = approveNgoRes.status === 200 &&
    approveNgoData.user?.status === 'approved' &&
    approveNgoData.user?.isVerified === true;
  record('Admin Approves NGO User (pending -> approved)', approveNgoOk, `status=${approveNgoData.user?.status}`);

  // =========================================================================
  // 4. ADMIN REJECTION WORKFLOW
  // =========================================================================
  console.log('\n>>> SECTION 4: Admin Rejection Workflow (pending -> rejected)');

  // Register another Police and NGO for rejection testing
  const regPolice2 = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: `Reject Police ${ts}`,
      email: `p1.police.rej.${ts}@delhipolice.gov.in`,
      phone: `927${String(ts).slice(-7)}`,
      password: 'SecurePass123!',
      role: 'police',
      organization: 'Invalid Police Division'
    })
  });
  const police2Data = await regPolice2.json();
  const police2Id = police2Data.user?.id;
  if (police2Id) testUsersCreated.push(police2Id);

  const regNgo2 = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: `Reject NGO ${ts}`,
      email: `p1.ngo.rej.${ts}@childwelfare.org`,
      phone: `928${String(ts).slice(-7)}`,
      password: 'SecurePass123!',
      role: 'ngo',
      organization: 'Unverified Shelter'
    })
  });
  const ngo2Data = await regNgo2.json();
  const ngo2Id = ngo2Data.user?.id;
  if (ngo2Id) testUsersCreated.push(ngo2Id);

  // Admin rejects Police with reason
  const rejectPoliceRes = await apiFetch(`/api/admin/users/${police2Id}/reject`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ rejectionReason: 'Official badge ID not verified with state records.' })
  });
  const rejectPoliceData = await rejectPoliceRes.json();
  const rejectPoliceOk = rejectPoliceRes.status === 200 &&
    rejectPoliceData.user?.status === 'rejected' &&
    rejectPoliceData.user?.isVerified === false &&
    rejectPoliceData.user?.rejectionReason === 'Official badge ID not verified with state records.';
  record('Admin Rejects Police User with Reason (pending -> rejected)', rejectPoliceOk, `reason=${rejectPoliceData.user?.rejectionReason}`);

  // Admin rejects NGO with reason
  const rejectNgoRes = await apiFetch(`/api/admin/users/${ngo2Id}/reject`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ rejectionReason: 'Child welfare shelter registration certificate expired.' })
  });
  const rejectNgoData = await rejectNgoRes.json();
  const rejectNgoOk = rejectNgoRes.status === 200 &&
    rejectNgoData.user?.status === 'rejected' &&
    rejectNgoData.user?.isVerified === false &&
    rejectNgoData.user?.rejectionReason === 'Child welfare shelter registration certificate expired.';
  record('Admin Rejects NGO User with Reason (pending -> rejected)', rejectNgoOk, `reason=${rejectNgoData.user?.rejectionReason}`);

  // =========================================================================
  // 5. AUTHORIZATION & PRIVILEGE ESCALATION SECURITY
  // =========================================================================
  console.log('\n>>> SECTION 5: Approval Authorization & Privilege Escalation Security');

  // Anonymous request to approve endpoint -> 401
  const anonApproveRes = await apiFetch(`/api/admin/users/${police2Id}/approve`, {
    method: 'PATCH'
  });
  record('Anonymous Call to Admin Approve Blocked (401)', anonApproveRes.status === 401, `Status: ${anonApproveRes.status}`);

  // Parent login & attempt to approve -> 403
  const parentAuth = await loginUser(parentPayload.email, parentPayload.password);
  const parentApproveRes = await apiFetch(`/api/admin/users/${police2Id}/approve`, {
    method: 'PATCH',
    headers: { Cookie: parentAuth.cookie }
  });
  record('Parent Cannot Approve User (403 Forbidden)', parentApproveRes.status === 403, `Status: ${parentApproveRes.status}`);

  // Citizen login & attempt to approve -> 403
  const citizenAuth = await loginUser(citizenPayload.email, citizenPayload.password);
  const citizenApproveRes = await apiFetch(`/api/admin/users/${police2Id}/approve`, {
    method: 'PATCH',
    headers: { Cookie: citizenAuth.cookie }
  });
  record('Citizen Cannot Approve User (403 Forbidden)', citizenApproveRes.status === 403, `Status: ${citizenApproveRes.status}`);

  // Police user attempting self-approval or approving another user -> 403
  const policeAuth = await loginUser(policePayload.email, policePayload.password);
  const policeApproveRes = await apiFetch(`/api/admin/users/${police2Id}/approve`, {
    method: 'PATCH',
    headers: { Cookie: policeAuth.cookie }
  });
  record('Police Cannot Approve Other Police (403 Forbidden)', policeApproveRes.status === 403, `Status: ${policeApproveRes.status}`);

  // NGO user attempting to approve another user -> 403
  const ngoAuth = await loginUser(ngoPayload.email, ngoPayload.password);
  const ngoApproveRes = await apiFetch(`/api/admin/users/${ngo2Id}/approve`, {
    method: 'PATCH',
    headers: { Cookie: ngoAuth.cookie }
  });
  record('NGO Cannot Approve Accounts (403 Forbidden)', ngoApproveRes.status === 403, `Status: ${ngoApproveRes.status}`);

  // Self-approval test: Police user attempting to call approve on themselves
  const policeSelfApprove = await apiFetch(`/api/admin/users/${policeUserId}/approve`, {
    method: 'PATCH',
    headers: { Cookie: policeAuth.cookie }
  });
  record('Self-Approval Blocked (403 Forbidden)', policeSelfApprove.status === 403, `Status: ${policeSelfApprove.status}`);

  // Privilege Escalation: Public profile endpoints do NOT allow changing role or status
  // Parent trying to PATCH /api/auth/me or nonexistent update to become admin
  const escalateRes = await apiFetch('/api/auth/me', {
    method: 'PATCH',
    headers: { Cookie: parentAuth.cookie },
    body: JSON.stringify({ role: 'admin', status: 'approved' })
  });
  // Since route does not exist or method not allowed, should be 404 or 405
  record('Normal User Cannot Escalate Role Via Auth Endpoints', escalateRes.status === 404 || escalateRes.status === 405, `Status: ${escalateRes.status}`);

  // =========================================================================
  // 6. SYSTEM ADMIN ACCIDENTAL DEMOTION / DESTRUCTION PROTECTION
  // =========================================================================
  console.log('\n>>> SECTION 6: System Admin Protection Guardrails');

  const adminUserId = adminAuth.data.user.id;

  // Admin trying to suspend themselves -> 400 SELF_SUSPENSION_FORBIDDEN
  const selfSuspendRes = await apiFetch(`/api/admin/users/${adminUserId}/suspend`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ reason: 'Accidental self-lockout' })
  });
  const selfSuspendData = await selfSuspendRes.json();
  const selfSuspendBlocked = selfSuspendRes.status === 400 && selfSuspendData.code === 'SELF_SUSPENSION_FORBIDDEN';
  record('Admin Self-Suspension Blocked (400 SELF_SUSPENSION_FORBIDDEN)', selfSuspendBlocked, `code=${selfSuspendData.code}`);

  // Admin trying to demote themselves -> 400 SELF_DEMOTION_FORBIDDEN
  const selfDemoteRes = await apiFetch(`/api/admin/users/${adminUserId}/role`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ role: 'citizen' })
  });
  const selfDemoteData = await selfDemoteRes.json();
  const selfDemoteBlocked = selfDemoteRes.status === 400 && selfDemoteData.code === 'SELF_DEMOTION_FORBIDDEN';
  record('Admin Self-Demotion Blocked (400 SELF_DEMOTION_FORBIDDEN)', selfDemoteBlocked, `code=${selfDemoteData.code}`);

  // Admin trying to reject an admin account -> 403 ADMIN_MODIFICATION_FORBIDDEN
  const adminRejectRes = await apiFetch(`/api/admin/users/${adminUserId}/reject`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie }
  });
  const adminRejectData = await adminRejectRes.json();
  const adminRejectBlocked = adminRejectRes.status === 403 && adminRejectData.code === 'ADMIN_MODIFICATION_FORBIDDEN';
  record('Admin Rejection Guard Blocked (403 ADMIN_MODIFICATION_FORBIDDEN)', adminRejectBlocked, `code=${adminRejectData.code}`);

  // Admin trying to suspend an admin account -> 403 ADMIN_MODIFICATION_FORBIDDEN (tested via direct target)
  // Let's create a temporary second admin in DB to test Admin A modifying Admin B
  const adminB = new User({
    name: 'Secondary Admin',
    email: `p1.admin.b.${ts}@guardianlink.local`,
    phone: `929${String(ts).slice(-7)}`,
    passwordHash: 'dummyHashForSecurityCheck',
    role: 'admin',
    status: 'active',
    isActive: true,
    isVerified: true
  });
  await adminB.save();
  testUsersCreated.push(adminB._id.toString());

  // Admin A attempts to demote Admin B to citizen
  const demoteBRes = await apiFetch(`/api/admin/users/${adminB._id}/role`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ role: 'citizen' })
  });
  const demoteBData = await demoteBRes.json();
  const demoteBBlocked = demoteBRes.status === 403 && demoteBData.code === 'ADMIN_DEMOTION_FORBIDDEN';
  record('System Admin Demotion Guard Blocked (403 ADMIN_DEMOTION_FORBIDDEN)', demoteBBlocked, `code=${demoteBData.code}`);

  // Admin A attempts to suspend Admin B
  const suspendBRes = await apiFetch(`/api/admin/users/${adminB._id}/suspend`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie }
  });
  const suspendBData = await suspendBRes.json();
  const suspendBBlocked = suspendBRes.status === 403 && suspendBData.code === 'ADMIN_MODIFICATION_FORBIDDEN';
  record('System Admin Suspension Guard Blocked (403 ADMIN_MODIFICATION_FORBIDDEN)', suspendBBlocked, `code=${suspendBData.code}`);

  // =========================================================================
  // 7. CLEANUP
  // =========================================================================
  console.log('\n>>> SECTION 7: Test Cleanup');
  if (testUsersCreated.length > 0) {
    const delRes = await User.deleteMany({ _id: { $in: testUsersCreated.map(id => new mongoose.Types.ObjectId(id)) } });
    console.log(`  🧹 Deleted ${delRes.deletedCount} temporary test users from MongoDB.`);
  }

  for (const uid of testSessionsCreated) {
    await redis.del(`session:${uid}`);
  }
  console.log(`  🧹 Invalidated ${testSessionsCreated.length} temporary Redis test sessions.`);

  await mongoose.disconnect();
  await redis.quit();

  // Print Summary
  console.log('\n==================================================================');
  console.log('            PHASE 1 VERIFICATION TEST SUITE SUMMARY');
  console.log('==================================================================');
  console.table(testResults);

  const failedTests = testResults.filter(t => t.status === 'FAIL');
  if (failedTests.length === 0) {
    console.log(`\n🎉 ALL ${testResults.length} PHASE 1 VERIFICATION TESTS PASSED!\n`);
    process.exit(0);
  } else {
    console.error(`\n❌ ${failedTests.length} TEST(S) FAILED.\n`);
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('\n❌ Test Suite Aborted with Unhandled Exception:', err);
  process.exit(1);
});
