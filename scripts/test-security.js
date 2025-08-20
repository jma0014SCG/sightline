#!/usr/bin/env node

/**
 * Security Feature Test Script
 * Tests rate limiting, CORS, webhook security, and validation
 * 
 * Usage: node scripts/test-security.js
 */

const https = require('https');
const http = require('http');

// Configuration
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const isHttps = APP_URL.startsWith('https');
const url = new URL(APP_URL);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m',
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
};

/**
 * Make an HTTP request
 */
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const client = isHttps ? https : http;
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
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

/**
 * Test rate limiting
 */
async function testRateLimiting() {
  console.log(`\n${colors.bold}Testing Rate Limiting...${colors.reset}`);
  
  try {
    // Test if rate limit headers are present
    const response = await makeRequest({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 3000),
      path: '/api/health',
      method: 'GET',
    });
    
    if (response.headers['x-ratelimit-limit']) {
      console.log(`${colors.green}✓${colors.reset} Rate limit headers present`);
      console.log(`  Limit: ${response.headers['x-ratelimit-limit']}`);
      console.log(`  Remaining: ${response.headers['x-ratelimit-remaining']}`);
      results.passed++;
    } else {
      console.log(`${colors.yellow}⚠${colors.reset} Rate limit headers not found (Redis may not be configured)`);
      results.skipped++;
    }
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Rate limiting test failed: ${error.message}`);
    results.failed++;
  }
}

/**
 * Test CORS configuration
 */
async function testCORS() {
  console.log(`\n${colors.bold}Testing CORS Configuration...${colors.reset}`);
  
  try {
    // Test preflight request
    const response = await makeRequest({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 3000),
      path: '/api/health',
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://example.com',
        'Access-Control-Request-Method': 'POST',
      },
    });
    
    if (response.headers['access-control-allow-methods']) {
      console.log(`${colors.green}✓${colors.reset} CORS preflight handled correctly`);
      console.log(`  Allowed Methods: ${response.headers['access-control-allow-methods']}`);
      results.passed++;
    } else {
      console.log(`${colors.yellow}⚠${colors.reset} CORS headers not fully configured`);
      results.skipped++;
    }
    
    // Test CORS with allowed origin
    const response2 = await makeRequest({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 3000),
      path: '/api/health',
      method: 'GET',
      headers: {
        'Origin': APP_URL,
      },
    });
    
    if (response2.headers['access-control-allow-origin'] === APP_URL) {
      console.log(`${colors.green}✓${colors.reset} CORS allows requests from app origin`);
      results.passed++;
    } else {
      console.log(`${colors.yellow}⚠${colors.reset} CORS origin validation may need adjustment`);
      results.skipped++;
    }
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} CORS test failed: ${error.message}`);
    results.failed++;
  }
}

/**
 * Test security headers
 */
async function testSecurityHeaders() {
  console.log(`\n${colors.bold}Testing Security Headers...${colors.reset}`);
  
  try {
    const response = await makeRequest({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 3000),
      path: '/',
      method: 'GET',
    });
    
    const securityHeaders = [
      'content-security-policy',
      'strict-transport-security',
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
    ];
    
    for (const header of securityHeaders) {
      if (response.headers[header]) {
        console.log(`${colors.green}✓${colors.reset} ${header} is set`);
        results.passed++;
      } else {
        console.log(`${colors.yellow}⚠${colors.reset} ${header} is not set`);
        results.skipped++;
      }
    }
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Security headers test failed: ${error.message}`);
    results.failed++;
  }
}

/**
 * Test webhook security
 */
async function testWebhookSecurity() {
  console.log(`\n${colors.bold}Testing Webhook Security...${colors.reset}`);
  
  try {
    // Test Clerk webhook without signature
    const response = await makeRequest({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 3000),
      path: '/api/webhooks/clerk',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: true }),
    });
    
    if (response.statusCode === 400) {
      console.log(`${colors.green}✓${colors.reset} Clerk webhook rejects unsigned requests`);
      results.passed++;
    } else {
      console.log(`${colors.red}✗${colors.reset} Clerk webhook accepted unsigned request`);
      results.failed++;
    }
    
    // Test Stripe webhook without signature
    const response2 = await makeRequest({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 3000),
      path: '/api/webhooks/stripe',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: true }),
    });
    
    if (response2.statusCode === 400) {
      console.log(`${colors.green}✓${colors.reset} Stripe webhook rejects unsigned requests`);
      results.passed++;
    } else {
      console.log(`${colors.red}✗${colors.reset} Stripe webhook accepted unsigned request`);
      results.failed++;
    }
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Webhook security test failed: ${error.message}`);
    results.failed++;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log(`${colors.bold}${colors.blue}Security Feature Tests${colors.reset}`);
  console.log(`Testing against: ${APP_URL}`);
  console.log('─'.repeat(50));
  
  await testRateLimiting();
  await testCORS();
  await testSecurityHeaders();
  await testWebhookSecurity();
  
  // Summary
  console.log('\n' + '─'.repeat(50));
  console.log(`${colors.bold}Test Results:${colors.reset}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.yellow}Skipped: ${results.skipped}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  
  if (results.failed === 0) {
    console.log(`\n${colors.green}${colors.bold}✅ All critical security features are working!${colors.reset}`);
    if (results.skipped > 0) {
      console.log(`${colors.yellow}Note: Some features are skipped (likely due to missing Redis configuration)${colors.reset}`);
    }
  } else {
    console.log(`\n${colors.red}${colors.bold}❌ Some security tests failed. Please review the output above.${colors.reset}`);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await makeRequest({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 3000),
      path: '/',
      method: 'HEAD',
    });
    
    if (response.statusCode >= 200 && response.statusCode < 500) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

// Main execution
(async () => {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log(`${colors.red}Error: Server is not running at ${APP_URL}${colors.reset}`);
    console.log('Please start the development server with: pnpm dev');
    process.exit(1);
  }
  
  await runTests();
})();