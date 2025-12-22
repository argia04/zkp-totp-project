# 📖 EXAMPLE COMMANDS & EXPECTED OUTPUT

## Contoh Penggunaan Testing Suite

---

## 🧪 Individual Test Commands

### 1. Functional Testing Only

```bash
npm run test:functional
# atau
node test-functional.js
```

**Expected Output:**

```
========================================
FUNCTIONAL TESTING - ZKP + TOTP System
========================================

⚠️  Pastikan server sudah berjalan di http://localhost:3001

[TC-01] Registrasi dengan username dan password valid
Status: PASS
Details: QR Code dan secret TOTP berhasil dibuat

[TC-02] Login dengan kredensial valid dan TOTP benar
Status: PASS
Details: Autentikasi berhasil

[TC-03] Login dengan password salah
Status: PASS
Details: Verifikasi ZKP gagal seperti yang diharapkan

[TC-04] Login dengan TOTP salah
Status: PASS
Details: Verifikasi TOTP gagal seperti yang diharapkan

[TC-05] Login dengan password benar tapi TOTP salah
Status: PASS
Details: Ditolak karena TOTP invalid

[TC-06] Registrasi dengan username yang sudah ada
Status: PASS
Details: Error: username sudah terdaftar

[TC-07] Login dengan username yang tidak terdaftar
Status: PASS
Details: Error: user tidak ditemukan

[TC-08] Login dengan TOTP kadaluarsa (>90 detik)
Status: PASS
Details: Ditolak karena TOTP expired

========================================
TEST SUMMARY
========================================

Total Tests: 8
Passed: 8 ✓
Failed: 0 ✗
Success Rate: 100.00%

✓ Results saved to functional-test-results.json
```

---

### 2. Security Testing (Replay Attack) Only

```bash
npm run test:security
# atau
node test-replay-attack.js
```

**Expected Output:**

```
========================================
REPLAY ATTACK SECURITY TESTING
ZKP + TOTP Authentication System
========================================

⚠️  Pastikan server sudah berjalan di http://localhost:3001

🔧 Setting up test user...
✓ Test user created: replay_test_1704123456789

🔒 Testing: Immediate ZKP Proof Replay...
✓ Original authentication succeeded
  - ZKP Valid: true
  - TOTP Valid: true
  - Auth Success: true

⚠️  Attempting replay attack...

[SEC-01] Replay bukti ZKP segera setelah login berhasil
Status: SECURE
Security: PROTECTED
Details: Challenge dihapus setelah digunakan. Replay ditolak.

🔒 Testing: TOTP within Time Window Replay...
✓ TOTP Code generated: 123456
  Current time window is valid for ~30 seconds
✓ First authentication succeeded
⚠️  Attempting to reuse same TOTP code...

[SEC-02] Replay kode TOTP dalam jendela waktu yang sama
Status: SECURE
Security: MEDIUM RISK
Details: Window tolerance terbatas (90 detik) - TOTP nonce tracking direkomendasikan

[... SEC-03 through SEC-07 ...]

========================================
SECURITY TEST SUMMARY
========================================

Total Tests: 7
Secure: 7 ✓
Vulnerable: 0 ⚠️
Errors: 0 ❌
Security Score: 100.00%

========================================
RISK ASSESSMENT
========================================

Critical Risk: 0 🔴
High Risk: 0 🟠
Medium Risk: 0 🟡
Protected: 7 🟢

✓ Results saved to replay-attack-test-results.json
```

---

### 3. Performance Testing Only

```bash
npm run test:performance
# atau
node test-performance.js
```

**Expected Output:**

