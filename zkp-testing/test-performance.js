/**
 * PERFORMANCE TESTING - Sesuai Tabel 4.7 dan Tabel 4.9 Bab 4
 * Test Cases untuk Pengujian Performa dan Load Testing
 *
 * Notasi Protokol Schnorr (Tabel 2.1):
 *   p = Bilangan prima besar (modulus)
 *   g = Generator grup
 *   x = Nilai rahasia (private key)
 *   y = g^x mod p (public key)
 *   r = Nonce acak
 *   t = g^r mod p (commitment)
 *   c = Challenge
 *   z = r + cx mod p (response)
 */

const axios = require("axios");
const speakeasy = require("speakeasy");

const API_URL = "http://localhost:3001/api";

// ========================================
// Schnorr Protocol Functions
// Sesuai Tabel 2.1 Bab 2
// ========================================
const schnorr = {
  // p: Bilangan prima besar (modulus)
  p: BigInt(
    "2410312426921032588552076022197566074856950548502459942654116941958108831682612228890093858261341614673227141477904012196503648957050582631942730706805009223062734745341073406696246014589361659774041027169249453200378729434170325843778659198143763193776859869524088940195577346119843545301547043747207749969763750084308926339295559968882457872412993810129130294592999947926365264059284647209730384947211681434464714438488520940127459844288859336526896320919633919"
  ),
  // g: Generator grup
  g: BigInt(2),

  // Generate random BigInt
  randomBigInt: (max) => {
    const str = max.toString();
    let result = "";
    for (let i = 0; i < str.length; i++) {
      result += Math.floor(Math.random() * 10);
    }
    return BigInt(result) % max;
  },

  // Modular exponentiation: base^exp mod mod
  modPow: (base, exp, mod) => {
    let result = BigInt(1);
    base = base % mod;
    while (exp > 0) {
      if (exp % BigInt(2) === BigInt(1)) {
        result = (result * base) % mod;
      }
      exp = exp >> BigInt(1);
      base = (base * base) % mod;
    }
    return result;
  },

  // Hash password menjadi private key (x)
  hashToPrivateKey: (password) => {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      hash = (hash << 5) - hash + password.charCodeAt(i);
      hash = hash & hash;
    }
    return BigInt(Math.abs(hash)) + BigInt(1000000);
  },
};

const performanceResults = [];

function measureTime(label, timeMs) {
  performanceResults.push({
    operation: label,
    time: timeMs,
    timestamp: new Date().toISOString(),
  });
}

// Statistics helper
function calculateStats(values) {
  const sorted = values.sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;

  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const p50 = sorted[Math.floor(values.length * 0.5)];
  const p95 = sorted[Math.floor(values.length * 0.95)];
  const p99 = sorted[Math.floor(values.length * 0.99)];

  return {
    mean: mean.toFixed(2),
    stdDev: stdDev.toFixed(2),
    min: Math.min(...values).toFixed(2),
    max: Math.max(...values).toFixed(2),
    p50: p50.toFixed(2),
    p95: p95.toFixed(2),
    p99: p99.toFixed(2),
  };
}

// ============================================
// PERFORMANCE TEST CASES
// ============================================

/**
 * PERF01: Client-side Key Generation
 * Mengukur waktu untuk generate x (private key) dan y (public key)
 * Sesuai Persamaan 2.1: y = g^x mod p
 */
