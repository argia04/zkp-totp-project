"""
VISUALIZATION GENERATOR
Generate charts and tables from test results for thesis documentation
Menghasilkan grafik dan tabel untuk dokumentasi skripsi

Requirements:
    pip install matplotlib pandas seaborn
"""

import json
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns
from pathlib import Path

# Set style
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")

OUTPUT_DIR = Path('outputs')
CHARTS_DIR = OUTPUT_DIR / 'charts'

# Create directories if they don't exist
OUTPUT_DIR.mkdir(exist_ok=True)
CHARTS_DIR.mkdir(exist_ok=True)

def load_json(filename):
    """Load JSON file from outputs directory"""
    try:
        with open(OUTPUT_DIR / filename, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"⚠️  {filename} not found. Run tests first.")
        return None

def generate_functional_chart():
    """Generate bar chart for functional testing results"""
    data = load_json('functional-test-results.json')
    if not data:
        return

    # Count pass/fail
    status_counts = {'PASS': 0, 'FAIL': 0}
    for test in data:
        status_counts[test['status']] = status_counts.get(test['status'], 0) + 1

    # Create chart
    fig, ax = plt.subplots(figsize=(10, 6))

    colors = ['#2ecc71', '#e74c3c']
    bars = ax.bar(status_counts.keys(), status_counts.values(), color=colors, alpha=0.8)

    ax.set_title('Functional Testing Results\nTest Cases Status Distribution',
                 fontsize=16, fontweight='bold', pad=20)
    ax.set_ylabel('Number of Test Cases', fontsize=12)
    ax.set_xlabel('Status', fontsize=12)

    # Add value labels on bars
    for bar in bars:
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height,
                f'{int(height)}',
                ha='center', va='bottom', fontsize=14, fontweight='bold')

    # Add percentage
    total = sum(status_counts.values())
    for i, (status, count) in enumerate(status_counts.items()):
        percentage = (count / total) * 100
        ax.text(i, count/2, f'{percentage:.1f}%',
                ha='center', va='center', fontsize=12, color='white', fontweight='bold')

    plt.tight_layout()
    plt.savefig(CHARTS_DIR / 'functional-test-results.png', dpi=300, bbox_inches='tight')
    plt.close()

    print("✓ Functional testing chart saved: charts/functional-test-results.png")

    # Generate detailed table
    df = pd.DataFrame([{
        'Test ID': test['id'],
        'Test Name': test['name'][:50] + '...' if len(test['name']) > 50 else test['name'],
        'Status': test['status']
    } for test in data])

    # Save as CSV
    df.to_csv(CHARTS_DIR / 'functional-test-results.csv', index=False)
    print("✓ Functional testing table saved: charts/functional-test-results.csv")

def generate_security_chart():
    """Generate security testing results chart"""
    data = load_json('replay-attack-test-results.json')
    if not data:
        return

    # Count by status
    status_counts = {}
    risk_counts = {}

    for test in data:
        status = test['status']
        risk = test.get('securityLevel', 'UNKNOWN')
        status_counts[status] = status_counts.get(status, 0) + 1
        risk_counts[risk] = risk_counts.get(risk, 0) + 1

    # Create figure with 2 subplots
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))

    # Chart 1: Security Status
    colors_status = {'SECURE': '#2ecc71', 'VULNERABLE': '#e74c3c', 'ERROR': '#95a5a6'}
    bars1 = ax1.bar(status_counts.keys(), status_counts.values(),
                    color=[colors_status.get(k, '#95a5a6') for k in status_counts.keys()],
                    alpha=0.8)

    ax1.set_title('Security Testing - Attack Prevention Status',
                  fontsize=14, fontweight='bold')
    ax1.set_ylabel('Number of Tests', fontsize=11)
    ax1.set_xlabel('Status', fontsize=11)

    for bar in bars1:
        height = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width()/2., height,
                f'{int(height)}',
                ha='center', va='bottom', fontsize=12, fontweight='bold')

    # Chart 2: Risk Level
    risk_order = ['PROTECTED', 'MEDIUM RISK', 'HIGH RISK', 'CRITICAL RISK']
    risk_colors = {'PROTECTED': '#2ecc71', 'MEDIUM RISK': '#f39c12',
                   'HIGH RISK': '#e67e22', 'CRITICAL RISK': '#e74c3c'}

    risk_data = {k: risk_counts.get(k, 0) for k in risk_order if k in risk_counts}

    bars2 = ax2.bar(risk_data.keys(), risk_data.values(),
                    color=[risk_colors.get(k, '#95a5a6') for k in risk_data.keys()],
                    alpha=0.8)

    ax2.set_title('Security Testing - Risk Assessment',
                  fontsize=14, fontweight='bold')
    ax2.set_ylabel('Number of Tests', fontsize=11)
    ax2.set_xlabel('Risk Level', fontsize=11)
    plt.setp(ax2.xaxis.get_majorticklabels(), rotation=15, ha='right')

    for bar in bars2:
        height = bar.get_height()
        ax2.text(bar.get_x() + bar.get_width()/2., height,
                f'{int(height)}',
                ha='center', va='bottom', fontsize=12, fontweight='bold')

    plt.tight_layout()
    plt.savefig(CHARTS_DIR / 'security-test-results.png', dpi=300, bbox_inches='tight')
    plt.close()

    print("✓ Security testing chart saved: charts/security-test-results.png")

    # Generate detailed table
    df = pd.DataFrame([{
        'Test ID': test['id'],
        'Scenario': test['name'][:40] + '...' if len(test['name']) > 40 else test['name'],
        'Status': test['status'],
        'Risk Level': test.get('securityLevel', 'UNKNOWN')
    } for test in data])

    df.to_csv(CHARTS_DIR / 'security-test-results.csv', index=False)
    print("✓ Security testing table saved: charts/security-test-results.csv")