```
========================================
PERFORMANCE TESTING
ZKP + TOTP Authentication System
========================================

⚠️  Pastikan server sudah berjalan di http://localhost:3001

⏱️  Testing: Client-side Key Generation Performance...
✓ Completed 100 iterations
  Average: 45.23 ms
  Std Dev: ±8.12 ms
  Min: 38.45 ms
  Max: 62.34 ms
  P50: 44.56 ms
  P95: 58.45 ms

⏱️  Testing: Registration Performance (with TOTP setup)...
✓ Completed 50 registrations
  Average: 180.45 ms
  Std Dev: ±25.34 ms
  P95: 220.67 ms

⏱️  Testing: Challenge Request Performance...
✓ Completed 100 challenge requests
  Average: 12.34 ms
  Std Dev: ±3.21 ms
  P95: 18.45 ms

⏱️  Testing: ZKP Proof Generation (client-side)...
✓ Completed 100 proof generations
  Average: 38.67 ms
  Std Dev: ±6.23 ms
  P95: 50.12 ms

⏱️  Testing: Complete Login Time (end-to-end)...
✓ Completed 50 full logins
  Average: 95.67 ms
  Std Dev: ±15.23 ms
  P95: 120.34 ms
  P99: 135.67 ms

⏱️  Testing: Server-side ZKP Verification Time...
✓ Completed 50 verifications
  Average: 28.45 ms
  Std Dev: ±5.12 ms
  P95: 38.23 ms

⏱️  Testing: Computational Overhead Comparison...

  📊 Client-side operations:
    Total client computation: 245.67 ms

  📊 Server-side operations:
    Total server verification: 32.45 ms

  📊 Overhead Summary:
    Client-side: 245.67 ms
    Server-side: 32.45 ms
    Total: 278.12 ms
    Distribution: 88.3% client, 11.7% server

⏱️  Testing: Concurrent Login Performance...
  Setting up 100 test users...
    20/100 users created...
    40/100 users created...
    60/100 users created...
    80/100 users created...
    100/100 users created...
✓ All users created

  Executing 100 concurrent logins...

📊 Concurrent Load Test Results:
  Total Users: 100
  Successful: 100
  Failed: 0
  Success Rate: 100.00%
  Total Time: 2456.78 ms
  Average Response Time: 145.23 ms
  Std Dev: ±28.45 ms
  P95: 220.34 ms
  P99: 285.67 ms
  Min: 98.45 ms
  Max: 320.12 ms

========================================
PERFORMANCE TEST SUMMARY
========================================

📊 Individual Operation Performance:
─────────────────────────────────────────

Client-side Key Generation:
  Average: 45.23 ms
  Std Dev: ±8.12 ms
  P95: 58.45 ms

Registration (with TOTP):
  Average: 180.45 ms
  Std Dev: ±25.34 ms
  P95: 220.67 ms

[... other operations ...]

Complete Login (end-to-end):
  Average: 95.67 ms
  Std Dev: ±15.23 ms
  P95: 120.34 ms

📊 Overhead Distribution:
─────────────────────────────────────────
  Client-side: 245.67 ms
  Server-side: 32.45 ms
  Total: 278.12 ms

📊 Load Test Results (100 concurrent users):
─────────────────────────────────────────
  Success Rate: 100.00%
  Total Time: 2456.78 ms
  Average Response: 145.23 ms
  P95: 220.34 ms
  P99: 285.67 ms

========================================
PERFORMANCE ASSESSMENT
========================================

✓ Excellent: Login time < 100ms (terasa instant)
✓ Excellent: 100% success rate under load

✓ Results saved to performance-test-results.json
```

---

### 4. Run All Tests (Comprehensive)

```bash
npm run test:all
# atau
node run-all-tests.js
```

**Interactive Menu:**

```
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║          COMPREHENSIVE TESTING SUITE                          ║
║          ZKP + TOTP Authentication System                     ║
║                                                                ║
║  Skripsi: Implementasi Two-Factor Authentication pada         ║
║           Aplikasi Web Menggunakan Zero Knowledge Proof       ║
║           dan Time-based One-Time Password                    ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

📋 Test Suite Overview:
  1. Functional Testing (TC-01 to TC-08)
  2. Security Testing - Replay Attack (SEC-01 to SEC-07)
  3. Performance Testing (Load & Response Time)

⚠️  Prerequisites:
  - Backend server running on http://localhost:3001
  - Node.js with required dependencies installed

Pilih mode pengujian:
1. Functional Testing Only
2. Security Testing Only
3. Performance Testing Only
4. Run All Tests (Recommended)

Pilihan (1-4): 4

🚀 Running All Tests...

======================================================================
PHASE 1/3: FUNCTIONAL TESTING
======================================================================

[... functional test output ...]

======================================================================
PHASE 2/3: SECURITY TESTING (REPLAY ATTACK)
======================================================================

[... security test output ...]

======================================================================
PHASE 3/3: PERFORMANCE TESTING
======================================================================

[... performance test output ...]

╔════════════════════════════════════════════════════════════════╗
║                    FINAL TEST REPORT                           ║
╚════════════════════════════════════════════════════════════════╝

📊 Functional Testing Results:
   Total Tests: 8
   Passed: 8 ✓
   Failed: 0 ✗
   Success Rate: 100.00%

🔒 Security Testing Results (Replay Attack):
   Total Tests: 7
   Secure: 7 ✓
   Vulnerable: 0 ⚠️
   Security Score: 100.00%

⏱️  Performance Testing Results:
   Average Login Time: 95.67 ms
   Concurrent Users: 100
   Success Rate: 100.00%
   P95 Response Time: 220.34 ms

═══════════════════════════════════════════════════════════════
OVERALL SYSTEM ASSESSMENT
═══════════════════════════════════════════════════════════════

✓ Fungsionalitas: EXCELLENT (Semua test case passed)
✓ Keamanan: EXCELLENT (Tahan terhadap semua replay attack)
✓ Performa: EXCELLENT (Login <100ms, 100% success rate)

───────────────────────────────────────────────────────────────
SKOR KESELURUHAN: 100.00% (100.0/100)
───────────────────────────────────────────────────────────────

🎉 KESIMPULAN: Sistem sangat baik dan siap untuk deployment

📁 Output Files:
   - functional-test-results.json
   - replay-attack-test-results.json
   - performance-test-results.json
   - comprehensive-test-report.json

✓ Comprehensive report saved

⏱️  Total execution time: 456.78 seconds
```

