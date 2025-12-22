# 🚀 QUICK START GUIDE

## Testing Suite untuk Skripsi ZKP + TOTP

---

## ⚡ Setup Cepat (5 Menit)

### 1️⃣ Persiapan Folder

```bash
# Pindahkan semua file testing ke folder terpisah
mkdir zkp-testing
cd zkp-testing

# File yang diperlukan (sudah ada di outputs):
# - run-all-tests.js
# - test-functional.js
# - test-replay-attack.js
# - test-performance.js
# - package.json
# - README.md
# - generate-visualizations.py
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Start Backend Server

**Di terminal terpisah:**

```bash
cd ../zkp-totp-project
node server.js
```

Pastikan muncul:

```
🚀 Server berjalan di http://localhost:3001
🔐 Siap menerima request registrasi dan login
```

### 4️⃣ Run Tests

```bash
# Kembali ke folder testing
cd ../zkp-testing

# Run semua test
npm run test:all

# Pilih option 4 (Run All Tests)
```

---

## 📊 Hasil yang Diharapkan

### ✅ Functional Testing

```
Total Tests: 8
Passed: 8 ✓
Failed: 0 ✗
Success Rate: 100.00%
```

### 🔒 Security Testing

```
Total Tests: 7
Secure: 7 ✓
Vulnerable: 0 ⚠️
Security Score: 100.00%
```

### ⏱️ Performance Testing

```
Average Login Time: ~95 ms
Concurrent Users: 100
Success Rate: 100.00%
```

---

## 📁 Output Files (untuk Skripsi)

Setelah testing selesai, cek folder `outputs/`:

### 1. JSON Files (Data Mentah)

- `functional-test-results.json` → untuk Tabel 4.2
- `replay-attack-test-results.json` → untuk Tabel 4.3
- `performance-test-results.json` → untuk Tabel 4.7, 4.9
- `comprehensive-test-report.json` → Summary lengkap

### 2. Generate Visualisasi (Optional)

```bash
# Install matplotlib dulu
pip install matplotlib pandas seaborn

# Generate charts
python generate-visualizations.py
```

Akan menghasilkan:

- `charts/functional-test-results.png` → Bar chart hasil functional testing
- `charts/security-test-results.png` → Security status dan risk level
- `charts/performance-test-results.png` → Response time dan load test
- `charts/comprehensive-summary.png` → Overall score
- `charts/system-comparison.png` → Perbandingan dengan sistem tradisional

Dan CSV files untuk tabel di Word:

- `functional-test-results.csv`
- `security-test-results.csv`
- `performance-test-results.csv`
- `system-comparison.csv`

---

## 🎯 Mapping ke Bab 4 Skripsi

| File Output                       | Untuk Tabel/Gambar di Bab 4                   |
| --------------------------------- | --------------------------------------------- |
| `functional-test-results.json`    | **Tabel 4.2**: Hasil Pengujian Fungsionalitas |
| `functional-test-results.png`     | **Gambar 4.X**: Grafik status test cases      |
| `replay-attack-test-results.json` | **Tabel 4.3**: Hasil Pengujian Keamanan       |
| `security-test-results.png`       | **Gambar 4.X**: Grafik security assessment    |
| `performance-test-results.json`   | **Tabel 4.7**: Waktu Respons Sistem           |
| `performance-test-results.json`   | **Tabel 4.9**: Waktu Eksekusi Operasi         |
| `performance-test-results.png`    | **Gambar 4.X**: Grafik performa               |
| `system-comparison.csv`           | **Tabel 4.5**: Perbandingan Sistem            |
| `comprehensive-test-report.json`  | Overall Assessment dan Conclusion             |

---

## 🔧 Troubleshooting Cepat

### ❌ Error: ECONNREFUSED

**Masalah**: Backend tidak jalan
**Solusi**:

```bash
cd zkp-totp-project
node server.js
```

### ❌ Error: Module not found

**Masalah**: Dependencies belum install
**Solusi**:

```bash
npm install
```

### ❌ Test Gagal "Challenge tidak valid"

**Masalah**: Server state kotor
**Solusi**: Restart server

```bash
# Stop (Ctrl+C) lalu start lagi
node server.js
```

---

## 📝 Checklist Sebelum Run Test

- [ ] ✅ Backend server running di http://localhost:3001
- [ ] ✅ Dependencies installed (`npm install`)
- [ ] ✅ Server fresh start (baru di-restart)
- [ ] ✅ Port 3001 tidak digunakan aplikasi lain
- [ ] ✅ Node.js version 16+ (`node --version`)

---

## 💡 Tips untuk Dokumentasi Skripsi

### 1. Copy JSON ke Excel/Word

```bash
# Buka file JSON, copy content
# Paste ke online JSON to Table converter
# Atau import langsung ke Excel
```

### 2. Customize Testing

Edit file test untuk adjust:

- Jumlah iterations (line ~140 di test-performance.js)
- Concurrent users (line ~200 di test-performance.js)
- Test timeout settings

### 3. Screenshot untuk Laporan

Ambil screenshot dari:

- Terminal output saat test running
- Comprehensive test report summary
- Charts yang di-generate

---

## ⏱️ Estimasi Waktu

- Setup + Install: **3-5 menit**
- Run Functional Tests: **2-3 menit**
- Run Security Tests: **3-4 menit**
- Run Performance Tests: **5-10 menit** (termasuk 100 concurrent)
- Generate Charts: **1 menit**

**Total: ~15-25 menit** untuk complete testing suite

---

## 🎓 Next Steps

1. ✅ Run all tests
2. ✅ Generate visualizations
3. ✅ Review comprehensive report
4. ✅ Copy results ke dokumen skripsi
5. ✅ Include charts di Bab 4
6. ✅ Prepare presentation slides

---

## 📞 Need Help?

**Common Issues:**

1. Server not responding → Check if port 3001 is free
2. Slow performance tests → Normal, wait patiently
3. Some tests fail → Restart server and try again
4. Visualization error → Install matplotlib: `pip install matplotlib pandas seaborn`

---

**Good luck with your testing and thesis defense! 🎉**

_File ini adalah quick reference. Untuk detail lengkap, baca README.md_
