const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Database simulasi (dalam praktik gunakan database real)
const users = {};

// ========================================
// Konstanta untuk Schnorr Protocol
// Berdasarkan Notasi Bab 2 (Tabel 2.1):
//   p = Bilangan prima besar (modulus)
//   g = Generator grup
//   x = Nilai rahasia (private key)
//   y = g^x mod p (public key)
//   r = Nonce acak
//   t = g^r mod p (commitment)
//   c = Challenge
//   z = r + cx mod p (response)
// ========================================
const schnorr = {
  // p: Bilangan prima besar (modulus) - sesuai Tabel 2.1
  p: BigInt(
    "2410312426921032588552076022197566074856950548502459942654116941958108831682612228890093858261341614673227141477904012196503648957050582631942730706805009223062734745341073406696246014589361659774041027169249453200378729434170325843778659198143763193776859869524088940195577346119843545301547043747207749969763750084308926339295559968882457872412993810129130294592999947926365264059284647209730384947211681434464714438488520940127459844288859336526896320919633919"
  ),
  // g: Generator grup - sesuai Tabel 2.1
  g: BigInt(2),

  // Fungsi modular exponentiation: base^exp mod mod
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
};

// ========================================
// TOTP NONCE TRACKING - Mencegah Replay Attack
// ========================================
const TOTP_EXPIRY_MS = 120000; // 2 menit (cukup untuk 4 window TOTP)

function cleanupExpiredTOTPs(user) {
  if (!user.usedTOTPs) return;

  const now = Date.now();
  user.usedTOTPs = user.usedTOTPs.filter(
    (entry) => now - entry.timestamp < TOTP_EXPIRY_MS
  );
}

function isTOTPUsed(user, totpCode) {
  if (!user.usedTOTPs) return false;
  return user.usedTOTPs.some((entry) => entry.code === totpCode);
}

function markTOTPAsUsed(user, totpCode) {
  if (!user.usedTOTPs) {
    user.usedTOTPs = [];
  }
  user.usedTOTPs.push({
    code: totpCode,
    timestamp: Date.now(),
  });
}

// ========================================
// CHALLENGE EXPIRY - Mencegah Challenge Lama
// ========================================
const CHALLENGE_EXPIRY_MS = 60000; // 1 menit

function cleanupExpiredChallenges(user) {
  if (!user.challenges) return;

  const now = Date.now();
  for (const sessionId in user.challenges) {
    if (now - user.challenges[sessionId].timestamp > CHALLENGE_EXPIRY_MS) {
      delete user.challenges[sessionId];
    }
  }
}

// ========================================
// ENDPOINT: REGISTRASI
// Server menerima public key y = g^x mod p dari client
// ========================================
app.post("/api/register", async (req, res) => {
  const { username, publicKey } = req.body;

  console.log("\n===== REGISTRASI DIMULAI =====");
  console.log("Username:", username);
  console.log("Public Key (y) diterima:", publicKey);

  // Check if username already exists
  if (users[username]) {
    console.log("Username sudah terdaftar");
    console.log("================================\n");
    return res.status(400).json({
      success: false,
      error: "Username sudah terdaftar",
    });
  }

  // Generate TOTP secret
  const secret = speakeasy.generateSecret({
    name: `ZKP-Demo (${username})`,
    length: 20,
  });

  // Generate QR Code
  const qrCode = await QRCode.toDataURL(secret.otpauth_url);

  // Simpan user dengan struktur yang lebih lengkap
  // y (publicKey) disimpan di server, x (privateKey) TIDAK PERNAH dikirim
  users[username] = {
    y: BigInt(publicKey), // y = public key (sesuai notasi Tabel 2.1)
    totpSecret: secret.base32,
    challenges: {},
    usedTOTPs: [], // Track TOTP yang sudah digunakan
    createdAt: Date.now(),
  };

  console.log("User berhasil terdaftar");
  console.log("Public key (y) tersimpan di server");
  console.log("Private key (x) TIDAK PERNAH dikirim ke server");
  console.log("TOTP Secret:", secret.base32);
  console.log("================================\n");

  res.json({
    success: true,
    totpSecret: secret.base32,
    qrCode: qrCode,
  });
});

