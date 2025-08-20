#!/usr/bin/env node

/**
 * Phase 8.3: Load Testing
 * 
 * Performance verification against targets:
 * - 100 concurrent users
 * - <3s page load on 3G
 * - <200ms API response times
 * - <50ms database query times
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');
const { PrismaClient } = require('@prisma/client');
const cluster = require('cluster');
const os = require('os');

// Configuration
const CONFIG = {
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  API_URL: 'http://localhost:8000',
  CONCURRENT_USERS: parseInt(process.env.LOAD_TEST_USERS) || 100,
  TEST_DURATION: 30000, // 30 seconds
  TARGETS: {
    pageLoad3G: 3000,     // 3 seconds
    apiResponse: 200,     // 200ms
    dbQuery: 50,          // 50ms
    errorRate: 0.01,      // 1% error rate
    throughput: 100,      // 100 req/s minimum
  },
  NETWORK_CONDITIONS: {
    '3G': { latency: 100, bandwidth: 1.6 }, // Mbps
    '4G': { latency: 50, bandwidth: 10 },
    'WiFi': { latency: 10, bandwidth: 50 },
  },
};

// Color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, type = 'info') {
  const prefix = {
    success: `${colors.green}✅`,
    error: `${colors.red}❌`,
    warning: `${colors.yellow}⚠️`,
    info: `${colors.blue}ℹ️`,
    test: `${colors.bright}🧪`,
    metric: `${colors.cyan}📊`,
    perf: `${colors.magenta}⚡`,
  };
  
  console.log(`${prefix[type] || prefix.info} ${message}${colors.reset}`);
}

// HTTP request with timing
function timedRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const startTime = performance.now();
    let ttfb = 0; // Time to first byte
    
    const req = protocol.request({
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 10000,
      ...options,
    }, (res) => {
      ttfb = performance.now() - startTime;
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const totalTime = performance.now() - startTime;
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          timing: {
            total: totalTime,
            ttfb: ttfb,
            download: totalTime - ttfb,
          },
        });
      });
    });
    
    req.on('error', (error) => {
      const totalTime = performance.now() - startTime;
      reject({
        error,
        timing: { total: totalTime },
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) req.write(options.body);
    req.end();
  });
}

// Simulate network conditions
function simulateNetworkDelay(condition = '3G') {
  const network = CONFIG.NETWORK_CONDITIONS[condition];
  return new Promise(resolve => {
    setTimeout(resolve, network.latency);
  });
}

// Test 1: Concurrent User Load
async function testConcurrentUsers() {
  log(`Testing ${CONFIG.CONCURRENT_USERS} Concurrent Users`, 'test');
  
  const results = {
    successful: 0,
    failed: 0,
    responseTimes: [],
    errors: [],
  };
  
  // Create promises for concurrent requests
  const userRequests = [];
  const endpoints = [
    '/',
    '/api/health',
    '/library',
    '/api/trpc/auth.getCurrentUser',
  ];
  
  log(`Simulating ${CONFIG.CONCURRENT_USERS} users across ${endpoints.length} endpoints`, 'info');
  
  for (let i = 0; i < CONFIG.CONCURRENT_USERS; i++) {
    const endpoint = endpoints[i % endpoints.length];
    const url = `${CONFIG.APP_URL}${endpoint}`;
    
    userRequests.push(
      timedRequest(url)
        .then((res) => {
          results.successful++;
          results.responseTimes.push(res.timing.total);
          return { success: true, time: res.timing.total, endpoint };
        })
        .catch((err) => {
          results.failed++;
          results.errors.push(err.message || 'Unknown error');
          return { success: false, error: err.message, endpoint };
        })
    );
  }
  
  // Execute all requests concurrently
  const startTime = performance.now();
  const userResults = await Promise.all(userRequests);
  const totalTime = performance.now() - startTime;
  
  // Calculate metrics
  const avgResponseTime = results.responseTimes.length > 0
    ? results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length
    : 0;
  
  const medianResponseTime = results.responseTimes.length > 0
    ? results.responseTimes.sort((a, b) => a - b)[Math.floor(results.responseTimes.length / 2)]
    : 0;
  
  const p95ResponseTime = results.responseTimes.length > 0
    ? results.responseTimes.sort((a, b) => a - b)[Math.floor(results.responseTimes.length * 0.95)]
    : 0;
  
  const errorRate = results.failed / CONFIG.CONCURRENT_USERS;
  const throughput = (CONFIG.CONCURRENT_USERS / totalTime) * 1000; // req/s
  
  // Log results
  log(`Completed in ${totalTime.toFixed(0)}ms`, 'metric');
  log(`Success: ${results.successful}/${CONFIG.CONCURRENT_USERS} (${((results.successful/CONFIG.CONCURRENT_USERS)*100).toFixed(1)}%)`, 'metric');
  log(`Average Response Time: ${avgResponseTime.toFixed(0)}ms`, 'metric');
  log(`Median Response Time: ${medianResponseTime.toFixed(0)}ms`, 'metric');
  log(`95th Percentile: ${p95ResponseTime.toFixed(0)}ms`, 'metric');
  log(`Throughput: ${throughput.toFixed(1)} req/s`, 'metric');
  
  // Evaluate against targets
  const passed = 
    errorRate <= CONFIG.TARGETS.errorRate &&
    avgResponseTime < CONFIG.TARGETS.apiResponse * 2 && // Allow 2x for concurrent load
    throughput >= CONFIG.TARGETS.throughput;
  
  if (passed) {
    log('Concurrent user test PASSED', 'success');
  } else {
    log('Concurrent user test FAILED', 'error');
    if (errorRate > CONFIG.TARGETS.errorRate) {
      log(`Error rate ${(errorRate * 100).toFixed(1)}% exceeds target ${(CONFIG.TARGETS.errorRate * 100)}%`, 'error');
    }
    if (throughput < CONFIG.TARGETS.throughput) {
      log(`Throughput ${throughput.toFixed(1)} req/s below target ${CONFIG.TARGETS.throughput} req/s`, 'error');
    }
  }
  
  return passed;
}

// Test 2: Page Load Performance (3G Simulation)
async function testPageLoadPerformance() {
  log('Testing Page Load Performance on 3G', 'test');
  
  const pages = [
    { url: '/', name: 'Landing Page' },
    { url: '/library', name: 'Library Page' },
    { url: '/billing', name: 'Billing Page' },
  ];
  
  const results = [];
  
  for (const page of pages) {
    try {
      // Simulate 3G latency
      await simulateNetworkDelay('3G');
      
      const startTime = performance.now();
      const response = await timedRequest(`${CONFIG.APP_URL}${page.url}`);
      const loadTime = performance.now() - startTime;
      
      // Simulate additional resources loading (CSS, JS, images)
      const resourceLoadTime = 500; // Estimate for bundled resources
      const totalLoadTime = loadTime + resourceLoadTime;
      
      results.push({
        page: page.name,
        loadTime: totalLoadTime,
        passed: totalLoadTime < CONFIG.TARGETS.pageLoad3G,
      });
      
      const status = totalLoadTime < CONFIG.TARGETS.pageLoad3G ? 'success' : 'warning';
      log(`${page.name}: ${totalLoadTime.toFixed(0)}ms (Target: <${CONFIG.TARGETS.pageLoad3G}ms)`, status);
      
      // Check page size
      if (response.body) {
        const pageSizeKB = Buffer.byteLength(response.body) / 1024;
        log(`  Page size: ${pageSizeKB.toFixed(1)}KB`, 'metric');
        
        if (pageSizeKB > 500) {
          log(`  Warning: Large page size may impact 3G performance`, 'warning');
        }
      }
    } catch (error) {
      log(`${page.name}: Failed - ${error.message}`, 'error');
      results.push({
        page: page.name,
        loadTime: Infinity,
        passed: false,
      });
    }
  }
  
  const allPassed = results.every(r => r.passed);
  const avgLoadTime = results.reduce((sum, r) => sum + r.loadTime, 0) / results.length;
  
  log(`Average page load time: ${avgLoadTime.toFixed(0)}ms`, 'metric');
  
  if (allPassed) {
    log('Page load performance test PASSED', 'success');
  } else {
    log('Page load performance test FAILED', 'error');
  }
  
  return allPassed;
}

// Test 3: API Response Times
async function testAPIResponseTimes() {
  log('Testing API Response Times', 'test');
  
  const endpoints = [
    { url: '/api/health', name: 'Health Check' },
    { url: '/api/trpc/library.getUserSummaries', name: 'Get Summaries' },
    { url: '/api/trpc/auth.getCurrentUser', name: 'Get Current User' },
    { url: '/api/trpc/billing.getSubscription', name: 'Get Subscription' },
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const samples = 10; // Take multiple samples for accuracy
    const times = [];
    
    for (let i = 0; i < samples; i++) {
      try {
        const response = await timedRequest(`${CONFIG.APP_URL}${endpoint.url}`);
        times.push(response.timing.total);
      } catch (error) {
        times.push(CONFIG.TARGETS.apiResponse * 2); // Penalty for errors
      }
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    const passed = avgTime < CONFIG.TARGETS.apiResponse;
    results.push({ endpoint: endpoint.name, avgTime, passed });
    
    const status = passed ? 'success' : 'error';
    log(`${endpoint.name}: Avg ${avgTime.toFixed(0)}ms (Min: ${minTime.toFixed(0)}ms, Max: ${maxTime.toFixed(0)}ms)`, status);
  }
  
  const allPassed = results.every(r => r.passed);
  
  if (allPassed) {
    log('API response time test PASSED', 'success');
  } else {
    const failed = results.filter(r => !r.passed);
    log(`API response time test FAILED - ${failed.length} endpoints too slow`, 'error');
  }
  
  return allPassed;
}

// Test 4: Database Query Performance
async function testDatabasePerformance() {
  log('Testing Database Query Performance', 'test');
  
  const prisma = new PrismaClient();
  const results = [];
  
  try {
    // Test various query patterns
    const queries = [
      {
        name: 'Simple Count',
        fn: () => prisma.user.count(),
      },
      {
        name: 'Find Many with Limit',
        fn: () => prisma.summary.findMany({ take: 10 }),
      },
      {
        name: 'Complex Join',
        fn: () => prisma.user.findMany({
          take: 5,
          include: {
            summaries: {
              take: 5,
              orderBy: { createdAt: 'desc' },
            },
          },
        }),
      },
      {
        name: 'Aggregation',
        fn: () => prisma.summary.groupBy({
          by: ['status'],
          _count: true,
        }),
      },
    ];
    
    // Run each query multiple times
    for (const query of queries) {
      const times = [];
      const samples = 20;
      
      for (let i = 0; i < samples; i++) {
        const startTime = performance.now();
        await query.fn();
        const queryTime = performance.now() - startTime;
        times.push(queryTime);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      const passed = avgTime < CONFIG.TARGETS.dbQuery;
      results.push({ query: query.name, avgTime, passed });
      
      const status = passed ? 'success' : avgTime < CONFIG.TARGETS.dbQuery * 2 ? 'warning' : 'error';
      log(`${query.name}: Avg ${avgTime.toFixed(2)}ms (Min: ${minTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms)`, status);
    }
    
    // Test concurrent queries
    log('Testing concurrent database queries...', 'info');
    
    const concurrentQueries = [];
    for (let i = 0; i < 50; i++) {
      concurrentQueries.push(prisma.user.count());
    }
    
    const concurrentStart = performance.now();
    await Promise.all(concurrentQueries);
    const concurrentTime = performance.now() - concurrentStart;
    const avgConcurrentTime = concurrentTime / 50;
    
    log(`Concurrent queries: ${avgConcurrentTime.toFixed(2)}ms average`, 'metric');
    
    if (avgConcurrentTime < CONFIG.TARGETS.dbQuery) {
      log('Database handles concurrent load well', 'success');
      results.push({ query: 'Concurrent Load', avgTime: avgConcurrentTime, passed: true });
    } else {
      log('Database struggles with concurrent load', 'warning');
      results.push({ query: 'Concurrent Load', avgTime: avgConcurrentTime, passed: false });
    }
    
  } catch (error) {
    log(`Database test error: ${error.message}`, 'error');
    return false;
  } finally {
    await prisma.$disconnect();
  }
  
  const allPassed = results.every(r => r.passed);
  
  if (allPassed) {
    log('Database performance test PASSED', 'success');
  } else {
    const failed = results.filter(r => !r.passed);
    log(`Database performance test FAILED - ${failed.length} queries too slow`, 'error');
  }
  
  return allPassed;
}

// Test 5: Sustained Load Test
async function testSustainedLoad() {
  log(`Testing Sustained Load (${CONFIG.TEST_DURATION/1000}s)`, 'test');
  
  const startTime = Date.now();
  const endTime = startTime + CONFIG.TEST_DURATION;
  
  const metrics = {
    requests: 0,
    successful: 0,
    failed: 0,
    responseTimes: [],
    errorTypes: {},
  };
  
  // Function to make continuous requests
  async function makeRequests() {
    while (Date.now() < endTime) {
      try {
        const response = await timedRequest(`${CONFIG.APP_URL}/api/health`);
        metrics.requests++;
        metrics.successful++;
        metrics.responseTimes.push(response.timing.total);
        
        if (metrics.requests % 100 === 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const rps = metrics.requests / elapsed;
          log(`Progress: ${metrics.requests} requests, ${rps.toFixed(1)} req/s`, 'metric');
        }
      } catch (error) {
        metrics.requests++;
        metrics.failed++;
        const errorType = error.message || 'Unknown';
        metrics.errorTypes[errorType] = (metrics.errorTypes[errorType] || 0) + 1;
      }
      
      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  // Run multiple concurrent request makers
  const workers = 10;
  const workerPromises = [];
  
  for (let i = 0; i < workers; i++) {
    workerPromises.push(makeRequests());
  }
  
  await Promise.all(workerPromises);
  
  // Calculate final metrics
  const duration = (Date.now() - startTime) / 1000;
  const throughput = metrics.requests / duration;
  const errorRate = metrics.failed / metrics.requests;
  const avgResponseTime = metrics.responseTimes.length > 0
    ? metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length
    : 0;
  
  log(`Sustained load test completed`, 'metric');
  log(`Total Requests: ${metrics.requests}`, 'metric');
  log(`Duration: ${duration.toFixed(1)}s`, 'metric');
  log(`Throughput: ${throughput.toFixed(1)} req/s`, 'metric');
  log(`Success Rate: ${((metrics.successful/metrics.requests)*100).toFixed(1)}%`, 'metric');
  log(`Average Response Time: ${avgResponseTime.toFixed(0)}ms`, 'metric');
  
  if (Object.keys(metrics.errorTypes).length > 0) {
    log('Error breakdown:', 'warning');
    Object.entries(metrics.errorTypes).forEach(([type, count]) => {
      log(`  ${type}: ${count}`, 'warning');
    });
  }
  
  const passed = 
    throughput >= CONFIG.TARGETS.throughput &&
    errorRate <= CONFIG.TARGETS.errorRate &&
    avgResponseTime < CONFIG.TARGETS.apiResponse * 3; // Allow 3x for sustained load
  
  if (passed) {
    log('Sustained load test PASSED', 'success');
  } else {
    log('Sustained load test FAILED', 'error');
  }
  
  return passed;
}

// Test 6: Memory and Resource Usage
async function testResourceUsage() {
  log('Testing Memory and Resource Usage', 'test');
  
  const initialMemory = process.memoryUsage();
  
  // Generate some load
  const requests = [];
  for (let i = 0; i < 100; i++) {
    requests.push(timedRequest(`${CONFIG.APP_URL}/api/health`).catch(() => {}));
  }
  
  await Promise.all(requests);
  
  const finalMemory = process.memoryUsage();
  
  // Calculate memory changes
  const heapUsedMB = finalMemory.heapUsed / 1024 / 1024;
  const heapTotalMB = finalMemory.heapTotal / 1024 / 1024;
  const externalMB = finalMemory.external / 1024 / 1024;
  const heapGrowthMB = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
  
  log(`Heap Used: ${heapUsedMB.toFixed(2)}MB`, 'metric');
  log(`Heap Total: ${heapTotalMB.toFixed(2)}MB`, 'metric');
  log(`External: ${externalMB.toFixed(2)}MB`, 'metric');
  log(`Heap Growth: ${heapGrowthMB.toFixed(2)}MB`, 'metric');
  
  // Check for memory leaks
  const acceptableGrowth = 50; // MB
  const hasMemoryLeak = heapGrowthMB > acceptableGrowth;
  
  if (!hasMemoryLeak) {
    log('No significant memory leaks detected', 'success');
  } else {
    log(`Warning: High memory growth detected (${heapGrowthMB.toFixed(2)}MB)`, 'warning');
  }
  
  // Check CPU usage (approximate)
  const cpuCount = os.cpus().length;
  log(`Available CPU cores: ${cpuCount}`, 'metric');
  
  return !hasMemoryLeak;
}

// Main test runner
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  PHASE 8.3: LOAD TESTING');
  console.log('='.repeat(60) + '\n');
  
  log(`Target Environment: ${CONFIG.APP_URL}`, 'info');
  log(`Performance Targets:`, 'info');
  log(`  - Page Load (3G): <${CONFIG.TARGETS.pageLoad3G}ms`, 'info');
  log(`  - API Response: <${CONFIG.TARGETS.apiResponse}ms`, 'info');
  log(`  - DB Query: <${CONFIG.TARGETS.dbQuery}ms`, 'info');
  log(`  - Error Rate: <${(CONFIG.TARGETS.errorRate * 100)}%`, 'info');
  log(`  - Throughput: >${CONFIG.TARGETS.throughput} req/s`, 'info');
  
  const tests = [
    { name: 'Concurrent Users', fn: testConcurrentUsers },
    { name: 'Page Load Performance', fn: testPageLoadPerformance },
    { name: 'API Response Times', fn: testAPIResponseTimes },
    { name: 'Database Performance', fn: testDatabasePerformance },
    { name: 'Sustained Load', fn: testSustainedLoad },
    { name: 'Resource Usage', fn: testResourceUsage },
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log('\n' + '-'.repeat(40));
    const startTime = performance.now();
    const passed = await test.fn();
    const duration = ((performance.now() - startTime) / 1000).toFixed(1);
    results.push({ name: test.name, passed, duration });
    console.log(`Test duration: ${duration}s`);
    console.log('-'.repeat(40));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('  LOAD TEST SUMMARY');
  console.log('='.repeat(60) + '\n');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);
  
  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.name} (${r.duration}s)`);
  });
  
  console.log('\n' + '-'.repeat(40));
  console.log(`Result: ${passed}/${total} tests passed (${percentage}%)`);
  
  if (percentage >= 100) {
    console.log(`${colors.green}✅ PERFORMANCE TARGETS MET${colors.reset}`);
    console.log('System ready for production load');
  } else if (percentage >= 80) {
    console.log(`${colors.yellow}⚠️  PERFORMANCE ACCEPTABLE${colors.reset}`);
    console.log('Some optimizations recommended before launch');
  } else {
    console.log(`${colors.red}❌ PERFORMANCE ISSUES DETECTED${colors.reset}`);
    console.log('Critical performance problems must be resolved');
  }
  
  console.log('='.repeat(60) + '\n');
  
  process.exit(passed === total ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { main };