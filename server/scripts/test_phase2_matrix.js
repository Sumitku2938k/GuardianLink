const { createClient } = require('redis');
const mongoose = require('mongoose');
const { User } = require('../models');

const API_BASE = 'http://localhost:5000';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/guardianlink';

const ROLES_TEST_DATA = [
  {
    role: 'parent',
    email: 'auth.parent@example.com',
    password: 'Password123!',
    expectedDashboard: '/dashboard'
  },
  {
    role: 'citizen',
    email: 'auth.citizen@example.com',
    password: 'Password123!',
    expectedDashboard: '/citizen/dashboard'
  },
  {
    role: 'police',
    email: 'officer.vikram@delhipolice.gov.in',
    password: 'PoliceOfficerPass2026!',
    expectedDashboard: '/police/dashboard'
  },
  {
    role: 'ngo',
    email: 'ananya.roy@childshelter.org',
    password: 'NgoPassword2026!',
    expectedDashboard: '/ngo/dashboard'
  },
  {
    role: 'admin',
    email: 'admin@guardianlink.local',
    password: 'AdminDev@GuardianLink2026!',
    expectedDashboard: '/admin/dashboard'
  }
];

async function runPhase2Audit() {
  console.log('====================================================');
  console.log('   PHASE 2 AUTHENTICATION & SESSION PERSISTENCE AUDIT');
  console.log('====================================================\n');

  // Connect to Redis to verify sessions directly
  const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379' });
  await redisClient.connect();
  console.log('✓ Connected to Redis at ' + (process.env.REDIS_URL || 'redis://redis:6379'));

  // Connect to MongoDB and ensure test users exist
  await mongoose.connect(MONGO_URI);
  for (let i = 0; i < ROLES_TEST_DATA.length; i++) {
    const item = ROLES_TEST_DATA[i];
    if (item.role === 'admin') continue;
    let existing = await User.findOne({ email: item.email });
    if (!existing) {
      await User.create({
        name: `Auth ${item.role.toUpperCase()}`,
        email: item.email,
        phone: `950000000${i}`,
        passwordHash: item.password,
        role: item.role,
        status: item.role === 'citizen' || item.role === 'parent' ? 'active' : 'approved',
        isVerified: true,
        isActive: true
      });
    } else {
      existing.passwordHash = item.password;
      existing.status = item.role === 'citizen' || item.role === 'parent' ? 'active' : 'approved';
      existing.isActive = true;
      existing.isVerified = true;
      await existing.save();
    }
  }

  let allPassed = true;
  const results = [];

  // TEST 1: Unauthenticated request to /api/auth/me
  try {
    const unauthRes = await fetch(`${API_BASE}/api/auth/me`);
    if (unauthRes.status === 401) {
      console.log('✓ [PASS] Unauthenticated request to /api/auth/me correctly blocked (401)');
      results.push({ test: 'Unauthenticated Block', status: 'PASS' });
    } else {
      console.error(`✗ [FAIL] Unauthenticated request returned status ${unauthRes.status}`);
      results.push({ test: 'Unauthenticated Block', status: 'FAIL' });
      allPassed = false;
    }
  } catch (err) {
    console.error('✗ [FAIL] Error testing unauthenticated access:', err.message);
    allPassed = false;
  }

  // Iterate over each role for full lifecycle: Login -> Refresh (/me) -> Logout -> Post-Logout Check -> Login Again
  for (const userConfig of ROLES_TEST_DATA) {
    console.log(`\n----------------------------------------------------`);
    console.log(`Testing Role: [${userConfig.role.toUpperCase()}] (${userConfig.email})`);
    console.log(`----------------------------------------------------`);

    let cookie = null;
    let userId = null;

    // STEP A: Login
    try {
      const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: userConfig.email,
          password: userConfig.password
        })
      });

      const loginData = await loginRes.json();

      if (loginRes.status !== 200 || !loginData.success) {
        throw new Error(`Login failed with status ${loginRes.status}: ${JSON.stringify(loginData)}`);
      }

      const returnedUser = loginData.user;
      userId = returnedUser.id || returnedUser._id;
      if (returnedUser.role !== userConfig.role) {
        throw new Error(`Role mismatch: expected ${userConfig.role}, got ${returnedUser.role}`);
      }

      // Extract cookie
      const rawCookieHeader = loginRes.headers.get('set-cookie');
      if (!rawCookieHeader) {
        throw new Error('No set-cookie header received from login!');
      }

      const tokenMatch = rawCookieHeader.match(/guardianlink_token=([^;]+)/);
      if (!tokenMatch) {
        throw new Error('guardianlink_token cookie missing in set-cookie header: ' + rawCookieHeader);
      }
      cookie = `guardianlink_token=${tokenMatch[1]}`;

      // Verify Redis session
      const redisSession = await redisClient.get(`session:${userId}`);
      if (!redisSession) {
        throw new Error(`Session key session:${userId} not found in Redis!`);
      }

      console.log(`✓ [PASS] ${userConfig.role} Login successful. Cookie established & Redis session saved.`);
      results.push({ test: `${userConfig.role} Login`, status: 'PASS' });
    } catch (err) {
      console.error(`✗ [FAIL] ${userConfig.role} Login:`, err.message);
      results.push({ test: `${userConfig.role} Login`, status: 'FAIL' });
      allPassed = false;
      continue;
    }

    // STEP B: Browser Refresh simulation (GET /api/auth/me with Cookie)
    try {
      const meRes = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Cookie: cookie }
      });

      const meData = await meRes.json();

      if (meRes.status !== 200 || !meData.success) {
        throw new Error(`Session persistence failed with status ${meRes.status}: ${JSON.stringify(meData)}`);
      }

      const meUser = meData.user;
      if (meUser.email !== userConfig.email || meUser.role !== userConfig.role) {
        throw new Error(`User mismatch on /me: expected ${userConfig.email}, got ${meUser.email}`);
      }

      console.log(`✓ [PASS] ${userConfig.role} Browser Refresh / Session Persistence verified (session restored via /me).`);
      results.push({ test: `${userConfig.role} Refresh`, status: 'PASS' });
    } catch (err) {
      console.error(`✗ [FAIL] ${userConfig.role} Refresh / Persistence:`, err.message);
      results.push({ test: `${userConfig.role} Refresh`, status: 'FAIL' });
      allPassed = false;
    }

    // STEP C: Logout
    try {
      const logoutRes = await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { Cookie: cookie }
      });

      const logoutData = await logoutRes.json();

      if (logoutRes.status !== 200 || !logoutData.success) {
        throw new Error(`Logout failed with status ${logoutRes.status}: ${JSON.stringify(logoutData)}`);
      }

      // Check Redis session destroyed
      const redisSessionAfter = await redisClient.get(`session:${userId}`);
      if (redisSessionAfter) {
        throw new Error(`Session key session:${userId} still exists in Redis after logout!`);
      }

      console.log(`✓ [PASS] ${userConfig.role} Logout successful. Redis session invalidated.`);
      results.push({ test: `${userConfig.role} Logout`, status: 'PASS' });
    } catch (err) {
      console.error(`✗ [FAIL] ${userConfig.role} Logout:`, err.message);
      results.push({ test: `${userConfig.role} Logout`, status: 'FAIL' });
      allPassed = false;
    }

    // STEP D: Post-Logout / Direct Access Block
    try {
      const postLogoutRes = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Cookie: cookie }
      });

      if (postLogoutRes.status !== 401) {
        throw new Error(`Old session still accepted! Status: ${postLogoutRes.status}`);
      }

      console.log(`✓ [PASS] ${userConfig.role} Post-Logout request with old cookie rejected (401).`);
      results.push({ test: `${userConfig.role} Post-Logout Block`, status: 'PASS' });
    } catch (err) {
      console.error(`✗ [FAIL] ${userConfig.role} Post-Logout Block:`, err.message);
      results.push({ test: `${userConfig.role} Post-Logout Block`, status: 'FAIL' });
      allPassed = false;
    }

    // STEP E: Login Again
    try {
      const reloginRes = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: userConfig.email,
          password: userConfig.password
        })
      });

      const reloginData = await reloginRes.json();

      if (reloginRes.status !== 200 || !reloginData.success) {
        throw new Error(`Relogin failed with status ${reloginRes.status}: ${JSON.stringify(reloginData)}`);
      }

      const rawCookie = reloginRes.headers.get('set-cookie');
      const tokenMatch = rawCookie.match(/guardianlink_token=([^;]+)/);
      const newCookie = `guardianlink_token=${tokenMatch[1]}`;

      // Verify new session in Redis
      const newRedisSession = await redisClient.get(`session:${userId}`);
      if (!newRedisSession) {
        throw new Error(`New session key session:${userId} not found in Redis!`);
      }

      // Cleanup relogin session
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { Cookie: newCookie }
      });

      console.log(`✓ [PASS] ${userConfig.role} Login Again successful. New session established and cleaned up.`);
      results.push({ test: `${userConfig.role} Login Again`, status: 'PASS' });
    } catch (err) {
      console.error(`✗ [FAIL] ${userConfig.role} Login Again:`, err.message);
      results.push({ test: `${userConfig.role} Login Again`, status: 'FAIL' });
      allPassed = false;
    }
  }

  // STEP 3: RBAC Cross-Role Authorization Check
  console.log(`\n----------------------------------------------------`);
  console.log(`Testing Cross-Role RBAC Authorization`);
  console.log(`----------------------------------------------------`);

  // Log in as parent
  try {
    const parentLogin = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'auth.parent@example.com',
        password: 'Password123!'
      })
    });
    const parentCookie = `guardianlink_token=${parentLogin.headers.get('set-cookie').match(/guardianlink_token=([^;]+)/)[1]}`;

    // Try accessing admin-only endpoint
    const forbiddenRes = await fetch(`${API_BASE}/api/admin/users`, {
      headers: { Cookie: parentCookie }
    });

    if (forbiddenRes.status === 403) {
      console.log('✓ [PASS] Non-admin (parent) access to /api/admin/users correctly rejected with 403 Forbidden.');
      results.push({ test: 'Wrong Role Route Block (RBAC 403)', status: 'PASS' });
    } else {
      console.error(`✗ [FAIL] Expected 403 Forbidden, got ${forbiddenRes.status}`);
      results.push({ test: 'Wrong Role Route Block (RBAC 403)', status: 'FAIL' });
      allPassed = false;
    }

    // Cleanup parent
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: parentCookie }
    });
  } catch (err) {
    console.error('✗ [FAIL] RBAC check failed:', err.message);
    allPassed = false;
  }

  // Admin access to admin endpoint
  try {
    const adminLogin = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@guardianlink.local',
        password: 'AdminDev@GuardianLink2026!'
      })
    });
    const adminCookie = `guardianlink_token=${adminLogin.headers.get('set-cookie').match(/guardianlink_token=([^;]+)/)[1]}`;

    const adminRes = await fetch(`${API_BASE}/api/admin/users`, {
      headers: { Cookie: adminCookie }
    });
    const adminData = await adminRes.json();

    if (adminRes.status === 200 && adminData.success) {
      console.log('✓ [PASS] Admin access to /api/admin/users succeeded with 200.');
      results.push({ test: 'Admin Authorized Route Access', status: 'PASS' });
    } else {
      console.error(`✗ [FAIL] Expected 200 for admin, got ${adminRes.status}`);
      results.push({ test: 'Admin Authorized Route Access', status: 'FAIL' });
      allPassed = false;
    }

    // Cleanup admin
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: adminCookie }
    });
  } catch (err) {
    console.error('✗ [FAIL] Admin access check failed:', err.message);
    allPassed = false;
  }

  await redisClient.quit();
  await mongoose.disconnect();

  console.log('\n====================================================');
  console.log('                 FINAL TEST SUMMARY');
  console.log('====================================================');
  console.table(results);

  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED! Backend Auth & Session Lifecycle 100% Verified.\n');
    process.exit(0);
  } else {
    console.error('\n❌ SOME TESTS FAILED!\n');
    process.exit(1);
  }
}

runPhase2Audit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