// ========================================
// ENDPOINT: REQUEST CHALLENGE
// Server mengirim challenge (c) ke client - sesuai Persamaan 2.3
// ========================================
app.post("/api/challenge", (req, res) => {
  const { username } = req.body;

  if (!users[username]) {
    return res.status(404).json({ error: "User tidak ditemukan" });
  }

  const user = users[username];

  // Cleanup expired challenges
  cleanupExpiredChallenges(user);

  // Generate random challenge (c) - sesuai Persamaan 2.3: c ← Zp
  const c = schnorr.p - BigInt(Math.floor(Math.random() * 1000000000));
  const sessionId =
    Date.now().toString() + Math.random().toString(36).substring(2);

  // Simpan challenge dengan timestamp
  user.challenges[sessionId] = {
    value: c,
    timestamp: Date.now(),
  };

  console.log("\n===== CHALLENGE DIKIRIM =====");
  console.log("Username:", username);
  console.log("Challenge (c):", c.toString().substring(0, 30) + "...");
  console.log("Session ID:", sessionId);
  console.log("Expires in:", CHALLENGE_EXPIRY_MS / 1000, "seconds");
  console.log("================================\n");

  res.json({
    challenge: c.toString(),
    sessionId: sessionId,
  });
});

// ========================================
// ENDPOINT: VERIFY ZKP + TOTP
// Verifikasi sesuai Persamaan 2.5: g^z ≡ t · y^c (mod p)
// ========================================
app.post("/api/verify", (req, res) => {
  const { username, commitment, response, sessionId, totpCode } = req.body;

  console.log("\n===== VERIFIKASI DIMULAI =====");
  console.log("Username:", username);

  const user = users[username];
  if (!user) {
    return res.status(404).json({ error: "User tidak ditemukan" });
  }

  // Cleanup expired data
  cleanupExpiredChallenges(user);
  cleanupExpiredTOTPs(user);

  // ========================================
  // LAYER 1: VERIFIKASI ZKP (4 Mekanisme Perlindungan)
  // ========================================
  console.log("\n========== LAYER 1: ZERO KNOWLEDGE PROOF ==========");

  // Mekanisme 1 & 3: One-Time Challenge & Session-Based Management
  const challengeData = user.challenges[sessionId];
  if (!challengeData) {
    console.log("\n[PROTEKSI] One-Time Challenge & Session Management");
    console.log("  → SessionID:", sessionId);
    console.log("  → Status: Challenge tidak ditemukan di storage");
    console.log(
      "  → Penyebab: Challenge sudah digunakan (one-time) atau sessionId invalid"
    );
    console.log("\n--- Hasil Verifikasi ZKP ---");
    console.log("  Hasil ZKP: INVALID ✗");
    console.log(
      "  Alasan: One-Time Challenge - challenge hanya dapat digunakan satu kali"
    );
    console.log("\n========== LAYER 2: TOTP (Dilewati) ==========");
    console.log("  TOTP tidak diverifikasi karena ZKP gagal");
    console.log("  Hasil TOTP: INVALID ✗");
    console.log("\n========== HASIL AKHIR: LOGIN GAGAL! ==========");
    console.log("  Replay Attack pada layer ZKP berhasil dicegah");
    console.log("================================\n");
    return res.json({
      success: false,
      error: "Challenge tidak valid atau sudah kadaluarsa",
      zkpValid: false,
      totpValid: false,
      challengeInvalid: true,
      protectionMechanism: "One-Time Challenge",
    });
  }

  // Mekanisme 2: Challenge Expiry
  const challengeAge = Date.now() - challengeData.timestamp;
  if (challengeAge > CHALLENGE_EXPIRY_MS) {
    delete user.challenges[sessionId];
    console.log("\n[PROTEKSI] Challenge Expiry");
    console.log(
      "  → Challenge dibuat:",
      new Date(challengeData.timestamp).toISOString()
    );
    console.log(
      "  → Umur challenge:",
      (challengeAge / 1000).toFixed(1),
      "detik"
    );
    console.log("  → Batas waktu:", CHALLENGE_EXPIRY_MS / 1000, "detik");
    console.log("  → Status: KADALUARSA");
    console.log("\n--- Hasil Verifikasi ZKP ---");
    console.log("  Hasil ZKP: INVALID ✗");
    console.log(
      "  Alasan: Challenge Expiry - challenge melewati batas waktu 1 menit"
    );
    console.log("\n========== LAYER 2: TOTP (Dilewati) ==========");
    console.log("  TOTP tidak diverifikasi karena ZKP gagal");
    console.log("  Hasil TOTP: INVALID ✗");
    console.log("\n========== HASIL AKHIR: LOGIN GAGAL! ==========");
    console.log("  Replay Attack dengan challenge kadaluarsa berhasil dicegah");
    console.log("================================\n");
    return res.json({
      success: false,
      error: "Challenge sudah kadaluarsa",
      zkpValid: false,
      totpValid: false,
      challengeExpired: true,
      protectionMechanism: "Challenge Expiry",
    });
  }

  // ========================================
  // Mekanisme 4: Random Nonce - Verifikasi matematis Schnorr
  // Notasi sesuai Tabel 2.1 dan Persamaan 2.5:
  //   t = commitment (g^r mod p)
  //   z = response (r + cx mod p)
  //   c = challenge
  //   y = public key (g^x mod p)
  // Verifikasi: g^z ≡ t · y^c (mod p)
  // ========================================
  console.log("\n[PROTEKSI] Random Nonce & Schnorr Verification");
  console.log("  → Commitment (t) diterima dari client");
  console.log("  → Response (z) diterima dari client");
  console.log(
    "  → Challenge (c) dari server:",
    challengeData.value.toString().substring(0, 30) + "..."
  );

  // Parse nilai sesuai notasi Tabel 2.1
  const t = BigInt(commitment); // t = commitment (Persamaan 2.2)
  const z = BigInt(response); // z = response (Persamaan 2.4)
  const c = challengeData.value; // c = challenge (Persamaan 2.3)
  const y = user.y; // y = public key (Persamaan 2.1)

  console.log("\n  Verifikasi Schnorr (Persamaan 2.5): g^z ≡ t × y^c (mod p)");

  // Calculate left side: g^z mod p
  const leftSide = schnorr.modPow(schnorr.g, z, schnorr.p);
  console.log(
    "  → Left side (g^z mod p):",
    leftSide.toString().substring(0, 40) + "..."
  );

  // Calculate right side: t * y^c mod p
  const yPowC = schnorr.modPow(y, c, schnorr.p);
  const rightSide = (t * yPowC) % schnorr.p;
  console.log(
    "  → Right side (t × y^c mod p):",
    rightSide.toString().substring(0, 40) + "..."
  );

  const zkpValid = leftSide === rightSide;

  console.log("\n--- Hasil Verifikasi ZKP ---");
  console.log("  Hasil ZKP:", zkpValid ? "VALID ✓" : "INVALID ✗");

  if (!zkpValid) {
    // Hapus challenge setelah digunakan (gagal atau berhasil)
    delete user.challenges[sessionId];
    console.log(
      "  Alasan: Bukti matematis tidak valid - kemungkinan password salah"
    );
    console.log("\n========== LAYER 2: TOTP (Dilewati) ==========");
    console.log("  TOTP tidak diverifikasi karena ZKP gagal");
    console.log("  Hasil TOTP: INVALID ✗");
    console.log("\n========== HASIL AKHIR: LOGIN GAGAL! ==========");
    console.log("================================\n");
    return res.json({
      success: false,
      error: "ZKP verification failed",
      zkpValid: false,
      totpValid: false,
    });
  }

  // ========================================
  // LAYER 2: VERIFIKASI TOTP (2 Mekanisme Perlindungan)
  // ========================================
  console.log("\n========== LAYER 2: TIME-BASED OTP ==========");
  console.log("  TOTP Code diterima:", totpCode);

  // Mekanisme 1: TOTP Nonce Tracking
  if (isTOTPUsed(user, totpCode)) {
    // Hapus challenge
    delete user.challenges[sessionId];
    console.log("\n[PROTEKSI] TOTP Nonce Tracking");
    console.log("  → Kode TOTP:", totpCode);
    console.log(
      "  → Status: Sudah pernah digunakan dalam",
      TOTP_EXPIRY_MS / 1000,
      "detik terakhir"
    );
    console.log("  → REPLAY ATTACK DETECTED!");
    console.log("\n--- Hasil Verifikasi TOTP ---");
    console.log("  Hasil TOTP: INVALID ✗");
    console.log(
      "  Alasan: TOTP Nonce Tracking - kode sudah tercatat sebagai used"
    );
    console.log("\n========== HASIL AKHIR: LOGIN GAGAL! ==========");
    console.log("  Replay Attack pada layer TOTP berhasil dicegah");
    console.log("  Flag: replayDetected = true");
    console.log("================================\n");
    return res.json({
      success: false,
      error: "TOTP sudah pernah digunakan",
      zkpValid: true,
      totpValid: false,
      replayDetected: true,
      protectionMechanism: "TOTP Nonce Tracking",
    });
  }

  // Mekanisme 2: TOTP Time Window Verification
  console.log("\n[PROTEKSI] TOTP Time Window");
  console.log("  → Window tolerance: ±1 (90 detik total)");

  const totpValid = speakeasy.totp.verify({
    secret: user.totpSecret,
    encoding: "base32",
    token: totpCode,
    window: 1,
  });

  console.log("\n--- Hasil Verifikasi TOTP ---");
  console.log("  Hasil TOTP:", totpValid ? "VALID ✓" : "INVALID ✗");

  if (!totpValid) {
    delete user.challenges[sessionId];
    console.log(
      "  Alasan: Kode TOTP tidak valid atau sudah kadaluarsa (>90 detik)"
    );
    console.log("\n========== HASIL AKHIR: LOGIN GAGAL! ==========");
    console.log("================================\n");
    return res.json({
      success: false,
      error: "TOTP tidak valid",
      zkpValid: true,
      totpValid: false,
      protectionMechanism: "TOTP Time Window",
    });
  }

  // TOTP valid, tandai sebagai sudah digunakan
  markTOTPAsUsed(user, totpCode);
  console.log("  → TOTP ditandai sebagai 'used' untuk mencegah replay");

  // Cleanup challenge (selalu hapus setelah verifikasi berhasil)
  delete user.challenges[sessionId];
  console.log("  → Challenge dihapus dari storage (one-time use)");

  console.log("\n========== HASIL AKHIR: LOGIN BERHASIL! ==========");
  console.log("  ZKP Valid: ✓");
  console.log("  TOTP Valid: ✓");
  console.log("  Autentikasi 2FA berhasil");
  console.log("================================\n");

  res.json({
    success: true,
    zkpValid: true,
    totpValid: true,
  });
});

