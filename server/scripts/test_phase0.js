const mongoose = require('mongoose');
const { createClient } = require('redis');

const API_BASE = 'http://localhost:5000';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/guardianlink';
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

const ts = Date.now();

const TEST_USERS = {
  parent: {
    fullName: `Phase0 Parent ${ts}`,
    email: `phase0.parent.${ts}@example.com`,
    phone: `91000${String(ts).slice(-5)}1`,
    password: 'Password123!',
    role: 'parent'
  },
  citizen: {
    fullName: `Phase0 Citizen ${ts}`,
    email: `phase0.citizen.${ts}@example.com`,
    phone: `91000${String(ts).slice(-5)}2`,
    password: 'Password123!',
    role: 'citizen'
  },
  police: {
    fullName: `Phase0 Officer ${ts}`,
    email: `phase0.police.${ts}@delhipolice.gov.in`,
    phone: `91000${String(ts).slice(-5)}3`,
    password: 'PolicePass2026!',
    role: 'police'
  },
  ngo: {
    fullName: `Phase0 NGO Care ${ts}`,
    email: `phase0.ngo.${ts}@childshelter.org`,
    phone: `91000${String(ts).slice(-5)}4`,
    password: 'NgoPass2026!',
    role: 'ngo'
  }
};

const results = [];

function record(name, passed, details = '') {
  results.push({ test: name, status: passed ? 'PASS' : 'FAIL', details });
  if (passed) {
    console.log(`✓ [PASS] ${name}${details ? ` (${details})` : ''}`);
  } else {
    console.error(`✗ [FAIL] ${name}${details ? ` (${details})` : ''}`);
  }
}

// Wrapper for fetch that passes standard headers and bypasses test rate limiting
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'x-test-suite': 'true',
    ...(options.headers || {})
  };
  return fetch(url, { ...options, headers });
}