async function PERF01_ClientSideKeyGeneration() {
  console.log("\n⏱️  Testing: Client-side Key Generation Performance...");
  console.log(
    "    Mengukur: x = hash(password), y = g^x mod p (Persamaan 2.1)"
  );

  const iterations = 100;
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const password = `TestPassword${i}`;
    const start = performance.now();

    // x = private key (dari hash password)
    const x = schnorr.hashToPrivateKey(password);
    // y = g^x mod p (public key) - Persamaan 2.1
    const y = schnorr.modPow(schnorr.g, x, schnorr.p);

    const end = performance.now();
    times.push(end - start);
  }

  const stats = calculateStats(times);

  console.log(`✓ Completed ${iterations} iterations`);
  console.log(`  Average: ${stats.mean} ms`);
  console.log(`  Std Dev: ±${stats.stdDev} ms`);
  console.log(`  Min: ${stats.min} ms`);
  console.log(`  Max: ${stats.max} ms`);
  console.log(`  P50: ${stats.p50} ms`);
  console.log(`  P95: ${stats.p95} ms`);

  measureTime("Client-side Key Generation", parseFloat(stats.mean));

  return stats;
}

/**
 * PERF02: Registration Time (with TOTP setup)
 */
async function PERF02_RegistrationTime() {
  console.log("\n⏱️  Testing: Registration Performance (with TOTP setup)...");

  const iterations = 50;
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const username = `perftest_reg_${Date.now()}_${i}`;
    const password = "TestPassword123!";

    const start = performance.now();

    // x = private key
    const x = schnorr.hashToPrivateKey(password);
    // y = g^x mod p (public key)
    const y = schnorr.modPow(schnorr.g, x, schnorr.p);

    await axios.post(`${API_URL}/register`, {
      username,
      publicKey: y.toString(),
    });

    const end = performance.now();
    times.push(end - start);

    // Small delay to avoid overwhelming server
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const stats = calculateStats(times);

  console.log(`✓ Completed ${iterations} registrations`);
  console.log(`  Average: ${stats.mean} ms`);
  console.log(`  Std Dev: ±${stats.stdDev} ms`);
  console.log(`  P95: ${stats.p95} ms`);

  measureTime("Registration (total with TOTP setup)", parseFloat(stats.mean));

  return stats;
}

/**
 * PERF03: Challenge Request
 */
async function PERF03_ChallengeRequest() {
  console.log("\n⏱️  Testing: Challenge Request Performance...");

  // Setup test user first
  const username = `perftest_challenge_${Date.now()}`;
  const password = "TestPassword123!";
  const x = schnorr.hashToPrivateKey(password);
  const y = schnorr.modPow(schnorr.g, x, schnorr.p);

  await axios.post(`${API_URL}/register`, {
    username,
    publicKey: y.toString(),
  });

  const iterations = 100;
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();

    await axios.post(`${API_URL}/challenge`, { username });

    const end = performance.now();
    times.push(end - start);
  }

  const stats = calculateStats(times);

  console.log(`✓ Completed ${iterations} challenge requests`);
  console.log(`  Average: ${stats.mean} ms`);
  console.log(`  Std Dev: ±${stats.stdDev} ms`);
  console.log(`  P95: ${stats.p95} ms`);

  measureTime("Request challenge", parseFloat(stats.mean));

  return stats;
}

/**
 * PERF04: ZKP Proof Generation (client-side)
 * Mengukur waktu untuk generate:
 * - r (random nonce)
 * - t = g^r mod p (commitment) - Persamaan 2.2
 * - z = r + c*x mod p (response) - Persamaan 2.4
 */
async function PERF04_ZKPProofGeneration() {
  console.log("\n⏱️  Testing: ZKP Proof Generation (client-side)...");
  console.log("    Mengukur: r, t = g^r mod p (2.2), z = r + cx mod p (2.4)");

  const iterations = 100;
  const times = [];

  const password = "TestPassword123!";
  const x = schnorr.hashToPrivateKey(password);

  for (let i = 0; i < iterations; i++) {
    // Simulasi challenge dari server
    const c = schnorr.p - BigInt(Math.floor(Math.random() * 1000000000));

    const start = performance.now();

    // r = random nonce
    const r = schnorr.randomBigInt(schnorr.p - BigInt(1)) + BigInt(1);
    // t = g^r mod p (commitment) - Persamaan 2.2
    const t = schnorr.modPow(schnorr.g, r, schnorr.p);
    // z = r + c*x mod (p-1) (response) - Persamaan 2.4
    const z = (r + c * x) % (schnorr.p - BigInt(1));

    const end = performance.now();
    times.push(end - start);
  }

  const stats = calculateStats(times);

  console.log(`✓ Completed ${iterations} proof generations`);
  console.log(`  Average: ${stats.mean} ms`);
  console.log(`  Std Dev: ±${stats.stdDev} ms`);
  console.log(`  P95: ${stats.p95} ms`);

  measureTime("Generate ZKP proof (client-side)", parseFloat(stats.mean));

  return stats;
}

