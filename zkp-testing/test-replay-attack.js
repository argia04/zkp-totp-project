/**
 * PENGUJIAN KEAMANAN - REPLAY ATTACK
 * 100 Iterasi per Skenario
 * Berdasarkan OWASP Testing Guide v4.2 dan NIST SP 800-63B
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
const readline = require("readline");

const API_URL = "http://localhost:3001/api";
const ITERATIONS = 100;

// ========================================
// Schnorr Protocol Constants
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

// Test Results Storage
const testResults = {
  replayZKPProof: { blocked: 0, passed: 0, errors: 0 },
  replayFullPacket: { blocked: 0, passed: 0, errors: 0 },
  replaySessionId: { blocked: 0, passed: 0, errors: 0 },
  replayTOTPSameWindow: { blocked: 0, passed: 0, errors: 0 },
  replayTOTPExpired: { blocked: 0, passed: 0, errors: 0 },
};

// ========================================
// Helper: Register test user
// Sesuai proses registrasi Gambar 3.2
// ========================================
async function setupTestUser(suffix = "") {
  const username = `test_user_${Date.now()}${suffix}`;
  const password = "SecurePassword123!";

  // x = private key (dari hash password)
  const x = schnorr.hashToPrivateKey(password);
  // y = g^x mod p (public key) - Persamaan 2.1
  const y = schnorr.modPow(schnorr.g, x, schnorr.p);

  const response = await axios.post(`${API_URL}/register`, {
    username,
    publicKey: y.toString(), // Hanya y yang dikirim ke server
  });

  return {
    username,
    password,
    x, // private key
    y, // public key
    totpSecret: response.data.totpSecret,
  };
}

// ========================================
// Helper: Perform valid authentication and capture packet
// Sesuai proses login Gambar 3.3
// ========================================
async function captureAuthPacket(userData) {
  const { username, password, totpSecret } = userData;

  // Get challenge (c) dari server - Persamaan 2.3
  const challengeRes = await axios.post(`${API_URL}/challenge`, { username });
  const c = BigInt(challengeRes.data.challenge); // c = challenge
  const sessionId = challengeRes.data.sessionId;

  // Generate ZKP proof
  // x = private key
  const x = schnorr.hashToPrivateKey(password);
  // r = random nonce
  const r = schnorr.randomBigInt(schnorr.p - BigInt(1)) + BigInt(1);
  // t = g^r mod p (commitment) - Persamaan 2.2
  const t = schnorr.modPow(schnorr.g, r, schnorr.p);
  // z = r + c*x mod (p-1) (response) - Persamaan 2.4
  const z = (r + c * x) % (schnorr.p - BigInt(1));

  // Get TOTP
  const totpCode = speakeasy.totp({
    secret: totpSecret,
    encoding: "base32",
  });

  const packet = {
    username,
    commitment: t.toString(), // t = commitment
    response: z.toString(), // z = response
    sessionId,
    totpCode,
  };

  // Execute original auth
  const verifyRes = await axios.post(`${API_URL}/verify`, packet);

  return { packet, originalResult: verifyRes.data, c, x };
}

// ========================================
// Helper: Generate new ZKP proof
// ========================================
async function generateNewProof(userData) {
  const { username, password, totpSecret } = userData;

  // Get challenge (c) - Persamaan 2.3
  const challengeRes = await axios.post(`${API_URL}/challenge`, { username });
  const c = BigInt(challengeRes.data.challenge);
  const sessionId = challengeRes.data.sessionId;

  // x = private key
  const x = schnorr.hashToPrivateKey(password);
  // r = random nonce
  const r = schnorr.randomBigInt(schnorr.p - BigInt(1)) + BigInt(1);
  // t = g^r mod p (commitment) - Persamaan 2.2
  const t = schnorr.modPow(schnorr.g, r, schnorr.p);
  // z = r + c*x mod (p-1) (response) - Persamaan 2.4
  const z = (r + c * x) % (schnorr.p - BigInt(1));

  const totpCode = speakeasy.totp({
    secret: totpSecret,
    encoding: "base32",
  });

  return {
    username,
    commitment: t.toString(),
    response: z.toString(),
    sessionId,
    totpCode,
    c,
    x,
  };
}

// ============================================
// SKENARIO 1: Replay ZKP Proof
// Referensi: NIST 800-63B 5.2.8
// ============================================
async function testReplayZKPProof(userData, iteration) {
  try {
    // Capture original auth packet
    const { packet } = await captureAuthPacket(userData);

    // Attempt replay with same packet
    const replayRes = await axios.post(`${API_URL}/verify`, packet);

    if (replayRes.data.success) {
      testResults.replayZKPProof.passed++;
      return {
        iteration,
        status: "PASSED",
        detail: "Replay accepted - VULNERABLE",
      };
    } else {
      testResults.replayZKPProof.blocked++;
      return {
        iteration,
        status: "BLOCKED",
        detail: replayRes.data.error || "Replay rejected",
      };
    }
  } catch (error) {
    if (error.response) {
      testResults.replayZKPProof.blocked++;
      return {
        iteration,
        status: "BLOCKED",
        detail: error.response.data?.error || "Challenge invalid/expired",
      };
    }
    testResults.replayZKPProof.errors++;
    return { iteration, status: "ERROR", detail: error.message };
  }
}

// ============================================
// SKENARIO 2: Replay Paket Lengkap (ZKP + TOTP)
// Referensi: OWASP ASVS 2.8.7
// ============================================
async function testReplayFullPacket(userData, iteration) {
  try {
    // Capture full auth packet
    const { packet } = await captureAuthPacket(userData);

    // Wait a moment then replay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Attempt replay with exact same packet
    const replayRes = await axios.post(`${API_URL}/verify`, packet);

    if (replayRes.data.success) {
      testResults.replayFullPacket.passed++;
      return {
        iteration,
        status: "PASSED",
        detail: "Full packet replay accepted - VULNERABLE",
      };
    } else {
      testResults.replayFullPacket.blocked++;
      return {
        iteration,
        status: "BLOCKED",
        detail: replayRes.data.error || "Replay rejected",
      };
    }
  } catch (error) {
    if (error.response) {
      testResults.replayFullPacket.blocked++;
      return {
        iteration,
        status: "BLOCKED",
        detail: error.response.data?.error || "Packet replay rejected",
      };
    }
    testResults.replayFullPacket.errors++;
    return { iteration, status: "ERROR", detail: error.message };
  }
}

// ============================================
// SKENARIO 3: Replay dengan SessionId Sama
// Referensi: OWASP Session Management
// ============================================
async function testReplaySessionId(userData, iteration) {
  try {
    const { username, password, totpSecret } = userData;

    // Get first challenge (c)
    const challengeRes1 = await axios.post(`${API_URL}/challenge`, {
      username,
    });
    const c1 = BigInt(challengeRes1.data.challenge);
    const sessionId = challengeRes1.data.sessionId;

    // Generate first proof
    // x = private key
    const x = schnorr.hashToPrivateKey(password);
    // r1 = random nonce
    const r1 = schnorr.randomBigInt(schnorr.p - BigInt(1)) + BigInt(1);
    // t1 = g^r1 mod p (commitment)
    const t1 = schnorr.modPow(schnorr.g, r1, schnorr.p);
    // z1 = r1 + c1*x mod (p-1) (response)
    const z1 = (r1 + c1 * x) % (schnorr.p - BigInt(1));

    const totpCode1 = speakeasy.totp({
      secret: totpSecret,
      encoding: "base32",
    });

    // First auth (success)
    await axios.post(`${API_URL}/verify`, {
      username,
      commitment: t1.toString(),
      response: z1.toString(),
      sessionId,
      totpCode: totpCode1,
    });

    // Try to reuse same sessionId with new proof
    // r2 = new random nonce
    const r2 = schnorr.randomBigInt(schnorr.p - BigInt(1)) + BigInt(1);
    // t2 = g^r2 mod p (new commitment)
    const t2 = schnorr.modPow(schnorr.g, r2, schnorr.p);
    // z2 = r2 + c1*x mod (p-1) (new response with OLD challenge)
    const z2 = (r2 + c1 * x) % (schnorr.p - BigInt(1));

    // Generate new TOTP (different from first)
    await new Promise((resolve) => setTimeout(resolve, 50));
    const totpCode2 = speakeasy.totp({
      secret: totpSecret,
      encoding: "base32",
    });

    const replayRes = await axios.post(`${API_URL}/verify`, {
      username,
      commitment: t2.toString(),
      response: z2.toString(),
      sessionId, // SAME session ID
      totpCode: totpCode2,
    });

    if (replayRes.data.success) {
      testResults.replaySessionId.passed++;
      return {
        iteration,
        status: "PASSED",
        detail: "SessionId reuse accepted - VULNERABLE",
      };
    } else {
      testResults.replaySessionId.blocked++;
      return {
        iteration,
        status: "BLOCKED",
        detail: replayRes.data.error || "SessionId reuse rejected",
      };
    }
  } catch (error) {
    if (error.response) {
      testResults.replaySessionId.blocked++;
      return {
        iteration,
        status: "BLOCKED",
        detail: error.response.data?.error || "SessionId already consumed",
      };
    }
    testResults.replaySessionId.errors++;
    return { iteration, status: "ERROR", detail: error.message };
  }
}

// ============================================
// SKENARIO 4: Replay TOTP dalam Window Sama
// Referensi: RFC 6238 5.2
// ============================================
async function testReplayTOTPSameWindow(userData, iteration) {
  try {
    const { username, password, totpSecret } = userData;
    const x = schnorr.hashToPrivateKey(password);

    // Generate TOTP yang akan kita capture dan replay
    const capturedTOTP = speakeasy.totp({
      secret: totpSecret,
      encoding: "base32",
    });

    // === FIRST AUTH ===
    // Get challenge (c1)
    const challengeRes1 = await axios.post(`${API_URL}/challenge`, {
      username,
    });
    const c1 = BigInt(challengeRes1.data.challenge);
    const sessionId1 = challengeRes1.data.sessionId;

    // Generate ZKP proof pertama
    const r1 = schnorr.randomBigInt(schnorr.p - BigInt(1)) + BigInt(1);
    const t1 = schnorr.modPow(schnorr.g, r1, schnorr.p);
    const z1 = (r1 + c1 * x) % (schnorr.p - BigInt(1));

    // Execute first auth
    const firstRes = await axios.post(`${API_URL}/verify`, {
      username,
      commitment: t1.toString(),
      response: z1.toString(),
      sessionId: sessionId1,
      totpCode: capturedTOTP,
    });

    if (!firstRes.data.success) {
      testResults.replayTOTPSameWindow.errors++;
      return {
        iteration,
        status: "ERROR",
        detail: "First auth failed: " + (firstRes.data.error || "unknown"),
      };
    }

    // === REPLAY ATTEMPT ===
    // Get NEW challenge (c2)
    const challengeRes2 = await axios.post(`${API_URL}/challenge`, {
      username,
    });
    const c2 = BigInt(challengeRes2.data.challenge);
    const sessionId2 = challengeRes2.data.sessionId;

    // Generate NEW ZKP proof (valid)
    const r2 = schnorr.randomBigInt(schnorr.p - BigInt(1)) + BigInt(1);
    const t2 = schnorr.modPow(schnorr.g, r2, schnorr.p);
    const z2 = (r2 + c2 * x) % (schnorr.p - BigInt(1));

    // Attempt replay with SAME TOTP code (should be blocked by nonce tracking)
    const replayRes = await axios.post(`${API_URL}/verify`, {
      username,
      commitment: t2.toString(),
      response: z2.toString(),
      sessionId: sessionId2,
      totpCode: capturedTOTP, // SAME TOTP - replay attempt!
    });

    if (replayRes.data.success) {
      testResults.replayTOTPSameWindow.passed++;
      return {
        iteration,
        status: "PASSED",
        detail: "TOTP reuse accepted - VULNERABLE",
      };
    } else {
      // Check if blocked specifically due to TOTP replay
      if (
        replayRes.data.replayDetected ||
        replayRes.data.error?.includes("sudah pernah digunakan")
      ) {
        testResults.replayTOTPSameWindow.blocked++;
        return {
          iteration,
          status: "BLOCKED",
          detail: "TOTP nonce tracking - replay detected",
        };
      }
      testResults.replayTOTPSameWindow.blocked++;
      return {
        iteration,
        status: "BLOCKED",
        detail: replayRes.data.error || "TOTP reuse rejected",
      };
    }
  } catch (error) {
    if (error.response && error.response.data) {
      if (!error.response.data.success) {
        if (
          error.response.data.replayDetected ||
          (error.response.data.error &&
            error.response.data.error.includes("sudah pernah digunakan"))
        ) {
          testResults.replayTOTPSameWindow.blocked++;
          return {
            iteration,
            status: "BLOCKED",
            detail: "TOTP nonce tracking active",
          };
        }
        testResults.replayTOTPSameWindow.blocked++;
        return {
          iteration,
          status: "BLOCKED",
          detail: error.response.data.error || "Request rejected",
        };
      }
    }
    testResults.replayTOTPSameWindow.errors++;
    return { iteration, status: "ERROR", detail: error.message };
  }
}

// ============================================
// SKENARIO 5: Replay TOTP setelah >90 detik
// Referensi: RFC 6238 4.1
// ============================================
async function testReplayTOTPExpired(userData, iteration) {
  try {
    const { username, password, totpSecret } = userData;

    // Generate TOTP for a past time window (simulated expired - 2 minutes ago)
    const pastTime = Math.floor((Date.now() - 120000) / 1000);
    const expiredTOTP = speakeasy.totp({
      secret: totpSecret,
      encoding: "base32",
      time: pastTime,
    });

    // Generate fresh ZKP proof
    const challengeRes = await axios.post(`${API_URL}/challenge`, { username });
    const c = BigInt(challengeRes.data.challenge);
    const sessionId = challengeRes.data.sessionId;

    const x = schnorr.hashToPrivateKey(password);
    const r = schnorr.randomBigInt(schnorr.p - BigInt(1)) + BigInt(1);
    const t = schnorr.modPow(schnorr.g, r, schnorr.p);
    const z = (r + c * x) % (schnorr.p - BigInt(1));

    // Try to use expired TOTP
    const replayRes = await axios.post(`${API_URL}/verify`, {
      username,
      commitment: t.toString(),
      response: z.toString(),
      sessionId,
      totpCode: expiredTOTP,
    });

    if (replayRes.data.success) {
      testResults.replayTOTPExpired.passed++;
      return {
        iteration,
        status: "PASSED",
        detail: "Expired TOTP accepted - VULNERABLE",
      };
    } else {
      testResults.replayTOTPExpired.blocked++;
      return {
        iteration,
        status: "BLOCKED",
        detail: replayRes.data.error || "Expired TOTP rejected",
      };
    }
  } catch (error) {
    if (error.response) {
      testResults.replayTOTPExpired.blocked++;
      return {
        iteration,
        status: "BLOCKED",
        detail: error.response.data?.error || "TOTP time window enforced",
      };
    }
    testResults.replayTOTPExpired.errors++;
    return { iteration, status: "ERROR", detail: error.message };
  }
}

// ============================================
// PROGRESS BAR
// ============================================
function showProgress(current, total, scenarioName) {
  const percent = Math.floor((current / total) * 100);
  const filled = Math.floor(percent / 5);
  const bar = "█".repeat(filled) + "░".repeat(20 - filled);
  process.stdout.write(
    `\r  [${bar}] ${percent}% - ${scenarioName} (${current}/${total})`
  );
}

// ============================================
// RESET TEST RESULTS
// ============================================
function resetTestResults() {
  testResults.replayZKPProof = { blocked: 0, passed: 0, errors: 0 };
  testResults.replayFullPacket = { blocked: 0, passed: 0, errors: 0 };
  testResults.replaySessionId = { blocked: 0, passed: 0, errors: 0 };
  testResults.replayTOTPSameWindow = { blocked: 0, passed: 0, errors: 0 };
  testResults.replayTOTPExpired = { blocked: 0, passed: 0, errors: 0 };
}

// ============================================
// INDIVIDUAL SCENARIO RUNNERS
// ============================================

async function runScenario1() {
  console.log(
    "\n┌─────────────────────────────────────────────────────────────────┐"
  );
  console.log(
    "│ Skenario: Replay ZKP proof                                      │"
  );
  console.log(
    "│ Pelaku: Adversary Client                                        │"
  );
  console.log(
    "│ Referensi: NIST 800-63B 5.2.8                                   │"
  );
  console.log(
    "│ Expected: 100% ditolak                                          │"
  );
  console.log(
    "└─────────────────────────────────────────────────────────────────┘\n"
  );

  for (let i = 1; i <= ITERATIONS; i++) {
    const userData = await setupTestUser(`_zkp_${i}`);
    await testReplayZKPProof(userData, i);
    showProgress(i, ITERATIONS, "Replay ZKP Proof");
  }
  console.log("\n");

  const rate = (
    (testResults.replayZKPProof.blocked / ITERATIONS) *
    100
  ).toFixed(0);
  console.log(
    `\n  Hasil: ${rate}% ditolak (${testResults.replayZKPProof.blocked}/${ITERATIONS})`
  );
  console.log(
    `  Passed: ${testResults.replayZKPProof.passed}, Errors: ${testResults.replayZKPProof.errors}`
  );
}

async function runScenario2() {
  console.log(
    "\n┌─────────────────────────────────────────────────────────────────┐"
  );
  console.log(
    "│ Skenario: Replay paket lengkap (ZKP + TOTP)                     │"
  );
  console.log(
    "│ Pelaku: Adversary Client                                        │"
  );
  console.log(
    "│ Referensi: OWASP ASVS 2.8.7                                     │"
  );
  console.log(
    "│ Expected: 100% ditolak                                          │"
  );
  console.log(
    "└─────────────────────────────────────────────────────────────────┘\n"
  );

  for (let i = 1; i <= ITERATIONS; i++) {
    const userData = await setupTestUser(`_full_${i}`);
    await testReplayFullPacket(userData, i);
    showProgress(i, ITERATIONS, "Replay Full Packet");
  }
  console.log("\n");

  const rate = (
    (testResults.replayFullPacket.blocked / ITERATIONS) *
    100
  ).toFixed(0);
  console.log(
    `\n  Hasil: ${rate}% ditolak (${testResults.replayFullPacket.blocked}/${ITERATIONS})`
  );
  console.log(
    `  Passed: ${testResults.replayFullPacket.passed}, Errors: ${testResults.replayFullPacket.errors}`
  );
}

async function runScenario3() {
  console.log(
    "\n┌─────────────────────────────────────────────────────────────────┐"
  );
  console.log(
    "│ Skenario: Replay dengan sessionId sama                          │"
  );
  console.log(
    "│ Pelaku: Adversary Client                                        │"
  );
  console.log(
    "│ Referensi: OWASP Session Mgmt                                   │"
  );
  console.log(
    "│ Expected: 100% ditolak                                          │"
  );
  console.log(
    "└─────────────────────────────────────────────────────────────────┘\n"
  );

  for (let i = 1; i <= ITERATIONS; i++) {
    const userData = await setupTestUser(`_sess_${i}`);
    await testReplaySessionId(userData, i);
    showProgress(i, ITERATIONS, "Replay SessionId");
  }
  console.log("\n");

  const rate = (
    (testResults.replaySessionId.blocked / ITERATIONS) *
    100
  ).toFixed(0);
  console.log(
    `\n  Hasil: ${rate}% ditolak (${testResults.replaySessionId.blocked}/${ITERATIONS})`
  );
  console.log(
    `  Passed: ${testResults.replaySessionId.passed}, Errors: ${testResults.replaySessionId.errors}`
  );
}

async function runScenario4() {
  console.log(
    "\n┌─────────────────────────────────────────────────────────────────┐"
  );
  console.log(
    "│ Skenario: Replay TOTP dalam window sama                         │"
  );
  console.log(
    "│ Pelaku: Adversary Client                                        │"
  );
  console.log(
    "│ Referensi: RFC 6238 5.2                                         │"
  );
  console.log(
    "│ Expected: 100% ditolak                                          │"
  );
  console.log(
    "└─────────────────────────────────────────────────────────────────┘\n"
  );

  for (let i = 1; i <= ITERATIONS; i++) {
    const userData = await setupTestUser(`_totp_win_${i}`);
    await testReplayTOTPSameWindow(userData, i);
    showProgress(i, ITERATIONS, "Replay TOTP Window");
  }
  console.log("\n");

  const rate = (
    (testResults.replayTOTPSameWindow.blocked / ITERATIONS) *
    100
  ).toFixed(0);
  console.log(
    `\n  Hasil: ${rate}% ditolak (${testResults.replayTOTPSameWindow.blocked}/${ITERATIONS})`
  );
  console.log(
    `  Passed: ${testResults.replayTOTPSameWindow.passed}, Errors: ${testResults.replayTOTPSameWindow.errors}`
  );
}

async function runScenario5() {
  console.log(
    "\n┌─────────────────────────────────────────────────────────────────┐"
  );
  console.log(
    "│ Skenario: Replay TOTP setelah >90 detik                         │"
  );
  console.log(
    "│ Pelaku: Adversary Client                                        │"
  );
  console.log(
    "│ Referensi: RFC 6238 4.1                                         │"
  );
  console.log(
    "│ Expected: 100% ditolak                                          │"
  );
  console.log(
    "└─────────────────────────────────────────────────────────────────┘\n"
  );

  for (let i = 1; i <= ITERATIONS; i++) {
    const userData = await setupTestUser(`_totp_exp_${i}`);
    await testReplayTOTPExpired(userData, i);
    showProgress(i, ITERATIONS, "Replay TOTP Expired");
  }
  console.log("\n");

  const rate = (
    (testResults.replayTOTPExpired.blocked / ITERATIONS) *
    100
  ).toFixed(0);
  console.log(
    `\n  Hasil: ${rate}% ditolak (${testResults.replayTOTPExpired.blocked}/${ITERATIONS})`
  );
  console.log(
    `  Passed: ${testResults.replayTOTPExpired.passed}, Errors: ${testResults.replayTOTPExpired.errors}`
  );
}

// ============================================
// PRINT RESULTS
// ============================================
function printResults(scenariosRun) {
  console.log("\n" + "═".repeat(66));
  console.log("                    HASIL PENGUJIAN KEAMANAN");
  console.log("═".repeat(66) + "\n");

  console.log(
    "┌─────────────────────────────────────┬──────────┬──────────┬──────────────┐"
  );
  console.log(
    "│ Skenario                            │ Iterasi  │ Ditolak  │ Expected     │"
  );
  console.log(
    "├─────────────────────────────────────┼──────────┼──────────┼──────────────┤"
  );

  let totalTests = 0;
  let totalBlocked = 0;
  let totalPassed = 0;
  let totalErrors = 0;

  if (
    scenariosRun.includes(1) ||
    scenariosRun.includes(2) ||
    scenariosRun.includes(3)
  ) {
    console.log(
      "│ \x1b[1mReplay Attack - Layer ZKP\x1b[0m                                                 │"
    );
    console.log(
      "├─────────────────────────────────────┼──────────┼──────────┼──────────────┤"
    );
  }

  if (scenariosRun.includes(1)) {
    const rate = (
      (testResults.replayZKPProof.blocked / ITERATIONS) *
      100
    ).toFixed(0);
    console.log(
      `│ Replay ZKP proof                    │   ${ITERATIONS}x    │  ${rate.padStart(
        3
      )}%    │ 100% ditolak │`
    );
    totalTests += ITERATIONS;
    totalBlocked += testResults.replayZKPProof.blocked;
    totalPassed += testResults.replayZKPProof.passed;
    totalErrors += testResults.replayZKPProof.errors;
  }

  if (scenariosRun.includes(2)) {
    const rate = (
      (testResults.replayFullPacket.blocked / ITERATIONS) *
      100
    ).toFixed(0);
    console.log(
      `│ Replay paket lengkap (ZKP+TOTP)     │   ${ITERATIONS}x    │  ${rate.padStart(
        3
      )}%    │ 100% ditolak │`
    );
    totalTests += ITERATIONS;
    totalBlocked += testResults.replayFullPacket.blocked;
    totalPassed += testResults.replayFullPacket.passed;
    totalErrors += testResults.replayFullPacket.errors;
  }

  if (scenariosRun.includes(3)) {
    const rate = (
      (testResults.replaySessionId.blocked / ITERATIONS) *
      100
    ).toFixed(0);
    console.log(
      `│ Replay dengan sessionId sama        │   ${ITERATIONS}x    │  ${rate.padStart(
        3
      )}%    │ 100% ditolak │`
    );
    totalTests += ITERATIONS;
    totalBlocked += testResults.replaySessionId.blocked;
    totalPassed += testResults.replaySessionId.passed;
    totalErrors += testResults.replaySessionId.errors;
  }

  if (scenariosRun.includes(4) || scenariosRun.includes(5)) {
    console.log(
      "├─────────────────────────────────────┼──────────┼──────────┼──────────────┤"
    );
    console.log(
      "│ \x1b[1mReplay Attack - Layer TOTP\x1b[0m                                                │"
    );
    console.log(
      "├─────────────────────────────────────┼──────────┼──────────┼──────────────┤"
    );
  }

  if (scenariosRun.includes(4)) {
    const rate = (
      (testResults.replayTOTPSameWindow.blocked / ITERATIONS) *
      100
    ).toFixed(0);
    console.log(
      `│ Replay TOTP dalam window sama       │   ${ITERATIONS}x    │  ${rate.padStart(
        3
      )}%    │ 100% ditolak │`
    );
    totalTests += ITERATIONS;
    totalBlocked += testResults.replayTOTPSameWindow.blocked;
    totalPassed += testResults.replayTOTPSameWindow.passed;
    totalErrors += testResults.replayTOTPSameWindow.errors;
  }

  if (scenariosRun.includes(5)) {
    const rate = (
      (testResults.replayTOTPExpired.blocked / ITERATIONS) *
      100
    ).toFixed(0);
    console.log(
      `│ Replay TOTP setelah >90 detik       │   ${ITERATIONS}x    │  ${rate.padStart(
        3
      )}%    │ 100% ditolak │`
    );
    totalTests += ITERATIONS;
    totalBlocked += testResults.replayTOTPExpired.blocked;
    totalPassed += testResults.replayTOTPExpired.passed;
    totalErrors += testResults.replayTOTPExpired.errors;
  }

  console.log(
    "└─────────────────────────────────────┴──────────┴──────────┴──────────────┘"
  );

  // Summary
  console.log("\n" + "─".repeat(66));
  console.log("                         RINGKASAN HASIL");
  console.log("─".repeat(66) + "\n");

  const successRate =
    totalTests > 0 ? ((totalBlocked / totalTests) * 100).toFixed(2) : "0.00";

  console.log(`  Total Pengujian     : ${totalTests}`);
  console.log(`  Serangan Ditolak    : ${totalBlocked} (${successRate}%)`);
  console.log(`  Serangan Berhasil   : ${totalPassed}`);
  console.log(`  Error               : ${totalErrors}`);
  console.log(`\n  Security Score      : ${successRate}%`);

  if (parseFloat(successRate) === 100) {
    console.log("\n  ✓ SISTEM AMAN - Semua serangan replay berhasil dicegah");
  } else if (parseFloat(successRate) >= 95) {
    console.log("\n  ⚠ SISTEM HAMPIR AMAN - Beberapa kerentanan terdeteksi");
  } else {
    console.log("\n  ✗ SISTEM RENTAN - Diperlukan perbaikan segera");
  }

  console.log("\n" + "═".repeat(66) + "\n");

  // Save results
  const fs = require("fs");
  const outputPath = "./replay-attack-results.json";

  const jsonResults = {
    testDate: new Date().toISOString(),
    iterations: ITERATIONS,
    scenariosRun,
    results: testResults,
    summary: {
      totalTests,
      totalBlocked,
      totalPassed,
      totalErrors,
      successRate: parseFloat(successRate),
    },
  };

  fs.writeFileSync(outputPath, JSON.stringify(jsonResults, null, 2));
  console.log(`Hasil disimpan ke: ${outputPath}\n`);
}

// ============================================
// MENU DISPLAY
// ============================================
function showMenu() {
  console.log(
    "\n╔═════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║          PENGUJIAN KEAMANAN - REPLAY ATTACK                    ║"
  );
  console.log(
    "║          100 Iterasi per Skenario                              ║"
  );
  console.log(
    "║          Berdasarkan OWASP Testing Guide v4.2                  ║"
  );
  console.log(
    "║          dan NIST SP 800-63B                                   ║"
  );
  console.log(
    "╚═════════════════════════════════════════════════════════════════╝\n"
  );

  console.log("Pastikan server berjalan di http://localhost:3001\n");
  console.log("─".repeat(66));
  console.log("\n  PILIH SKENARIO PENGUJIAN:\n");
  console.log(
    "  ┌─────────────────────────────────────────────────────────────┐"
  );
  console.log(
    "  │ LAYER ZKP                                                   │"
  );
  console.log(
    "  ├─────────────────────────────────────────────────────────────┤"
  );
  console.log(
    "  │ [1] Replay ZKP proof              (NIST 800-63B 5.2.8)      │"
  );
  console.log(
    "  │ [2] Replay paket lengkap          (OWASP ASVS 2.8.7)        │"
  );
  console.log(
    "  │ [3] Replay dengan sessionId sama  (OWASP Session Mgmt)      │"
  );
  console.log(
    "  ├─────────────────────────────────────────────────────────────┤"
  );
  console.log(
    "  │ LAYER TOTP                                                  │"
  );
  console.log(
    "  ├─────────────────────────────────────────────────────────────┤"
  );
  console.log(
    "  │ [4] Replay TOTP dalam window sama (RFC 6238 5.2)            │"
  );
  console.log(
    "  │ [5] Replay TOTP setelah >90 detik (RFC 6238 4.1)            │"
  );
  console.log(
    "  ├─────────────────────────────────────────────────────────────┤"
  );
  console.log(
    "  │ [6] Jalankan SEMUA skenario                                 │"
  );
  console.log(
    "  │ [0] Keluar                                                  │"
  );
  console.log(
    "  └─────────────────────────────────────────────────────────────┘\n"
  );
}

// ============================================
// MAIN INTERACTIVE RUNNER
// ============================================
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) =>
    new Promise((resolve) => rl.question(prompt, resolve));

  let running = true;

  while (running) {
    showMenu();

    const choice = await question("  Masukkan pilihan (0-6): ");
    const scenariosRun = [];

    resetTestResults();

    switch (choice.trim()) {
      case "1":
        await runScenario1();
        scenariosRun.push(1);
        printResults(scenariosRun);
        break;

      case "2":
        await runScenario2();
        scenariosRun.push(2);
        printResults(scenariosRun);
        break;

      case "3":
        await runScenario3();
        scenariosRun.push(3);
        printResults(scenariosRun);
        break;

      case "4":
        await runScenario4();
        scenariosRun.push(4);
        printResults(scenariosRun);
        break;

      case "5":
        await runScenario5();
        scenariosRun.push(5);
        printResults(scenariosRun);
        break;

      case "6":
        console.log("\n▶ MENJALANKAN SEMUA SKENARIO...\n");
        console.log("─".repeat(66));

        console.log("\n▶ LAYER ZKP - REPLAY ATTACK\n");
        await runScenario1();
        scenariosRun.push(1);

        await runScenario2();
        scenariosRun.push(2);

        await runScenario3();
        scenariosRun.push(3);

        console.log("\n▶ LAYER TOTP - REPLAY ATTACK\n");
        await runScenario4();
        scenariosRun.push(4);

        await runScenario5();
        scenariosRun.push(5);

        printResults(scenariosRun);
        break;

      case "0":
        console.log("\n  Keluar dari program. Terima kasih!\n");
        running = false;
        break;

      default:
        console.log("\n  ⚠ Pilihan tidak valid. Silakan pilih 0-6.\n");
    }

    if (running && choice.trim() !== "0") {
      await question("\n  Tekan ENTER untuk kembali ke menu...");
    }
  }

  rl.close();
}

// Run
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