def generate_performance_chart():
    """Generate performance testing charts"""
    data = load_json('performance-test-results.json')
    if not data or not data.get('summary'):
        return

    summary = data['summary']

    # Prepare data for operations chart
    operations = []
    mean_times = []
    std_devs = []

    operation_map = {
        'keyGen': 'Key Generation',
        'registration': 'Registration',
        'challenge': 'Challenge Request',
        'proofGen': 'Proof Generation',
        'verification': 'Server Verification',
        'login': 'Complete Login'
    }

    for key, name in operation_map.items():
        if key in summary and 'mean' in summary[key]:
            operations.append(name)
            mean_times.append(float(summary[key]['mean']))
            std_devs.append(float(summary[key]['stdDev']))

    # Create figure with 2 subplots
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))

    # Chart 1: Operation times
    bars = ax1.barh(operations, mean_times, xerr=std_devs,
                    color='steelblue', alpha=0.8, capsize=5)

    ax1.set_title('Performance Testing - Operation Response Times',
                  fontsize=14, fontweight='bold')
    ax1.set_xlabel('Time (milliseconds)', fontsize=11)
    ax1.set_ylabel('Operation', fontsize=11)
    ax1.grid(axis='x', alpha=0.3)

    for i, (bar, time) in enumerate(zip(bars, mean_times)):
        ax1.text(time + std_devs[i] + 5, bar.get_y() + bar.get_height()/2,
                f'{time:.1f} ms',
                va='center', fontsize=10)

    # Chart 2: Concurrent load test
    if 'concurrent' in summary and 'stats' in summary['concurrent']:
        concurrent = summary['concurrent']

        metrics = ['Mean', 'P50', 'P95', 'P99']
        values = [
            float(concurrent['stats']['mean']),
            float(concurrent['stats']['p50']),
            float(concurrent['stats']['p95']),
            float(concurrent['stats']['p99'])
        ]

        bars2 = ax2.bar(metrics, values, color=['#3498db', '#2ecc71', '#f39c12', '#e74c3c'],
                       alpha=0.8)

        ax2.set_title(f'Concurrent Load Test (100 Users)\nSuccess Rate: {concurrent["successCount"]}%',
                     fontsize=14, fontweight='bold')
        ax2.set_ylabel('Response Time (milliseconds)', fontsize=11)
        ax2.set_xlabel('Percentile', fontsize=11)
        ax2.grid(axis='y', alpha=0.3)

        for bar in bars2:
            height = bar.get_height()
            ax2.text(bar.get_x() + bar.get_width()/2., height,
                    f'{height:.1f}',
                    ha='center', va='bottom', fontsize=11, fontweight='bold')

    plt.tight_layout()
    plt.savefig(CHARTS_DIR / 'performance-test-results.png', dpi=300, bbox_inches='tight')
    plt.close()

    print("✓ Performance testing chart saved: charts/performance-test-results.png")

    # Generate performance table
    perf_data = []
    for key, name in operation_map.items():
        if key in summary and 'mean' in summary[key]:
            perf_data.append({
                'Operation': name,
                'Mean (ms)': float(summary[key]['mean']),
                'Std Dev (ms)': float(summary[key]['stdDev']),
                'Min (ms)': float(summary[key]['min']),
                'Max (ms)': float(summary[key]['max']),
                'P95 (ms)': float(summary[key]['p95'])
            })

    df = pd.DataFrame(perf_data)
    df.to_csv(CHARTS_DIR / 'performance-test-results.csv', index=False)
    print("✓ Performance testing table saved: charts/performance-test-results.csv")