/**
 * PERF05: Complete Login Time (end-to-end)
 */
async function PERF05_CompleteLoginTime() {
  console.log("\n⏱️  Testing: Complete Login Time (end-to-end)...");

  // Setup test user
  const username = `perftest_login_${Date.now()}`;
  const password = "TestPassword123!";
  const x = schnorr.hashToPrivateKey(password);
  const y = schnorr.modPow(schnorr.g, x, schnorr.p);

  const regRes = await axios.post(`${API_URL}/register`, {
    username,
    publicKey: y.toString(),
  });

  const totpSecret = regRes.data.totpSecret;

  const iterations = 50;
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();

    // Step 1: Get challenge (c)
    const challengeRes = await axios.post(`${API_URL}/challenge`, { username });
    const c = BigInt(challengeRes.data.challenge);
    const sessionId = challengeRes.data.sessionId;

    // Step 2: Generate proof
    // r = random nonce
    const r = schnorr.randomBigInt(schnorr.p - BigInt(1)) + BigInt(1);
    // t = g^r mod p (commitment)
    const t = schnorr.modPow(schnorr.g, r, schnorr.p);
    // z = r + c*x mod (p-1) (response)
    const z = (r + c * x) % (schnorr.p - BigInt(1));

    // Step 3: Get TOTP
    const totpCode = speakeasy.totp({
      secret: totpSecret,
      encoding: "base32",
    });

    // Step 4: Verify
    await axios.post(`${API_URL}/verify`, {
      username,
      commitment: t.toString(),
      response: z.toString(),
      sessionId,
      totpCode,
    });

    const end = performance.now();
    times.push(end - start);

    // Small delay
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const stats = calculateStats(times);

  console.log(`✓ Completed ${iterations} full logins`);
  console.log(`  Average: ${stats.mean} ms`);
  console.log(`  Std Dev: ±${stats.stdDev} ms`);
  console.log(`  P95: ${stats.p95} ms`);
  console.log(`  P99: ${stats.p99} ms`);

  measureTime("Total login time (end-to-end)", parseFloat(stats.mean));

  return stats;
}

/**
 * PERF06: Concurrent Logins (100 users)
 */
