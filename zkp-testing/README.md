# 🧪 Comprehensive Testing Suite

## Two-Factor Authentication dengan ZKP + TOTP

Testing suite lengkap untuk skripsi **"Implementasi Two-Factor Authentication pada Aplikasi Web Menggunakan Zero Knowledge Proof dan Time-based One-Time Password"**

---

## 📋 Daftar Isi

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Running Tests](#running-tests)
5. [Test Coverage](#test-coverage)
6. [Output Files](#output-files)
7. [Interpreting Results](#interpreting-results)

---

## 🎯 Overview

Suite pengujian ini mencakup 3 kategori utama sesuai dengan Bab 4 skripsi:

### 1. **Functional Testing** (Tabel 4.2)

- TC-01: Registrasi normal
- TC-02: Login dengan kredensial valid
- TC-03: Login dengan password salah
- TC-04: Login dengan TOTP salah
- TC-05: Login dengan password benar tapi TOTP salah
- TC-06: Registrasi username duplikat
- TC-07: Login dengan user tidak terdaftar
- TC-08: Login dengan TOTP kadaluarsa

### 2. **Security Testing - Replay Attack** (Tabel 4.3 & 4.5)

- SEC-01: Replay ZKP proof segera setelah login
- SEC-02: Replay TOTP dalam time window
- SEC-03: Replay paket lengkap (ZKP + TOTP)
- SEC-04: Replay dengan sessionId sama
- SEC-05: Replay TOTP kadaluarsa (>90 detik)
- SEC-06: Man-in-the-Middle (password leakage test)
- SEC-07: Database breach simulation

### 3. **Performance Testing** (Tabel 4.7 & 4.9)

- PERF-01: Client-side key generation
- PERF-02: Waktu registrasi
- PERF-03: Request challenge
- PERF-04: Generate ZKP proof
- PERF-05: Complete login time
- PERF-06: Concurrent load (100 users)
- PERF-07: Server-side verification
- PERF-08: Overhead comparison

---

## 📦 Prerequisites

### 1. Backend Server

Pastikan backend server sudah berjalan:

```bash
cd zkp-totp-project
node server.js
```

Server harus berjalan di `http://localhost:3001`

### 2. Node.js

- Node.js versi 16.x atau lebih baru
- npm atau yarn

---

## 🚀 Installation

### Langkah 1: Copy semua file testing ke folder testing

```bash
# Buat folder testing di root project
mkdir testing
cd testing

# Copy semua file:
# - run-all-tests.js
# - test-functional.js
# - test-replay-attack.js
# - test-performance.js
# - package.json
```

### Langkah 2: Install dependencies

```bash
npm install
```

Dependencies yang akan diinstall:

- `axios`: HTTP client untuk API calls
- `speakeasy`: TOTP generation dan verification

---

## 🧪 Running Tests

### Option 1: Run All Tests (Recommended)

Menjalankan semua pengujian secara berurutan:

```bash
npm run test:all
```

atau

```bash
node run-all-tests.js
```

Menu interaktif akan muncul:

```
Pilih mode pengujian:
1. Functional Testing Only
2. Security Testing Only
3. Performance Testing Only
4. Run All Tests (Recommended)

Pilihan (1-4):
```

### Option 2: Run Individual Tests

**Functional Testing Only:**

```bash
npm run test:functional
```

**Security Testing Only:**

```bash
npm run test:security
```

**Performance Testing Only:**

```bash
npm run test:performance
```

---

## 📊 Test Coverage

### Functional Testing Coverage

| ID    | Test Case                    | Expected Result          |
| ----- | ---------------------------- | ------------------------ |
| TC-01 | Normal registration          | QR code generated        |
| TC-02 | Normal login                 | Login success            |
| TC-03 | Wrong password               | ZKP verification failed  |
| TC-04 | Wrong TOTP                   | TOTP verification failed |
| TC-05 | Correct password, wrong TOTP | Ditolak (TOTP invalid)   |
| TC-06 | Duplicate username           | Error: username exists   |
| TC-07 | Non-existent user            | Error: user not found    |
| TC-08 | Expired TOTP                 | Ditolak (TOTP expired)   |

### Security Testing Coverage

| ID     | Skenario             | Mekanisme Proteksi          | Status    |
| ------ | -------------------- | --------------------------- | --------- |
| SEC-01 | ZKP replay immediate | Challenge deleted after use | Protected |
| SEC-02 | TOTP window replay   | Time-based expiration       | Protected |
| SEC-03 | Full packet replay   | Combined protection         | Protected |
| SEC-04 | SessionID replay     | Challenge not stored        | Protected |
| SEC-05 | Expired TOTP         | TOTP auto-expires           | Protected |
| SEC-06 | Password leakage     | Never transmitted           | Protected |
| SEC-07 | Database breach      | Only public key stored      | Protected |

### Performance Testing Metrics

| Operasi                | Target       | Actual (akan diukur) |
| ---------------------- | ------------ | -------------------- |
| Client-side key gen    | < 50 ms      | ?                    |
| Registration (total)   | < 200 ms     | ?                    |
| Challenge request      | < 20 ms      | ?                    |
| ZKP proof generation   | < 50 ms      | ?                    |
| Complete login         | < 100 ms     | ?                    |
| Concurrent (100 users) | 100% success | ?                    |

---

## 📁 Output Files

Setelah pengujian selesai, file-file berikut akan dibuat di `/mnt/user-data/outputs/`:

### 1. `functional-test-results.json`

```json
[
  {
    "id": "TC-01",
    "name": "Registrasi dengan username dan password valid",
    "status": "PASS",
    "details": "QR Code dan secret TOTP berhasil dibuat",
    "timestamp": "2025-01-..."
  },
  ...
]
```

### 2. `replay-attack-test-results.json`

```json
[
  {
    "id": "SEC-01",
    "name": "Replay bukti ZKP segera setelah login berhasil",
    "status": "SECURE",
    "details": "Challenge dihapus setelah digunakan",
    "securityLevel": "PROTECTED",
    "timestamp": "2025-01-..."
  },
  ...
]
```

### 3. `performance-test-results.json`

```json
{
  "summary": {
    "keyGen": {
      "mean": "45.23",
      "stdDev": "8.12",
      "p95": "58.45"
    },
    "login": {
      "mean": "95.67",
      "stdDev": "15.23",
      "p95": "120.34"
    },
    ...
  },
  "rawData": [...]
}
```

### 4. `comprehensive-test-report.json`

Laporan lengkap yang menggabungkan semua hasil pengujian dengan:

- Metadata (timestamp, durasi total)
- Summary functional testing
- Summary security testing
- Summary performance testing
- Overall system assessment
- Final score

---

## 📈 Interpreting Results

### Functional Testing

✅ **PASS**: Test case berhasil sesuai expected result
❌ **FAIL**: Test case gagal, ada bug atau issue

**Target**: 100% test cases PASS

### Security Testing

🟢 **SECURE**: Sistem berhasil mencegah serangan
🔴 **VULNERABLE**: Sistem rentan terhadap serangan
⚪ **ERROR**: Error saat testing

**Risk Levels**:

- 🟢 **PROTECTED**: Tidak ada risiko
- 🟡 **MEDIUM RISK**: Risiko sedang, perlu monitoring
- 🟠 **HIGH RISK**: Risiko tinggi, perlu perbaikan
- 🔴 **CRITICAL RISK**: Risiko kritis, harus diperbaiki segera

**Target**: 100% SECURE (semua serangan dapat dicegah)

### Performance Testing

**Kategorisasi Performa**:

- ✅ **Excellent**: Login time < 100ms
- ✅ **Good**: Login time < 300ms
- ⚠️ **Fair**: Login time < 1000ms
- ❌ **Poor**: Login time > 1000ms

**Load Test Target**:

- Success rate: ≥ 95%
- Average response: < 500ms
- P95: < 1000ms

### Overall Assessment

System mendapat **Final Score** berdasarkan:

- 40% dari Functional Testing
- 40% dari Security Testing
- 20% dari Performance Testing

**Grade**:

- 🎉 **≥ 90%**: Excellent - Siap deployment
- ✅ **≥ 75%**: Good - Perlu minor improvements
- ⚠️ **< 75%**: Needs Improvement

---

## 🐛 Troubleshooting

### Error: "connect ECONNREFUSED 127.0.0.1:3001"

**Solusi**: Pastikan backend server sudah berjalan

```bash
cd zkp-totp-project
node server.js
```

### Error: "Module not found"

**Solusi**: Install dependencies

```bash
npm install
```

### Test gagal dengan rate "Challenge tidak valid"

**Solusi**: Restart backend server untuk reset state

```bash
# Stop server (Ctrl+C)
# Start again
node server.js
```

### Performance test timeout

**Solusi**: Tingkatkan timeout atau kurangi jumlah concurrent users
Edit `test-performance.js` line yang mengatur iterations/concurrent users

---

## 📝 Untuk Laporan Skripsi

Hasil pengujian ini dapat digunakan untuk:

### Bab 4 - Hasil dan Analisis

1. **Tabel 4.2**: Hasil Pengujian Fungsionalitas (dari functional-test-results.json)
2. **Tabel 4.3**: Hasil Pengujian Replay Attack (dari replay-attack-test-results.json)
3. **Tabel 4.5**: Perbandingan dengan Sistem Tradisional (dari comprehensive report)
4. **Tabel 4.7**: Hasil Pengukuran Waktu Respons (dari performance-test-results.json)
5. **Tabel 4.9**: Waktu Eksekusi Operasi Kriptografi (dari performance rawData)

### Grafik dan Visualisasi

Data JSON dapat diimport ke Excel/Google Sheets untuk membuat:

- Bar chart: Success rate per kategori test
- Line chart: Response time distribution
- Pie chart: Security risk assessment
- Table: Detailed test results

---

## 👨‍💻 Support

Jika ada pertanyaan atau issue:

1. Pastikan semua prerequisites terpenuhi
2. Check backend server logs untuk error messages
3. Review output JSON files untuk detail error
4. Restart backend dan coba lagi

---

## 📄 License

MIT License - For educational/thesis purposes

---

## ✅ Quick Start Checklist

- [ ] Backend server running (`node server.js`)
- [ ] Dependencies installed (`npm install`)
- [ ] Server accessible at `http://localhost:3001`
- [ ] Run tests (`npm run test:all`)
- [ ] Check output files in `/mnt/user-data/outputs/`
- [ ] Review comprehensive report
- [ ] Use results for thesis documentation

---

**Good luck with your thesis! 🎓**
