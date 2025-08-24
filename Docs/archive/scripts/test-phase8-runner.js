#!/usr/bin/env node

/**
 * Phase 8 Test Runner
 * 
 * Master test runner for all Phase 8 pre-launch verification tests.
 * Can run all tests or specific phases based on command line arguments.
 * 
 * Usage:
 *   node scripts/test-phase8-runner.js           # Run all tests
 *   node scripts/test-phase8-runner.js --phase 1 # Run only phase 8.1
 *   node scripts/test-phase8-runner.js --phase 2 # Run only phase 8.2
 *   node scripts/test-phase8-runner.js --phase 3 # Run only phase 8.3
 *   node scripts/test-phase8-runner.js --quick   # Run quick tests only (skip load tests)
 *   node scripts/test-phase8-runner.js --report  # Generate detailed report
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Test configuration
const TESTS = [
  {
    phase: '8.1',
    name: 'Critical Systems Verification',
    script: 'test-phase81-critical-systems.js',
    description: 'Verifies all critical platform systems are operational',
    estimatedTime: '1-2 minutes',
    priority: 'HIGH',
  },
  {
    phase: '8.2',
    name: 'Usage Limits Verification',
    script: 'test-phase82-usage-limits.js',
    description: 'Tests subscription tier limits and enforcement',
    estimatedTime: '2-3 minutes',
    priority: 'HIGH',
  },
  {
    phase: '8.3',
    name: 'Load Testing',
    script: 'test-phase83-load-testing.js',
    description: 'Performance testing under load conditions',
    estimatedTime: '5-10 minutes',
    priority: 'MEDIUM',
    skipInQuickMode: true,
  },
];

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  phase: null,
  quick: args.includes('--quick'),
  report: args.includes('--report'),
  verbose: args.includes('--verbose'),
  help: args.includes('--help') || args.includes('-h'),
};

// Check for specific phase
const phaseIndex = args.indexOf('--phase');
if (phaseIndex !== -1 && args[phaseIndex + 1]) {
  options.phase = args[phaseIndex + 1];
}

// Display help
if (options.help) {
  console.log(`
${colors.bright}Phase 8 Pre-Launch Verification Test Runner${colors.reset}

${colors.cyan}Usage:${colors.reset}
  node scripts/test-phase8-runner.js [options]

${colors.cyan}Options:${colors.reset}
  --phase <n>    Run only phase 8.n (1, 2, or 3)
  --quick        Skip time-intensive tests (load testing)
  --report       Generate detailed HTML report
  --verbose      Show detailed test output
  --help, -h     Show this help message

${colors.cyan}Examples:${colors.reset}
  node scripts/test-phase8-runner.js                # Run all tests
  node scripts/test-phase8-runner.js --phase 1      # Run only phase 8.1
  node scripts/test-phase8-runner.js --quick        # Quick validation
  node scripts/test-phase8-runner.js --report       # Full test with report

${colors.cyan}Available Tests:${colors.reset}`);
  
  TESTS.forEach(test => {
    console.log(`  ${colors.bright}Phase ${test.phase}${colors.reset}: ${test.name}`);
    console.log(`    ${colors.dim}${test.description}${colors.reset}`);
    console.log(`    Time: ${test.estimatedTime} | Priority: ${test.priority}`);
  });
  
  process.exit(0);
}

// Test result storage
const testResults = {
  startTime: new Date(),
  endTime: null,
  environment: {
    node: process.version,
    platform: process.platform,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  phases: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  },
};

// Run a single test script
function runTest(test) {
  return new Promise((resolve) => {
    console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}  PHASE ${test.phase}: ${test.name.toUpperCase()}${colors.reset}`);
    console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.dim}${test.description}${colors.reset}`);
    console.log(`${colors.dim}Estimated time: ${test.estimatedTime}${colors.reset}\n`);
    
    const scriptPath = path.join(__dirname, test.script);
    
    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      console.log(`${colors.red}❌ Test script not found: ${test.script}${colors.reset}`);
      resolve({
        phase: test.phase,
        name: test.name,
        status: 'error',
        error: 'Script not found',
        duration: 0,
      });
      return;
    }
    
    const startTime = Date.now();
    const child = spawn('node', [scriptPath], {
      stdio: options.verbose ? 'inherit' : 'pipe',
      env: { ...process.env },
    });
    
    let output = '';
    let errorOutput = '';
    
    if (!options.verbose) {
      child.stdout.on('data', (data) => {
        output += data.toString();
        // Show progress indicators
        if (data.toString().includes('✅')) {
          process.stdout.write(`${colors.green}.${colors.reset}`);
        } else if (data.toString().includes('❌')) {
          process.stdout.write(`${colors.red}x${colors.reset}`);
        } else if (data.toString().includes('⚠️')) {
          process.stdout.write(`${colors.yellow}!${colors.reset}`);
        }
      });
      
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
    }
    
    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      const durationStr = `${(duration / 1000).toFixed(1)}s`;
      
      if (!options.verbose) {
        console.log(); // New line after progress dots
      }
      
      const result = {
        phase: test.phase,
        name: test.name,
        status: code === 0 ? 'passed' : 'failed',
        exitCode: code,
        duration: duration,
        output: output,
        errorOutput: errorOutput,
      };
      
      // Parse test results from output
      const passedMatches = output.match(/(\d+)\/(\d+) (?:tests|systems|checks) (?:passed|verified)/gi);
      if (passedMatches && passedMatches.length > 0) {
        const lastMatch = passedMatches[passedMatches.length - 1];
        const [passed, total] = lastMatch.match(/\d+/g).map(Number);
        result.testCount = { passed, total };
        result.percentage = Math.round((passed / total) * 100);
      }
      
      // Display result
      if (code === 0) {
        console.log(`${colors.green}✅ Phase ${test.phase} PASSED${colors.reset} (${durationStr})`);
      } else {
        console.log(`${colors.red}❌ Phase ${test.phase} FAILED${colors.reset} (${durationStr})`);
        if (!options.verbose && errorOutput) {
          console.log(`${colors.dim}Error output:${colors.reset}`);
          console.log(errorOutput.slice(0, 500)); // Show first 500 chars of error
        }
      }
      
      resolve(result);
    });
    
    child.on('error', (error) => {
      console.log(`${colors.red}❌ Failed to run test: ${error.message}${colors.reset}`);
      resolve({
        phase: test.phase,
        name: test.name,
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime,
      });
    });
  });
}

// Generate HTML report
function generateHTMLReport() {
  const reportPath = path.join(__dirname, '..', 'phase8-test-report.html');
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Phase 8 Pre-Launch Verification Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 2.5em;
    }
    .header .subtitle {
      opacity: 0.9;
      margin-top: 10px;
    }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .card h3 {
      margin: 0 0 10px 0;
      color: #667eea;
    }
    .card .number {
      font-size: 2.5em;
      font-weight: bold;
      margin: 10px 0;
    }
    .card.passed .number { color: #10b981; }
    .card.failed .number { color: #ef4444; }
    .card.skipped .number { color: #f59e0b; }
    .phase-result {
      background: white;
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .phase-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .phase-title {
      font-size: 1.5em;
      font-weight: bold;
    }
    .status-badge {
      padding: 5px 15px;
      border-radius: 20px;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 0.8em;
    }
    .status-passed { background: #10b981; color: white; }
    .status-failed { background: #ef4444; color: white; }
    .status-skipped { background: #f59e0b; color: white; }
    .progress-bar {
      height: 30px;
      background: #e5e7eb;
      border-radius: 15px;
      overflow: hidden;
      margin: 15px 0;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      transition: width 0.3s ease;
    }
    .details {
      margin-top: 15px;
      padding: 15px;
      background: #f9fafb;
      border-radius: 5px;
      font-family: monospace;
      font-size: 0.9em;
      max-height: 300px;
      overflow-y: auto;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .launch-readiness {
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      margin-bottom: 30px;
      text-align: center;
    }
    .readiness-score {
      font-size: 4em;
      font-weight: bold;
      margin: 20px 0;
    }
    .readiness-high { color: #10b981; }
    .readiness-medium { color: #f59e0b; }
    .readiness-low { color: #ef4444; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Phase 8 Pre-Launch Verification Report</h1>
    <div class="subtitle">
      Generated: ${new Date().toLocaleString()}<br>
      Environment: ${testResults.environment.appUrl}
    </div>
  </div>
  
  <div class="launch-readiness">
    <h2>Launch Readiness Score</h2>
    <div class="readiness-score ${testResults.summary.passed >= testResults.summary.total * 0.9 ? 'readiness-high' : 
      testResults.summary.passed >= testResults.summary.total * 0.7 ? 'readiness-medium' : 'readiness-low'}">
      ${Math.round((testResults.summary.passed / (testResults.summary.total || 1)) * 100)}%
    </div>
    <p>${testResults.summary.passed >= testResults.summary.total * 0.9 ? '✅ READY FOR LAUNCH' : 
      testResults.summary.passed >= testResults.summary.total * 0.7 ? '⚠️ NEARLY READY - Address failed tests' : 
      '❌ NOT READY - Critical issues must be resolved'}</p>
  </div>
  
  <div class="summary-cards">
    <div class="card passed">
      <h3>Passed</h3>
      <div class="number">${testResults.summary.passed}</div>
    </div>
    <div class="card failed">
      <h3>Failed</h3>
      <div class="number">${testResults.summary.failed}</div>
    </div>
    <div class="card skipped">
      <h3>Skipped</h3>
      <div class="number">${testResults.summary.skipped}</div>
    </div>
    <div class="card">
      <h3>Total Time</h3>
      <div class="number">${((testResults.endTime - testResults.startTime) / 1000).toFixed(1)}s</div>
    </div>
  </div>
  
  ${testResults.phases.map(phase => `
    <div class="phase-result">
      <div class="phase-header">
        <div class="phase-title">Phase ${phase.phase}: ${phase.name}</div>
        <div class="status-badge status-${phase.status}">${phase.status}</div>
      </div>
      ${phase.testCount ? `
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${phase.percentage}%">
            ${phase.testCount.passed}/${phase.testCount.total} Tests Passed (${phase.percentage}%)
          </div>
        </div>
      ` : ''}
      <p>Duration: ${(phase.duration / 1000).toFixed(1)}s</p>
      ${phase.error ? `<p style="color: #ef4444;">Error: ${phase.error}</p>` : ''}
      ${options.verbose && phase.output ? `
        <details>
          <summary>View Details</summary>
          <div class="details">
            <pre>${phase.output.replace(/\x1b\[[0-9;]*m/g, '')}</pre>
          </div>
        </details>
      ` : ''}
    </div>
  `).join('')}
  
  <div class="footer">
    <p>Sightline.ai Pre-Launch Verification • Phase 8 Complete</p>
    <p>Node ${process.version} • ${process.platform}</p>
  </div>
</body>
</html>`;
  
  fs.writeFileSync(reportPath, html);
  console.log(`\n${colors.green}📄 HTML report generated: ${reportPath}${colors.reset}`);
  return reportPath;
}

// Main test runner
async function main() {
  console.log(`\n${colors.bright}${colors.cyan}🚀 PHASE 8 PRE-LAUNCH VERIFICATION SUITE${colors.reset}`);
  console.log(`${colors.dim}${'─'.repeat(60)}${colors.reset}`);
  console.log(`Environment: ${testResults.environment.appUrl}`);
  console.log(`Node Version: ${testResults.environment.node}`);
  console.log(`Platform: ${testResults.environment.platform}`);
  
  // Determine which tests to run
  let testsToRun = TESTS;
  
  if (options.phase) {
    testsToRun = TESTS.filter(t => t.phase === `8.${options.phase}`);
    if (testsToRun.length === 0) {
      console.log(`${colors.red}❌ Invalid phase: ${options.phase}${colors.reset}`);
      console.log('Valid phases: 1, 2, 3');
      process.exit(1);
    }
    console.log(`Running only Phase 8.${options.phase}`);
  }
  
  if (options.quick) {
    testsToRun = testsToRun.filter(t => !t.skipInQuickMode);
    console.log('Quick mode: Skipping time-intensive tests');
  }
  
  console.log(`Tests to run: ${testsToRun.length}`);
  console.log(`${colors.dim}${'─'.repeat(60)}${colors.reset}`);
  
  // Run tests sequentially
  for (const test of testsToRun) {
    const result = await runTest(test);
    testResults.phases.push(result);
    
    if (result.status === 'passed') {
      testResults.summary.passed++;
    } else if (result.status === 'failed') {
      testResults.summary.failed++;
    } else {
      testResults.summary.skipped++;
    }
    testResults.summary.total++;
  }
  
  // Skip tests that weren't run
  const skippedTests = TESTS.filter(t => !testsToRun.includes(t));
  for (const test of skippedTests) {
    testResults.phases.push({
      phase: test.phase,
      name: test.name,
      status: 'skipped',
      duration: 0,
    });
    testResults.summary.skipped++;
    testResults.summary.total++;
  }
  
  testResults.endTime = new Date();
  
  // Display summary
  console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}  FINAL RESULTS${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}\n`);
  
  testResults.phases.forEach(phase => {
    const icon = phase.status === 'passed' ? '✅' : 
                 phase.status === 'failed' ? '❌' : '⏭️';
    const color = phase.status === 'passed' ? colors.green : 
                  phase.status === 'failed' ? colors.red : colors.yellow;
    console.log(`${icon} ${color}Phase ${phase.phase}: ${phase.name}${colors.reset}`);
    if (phase.testCount) {
      console.log(`   ${phase.testCount.passed}/${phase.testCount.total} tests passed (${phase.percentage}%)`);
    }
  });
  
  console.log(`\n${colors.dim}${'─'.repeat(40)}${colors.reset}`);
  
  const percentage = Math.round((testResults.summary.passed / testResults.summary.total) * 100);
  console.log(`Overall: ${testResults.summary.passed}/${testResults.summary.total} phases passed (${percentage}%)`);
  console.log(`Total time: ${((testResults.endTime - testResults.startTime) / 1000).toFixed(1)} seconds`);
  
  // Launch readiness assessment
  console.log(`\n${colors.bright}🚀 LAUNCH READINESS ASSESSMENT${colors.reset}`);
  console.log(`${colors.dim}${'─'.repeat(40)}${colors.reset}`);
  
  if (percentage >= 100) {
    console.log(`${colors.green}✅ ALL SYSTEMS GO - Ready for launch!${colors.reset}`);
    console.log('All critical systems verified and performance targets met.');
  } else if (percentage >= 80) {
    console.log(`${colors.yellow}⚠️  NEARLY READY - Address remaining issues${colors.reset}`);
    console.log('Most systems operational but some issues need attention.');
  } else {
    console.log(`${colors.red}❌ NOT READY FOR LAUNCH${colors.reset}`);
    console.log('Critical systems failing. Must resolve before launch.');
  }
  
  // Generate report if requested
  if (options.report) {
    const reportPath = generateHTMLReport();
    console.log(`\nOpen the report in your browser:`);
    console.log(`${colors.cyan}open ${reportPath}${colors.reset}`);
  }
  
  console.log(`\n${colors.dim}${'='.repeat(60)}${colors.reset}\n`);
  
  // Save JSON results
  const jsonPath = path.join(__dirname, '..', 'phase8-test-results.json');
  fs.writeFileSync(jsonPath, JSON.stringify(testResults, null, 2));
  console.log(`📊 Test results saved to: ${jsonPath}`);
  
  process.exit(testResults.summary.failed > 0 ? 1 : 0);
}

// Run the tests
main().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});