async function PERF06_ConcurrentLogins() {
  console.log("\n⏱️  Testing: Concurrent Login Performance...");

  // Setup test users
  console.log("  Setting up 100 test users...");
  const users = [];

  for (let i = 0; i < 100; i++) {
    const username = `concurrent_test_${Date.now()}_${i}`;
    const password = "TestPassword123!";
    const x = schnorr.hashToPrivateKey(password);
    const y = schnorr.modPow(schnorr.g, x, schnorr.p);

    const regRes = await axios.post(`${API_URL}/register`, {
      username,
      publicKey: y.toString(),
    });

    users.push({
      username,
      password,
      x,
      totpSecret: regRes.data.totpSecret,
    });

    if ((i + 1) % 20 === 0) {
      console.log(`    ${i + 1}/100 users created...`);
    }
  }

  console.log("✓ All users created");
  console.log("\n  Executing 100 concurrent logins...");

  const start = performance.now();

  // Execute all logins concurrently
  const loginPromises = users.map(async (user) => {
    const loginStart = performance.now();

    try {
      // Get challenge (c)
      const challengeRes = await axios.post(`${API_URL}/challenge`, {
        username: user.username,
      });
      const c = BigInt(challengeRes.data.challenge);
      const sessionId = challengeRes.data.sessionId;

      // Generate proof
      const r = schnorr.randomBigInt(schnorr.p - BigInt(1)) + BigInt(1);
      const t = schnorr.modPow(schnorr.g, r, schnorr.p);
      const z = (r + c * user.x) % (schnorr.p - BigInt(1));

      // Get TOTP
      const totpCode = speakeasy.totp({
        secret: user.totpSecret,
        encoding: "base32",
      });

      // Verify
      await axios.post(`${API_URL}/verify`, {
        username: user.username,
        commitment: t.toString(),
        response: z.toString(),
        sessionId,
        totpCode,
      });

      const loginEnd = performance.now();
      return {
        success: true,
        time: loginEnd - loginStart,
      };
    } catch (error) {
      const loginEnd = performance.now();
      return {
        success: false,
        time: loginEnd - loginStart,
        error: error.message,
      };
    }
  });

  const results = await Promise.all(loginPromises);
  const end = performance.now();

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const totalTime = end - start;

  const times = results.map((r) => r.time);
  const stats = calculateStats(times);

  console.log("\n📊 Concurrent Load Test Results:");
  console.log(`  Total Users: 100`);
  console.log(`  Successful: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log(`  Success Rate: ${((successCount / 100) * 100).toFixed(2)}%`);
  console.log(`  Total Time: ${totalTime.toFixed(2)} ms`);
  console.log(`  Average Response Time: ${stats.mean} ms`);
  console.log(`  Std Dev: ±${stats.stdDev} ms`);
  console.log(`  P95: ${stats.p95} ms`);
  console.log(`  P99: ${stats.p99} ms`);
  console.log(`  Min: ${stats.min} ms`);
  console.log(`  Max: ${stats.max} ms`);

  return {
    successCount,
    failCount,
    totalTime,
    stats,
  };
}

/**
 * PERF07: Server-side ZKP Verification Time
 * Mengukur waktu server untuk memverifikasi: g^z ≡ t × y^c (mod p) - Persamaan 2.5
 */
async function PERF07_ServerSideVerification() {
  console.log("\n⏱️  Testing: Server-side ZKP Verification Time...");
  console.log(
    "    Server memverifikasi: g^z ≡ t × y^c (mod p) - Persamaan 2.5"
  );

  // Setup test user
  const username = `perftest_verify_${Date.now()}`;
  const password = "TestPassword123!";
  const x = schnorr.hashToPrivateKey(password);
  const y = schnorr.modPow(schnorr.g, x, schnorr.p);

  const regRes = await axios.post(`${API_URL}/register`, {
    username,
    publicKey: y.toString(),
  });

  const totpSecret = regRes.data.totpSecret;

  const iterations = 50;
  const times = [];

  for (let i = 0; i < iterations; i++) {
    // Get challenge
    const challengeRes = await axios.post(`${API_URL}/challenge`, { username });
    const c = BigInt(challengeRes.data.challenge);
    const sessionId = challengeRes.data.sessionId;

    // Generate proof
    const r = schnorr.randomBigInt(schnorr.p - BigInt(1)) + BigInt(1);
    const t = schnorr.modPow(schnorr.g, r, schnorr.p);
    const z = (r + c * x) % (schnorr.p - BigInt(1));

    const totpCode = speakeasy.totp({
      secret: totpSecret,
      encoding: "base32",
    });

    // Measure only server verification time
    const start = performance.now();

    await axios.post(`${API_URL}/verify`, {
      username,
      commitment: t.toString(),
      response: z.toString(),
      sessionId,
      totpCode,
    });

    const end = performance.now();
    times.push(end - start);

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  const stats = calculateStats(times);

  console.log(`✓ Completed ${iterations} verifications`);
  console.log(`  Average: ${stats.mean} ms`);
  console.log(`  Std Dev: ±${stats.stdDev} ms`);
  console.log(`  P95: ${stats.p95} ms`);

  measureTime("Verify ZKP (server-side)", parseFloat(stats.mean));

  return stats;
}

// ============================================
// OVERHEAD COMPARISON
// ============================================

async function PERF08_OverheadComparison() {
  console.log("\n⏱️  Testing: Computational Overhead Comparison...");

  const username = `overhead_test_${Date.now()}`;
  const password = "TestPassword123!";

  // Measure client-side overhead
  console.log("\n  📊 Client-side operations:");
  const clientStart = performance.now();

  // x = private key
  const x = schnorr.hashToPrivateKey(password);
  // y = g^x mod p (public key)
  const y = schnorr.modPow(schnorr.g, x, schnorr.p);
  // r = random nonce
  const r = schnorr.randomBigInt(schnorr.p - BigInt(1)) + BigInt(1);
  // t = g^r mod p (commitment)
  const t = schnorr.modPow(schnorr.g, r, schnorr.p);
  // Simulasi challenge
  const c = schnorr.p - BigInt(1000000);
  // z = r + c*x mod (p-1) (response)
  const z = (r + c * x) % (schnorr.p - BigInt(1));

  const clientEnd = performance.now();
  const clientTime = clientEnd - clientStart;

  console.log(`    Total client computation: ${clientTime.toFixed(2)} ms`);

  // Register user and measure server overhead
  const regRes = await axios.post(`${API_URL}/register`, {
    username,
    publicKey: y.toString(),
  });

  const totpSecret = regRes.data.totpSecret;

  // Get challenge
  const challengeRes = await axios.post(`${API_URL}/challenge`, { username });
  const serverChallenge = BigInt(challengeRes.data.challenge);
  const sessionId = challengeRes.data.sessionId;

  // Generate new proof with server challenge
  const r2 = schnorr.randomBigInt(schnorr.p - BigInt(1)) + BigInt(1);
  const t2 = schnorr.modPow(schnorr.g, r2, schnorr.p);
  const z2 = (r2 + serverChallenge * x) % (schnorr.p - BigInt(1));

  const totpCode = speakeasy.totp({
    secret: totpSecret,
    encoding: "base32",
  });

  console.log("\n  📊 Server-side operations:");
  const serverStart = performance.now();

  await axios.post(`${API_URL}/verify`, {
    username,
    commitment: t2.toString(),
    response: z2.toString(),
    sessionId,
    totpCode,
  });

  const serverEnd = performance.now();
  const serverTime = serverEnd - serverStart;

  console.log(`    Total server verification: ${serverTime.toFixed(2)} ms`);

  console.log("\n  📊 Overhead Summary:");
  console.log(`    Client-side: ${clientTime.toFixed(2)} ms`);
  console.log(`    Server-side: ${serverTime.toFixed(2)} ms`);
  console.log(`    Total: ${(clientTime + serverTime).toFixed(2)} ms`);
  console.log(
    `    Distribution: ${(
      (clientTime / (clientTime + serverTime)) *
      100
    ).toFixed(1)}% client, ${(
      (serverTime / (clientTime + serverTime)) *
      100
    ).toFixed(1)}% server`
  );

  return {
    clientTime,
    serverTime,
    totalTime: clientTime + serverTime,
  };
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runPerformanceTests() {
  console.log("\n========================================");
  console.log("PERFORMANCE TESTING");
  console.log("ZKP + TOTP Authentication System");
  console.log("========================================\n");
  console.log("Notasi Protokol Schnorr (Tabel 2.1):");
  console.log("  x = private key, y = g^x mod p (public key)");
  console.log("  r = nonce, t = g^r mod p (commitment)");
  console.log("  c = challenge, z = r + cx mod p (response)");
  console.log("  Verifikasi: g^z ≡ t × y^c (mod p)\n");
  console.log("⚠️  Pastikan server sudah berjalan di http://localhost:3001\n");

  const results = {};

  // Run all performance tests
  results.keyGen = await PERF01_ClientSideKeyGeneration();
  results.registration = await PERF02_RegistrationTime();
  results.challenge = await PERF03_ChallengeRequest();
  results.proofGen = await PERF04_ZKPProofGeneration();
  results.login = await PERF05_CompleteLoginTime();
  results.verification = await PERF07_ServerSideVerification();
  results.overhead = await PERF08_OverheadComparison();
  results.concurrent = await PERF06_ConcurrentLogins();

  // Print comprehensive summary
  console.log("\n========================================");
  console.log("PERFORMANCE TEST SUMMARY");
  console.log("========================================\n");

  console.log("📊 Individual Operation Performance:");
  console.log("─────────────────────────────────────────");

  const operationStats = [
    { name: "Client-side Key Generation", stats: results.keyGen },
    { name: "Registration (with TOTP)", stats: results.registration },
    { name: "Challenge Request", stats: results.challenge },
    { name: "ZKP Proof Generation", stats: results.proofGen },
    { name: "Server-side Verification", stats: results.verification },
    { name: "Complete Login (end-to-end)", stats: results.login },
  ];

  operationStats.forEach((op) => {
    console.log(`\n${op.name}:`);
    console.log(`  Average: ${op.stats.mean} ms`);
    console.log(`  Std Dev: ±${op.stats.stdDev} ms`);
    console.log(`  P95: ${op.stats.p95} ms`);
  });

  console.log("\n📊 Overhead Distribution:");
  console.log("─────────────────────────────────────────");
  console.log(`  Client-side: ${results.overhead.clientTime.toFixed(2)} ms`);
  console.log(`  Server-side: ${results.overhead.serverTime.toFixed(2)} ms`);
  console.log(`  Total: ${results.overhead.totalTime.toFixed(2)} ms`);

  console.log("\n📊 Load Test Results (100 concurrent users):");
  console.log("─────────────────────────────────────────");
  console.log(
    `  Success Rate: ${((results.concurrent.successCount / 100) * 100).toFixed(
      2
    )}%`
  );
  console.log(`  Total Time: ${results.concurrent.totalTime.toFixed(2)} ms`);
  console.log(`  Average Response: ${results.concurrent.stats.mean} ms`);
  console.log(`  P95: ${results.concurrent.stats.p95} ms`);
  console.log(`  P99: ${results.concurrent.stats.p99} ms`);

  // Performance assessment
  console.log("\n========================================");
  console.log("PERFORMANCE ASSESSMENT");
  console.log("========================================\n");

  const avgLogin = parseFloat(results.login.mean);

  if (avgLogin < 100) {
    console.log("✓ Excellent: Login time < 100ms (terasa instant)");
  } else if (avgLogin < 300) {
    console.log("✓ Good: Login time < 300ms (acceptable)");
  } else if (avgLogin < 1000) {
    console.log("⚠️  Fair: Login time < 1000ms (noticeable delay)");
  } else {
    console.log("❌ Poor: Login time > 1000ms (significant delay)");
  }

  if (results.concurrent.successCount === 100) {
    console.log("✓ Excellent: 100% success rate under load");
  } else if (results.concurrent.successCount >= 95) {
    console.log("✓ Good: ≥95% success rate under load");
  } else {
    console.log("⚠️  Needs improvement: <95% success rate under load");
  }

  // Save results
  const fs = require("fs");
  const path = require("path");

  // Create outputs directory if it doesn't exist
  const outputDir = path.join(process.cwd(), "outputs");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "performance-test-results.json");
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        summary: results,
        rawData: performanceResults,
      },
      null,
      2
    )
  );
  console.log(`✓ Results saved to ${outputPath}\n`);
}

// Run tests
if (require.main === module) {
  runPerformanceTests().catch(console.error);
}

module.exports = { runPerformanceTests };
