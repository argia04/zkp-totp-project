/**
 * FUNCTIONAL TESTING - Sesuai Tabel 4.2 Bab 4
 * Test Cases untuk Pengujian Fungsionalitas Sistem ZKP + TOTP
 */

const axios = require("axios");
const speakeasy = require("speakeasy");

const API_URL = "http://localhost:3001/api";

// Crypto functions (sama seperti di client)
const crypto = {
  p: BigInt(
    "2410312426921032588552076022197566074856950548502459942654116941958108831682612228890093858261341614673227141477904012196503648957050582631942730706805009223062734745341073406696246014589361659774041027169249453200378729434170325843778659198143763193776859869524088940195577346119843545301547043747207749969763750084308926339295559968882457872412993810129130294592999947926365264059284647209730384947211681434464714438488520940127459844288859336526896320919633919"
  ),
  g: BigInt(2),

  randomBigInt: (max) => {
    const str = max.toString();
    let result = "";
    for (let i = 0; i < str.length; i++) {
      result += Math.floor(Math.random() * 10);
    }
    return BigInt(result) % max;
  },

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

  hashPassword: (password) => {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      hash = (hash << 5) - hash + password.charCodeAt(i);
      hash = hash & hash;
    }
    return BigInt(Math.abs(hash)) + BigInt(1000000);
  },
};

// Test results storage
const testResults = [];

function logResult(testId, testName, status, details) {
  const result = {
    id: testId,
    name: testName,
    status: status,
    details: details,
    timestamp: new Date().toISOString(),
  };
  testResults.push(result);
  console.log(`\n[${testId}] ${testName}`);
  console.log(`Status: ${status}`);
  console.log(`Details: ${details}`);
}

// Helper: Register user
async function registerUser(username, password) {
  const privateKey = crypto.hashPassword(password);
  const publicKey = crypto.modPow(crypto.g, privateKey, crypto.p);

  const response = await axios.post(`${API_URL}/register`, {
    username,
    publicKey: publicKey.toString(),
  });

  return response.data;
}

// Helper: Login user
async function loginUser(username, password, totpCode) {
  // Step 1: Get challenge
  const challengeRes = await axios.post(`${API_URL}/challenge`, { username });
  const challenge = BigInt(challengeRes.data.challenge);
  const sessionId = challengeRes.data.sessionId;

  // Step 2: Generate proof
  const privateKey = crypto.hashPassword(password);
  const r = crypto.randomBigInt(crypto.p - BigInt(1)) + BigInt(1);
  const commitment = crypto.modPow(crypto.g, r, crypto.p);
  const response = (r + challenge * privateKey) % (crypto.p - BigInt(1));

  // Step 3: Verify
  const verifyRes = await axios.post(`${API_URL}/verify`, {
    username,
    commitment: commitment.toString(),
    response: response.toString(),
    sessionId,
    totpCode,
  });

  return verifyRes.data;
}

// ============================================
// TEST CASES - Sesuai Tabel 4.2
// ============================================

async function TC01_NormalRegistration() {
  try {
    const username = `testuser_${Date.now()}`;
    const password = "TestPassword123!";

    const result = await registerUser(username, password);

    if (result.success && result.qrCode && result.totpSecret) {
      logResult(
        "TC-01",
        "Registrasi dengan username dan password valid",
        "PASS",
        "QR Code dan secret TOTP berhasil dibuat"
      );
      return { username, password, totpSecret: result.totpSecret };
    } else {
      logResult(
        "TC-01",
        "Registrasi dengan username dan password valid",
        "FAIL",
        "Response tidak lengkap"
      );
      return null;
    }
  } catch (error) {
    logResult(
      "TC-01",
      "Registrasi dengan username dan password valid",
      "FAIL",
      error.message
    );
    return null;
  }
}

async function TC02_NormalLogin(userData) {
  try {
    const { username, password, totpSecret } = userData;

    // Generate valid TOTP code
    const totpCode = speakeasy.totp({
      secret: totpSecret,
      encoding: "base32",
    });

    const result = await loginUser(username, password, totpCode);

    if (result.success && result.zkpValid && result.totpValid) {
      logResult(
        "TC-02",
        "Login dengan kredensial valid dan TOTP benar",
        "PASS",
        "Autentikasi berhasil"
      );
    } else {
      logResult(
        "TC-02",
        "Login dengan kredensial valid dan TOTP benar",
        "FAIL",
        `ZKP: ${result.zkpValid}, TOTP: ${result.totpValid}`
      );
    }
  } catch (error) {
    logResult(
      "TC-02",
      "Login dengan kredensial valid dan TOTP benar",
      "FAIL",
      error.message
    );
  }
}

async function TC03_WrongPassword(userData) {
  try {
    const { username, totpSecret } = userData;
    const wrongPassword = "WrongPassword123!";

    const totpCode = speakeasy.totp({
      secret: totpSecret,
      encoding: "base32",
    });

    const result = await loginUser(username, wrongPassword, totpCode);

    if (!result.success && !result.zkpValid) {
      logResult(
        "TC-03",
        "Login dengan password salah",
        "PASS",
        "Verifikasi ZKP gagal seperti yang diharapkan"
      );
    } else {
      logResult(
        "TC-03",
        "Login dengan password salah",
        "FAIL",
        "Sistem seharusnya menolak password salah"
      );
    }
  } catch (error) {
    logResult("TC-03", "Login dengan password salah", "FAIL", error.message);
  }
}