def generate_comprehensive_summary():
    """Generate comprehensive summary chart"""
    report = load_json('comprehensive-test-report.json')
    if not report:
        return

    # Extract scores
    scores = {}
    labels = []
    values = []
    colors = []

    if report.get('functionalTesting'):
        func_rate = float(report['functionalTesting']['successRate'].rstrip('%'))
        labels.append('Functional\nTesting')
        values.append(func_rate)
        colors.append('#3498db')

    if report.get('securityTesting'):
        sec_rate = float(report['securityTesting']['securityScore'].rstrip('%'))
        labels.append('Security\nTesting')
        values.append(sec_rate)
        colors.append('#2ecc71')

    if report.get('overallAssessment') and 'finalScore' in report['overallAssessment']:
        final_score = float(report['overallAssessment']['finalScore'].rstrip('%'))
        labels.append('Overall\nScore')
        values.append(final_score)
        colors.append('#9b59b6')

    # Create chart
    fig, ax = plt.subplots(figsize=(10, 6))

    bars = ax.bar(labels, values, color=colors, alpha=0.8)

    ax.set_title('Comprehensive Test Results Summary',
                 fontsize=16, fontweight='bold', pad=20)
    ax.set_ylabel('Score (%)', fontsize=12)
    ax.set_ylim(0, 105)
    ax.axhline(y=90, color='green', linestyle='--', alpha=0.5, label='Excellent (≥90%)')
    ax.axhline(y=75, color='orange', linestyle='--', alpha=0.5, label='Good (≥75%)')
    ax.grid(axis='y', alpha=0.3)
    ax.legend(loc='lower right')

    # Add value labels
    for bar, value in zip(bars, values):
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height + 1,
                f'{value:.1f}%',
                ha='center', va='bottom', fontsize=14, fontweight='bold')

    plt.tight_layout()
    plt.savefig(CHARTS_DIR / 'comprehensive-summary.png', dpi=300, bbox_inches='tight')
    plt.close()

    print("✓ Comprehensive summary chart saved: charts/comprehensive-summary.png")

def generate_comparison_table():
    """Generate comparison table with traditional systems"""
    comparison_data = {
        'Aspect': [
            'Password di server',
            'Proteksi replay',
            'Privacy',
            'Security',
            'Complexity',
            'Overhead (ms)',
            'Transparency'
        ],
        'Password Only': [
            'Ya (hash)',
            'Tidak',
            'Rendah',
            'Rendah',
            'Rendah',
            '50',
            'Opaque'
        ],
        'Password + TOTP': [
            'Ya (hash)',
            'Parsial',
            'Rendah',
            'Sedang',
            'Sedang',
            '100',
            'Parsial'
        ],
        'ZKP + TOTP (Proposed)': [
            'Tidak',
            'Ya',
            'Tinggi',
            'Tinggi',
            'Tinggi',
            '~450-550',
            'Verifiable'
        ]
    }

    df = pd.DataFrame(comparison_data)

    # Save as CSV
    df.to_csv(CHARTS_DIR / 'system-comparison.csv', index=False)
    print("✓ System comparison table saved: charts/system-comparison.csv")

    # Create visualization
    fig, ax = plt.subplots(figsize=(12, 6))
    ax.axis('tight')
    ax.axis('off')

    table = ax.table(cellText=df.values, colLabels=df.columns,
                    cellLoc='center', loc='center',
                    colWidths=[0.2, 0.25, 0.25, 0.3])

    table.auto_set_font_size(False)
    table.set_fontsize(9)
    table.scale(1, 2)

    # Style header
    for i in range(len(df.columns)):
        table[(0, i)].set_facecolor('#3498db')
        table[(0, i)].set_text_props(weight='bold', color='white')

    # Style rows
    for i in range(1, len(df) + 1):
        for j in range(len(df.columns)):
            if i % 2 == 0:
                table[(i, j)].set_facecolor('#ecf0f1')

    plt.title('Comparison with Traditional Authentication Systems',
              fontsize=14, fontweight='bold', pad=20)

    plt.savefig(CHARTS_DIR / 'system-comparison.png', dpi=300, bbox_inches='tight')
    plt.close()

    print("✓ System comparison chart saved: charts/system-comparison.png")

def main():
    """Main function to generate all visualizations"""
    print('\n' + '='*60)
    print('VISUALIZATION GENERATOR')
    print('Generating charts and tables for thesis documentation')
    print('='*60 + '\n')

    print('📊 Generating visualizations...\n')

    generate_functional_chart()
    generate_security_chart()
    generate_performance_chart()
    generate_comprehensive_summary()
    generate_comparison_table()

    print('\n' + '='*60)
    print('✓ All visualizations generated successfully!')
    print(f'📁 Output directory: {CHARTS_DIR}')
    print('='*60 + '\n')

    print('Generated files:')
    print('  📊 Charts (PNG):')
    print('     - functional-test-results.png')
    print('     - security-test-results.png')
    print('     - performance-test-results.png')
    print('     - comprehensive-summary.png')
    print('     - system-comparison.png')
    print('  📋 Tables (CSV):')
    print('     - functional-test-results.csv')
    print('     - security-test-results.csv')
    print('     - performance-test-results.csv')
    print('     - system-comparison.csv')
    print('\n💡 These files can be used in your thesis documentation (Bab 4)\n')

if __name__ == '__main__':
    main()