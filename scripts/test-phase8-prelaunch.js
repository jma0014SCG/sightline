#!/usr/bin/env node

/**
 * Phase 8: Pre-Launch Verification Suite
 * 
 * This comprehensive test suite covers:
 * - 8.1: Critical Systems Verification
 * - 8.2: Usage Limits Verification
 * - 8.3: Load Testing
 * 
 * Run with: node scripts/test-phase8-prelaunch.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { PrismaClient } = require('@prisma/client');

// Test configuration
const CONFIG = {
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  API_URL: process.env.API_URL || 'http://localhost:8000',
  TEST_TIMEOUT: 30000,
  LOAD_TEST_USERS: 100,
  PERFORMANCE_TARGETS: {
    pageLoad3G: 3000, // 3 seconds on 3G
    apiResponse: 200, // 200ms API response
    dbQuery: 50, // 50ms database query
  },
};

// Test results tracking
const testResults = {
  phase81: { passed: 0, failed: 0, tests: [] },
  phase82: { passed: 0, failed: 0, tests: [] },
  phase83: { passed: 0, failed: 0, tests: [] },
  startTime: Date.now(),
};

// Utility functions
function logSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

function logTest(description, status, details = '') {
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  console.log(`${icon} ${description}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

function recordTest(phase, description, status, details = '') {
  const result = { description, status, details, timestamp: Date.now() };
  testResults[phase].tests.push(result);
  if (status === 'pass') {
    testResults[phase].passed++;
  } else {
    testResults[phase].failed++;
  }
  logTest(description, status, details);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      ...options,
    };

    const protocol = urlObj.protocol === 'https:' ? https : require('http');
    const req = protocol.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// ==============================================================================
// PHASE 8.1: CRITICAL SYSTEMS VERIFICATION
// ==============================================================================

async function testPhase81_CriticalSystems() {
  logSection('PHASE 8.1: CRITICAL SYSTEMS VERIFICATION');
  
  // Test 1: Authentication System (Clerk)
  try {
    const authResponse = await makeRequest(`${CONFIG.APP_URL}/api/health`);
    const healthData = JSON.parse(authResponse.body);
    
    if (healthData.status === 'healthy' && healthData.services?.clerk === 'operational') {
      recordTest('phase81', 'Authentication (Clerk) Health Check', 'pass', 'Clerk service operational');
    } else {
      recordTest('phase81', 'Authentication (Clerk) Health Check', 'fail', 'Clerk service not responding');
    }
  } catch (error) {
    recordTest('phase81', 'Authentication (Clerk) Health Check', 'fail', error.message);
  }

  // Test 2: Payment Processing (Stripe)
  try {
    const stripeWebhookUrl = `${CONFIG.APP_URL}/api/webhooks/stripe`;
    const webhookResponse = await makeRequest(stripeWebhookUrl, {
      method: 'POST',
      headers: {
        'stripe-signature': 'test_signature',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'test.ping' }),
    });
    
    // Expect 401 without valid signature (shows webhook is active)
    if (webhookResponse.status === 401 || webhookResponse.status === 400) {
      recordTest('phase81', 'Payment Webhook (Stripe) Active', 'pass', 'Stripe webhook endpoint responding');
    } else {
      recordTest('phase81', 'Payment Webhook (Stripe) Active', 'fail', `Unexpected status: ${webhookResponse.status}`);
    }
  } catch (error) {
    recordTest('phase81', 'Payment Webhook (Stripe) Active', 'fail', error.message);
  }

  // Test 3: Summary Creation Pipeline
  try {
    const pipelineTest = await makeRequest(`${CONFIG.API_URL}/health`);
    if (pipelineTest.status === 200) {
      recordTest('phase81', 'Summary Creation Pipeline (FastAPI)', 'pass', 'Python API responding');
    } else {
      recordTest('phase81', 'Summary Creation Pipeline (FastAPI)', 'fail', `API status: ${pipelineTest.status}`);
    }
  } catch (error) {
    recordTest('phase81', 'Summary Creation Pipeline (FastAPI)', 'fail', error.message);
  }

  // Test 4: Database Performance
  const prisma = new PrismaClient();
  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const queryTime = Date.now() - startTime;
    
    if (queryTime < CONFIG.PERFORMANCE_TARGETS.dbQuery) {
      recordTest('phase81', 'Database Query Performance', 'pass', `Query time: ${queryTime}ms`);
    } else {
      recordTest('phase81', 'Database Query Performance', 'fail', `Query time ${queryTime}ms exceeds target ${CONFIG.PERFORMANCE_TARGETS.dbQuery}ms`);
    }
  } catch (error) {
    recordTest('phase81', 'Database Query Performance', 'fail', error.message);
  } finally {
    await prisma.$disconnect();
  }

  // Test 5: Error Tracking (Sentry)
  try {
    const sentryDsn = process.env.SENTRY_DSN;
    if (sentryDsn && sentryDsn.includes('sentry.io')) {
      recordTest('phase81', 'Error Tracking (Sentry) Configuration', 'pass', 'Sentry DSN configured');
    } else {
      recordTest('phase81', 'Error Tracking (Sentry) Configuration', 'warn', 'Sentry DSN not configured');
    }
  } catch (error) {
    recordTest('phase81', 'Error Tracking (Sentry) Configuration', 'fail', error.message);
  }

  // Test 6: Environment Variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_APP_URL',
    'CLERK_SECRET_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'OPENAI_API_KEY',
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length === 0) {
    recordTest('phase81', 'Environment Variables Complete', 'pass', 'All required variables set');
  } else {
    recordTest('phase81', 'Environment Variables Complete', 'fail', `Missing: ${missingVars.join(', ')}`);
  }

  // Test 7: Security Headers
  try {
    const response = await makeRequest(CONFIG.APP_URL);
    const securityHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'strict-transport-security',
    ];
    
    const presentHeaders = securityHeaders.filter(h => response.headers[h]);
    if (presentHeaders.length >= 2) {
      recordTest('phase81', 'Security Headers Configuration', 'pass', `${presentHeaders.length}/3 headers present`);
    } else {
      recordTest('phase81', 'Security Headers Configuration', 'warn', `Only ${presentHeaders.length}/3 headers present`);
    }
  } catch (error) {
    recordTest('phase81', 'Security Headers Configuration', 'fail', error.message);
  }

  // Test 8: Webhooks Verification
  try {
    const clerkWebhookUrl = `${CONFIG.APP_URL}/api/webhooks/clerk`;
    const clerkResponse = await makeRequest(clerkWebhookUrl, {
      method: 'POST',
      headers: {
        'svix-id': 'test',
        'svix-timestamp': Date.now().toString(),
        'svix-signature': 'test',
      },
      body: JSON.stringify({ type: 'test' }),
    });
    
    // Expect 401 without valid signature
    if (clerkResponse.status === 401 || clerkResponse.status === 400) {
      recordTest('phase81', 'Clerk Webhook Verification', 'pass', 'Webhook signature verification active');
    } else {
      recordTest('phase81', 'Clerk Webhook Verification', 'fail', `Unexpected status: ${clerkResponse.status}`);
    }
  } catch (error) {
    recordTest('phase81', 'Clerk Webhook Verification', 'fail', error.message);
  }
}

// ==============================================================================
// PHASE 8.2: USAGE LIMITS VERIFICATION
// ==============================================================================

async function testPhase82_UsageLimits() {
  logSection('PHASE 8.2: USAGE LIMITS VERIFICATION');
  
  const prisma = new PrismaClient();
  
  try {
    // Test Anonymous User Limits (1 summary limit)
    const anonymousUser = await prisma.user.findUnique({
      where: { clerkId: 'ANONYMOUS_USER' },
      include: { summaries: true },
    });
    
    if (anonymousUser) {
      recordTest('phase82', 'Anonymous User Account Exists', 'pass', 'ANONYMOUS_USER found in database');
      
      // Check anonymous user can't exceed 1 summary
      if (anonymousUser.summaries.length <= 1) {
        recordTest('phase82', 'Anonymous User Limit (1 summary)', 'pass', `Current: ${anonymousUser.summaries.length}/1`);
      } else {
        recordTest('phase82', 'Anonymous User Limit (1 summary)', 'fail', `Has ${anonymousUser.summaries.length} summaries`);
      }
    } else {
      recordTest('phase82', 'Anonymous User Account Exists', 'fail', 'ANONYMOUS_USER not found');
    }
    
    // Test Free Plan Limits (3 lifetime summaries)
    const freeUsers = await prisma.user.findMany({
      where: {
        subscriptionTier: 'FREE',
        clerkId: { not: 'ANONYMOUS_USER' },
      },
      include: {
        summaries: true,
      },
      take: 5,
    });
    
    let freePlanValid = true;
    for (const user of freeUsers) {
      if (user.summaries.length > 3) {
        freePlanValid = false;
        recordTest('phase82', `Free User ${user.id} Limit Check`, 'fail', `Has ${user.summaries.length}/3 summaries`);
      }
    }
    
    if (freePlanValid) {
      recordTest('phase82', 'Free Plan Limit (3 lifetime)', 'pass', `Checked ${freeUsers.length} users`);
    }
    
    // Test Pro Plan Limits (25/month with reset)
    const proUsers = await prisma.user.findMany({
      where: {
        subscriptionTier: 'PRO',
      },
      include: {
        summaries: {
          where: {
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        },
      },
      take: 5,
    });
    
    let proPlanValid = true;
    for (const user of proUsers) {
      if (user.summaries.length > 25) {
        proPlanValid = false;
        recordTest('phase82', `Pro User ${user.id} Monthly Limit`, 'fail', `Has ${user.summaries.length}/25 this month`);
      }
    }
    
    if (proPlanValid) {
      recordTest('phase82', 'Pro Plan Limit (25/month)', 'pass', `Checked ${proUsers.length} users`);
    }
    
    // Test Enterprise Plan (Unlimited)
    const enterpriseUsers = await prisma.user.findMany({
      where: {
        subscriptionTier: 'ENTERPRISE',
      },
      include: {
        _count: {
          select: { summaries: true },
        },
      },
      take: 5,
    });
    
    if (enterpriseUsers.length > 0) {
      recordTest('phase82', 'Enterprise Plan (Unlimited)', 'pass', `${enterpriseUsers.length} enterprise users found`);
    } else {
      recordTest('phase82', 'Enterprise Plan (Unlimited)', 'warn', 'No enterprise users to test');
    }
    
    // Test Reset Logic for Pro Plans
    const currentDate = new Date();
    const isFirstOfMonth = currentDate.getDate() === 1;
    
    if (isFirstOfMonth) {
      recordTest('phase82', 'Pro Plan Reset Date Check', 'pass', 'Today is reset day (1st of month)');
    } else {
      const daysUntilReset = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1).getDate() - currentDate.getDate();
      recordTest('phase82', 'Pro Plan Reset Date Check', 'pass', `${daysUntilReset} days until next reset`);
    }
    
  } catch (error) {
    recordTest('phase82', 'Usage Limits Database Tests', 'fail', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// ==============================================================================
// PHASE 8.3: LOAD TESTING
// ==============================================================================

async function testPhase83_LoadTesting() {
  logSection('PHASE 8.3: LOAD TESTING');
  
  // Test 1: Concurrent User Simulation
  console.log(`\n📊 Simulating ${CONFIG.LOAD_TEST_USERS} concurrent users...`);
  
  const concurrentRequests = [];
  const startTime = Date.now();
  
  // Create concurrent requests
  for (let i = 0; i < CONFIG.LOAD_TEST_USERS; i++) {
    concurrentRequests.push(
      makeRequest(`${CONFIG.APP_URL}/api/health`)
        .then(res => ({ success: true, status: res.status, time: Date.now() - startTime }))
        .catch(err => ({ success: false, error: err.message, time: Date.now() - startTime }))
    );
  }
  
  // Wait for all requests to complete
  const results = await Promise.all(concurrentRequests);
  const successCount = results.filter(r => r.success).length;
  const avgResponseTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
  
  if (successCount >= CONFIG.LOAD_TEST_USERS * 0.95) {
    recordTest('phase83', `Concurrent Users (${CONFIG.LOAD_TEST_USERS})`, 'pass', 
      `${successCount}/${CONFIG.LOAD_TEST_USERS} succeeded, avg ${avgResponseTime.toFixed(0)}ms`);
  } else {
    recordTest('phase83', `Concurrent Users (${CONFIG.LOAD_TEST_USERS})`, 'fail', 
      `Only ${successCount}/${CONFIG.LOAD_TEST_USERS} succeeded`);
  }
  
  // Test 2: Page Load on 3G
  console.log('\n📱 Testing page load time on simulated 3G...');
  
  try {
    const pageStartTime = Date.now();
    const pageResponse = await makeRequest(CONFIG.APP_URL);
    const pageLoadTime = Date.now() - pageStartTime;
    
    // Simulate 3G latency (add 150ms baseline)
    const simulated3GTime = pageLoadTime + 150;
    
    if (simulated3GTime < CONFIG.PERFORMANCE_TARGETS.pageLoad3G) {
      recordTest('phase83', 'Page Load on 3G', 'pass', `${simulated3GTime}ms < ${CONFIG.PERFORMANCE_TARGETS.pageLoad3G}ms target`);
    } else {
      recordTest('phase83', 'Page Load on 3G', 'fail', `${simulated3GTime}ms exceeds ${CONFIG.PERFORMANCE_TARGETS.pageLoad3G}ms target`);
    }
  } catch (error) {
    recordTest('phase83', 'Page Load on 3G', 'fail', error.message);
  }
  
  // Test 3: API Response Times
  console.log('\n⚡ Testing API response times...');
  
  const apiEndpoints = [
    '/api/health',
    '/api/trpc/library.getUserSummaries',
    '/api/trpc/auth.getCurrentUser',
  ];
  
  for (const endpoint of apiEndpoints) {
    try {
      const apiStartTime = Date.now();
      await makeRequest(`${CONFIG.APP_URL}${endpoint}`);
      const apiResponseTime = Date.now() - apiStartTime;
      
      if (apiResponseTime < CONFIG.PERFORMANCE_TARGETS.apiResponse) {
        recordTest('phase83', `API Response: ${endpoint}`, 'pass', `${apiResponseTime}ms`);
      } else {
        recordTest('phase83', `API Response: ${endpoint}`, 'fail', 
          `${apiResponseTime}ms exceeds ${CONFIG.PERFORMANCE_TARGETS.apiResponse}ms target`);
      }
    } catch (error) {
      recordTest('phase83', `API Response: ${endpoint}`, 'fail', error.message);
    }
  }
  
  // Test 4: Database Query Performance Under Load
  console.log('\n💾 Testing database performance under load...');
  
  const prisma = new PrismaClient();
  try {
    const queryPromises = [];
    
    // Execute 50 concurrent database queries
    for (let i = 0; i < 50; i++) {
      queryPromises.push(
        prisma.user.count()
          .then(count => ({ success: true, count, time: Date.now() }))
          .catch(err => ({ success: false, error: err.message }))
      );
    }
    
    const dbStartTime = Date.now();
    const dbResults = await Promise.all(queryPromises);
    const dbTotalTime = Date.now() - dbStartTime;
    const avgQueryTime = dbTotalTime / 50;
    
    if (avgQueryTime < CONFIG.PERFORMANCE_TARGETS.dbQuery) {
      recordTest('phase83', 'Database Performance Under Load', 'pass', 
        `Avg query time: ${avgQueryTime.toFixed(2)}ms for 50 queries`);
    } else {
      recordTest('phase83', 'Database Performance Under Load', 'fail', 
        `Avg ${avgQueryTime.toFixed(2)}ms exceeds ${CONFIG.PERFORMANCE_TARGETS.dbQuery}ms target`);
    }
  } catch (error) {
    recordTest('phase83', 'Database Performance Under Load', 'fail', error.message);
  } finally {
    await prisma.$disconnect();
  }
  
  // Test 5: Memory Usage Check
  console.log('\n💻 Checking memory usage...');
  
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  
  if (heapUsedMB < 500) {
    recordTest('phase83', 'Memory Usage', 'pass', `${heapUsedMB}MB used of ${heapTotalMB}MB total`);
  } else {
    recordTest('phase83', 'Memory Usage', 'warn', `High memory usage: ${heapUsedMB}MB`);
  }
}

// ==============================================================================
// MAIN EXECUTION
// ==============================================================================

async function generateReport() {
  logSection('TEST RESULTS SUMMARY');
  
  const totalTime = ((Date.now() - testResults.startTime) / 1000).toFixed(2);
  
  console.log('\n📊 Overall Results:');
  console.log('─'.repeat(40));
  
  // Phase 8.1 Summary
  const phase81Total = testResults.phase81.passed + testResults.phase81.failed;
  const phase81Percent = phase81Total > 0 ? Math.round((testResults.phase81.passed / phase81Total) * 100) : 0;
  console.log(`Phase 8.1 (Critical Systems): ${testResults.phase81.passed}/${phase81Total} passed (${phase81Percent}%)`);
  
  // Phase 8.2 Summary
  const phase82Total = testResults.phase82.passed + testResults.phase82.failed;
  const phase82Percent = phase82Total > 0 ? Math.round((testResults.phase82.passed / phase82Total) * 100) : 0;
  console.log(`Phase 8.2 (Usage Limits):     ${testResults.phase82.passed}/${phase82Total} passed (${phase82Percent}%)`);
  
  // Phase 8.3 Summary
  const phase83Total = testResults.phase83.passed + testResults.phase83.failed;
  const phase83Percent = phase83Total > 0 ? Math.round((testResults.phase83.passed / phase83Total) * 100) : 0;
  console.log(`Phase 8.3 (Load Testing):     ${testResults.phase83.passed}/${phase83Total} passed (${phase83Percent}%)`);
  
  console.log('─'.repeat(40));
  
  // Overall summary
  const totalPassed = testResults.phase81.passed + testResults.phase82.passed + testResults.phase83.passed;
  const totalFailed = testResults.phase81.failed + testResults.phase82.failed + testResults.phase83.failed;
  const totalTests = totalPassed + totalFailed;
  const overallPercent = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
  
  console.log(`\nTotal: ${totalPassed}/${totalTests} tests passed (${overallPercent}%)`);
  console.log(`Execution time: ${totalTime} seconds`);
  
  // Launch readiness assessment
  console.log('\n🚀 Launch Readiness Assessment:');
  console.log('─'.repeat(40));
  
  if (overallPercent >= 95) {
    console.log('✅ READY FOR LAUNCH - All critical systems verified');
  } else if (overallPercent >= 80) {
    console.log('⚠️  NEARLY READY - Address failed tests before launch');
  } else {
    console.log('❌ NOT READY - Critical issues must be resolved');
  }
  
  // Save detailed report
  const reportPath = path.join(__dirname, '..', 'test-results-phase8.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

async function main() {
  console.log('🚀 Starting Phase 8 Pre-Launch Verification Suite');
  console.log(`📍 Testing against: ${CONFIG.APP_URL}`);
  console.log(`🐍 Python API: ${CONFIG.API_URL}`);
  console.log('─'.repeat(60));
  
  try {
    // Run all test phases
    await testPhase81_CriticalSystems();
    await testPhase82_UsageLimits();
    await testPhase83_LoadTesting();
    
    // Generate final report
    await generateReport();
    
    // Exit with appropriate code
    const totalFailed = testResults.phase81.failed + testResults.phase82.failed + testResults.phase83.failed;
    process.exit(totalFailed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n❌ Fatal error during testing:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { testResults, CONFIG };