async function TC04_WrongTOTP(userData) {
  try {
    const { username, password } = userData;
    const wrongTOTP = "000000";

    const result = await loginUser(username, password, wrongTOTP);

    if (!result.success && result.zkpValid && !result.totpValid) {
      logResult(
        "TC-04",
        "Login dengan TOTP salah",
        "PASS",
        "Verifikasi TOTP gagal seperti yang diharapkan"
      );
    } else {
      logResult(
        "TC-04",
        "Login dengan TOTP salah",
        "FAIL",
        "Sistem seharusnya menolak TOTP salah"
      );
    }
  } catch (error) {
    logResult("TC-04", "Login dengan TOTP salah", "FAIL", error.message);
  }
}

async function TC05_CorrectPasswordWrongTOTP(userData) {
  try {
    const { username, password } = userData;
    const wrongTOTP = "999999";

    const result = await loginUser(username, password, wrongTOTP);

    if (!result.success && !result.totpValid) {
      logResult(
        "TC-05",
        "Login dengan password benar tapi TOTP salah",
        "PASS",
        "Ditolak karena TOTP invalid"
      );
    } else {
      logResult(
        "TC-05",
        "Login dengan password benar tapi TOTP salah",
        "FAIL",
        "Sistem seharusnya menolak"
      );
    }
  } catch (error) {
    logResult(
      "TC-05",
      "Login dengan password benar tapi TOTP salah",
      "FAIL",
      error.message
    );
  }
}

async function TC06_DuplicateRegistration(userData) {
  try {
    const { username } = userData;
    const password = "AnotherPassword123!";

    await registerUser(username, password);
    logResult(
      "TC-06",
      "Registrasi dengan username yang sudah ada",
      "FAIL",
      "Sistem seharusnya menolak username duplikat"
    );
  } catch (error) {
    if (error.response && error.response.status === 400) {
      logResult(
        "TC-06",
        "Registrasi dengan username yang sudah ada",
        "PASS",
        "Error: username sudah terdaftar"
      );
    } else {
      logResult(
        "TC-06",
        "Registrasi dengan username yang sudah ada",
        "FAIL",
        error.message
      );
    }
  }
}

async function TC07_NonExistentUser() {
  try {
    const username = "nonexistent_user_12345";
    const password = "Password123!";
    const totpCode = "123456";

    await loginUser(username, password, totpCode);
    logResult(
      "TC-07",
      "Login dengan username yang tidak terdaftar",
      "FAIL",
      "Sistem seharusnya menolak user tidak terdaftar"
    );
  } catch (error) {
    if (error.response && error.response.status === 404) {
      logResult(
        "TC-07",
        "Login dengan username yang tidak terdaftar",
        "PASS",
        "Error: user tidak ditemukan"
      );
    } else {
      logResult(
        "TC-07",
        "Login dengan username yang tidak terdaftar",
        "FAIL",
        error.message
      );
    }
  }
}

async function TC08_ExpiredTOTP(userData) {
  try {
    const { username, password, totpSecret } = userData;

    // Generate TOTP for 2 minutes ago (expired)
    const expiredTime = Math.floor(Date.now() / 1000) - 120;
    const expiredTOTP = speakeasy.totp({
      secret: totpSecret,
      encoding: "base32",
      time: expiredTime,
    });

    const result = await loginUser(username, password, expiredTOTP);

    if (!result.success && !result.totpValid) {
      logResult(
        "TC-08",
        "Login dengan TOTP kadaluarsa (>90 detik)",
        "PASS",
        "Ditolak karena TOTP expired"
      );
    } else {
      logResult(
        "TC-08",
        "Login dengan TOTP kadaluarsa (>90 detik)",
        "FAIL",
        "Sistem seharusnya menolak TOTP kadaluarsa"
      );
    }
  } catch (error) {
    logResult(
      "TC-08",
      "Login dengan TOTP kadaluarsa (>90 detik)",
      "FAIL",
      error.message
    );
  }
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runFunctionalTests() {
  console.log("\n========================================");
  console.log("FUNCTIONAL TESTING - ZKP + TOTP System");
  console.log("========================================\n");
  console.log("⚠️  Pastikan server sudah berjalan di http://localhost:3001\n");

  // Test user data
  let userData = null;

  // Run all test cases
  userData = await TC01_NormalRegistration();

  if (userData) {
    await TC02_NormalLogin(userData);
    await TC03_WrongPassword(userData);
    await TC04_WrongTOTP(userData);
    await TC05_CorrectPasswordWrongTOTP(userData);
    await TC06_DuplicateRegistration(userData);
    await TC08_ExpiredTOTP(userData);
  }

  await TC07_NonExistentUser();

  // Print summary
  console.log("\n========================================");
  console.log("TEST SUMMARY");
  console.log("========================================\n");

  const passed = testResults.filter((r) => r.status === "PASS").length;
  const failed = testResults.filter((r) => r.status === "FAIL").length;
  const total = testResults.length;

  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed} ✓`);
  console.log(`Failed: ${failed} ✗`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(2)}%`);

  // Print detailed results
  console.log("\n========================================");
  console.log("DETAILED RESULTS");
  console.log("========================================\n");

  testResults.forEach((result) => {
    const icon = result.status === "PASS" ? "✓" : "✗";
    console.log(`${icon} [${result.id}] ${result.name}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Details: ${result.details}\n`);
  });

  // Save results to file
  const fs = require("fs");
  const path = require("path");

  // Create outputs directory if it doesn't exist
  const outputDir = path.join(process.cwd(), "outputs");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "functional-test-results.json");
  fs.writeFileSync(outputPath, JSON.stringify(testResults, null, 2));
  console.log(`✓ Results saved to ${outputPath}\n`);
}

// Run tests
if (require.main === module) {
  runFunctionalTests().catch(console.error);
}

module.exports = { runFunctionalTests };