// ========================================
// ENDPOINT: STATUS (untuk debugging)
// ========================================
app.get("/api/status", (req, res) => {
  const userCount = Object.keys(users).length;
  const userStats = {};

  for (const username in users) {
    const user = users[username];
    userStats[username] = {
      activeChallenges: Object.keys(user.challenges || {}).length,
      usedTOTPs: (user.usedTOTPs || []).length,
      createdAt: user.createdAt,
    };
  }

  res.json({
    serverTime: new Date().toISOString(),
    userCount,
    userStats,
    config: {
      challengeExpiryMs: CHALLENGE_EXPIRY_MS,
      totpExpiryMs: TOTP_EXPIRY_MS,
    },
  });
});

// ========================================
// ENDPOINT: CLEAR USED TOTPS (untuk testing)
// ========================================
app.post("/api/debug/clear-totp/:username", (req, res) => {
  const { username } = req.params;

  if (!users[username]) {
    return res.status(404).json({ error: "User tidak ditemukan" });
  }

  users[username].usedTOTPs = [];
  console.log(`Cleared used TOTPs for user: ${username}`);

  res.json({ success: true, message: "Used TOTPs cleared" });
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`ZKP + TOTP Authentication Server`);
  console.log(`========================================`);
  console.log(`Server berjalan di http://localhost:${PORT}`);
  console.log(`\nNotasi Protokol Schnorr (Tabel 2.1):`);
  console.log(`  p = Bilangan prima besar (modulus)`);
  console.log(`  g = Generator grup`);
  console.log(`  x = Private key (TIDAK disimpan di server)`);
  console.log(`  y = g^x mod p (Public key)`);
  console.log(`  r = Random nonce`);
  console.log(`  t = g^r mod p (Commitment)`);
  console.log(`  c = Challenge`);
  console.log(`  z = r + cx mod p (Response)`);
  console.log(`\nVerifikasi (Persamaan 2.5): g^z ≡ t × y^c (mod p)`);
  console.log(`\nFitur Keamanan:`);
  console.log(`  ✓ TOTP Nonce Tracking (Replay Prevention)`);
  console.log(`  ✓ Challenge Expiry (${CHALLENGE_EXPIRY_MS / 1000}s)`);
  console.log(`  ✓ TOTP Used Code Expiry (${TOTP_EXPIRY_MS / 1000}s)`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /api/register  - Registrasi user baru`);
  console.log(`  POST /api/challenge - Request challenge untuk login`);
  console.log(`  POST /api/verify    - Verifikasi ZKP + TOTP`);
  console.log(`  GET  /api/status    - Status server (debug)`);
  console.log(`\nSiap menerima request registrasi dan login\n`);
});
