/**
 * MASTER TEST RUNNER
 * Menjalankan semua pengujian: Functional, Replay Attack, dan Performance
 * Untuk Skripsi: Implementasi Two-Factor Authentication dengan ZKP + TOTP
 */

const { runFunctionalTests } = require("./test-functional");
const { runReplayAttackTests } = require("./test-replay-attack");
const { runPerformanceTests } = require("./test-performance");
const fs = require("fs");

async function generateComprehensiveReport() {
  console.log("\n");
  console.log(
    "╔════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║                                                                ║"
  );
  console.log(
    "║          COMPREHENSIVE TESTING SUITE                          ║"
  );
  console.log(
    "║          ZKP + TOTP Authentication System                     ║"
  );
  console.log(
    "║                                                                ║"
  );
  console.log(
    "║  Skripsi: Implementasi Two-Factor Authentication pada         ║"
  );
  console.log(
    "║           Aplikasi Web Menggunakan Zero Knowledge Proof       ║"
  );
  console.log(
    "║           dan Time-based One-Time Password                    ║"
  );
  console.log(
    "║                                                                ║"
  );
  console.log(
    "╚════════════════════════════════════════════════════════════════╝"
  );
  console.log("\n");

  const startTime = Date.now();

  console.log("📋 Test Suite Overview:");
  console.log("  1. Functional Testing (TC-01 to TC-08)");
  console.log("  2. Security Testing - Replay Attack (SEC-01 to SEC-07)");
  console.log("  3. Performance Testing (Load & Response Time)");
  console.log("\n⚠️  Prerequisites:");
  console.log("  - Backend server running on http://localhost:3001");
  console.log("  - Node.js with required dependencies installed");
  console.log("\n");

  // Ask user which tests to run
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      "Pilih mode pengujian:\n1. Functional Testing Only\n2. Security Testing Only\n3. Performance Testing Only\n4. Run All Tests (Recommended)\n\nPilihan (1-4): ",
      async (answer) => {
        rl.close();

        console.log("\n");

        try {
          switch (answer.trim()) {
            case "1":
              console.log("🚀 Running Functional Tests...\n");
              await runFunctionalTests();
              break;

            case "2":
              console.log("🚀 Running Security Tests (Replay Attack)...\n");
              await runReplayAttackTests();
              break;

            case "3":
              console.log("🚀 Running Performance Tests...\n");
              await runPerformanceTests();
              break;

            case "4":
            default:
              console.log("🚀 Running All Tests...\n");

              // Run functional tests
              console.log("\n" + "=".repeat(70));
              console.log("PHASE 1/3: FUNCTIONAL TESTING");
              console.log("=".repeat(70) + "\n");
              await runFunctionalTests();

              // Wait a bit between test suites
              await new Promise((r) => setTimeout(r, 2000));

              // Run security tests
              console.log("\n" + "=".repeat(70));
              console.log("PHASE 2/3: SECURITY TESTING (REPLAY ATTACK)");
              console.log("=".repeat(70) + "\n");
              await runReplayAttackTests();

              // Wait a bit between test suites
              await new Promise((r) => setTimeout(r, 2000));

              // Run performance tests
              console.log("\n" + "=".repeat(70));
              console.log("PHASE 3/3: PERFORMANCE TESTING");
              console.log("=".repeat(70) + "\n");
              await runPerformanceTests();

              break;
          }

          const endTime = Date.now();
          const totalTime = ((endTime - startTime) / 1000).toFixed(2);

          // Generate final report
          generateFinalReport(totalTime);

          resolve();
        } catch (error) {
          console.error("\n❌ Error during testing:", error.message);
          console.error("\nPastikan:");
          console.error(
            "  1. Server backend sudah berjalan di http://localhost:3001"
          );
          console.error(
            "  2. Semua dependencies sudah terinstall (npm install)"
          );
          console.error(
            "  3. Server dalam kondisi fresh start (restart jika perlu)"
          );
          resolve();
        }
      }
    );
  });
}