---

## 📊 Generate Visualizations

```bash
python generate-visualizations.py
```

**Expected Output:**

```
============================================================
VISUALIZATION GENERATOR
Generating charts and tables for thesis documentation
============================================================

📊 Generating visualizations...

✓ Functional testing chart saved: charts/functional-test-results.png
✓ Functional testing table saved: charts/functional-test-results.csv
✓ Security testing chart saved: charts/security-test-results.png
✓ Security testing table saved: charts/security-test-results.csv
✓ Performance testing chart saved: charts/performance-test-results.png
✓ Performance testing table saved: charts/performance-test-results.csv
✓ Comprehensive summary chart saved: charts/comprehensive-summary.png
✓ System comparison chart saved: charts/system-comparison.png

============================================================
✓ All visualizations generated successfully!
📁 Output directory: /mnt/user-data/outputs/charts
============================================================

Generated files:
  📊 Charts (PNG):
     - functional-test-results.png
     - security-test-results.png
     - performance-test-results.png
     - comprehensive-summary.png
     - system-comparison.png
  📋 Tables (CSV):
     - functional-test-results.csv
     - security-test-results.csv
     - performance-test-results.csv
     - system-comparison.csv

💡 These files can be used in your thesis documentation (Bab 4)
```

---

## 🐛 Common Error Messages & Solutions

### Error 1: Connection Refused

```
❌ Error during testing: connect ECONNREFUSED 127.0.0.1:3001

Pastikan:
  1. Server backend sudah berjalan di http://localhost:3001
  2. Semua dependencies sudah terinstall (npm install)
  3. Server dalam kondisi fresh start (restart jika perlu)
```

**Solution:**

```bash
# Terminal 1: Start backend
cd zkp-totp-project
node server.js

# Terminal 2: Run tests
cd zkp-testing
npm run test:all
```

### Error 2: Module Not Found

```
Error: Cannot find module 'axios'
```

**Solution:**

```bash
npm install
```

### Error 3: Challenge Tidak Valid

```
[TC-02] Login dengan kredensial valid dan TOTP benar
Status: FAIL
Details: Challenge tidak valid
```

**Solution:** Restart backend server

```bash
# Stop server (Ctrl+C)
# Start fresh
node server.js
```

---

## ⏱️ Performance Benchmarks

### Target Values (Tabel 4.7)

| Operation        | Target  | Good    | Acceptable |
| ---------------- | ------- | ------- | ---------- |
| Key Generation   | <50 ms  | <100 ms | <200 ms    |
| Registration     | <200 ms | <300 ms | <500 ms    |
| Challenge        | <20 ms  | <50 ms  | <100 ms    |
| Proof Gen        | <50 ms  | <100 ms | <200 ms    |
| Complete Login   | <100 ms | <300 ms | <1000 ms   |
| Concurrent (100) | 100%    | ≥95%    | ≥90%       |

### Expected Results

```json
{
  "keyGen": { "mean": "40-50 ms" },
  "registration": { "mean": "150-200 ms" },
  "challenge": { "mean": "10-20 ms" },
  "proofGen": { "mean": "30-50 ms" },
  "login": { "mean": "80-100 ms" },
  "concurrent": {
    "successCount": 100,
    "avgResponseTime": "120-150 ms"
  }
}
```

---

## 📋 Checklist untuk Dokumentasi Skripsi

- [ ] Run all tests successfully
- [ ] Verify all functional tests PASS
- [ ] Verify all security tests SECURE
- [ ] Check performance meets targets
- [ ] Generate visualizations
- [ ] Screenshot terminal outputs
- [ ] Copy JSON data untuk tabel
- [ ] Include charts di dokumen
- [ ] Write analysis di Bab 4
- [ ] Prepare for thesis defense

---

**Semua contoh output di atas adalah hasil yang diharapkan dengan sistem yang berfungsi dengan baik.**

_Jika hasil Anda berbeda signifikan, periksa kembali implementasi backend dan frontend._