async function runPhase0Suite() {
  console.log('==================================================================');
  console.log('       GUARDIANLINK PHASE 0: STABILIZATION & BASELINE VERIFICATION');
  console.log('==================================================================\n');

  // Connect directly to DB and Redis for low-level verification & cleanup
  await mongoose.connect(MONGO_URI);
  console.log('🍃 Connected to MongoDB:', MONGO_URI);

  const redisClient = createClient({ url: REDIS_URL });
  await redisClient.connect();
  console.log('⚡ Connected to Redis:', REDIS_URL);

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const createdUserIds = [];

  try {
    // -------------------------------------------------------------
    // SECTION 1: INFRASTRUCTURE & STARTUP
    // -------------------------------------------------------------
    console.log('\n--- 1. Infrastructure & Startup ---');
    try {
      const healthRes = await apiFetch('/api/health');
      const healthData = await healthRes.json();
      record('Backend Startup & Health Endpoint', healthRes.status === 200 && healthData.success, `Status: ${healthRes.status}`);
    } catch (err) {
      record('Backend Startup & Health Endpoint', false, err.message);
    }

    try {
      const pingResult = await redisClient.ping();
      record('Redis Connectivity', pingResult === 'PONG', `Ping response: ${pingResult}`);
    } catch (err) {
      record('Redis Connectivity', false, err.message);
    }

    try {
      const dbState = mongoose.connection.readyState;
      record('MongoDB Connectivity', dbState === 1, `Ready state: ${dbState}`);
    } catch (err) {
      record('MongoDB Connectivity', false, err.message);
    }

    // -------------------------------------------------------------
    // SECTION 2: USER REGISTRATION & MONGO PERSISTENCE (ALL 4 ROLES)
    // -------------------------------------------------------------
    console.log('\n--- 2. User Registration & Default Roles/Statuses ---');

    for (const [roleName, userData] of Object.entries(TEST_USERS)) {
      try {
        const regRes = await apiFetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(userData)
        });
        const regData = await regRes.json();

        if (regRes.status !== 201 || !regData.success) {
          throw new Error(`Register failed (${regRes.status}): ${JSON.stringify(regData)}`);
        }

        const userId = regData.user.id || regData.user._id;
        createdUserIds.push(userId);

        // Verify in MongoDB
        const mongoUser = await User.findById(userId);
        if (!mongoUser) throw new Error('User not found in MongoDB after registration!');

        // Check password hashing
        const pwHash = mongoUser.get('passwordHash');
        const isBcrypt = pwHash && pwHash.startsWith('$2') && pwHash.length > 50;
        const noPlaintext = pwHash !== userData.password;

        // Check role and status
        const roleMatch = mongoUser.get('role') === roleName;
        const expectedStatus = (roleName === 'police' || roleName === 'ngo') ? 'pending' : 'active';
        const statusMatch = mongoUser.get('status') === expectedStatus;

        // Check no password in API response
        const noPwInRes = !regData.user.password && !regData.user.passwordHash;

        record(`${roleName.toUpperCase()} Registration & Storage`, isBcrypt && noPlaintext && roleMatch && statusMatch && noPwInRes,
          `Role: ${mongoUser.get('role')}, Status: ${mongoUser.get('status')}, Hash Verified: ${isBcrypt}`);
      } catch (err) {
        record(`${roleName.toUpperCase()} Registration & Storage`, false, err.message);
      }
    }

    // Test rejection of Admin registration
    try {
      const adminRegRes = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Fake Admin Attack',
          email: `fake.admin.${ts}@example.com`,
          phone: `91000${String(ts).slice(-5)}9`,
          password: 'Password123!',
          role: 'admin'
        })
      });
      record('Admin Public Registration Blocked', adminRegRes.status === 403, `HTTP Status: ${adminRegRes.status} (Expected 403)`);
    } catch (err) {
      record('Admin Public Registration Blocked', false, err.message);
    }

    // -------------------------------------------------------------
    // SECTION 3: VALIDATION & DUPLICATE CHECKS
    // -------------------------------------------------------------
    console.log('\n--- 3. Validation & Negative Tests ---');
    try {
      const dupEmailRes = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Duplicate Email Person',
          email: TEST_USERS.parent.email,
          phone: `91999${String(ts).slice(-5)}0`,
          password: 'Password123!',
          role: 'parent'
        })
      });
      record('Duplicate Email Rejected', dupEmailRes.status === 400, `HTTP Status: ${dupEmailRes.status}`);
    } catch (err) {
      record('Duplicate Email Rejected', false, err.message);
    }

    try {
      const dupPhoneRes = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Duplicate Phone Person',
          email: `unique.phone.${ts}@example.com`,
          phone: TEST_USERS.parent.phone,
          password: 'Password123!',
          role: 'parent'
        })
      });
      record('Duplicate Phone Rejected', dupPhoneRes.status === 400, `HTTP Status: ${dupPhoneRes.status}`);
    } catch (err) {
      record('Duplicate Phone Rejected', false, err.message);
    }

    try {
      const shortPwRes = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Short PW',
          email: `shortpw.${ts}@example.com`,
          phone: `91999${String(ts).slice(-5)}1`,
          password: '123',
          role: 'parent'
        })
      });
      record('Short Password Rejected', shortPwRes.status === 400, `HTTP Status: ${shortPwRes.status}`);
    } catch (err) {
      record('Short Password Rejected', false, err.message);
    }

    // -------------------------------------------------------------
    // SECTION 4: LOGIN & CREDENTIAL VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- 4. Login & Authentication Flow ---');

    // Wrong password test
    try {
      const wrongPwRes = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: TEST_USERS.parent.email,
          password: 'WrongPassword999!'
        })
      });
      record('Wrong Password Rejected (401)', wrongPwRes.status === 401, `Status: ${wrongPwRes.status}`);
    } catch (err) {
      record('Wrong Password Rejected (401)', false, err.message);
    }

    // Unknown user test
    try {
      const unknownRes = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'nonexistent.user.999@example.com',
          password: 'Password123!'
        })
      });
      record('Unknown User Rejected (401)', unknownRes.status === 401, `Status: ${unknownRes.status}`);
    } catch (err) {
      record('Unknown User Rejected (401)', false, err.message);
    }

    // Successful login for Parent
    let parentCookie = null;
    let parentUserId = null;
    try {
      const loginRes = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: TEST_USERS.parent.email,
          password: TEST_USERS.parent.password
        })
      });
      const loginData = await loginRes.json();
      parentUserId = loginData.user?.id || loginData.user?._id;

      // Check cookie headers
      const setCookie = loginRes.headers.get('set-cookie');
      const isHttpOnly = setCookie && setCookie.includes('HttpOnly');
      const isLax = setCookie && setCookie.toLowerCase().includes('samesite=lax');
      const tokenMatch = setCookie ? setCookie.match(/guardianlink_token=([^;]+)/) : null;
      parentCookie = tokenMatch ? `guardianlink_token=${tokenMatch[1]}` : null;

      // Check Redis session
      const redisSession = await redisClient.get(`session:${parentUserId}`);
      const parsedSession = redisSession ? JSON.parse(redisSession) : null;

      record('Parent Login & Cookie Specs', loginRes.status === 200 && isHttpOnly && isLax && !!parentCookie,
        `HttpOnly: ${isHttpOnly}, SameSite: Lax, Cookie established`);
      record('Redis Session Created', !!parsedSession && parsedSession.userId === parentUserId,
        `Key session:${parentUserId} verified in Redis`);
    } catch (err) {
      record('Parent Login & Cookie Specs', false, err.message);
      record('Redis Session Created', false, err.message);
    }

    // -------------------------------------------------------------
    // SECTION 5: /api/auth/me & SESSION VALIDATION
    // -------------------------------------------------------------
    console.log('\n--- 5. Session Verification & /api/auth/me Cases ---');

    // Case A: Authenticated user
    try {
      const meRes = await apiFetch('/api/auth/me', {
        headers: { Cookie: parentCookie }
      });
      const meData = await meRes.json();
      const userOk = meRes.status === 200 && meData.user && meData.user.email === TEST_USERS.parent.email;
      const noSecrets = !meData.user?.password && !meData.user?.passwordHash && !meData.user?.__v;
      record('Case A: Authenticated /me Valid', userOk && noSecrets, `User: ${meData.user?.email}`);
    } catch (err) {
      record('Case A: Authenticated /me Valid', false, err.message);
    }

    // Case B: No cookie
    try {
      const noCookieRes = await apiFetch('/api/auth/me');
      record('Case B: No Cookie -> 401', noCookieRes.status === 401, `Status: ${noCookieRes.status}`);
    } catch (err) {
      record('Case B: No Cookie -> 401', false, err.message);
    }

    // Case C: Tampered / Invalid cookie
    try {
      const tamperedRes = await apiFetch('/api/auth/me', {
        headers: { Cookie: 'guardianlink_token=invalid.tampered.signature' }
      });
      record('Case C: Tampered Cookie -> 401', tamperedRes.status === 401, `Status: ${tamperedRes.status}`);
    } catch (err) {
      record('Case C: Tampered Cookie -> 401', false, err.message);
    }

    // Case D: JWT valid cryptographically but Redis session deleted
    try {
      // Temporarily remove Redis session key
      await redisClient.del(`session:${parentUserId}`);
      const noRedisRes = await apiFetch('/api/auth/me', {
        headers: { Cookie: parentCookie }
      });
      const noRedisData = await noRedisRes.json();
      record('Case D: Missing Redis Session -> 401', noRedisRes.status === 401 && noRedisData.code === 'SESSION_EXPIRED',
        `Status: ${noRedisRes.status}, Code: ${noRedisData.code}`);

      // Restore Redis session so we can test logout cleanly
      await redisClient.set(`session:${parentUserId}`, JSON.stringify({
        userId: parentUserId,
        role: 'parent',
        token: parentCookie.split('=')[1],
        lastActive: new Date().toISOString()
      }), { EX: 604800 });
    } catch (err) {
      record('Case D: Missing Redis Session -> 401', false, err.message);
    }

    // -------------------------------------------------------------
    // SECTION 6: LOGOUT LIFECYCLE
    // -------------------------------------------------------------
    console.log('\n--- 6. Logout & Session Invalidation ---');
    try {
      const logoutRes = await apiFetch('/api/auth/logout', {
        method: 'POST',
        headers: { Cookie: parentCookie }
      });
      const logoutData = await logoutRes.json();
      const logoutStatus = logoutRes.status === 200 && logoutData.success;

      // Verify Redis session is gone
      const redisSessionAfter = await redisClient.get(`session:${parentUserId}`);
      const redisCleaned = !redisSessionAfter;

      // Verify old cookie rejected now
      const postLogoutMe = await apiFetch('/api/auth/me', {
        headers: { Cookie: parentCookie }
      });
      const postLogoutBlocked = postLogoutMe.status === 401;

      record('Logout Endpoint & Redis Cleanup', logoutStatus && redisCleaned, `Redis key deleted: ${redisCleaned}`);
      record('Old Session Inaccessible Post-Logout', postLogoutBlocked, `Status: ${postLogoutMe.status}`);
    } catch (err) {
      record('Logout Endpoint & Redis Cleanup', false, err.message);
      record('Old Session Inaccessible Post-Logout', false, err.message);
    }

    // -------------------------------------------------------------
    // SECTION 7: SUSPENDED / DEACTIVATED ACCOUNT ENFORCEMENT
    // -------------------------------------------------------------
    console.log('\n--- 7. Suspended / Deactivated Account Enforcement ---');
    try {
      // Create user and suspend directly in Mongo
      const susUser = new User({
        name: 'Suspended Test User',
        email: `suspended.${ts}@example.com`,
        phone: `91888${String(ts).slice(-5)}1`,
        passwordHash: '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRpH1xK1sR.7v9H8uKx8L9b0u8vWe', // 'Password123!'
        role: 'parent',
        status: 'suspended'
      });
      await susUser.save();
      createdUserIds.push(susUser._id.toString());

      const susLoginRes = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: susUser.get('email'),
          password: 'Password123!'
        })
      });
      record('Suspended Account Login Blocked (403)', susLoginRes.status === 403, `Status: ${susLoginRes.status}`);
    } catch (err) {
      record('Suspended Account Login Blocked (403)', false, err.message);
    }

    try {
      // Create user and deactivate directly in Mongo
      const deactUser = new User({
        name: 'Deactivated Test User',
        email: `deactivated.${ts}@example.com`,
        phone: `91888${String(ts).slice(-5)}2`,
        passwordHash: '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRpH1xK1sR.7v9H8uKx8L9b0u8vWe',
        role: 'parent',
        status: 'deactivated'
      });
      await deactUser.save();
      createdUserIds.push(deactUser._id.toString());

      const deactLoginRes = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: deactUser.get('email'),
          password: 'Password123!'
        })
      });
      record('Deactivated Account Login Blocked (403)', deactLoginRes.status === 403, `Status: ${deactLoginRes.status}`);
    } catch (err) {
      record('Deactivated Account Login Blocked (403)', false, err.message);
    }

    // -------------------------------------------------------------
    // SECTION 8: FULL RBAC COMBINATIONS & BACKEND GUARDS
    // -------------------------------------------------------------
    console.log('\n--- 8. Full RBAC Matrix Verification ---');

    // Helper to log in a user and get cookie
    async function getCookieFor(email, password) {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: email, password })
      });
      if (res.status !== 200) {
        const text = await res.text();
        throw new Error(`Login failed for ${email} with status ${res.status}: ${text}`);
      }
      const setCookie = res.headers.get('set-cookie');
      if (!setCookie) {
        throw new Error(`No set-cookie header received for ${email}`);
      }
      const match = setCookie.match(/guardianlink_token=([^;]+)/);
      if (!match) {
        throw new Error(`guardianlink_token not found in set-cookie for ${email}: ${setCookie}`);
      }
      return `guardianlink_token=${match[1]}`;
    }

    const parentCk = await getCookieFor(TEST_USERS.parent.email, TEST_USERS.parent.password);
    const citizenCk = await getCookieFor(TEST_USERS.citizen.email, TEST_USERS.citizen.password);
    const policeCk = await getCookieFor(TEST_USERS.police.email, TEST_USERS.police.password);
    const ngoCk = await getCookieFor(TEST_USERS.ngo.email, TEST_USERS.ngo.password);
    const adminCk = await getCookieFor('admin@guardianlink.local', 'AdminDev@GuardianLink2026!');

    // Test parent -> admin
    const pAdmin = await apiFetch('/api/admin/users', { headers: { Cookie: parentCk } });
    record('RBAC: Parent -> /api/admin/users (403)', pAdmin.status === 403, `Status: ${pAdmin.status}`);

    // Test citizen -> admin
    const cAdmin = await apiFetch('/api/admin/users', { headers: { Cookie: citizenCk } });
    record('RBAC: Citizen -> /api/admin/users (403)', cAdmin.status === 403, `Status: ${cAdmin.status}`);

    // Test police -> admin
    const polAdmin = await apiFetch('/api/admin/users', { headers: { Cookie: policeCk } });
    record('RBAC: Police -> /api/admin/users (403)', polAdmin.status === 403, `Status: ${polAdmin.status}`);

    // Test ngo -> admin
    const nAdmin = await apiFetch('/api/admin/users', { headers: { Cookie: ngoCk } });
    record('RBAC: NGO -> /api/admin/users (403)', nAdmin.status === 403, `Status: ${nAdmin.status}`);

    // Test admin -> admin
    const aAdmin = await apiFetch('/api/admin/users', { headers: { Cookie: adminCk } });
    const aData = await aAdmin.json();
    record('RBAC: Admin -> /api/admin/users (200 Authorized)', aAdmin.status === 200 && aData.success, `Count: ${aData.count}`);

    // -------------------------------------------------------------
    // SECTION 9: ADMIN APPROVAL WORKFLOW
    // -------------------------------------------------------------
    console.log('\n--- 9. Admin Approval & Moderation Actions ---');
    try {
      const policeUser = await User.findOne({ email: TEST_USERS.police.email });
      const policeUserId = policeUser._id.toString();

      // Approve police officer
      const approveRes = await apiFetch(`/api/admin/users/${policeUserId}/approve`, {
        method: 'PATCH',
        headers: { Cookie: adminCk }
      });
      const approveData = await approveRes.json();
      const isApproved = approveRes.status === 200 && approveData.user.status === 'approved';
      record('Admin Approves Police User', isApproved, `New Status: ${approveData.user?.status}`);

      // Suspend police officer
      const susRes = await apiFetch(`/api/admin/users/${policeUserId}/suspend`, {
        method: 'PATCH',
        headers: { Cookie: adminCk }
      });
      const susData = await susRes.json();
      record('Admin Suspends User', susRes.status === 200 && susData.user.status === 'suspended', `Status: ${susData.user?.status}`);

      // Activate police officer back
      const actRes = await apiFetch(`/api/admin/users/${policeUserId}/activate`, {
        method: 'PATCH',
        headers: { Cookie: adminCk }
      });
      const actData = await actRes.json();
      record('Admin Re-activates User', actRes.status === 200 && actData.user.status === 'approved', `Status: ${actData.user?.status}`);
    } catch (err) {
      record('Admin Approval & Moderation Actions', false, err.message);
    }

    // Clean up sessions for test users
    await apiFetch('/api/auth/logout', { method: 'POST', headers: { Cookie: parentCk } });
    await apiFetch('/api/auth/logout', { method: 'POST', headers: { Cookie: citizenCk } });
    await apiFetch('/api/auth/logout', { method: 'POST', headers: { Cookie: policeCk } });
    await apiFetch('/api/auth/logout', { method: 'POST', headers: { Cookie: ngoCk } });
    await apiFetch('/api/auth/logout', { method: 'POST', headers: { Cookie: adminCk } });

  } finally {
    // -------------------------------------------------------------
    // AUTOMATED TEST DATA CLEANUP
    // -------------------------------------------------------------
    console.log('\n--- Cleaning up temporary Phase 0 test records ---');
    if (createdUserIds.length > 0) {
      const delResult = await User.deleteMany({ _id: { $in: createdUserIds } });
      console.log(`🧹 Cleaned up ${delResult.deletedCount} temporary test users from MongoDB.`);
      for (const uid of createdUserIds) {
        await redisClient.del(`session:${uid}`);
      }
      console.log('🧹 Cleaned up corresponding test Redis session keys.');
    }

    await redisClient.quit();
    await mongoose.disconnect();
  }

  // -------------------------------------------------------------
  // FINAL REPORT
  // -------------------------------------------------------------
  console.log('\n==================================================================');
  console.log('                   PHASE 0 TEST SUITE SUMMARY');
  console.log('==================================================================');
  console.table(results);

  const failedCount = results.filter(r => r.status === 'FAIL').length;
  if (failedCount === 0) {
    console.log(`\n🎉 ALL ${results.length} TESTS PASSED! Phase 0 Baseline is 100% Stable & Verified.\n`);
    process.exit(0);
  } else {
    console.error(`\n❌ ${failedCount} OF ${results.length} TESTS FAILED!\n`);
    process.exit(1);
  }
}

runPhase0Suite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