function generateFinalReport(totalTime) {
  console.log("\n\n");
  console.log(
    "╔════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║                    FINAL TEST REPORT                           ║"
  );
  console.log(
    "╚════════════════════════════════════════════════════════════════╝"
  );
  console.log("\n");

  // Load all test results
  let functionalResults = null;
  let securityResults = null;
  let performanceResults = null;

  try {
    const path = require("path");
    const outputPath = path.join(
      process.cwd(),
      "outputs",
      "functional-test-results.json"
    );
    functionalResults = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  } catch (e) {
    console.log("⚠️  Functional test results not found");
  }

  try {
    const path = require("path");
    const outputPath = path.join(
      process.cwd(),
      "outputs",
      "replay-attack-test-results.json"
    );
    securityResults = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  } catch (e) {
    console.log("⚠️  Security test results not found");
  }

  try {
    const path = require("path");
    const outputPath = path.join(
      process.cwd(),
      "outputs",
      "performance-test-results.json"
    );
    performanceResults = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  } catch (e) {
    console.log("⚠️  Performance test results not found");
  }

  // Generate comprehensive report
  const report = {
    metadata: {
      timestamp: new Date().toISOString(),
      totalDuration: `${totalTime} seconds`,
      thesis:
        "Implementasi Two-Factor Authentication pada Aplikasi Web Menggunakan Zero Knowledge Proof dan Time-based One-Time Password",
    },
    functionalTesting: null,
    securityTesting: null,
    performanceTesting: null,
    overallAssessment: {},
  };

  // Functional results
  if (functionalResults) {
    const passed = functionalResults.filter((r) => r.status === "PASS").length;
    const total = functionalResults.length;
    report.functionalTesting = {
      totalTests: total,
      passed: passed,
      failed: total - passed,
      successRate: `${((passed / total) * 100).toFixed(2)}%`,
      details: functionalResults,
    };

    console.log("📊 Functional Testing Results:");
    console.log(`   Total Tests: ${total}`);
    console.log(`   Passed: ${passed} ✓`);
    console.log(`   Failed: ${total - passed} ✗`);
    console.log(`   Success Rate: ${((passed / total) * 100).toFixed(2)}%`);
    console.log("");
  }

  // Security results
  if (securityResults) {
    const secure = securityResults.filter((r) => r.status === "SECURE").length;
    const vulnerable = securityResults.filter(
      (r) => r.status === "VULNERABLE"
    ).length;
    const total = securityResults.length;

    report.securityTesting = {
      totalTests: total,
      secure: secure,
      vulnerable: vulnerable,
      securityScore: `${((secure / total) * 100).toFixed(2)}%`,
      details: securityResults,
    };

    console.log("🔒 Security Testing Results (Replay Attack):");
    console.log(`   Total Tests: ${total}`);
    console.log(`   Secure: ${secure} ✓`);
    console.log(`   Vulnerable: ${vulnerable} ⚠️`);
    console.log(`   Security Score: ${((secure / total) * 100).toFixed(2)}%`);
    console.log("");
  }

  // Performance results
  if (performanceResults && performanceResults.summary) {
    const loginTime = parseFloat(performanceResults.summary.login.mean);
    const concurrentSuccess =
      performanceResults.summary.concurrent.successCount;

    report.performanceTesting = {
      averageLoginTime: `${loginTime.toFixed(2)} ms`,
      concurrentLoadTest: {
        users: 100,
        successRate: `${((concurrentSuccess / 100) * 100).toFixed(2)}%`,
        avgResponseTime:
          performanceResults.summary.concurrent.stats.mean + " ms",
        p95: performanceResults.summary.concurrent.stats.p95 + " ms",
      },
      overhead: performanceResults.summary.overhead,
      fullDetails: performanceResults.summary,
    };

    console.log("⏱️  Performance Testing Results:");
    console.log(`   Average Login Time: ${loginTime.toFixed(2)} ms`);
    console.log(`   Concurrent Users: 100`);
    console.log(
      `   Success Rate: ${((concurrentSuccess / 100) * 100).toFixed(2)}%`
    );
    console.log(
      `   P95 Response Time: ${performanceResults.summary.concurrent.stats.p95} ms`
    );
    console.log("");
  }

  // Overall assessment
  console.log(
    "═══════════════════════════════════════════════════════════════"
  );
  console.log("OVERALL SYSTEM ASSESSMENT");
  console.log(
    "═══════════════════════════════════════════════════════════════\n"
  );

  let overallScore = 0;
  let maxScore = 0;

  if (functionalResults) {
    const passed = functionalResults.filter((r) => r.status === "PASS").length;
    const total = functionalResults.length;
    overallScore += (passed / total) * 40; // 40% weight
    maxScore += 40;

    if (passed === total) {
      console.log("✓ Fungsionalitas: EXCELLENT (Semua test case passed)");
      report.overallAssessment.functionality = "EXCELLENT";
    } else if (passed >= total * 0.8) {
      console.log("✓ Fungsionalitas: GOOD (≥80% test case passed)");
      report.overallAssessment.functionality = "GOOD";
    } else {
      console.log("⚠️  Fungsionalitas: NEEDS IMPROVEMENT");
      report.overallAssessment.functionality = "NEEDS IMPROVEMENT";
    }
  }

  if (securityResults) {
    const secure = securityResults.filter((r) => r.status === "SECURE").length;
    const total = securityResults.length;
    overallScore += (secure / total) * 40; // 40% weight
    maxScore += 40;

    if (secure === total) {
      console.log("✓ Keamanan: EXCELLENT (Tahan terhadap semua replay attack)");
      report.overallAssessment.security = "EXCELLENT";
    } else if (secure >= total * 0.85) {
      console.log("✓ Keamanan: GOOD (Tahan terhadap mayoritas serangan)");
      report.overallAssessment.security = "GOOD";
    } else {
      console.log("⚠️  Keamanan: NEEDS IMPROVEMENT");
      report.overallAssessment.security = "NEEDS IMPROVEMENT";
    }
  }

  if (performanceResults && performanceResults.summary) {
    const loginTime = parseFloat(performanceResults.summary.login.mean);
    const concurrentSuccess =
      performanceResults.summary.concurrent.successCount;
    maxScore += 20;

    let perfScore = 0;
    if (loginTime < 100 && concurrentSuccess === 100) {
      perfScore = 20;
      console.log("✓ Performa: EXCELLENT (Login <100ms, 100% success rate)");
      report.overallAssessment.performance = "EXCELLENT";
    } else if (loginTime < 300 && concurrentSuccess >= 95) {
      perfScore = 15;
      console.log("✓ Performa: GOOD (Login <300ms, ≥95% success rate)");
      report.overallAssessment.performance = "GOOD";
    } else {
      perfScore = 10;
      console.log("⚠️  Performa: ACCEPTABLE (Dapat ditingkatkan)");
      report.overallAssessment.performance = "ACCEPTABLE";
    }
    overallScore += perfScore;
  }

  const finalScore = ((overallScore / maxScore) * 100).toFixed(2);
  report.overallAssessment.finalScore = `${finalScore}%`;

  console.log("\n" + "─".repeat(63));
  console.log(
    `SKOR KESELURUHAN: ${finalScore}% (${overallScore.toFixed(1)}/${maxScore})`
  );
  console.log("─".repeat(63) + "\n");

  if (parseFloat(finalScore) >= 90) {
    console.log("🎉 KESIMPULAN: Sistem sangat baik dan siap untuk deployment");
  } else if (parseFloat(finalScore) >= 75) {
    console.log(
      "✓ KESIMPULAN: Sistem baik dengan beberapa area untuk improvement"
    );
  } else {
    console.log(
      "⚠️  KESIMPULAN: Sistem memerlukan perbaikan sebelum deployment"
    );
  }

  console.log("\n📁 Output Files:");
  console.log("   - functional-test-results.json");
  console.log("   - replay-attack-test-results.json");
  console.log("   - performance-test-results.json");
  console.log("   - comprehensive-test-report.json");

  // Save comprehensive report
  const path = require("path");
  const outputDir = path.join(process.cwd(), "outputs");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "comprehensive-test-report.json");
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log("\n✓ Comprehensive report saved\n");
  console.log(`⏱️  Total execution time: ${totalTime} seconds\n`);
}

// Run the master test suite
if (require.main === module) {
  generateComprehensiveReport().catch(console.error);
}

module.exports = { generateComprehensiveReport };
