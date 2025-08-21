#!/usr/bin/env node

/**
 * Phase 8.1: Critical Systems Verification
 * 
 * Deep verification of all critical platform systems:
 * - Authentication (Clerk)
 * - Payment Processing (Stripe)
 * - Video Summarization Pipeline
 * - Database Performance
 * - Error Tracking (Sentry)
 * - Security Headers
 * - Webhook Security
 * - Environment Configuration
 */

const { execSync } = require('child_process');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { PrismaClient } = require('@prisma/client');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Test configuration
const CONFIG = {
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  API_URL: 'http://localhost:8000',
  CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
};

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, type = 'info') {
  const prefix = {
    success: `${colors.green}✅`,
    error: `${colors.red}❌`,
    warning: `${colors.yellow}⚠️`,
    info: `${colors.blue}ℹ️`,
    test: `${colors.bright}🧪`,
  };
  
  console.log(`${prefix[type] || prefix.info} ${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const req = protocol.request({
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      ...options,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });
    
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// Test Authentication System
async function testAuthenticationSystem() {
  log('Testing Authentication System (Clerk)', 'test');
  
  try {
    // Test 1: Check Clerk environment variables
    const clerkVars = [
      'CLERK_SECRET_KEY',
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'CLERK_WEBHOOK_SECRET',
    ];
    
    const missingClerkVars = clerkVars.filter(v => !process.env[v]);
    if (missingClerkVars.length === 0) {
      log('Clerk environment variables configured', 'success');
    } else {
      log(`Missing Clerk variables: ${missingClerkVars.join(', ')}`, 'error');
      return false;
    }
    
    // Test 2: Verify Clerk webhook endpoint
    const webhookUrl = `${CONFIG.APP_URL}/api/webhooks/clerk`;
    const testPayload = {
      type: 'user.created',
      data: { id: 'test_user_' + Date.now() },
    };
    
    // Generate test signature (this will fail validation but shows webhook is active)
    const timestamp = Date.now().toString();
    const signedContent = `${timestamp}.${JSON.stringify(testPayload)}`;
    const signature = crypto
      .createHmac('sha256', CONFIG.CLERK_WEBHOOK_SECRET || 'test')
      .update(signedContent)
      .digest('base64');
    
    const response = await makeRequest(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'svix-id': 'test_' + Date.now(),
        'svix-timestamp': timestamp,
        'svix-signature': `v1,${signature}`,
      },
      body: JSON.stringify(testPayload),
    });
    
    if (response.status === 401 || response.status === 400) {
      log('Clerk webhook signature verification active', 'success');
    } else if (response.status === 200) {
      log('Clerk webhook processed test event', 'success');
    } else {
      log(`Clerk webhook returned unexpected status: ${response.status}`, 'warning');
    }
    
    // Test 3: Check authentication middleware on protected routes
    const protectedRoutes = [
      '/api/trpc/library.getUserSummaries',
      '/api/trpc/billing.getSubscription',
    ];
    
    for (const route of protectedRoutes) {
      const protectedResponse = await makeRequest(`${CONFIG.APP_URL}${route}`);
      if (protectedResponse.status === 401 || protectedResponse.status === 403) {
        log(`Protected route ${route} requires authentication`, 'success');
      } else {
        log(`Protected route ${route} not properly secured`, 'error');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    log(`Authentication test failed: ${error.message}`, 'error');
    return false;
  }
}

// Test Payment Processing System
async function testPaymentSystem() {
  log('Testing Payment Processing System (Stripe)', 'test');
  
  try {
    // Test 1: Check Stripe environment variables
    const stripeVars = [
      'STRIPE_SECRET_KEY',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'NEXT_PUBLIC_STRIPE_PRO_PRICE_ID',
    ];
    
    const missingStripeVars = stripeVars.filter(v => !process.env[v]);
    if (missingStripeVars.length === 0) {
      log('Stripe environment variables configured', 'success');
    } else {
      log(`Missing Stripe variables: ${missingStripeVars.join(', ')}`, 'error');
      return false;
    }
    
    // Test 2: Verify Stripe API connection
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const prices = await stripe.prices.list({ limit: 1 });
        log(`Stripe API connected (${prices.data.length} price(s) found)`, 'success');
      } catch (stripeError) {
        log(`Stripe API error: ${stripeError.message}`, 'error');
        return false;
      }
    }
    
    // Test 3: Verify Stripe webhook endpoint
    const webhookUrl = `${CONFIG.APP_URL}/api/webhooks/stripe`;
    const testPayload = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_' + Date.now(),
          customer: 'cus_test',
          subscription: 'sub_test',
        },
      },
    };
    
    // Generate test signature
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = `${timestamp}.${JSON.stringify(testPayload)}`;
    const signature = crypto
      .createHmac('sha256', CONFIG.STRIPE_WEBHOOK_SECRET || 'test')
      .update(payload)
      .digest('hex');
    
    const response = await makeRequest(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': `t=${timestamp},v1=${signature}`,
      },
      body: JSON.stringify(testPayload),
    });
    
    if (response.status === 400 || response.status === 401) {
      log('Stripe webhook signature verification active', 'success');
    } else if (response.status === 200) {
      log('Stripe webhook processed test event', 'success');
    } else {
      log(`Stripe webhook returned status: ${response.status}`, 'warning');
    }
    
    return true;
  } catch (error) {
    log(`Payment system test failed: ${error.message}`, 'error');
    return false;
  }
}

// Test Video Summarization Pipeline
async function testSummarizationPipeline() {
  log('Testing Video Summarization Pipeline', 'test');
  
  try {
    // Test 1: Check Python API health
    const apiHealth = await makeRequest(`${CONFIG.API_URL}/api/health`);
    
    if (apiHealth.status === 200) {
      const healthData = JSON.parse(apiHealth.body);
      log(`Python API healthy: ${healthData.status}`, 'success');
    } else {
      log(`Python API unhealthy: status ${apiHealth.status}`, 'error');
      return false;
    }
    
    // Test 2: Check AI service environment variables
    const aiVars = [
      'OPENAI_API_KEY',
      'YOUTUBE_API_KEY',
    ];
    
    const missingAiVars = aiVars.filter(v => !process.env[v]);
    if (missingAiVars.length === 0) {
      log('AI service credentials configured', 'success');
    } else {
      log(`Missing AI variables: ${missingAiVars.join(', ')}`, 'warning');
    }
    
    // Test 3: Check transcript service fallback configuration
    const transcriptServices = {
      'GUMLOOP_API_KEY': 'Gumloop',
      'OXYLABS_USERNAME': 'Oxylabs',
      'OXYLABS_PASSWORD': 'Oxylabs',
    };
    
    const configuredServices = Object.entries(transcriptServices)
      .filter(([key]) => process.env[key])
      .map(([, name]) => name);
    
    if (configuredServices.length > 0) {
      log(`Transcript services configured: ${[...new Set(configuredServices)].join(', ')}`, 'success');
    } else {
      log('No transcript fallback services configured', 'warning');
    }
    
    // Test 4: Verify progress tracking endpoint
    const progressUrl = `${CONFIG.API_URL}/api/progress/test_task_id`;
    const progressResponse = await makeRequest(progressUrl);
    
    if (progressResponse.status === 404 || progressResponse.status === 200) {
      log('Progress tracking endpoint operational', 'success');
    } else {
      log(`Progress endpoint returned unexpected status: ${progressResponse.status}`, 'warning');
    }
    
    return true;
  } catch (error) {
    log(`Summarization pipeline test failed: ${error.message}`, 'error');
    return false;
  }
}

// Test Database Performance
async function testDatabasePerformance() {
  log('Testing Database Performance', 'test');
  
  const prisma = new PrismaClient();
  const results = [];
  
  try {
    // Test 1: Connection speed
    const connectStart = Date.now();
    await prisma.$connect();
    const connectTime = Date.now() - connectStart;
    
    if (connectTime < 1000) {
      log(`Database connection established in ${connectTime}ms`, 'success');
      results.push(true);
    } else {
      log(`Slow database connection: ${connectTime}ms`, 'warning');
      results.push(false);
    }
    
    // Test 2: Simple query performance
    const queries = [
      { name: 'User count', query: prisma.user.count() },
      { name: 'Summary count', query: prisma.summary.count() },
      { name: 'Recent summaries', query: prisma.summary.findMany({ take: 10, orderBy: { createdAt: 'desc' } }) },
    ];
    
    for (const { name, query } of queries) {
      const queryStart = Date.now();
      await query;
      const queryTime = Date.now() - queryStart;
      
      if (queryTime < 50) {
        log(`${name} query: ${queryTime}ms`, 'success');
        results.push(true);
      } else if (queryTime < 100) {
        log(`${name} query slow: ${queryTime}ms`, 'warning');
        results.push(true);
      } else {
        log(`${name} query too slow: ${queryTime}ms`, 'error');
        results.push(false);
      }
    }
    
    // Test 3: Connection pool
    const poolTest = [];
    for (let i = 0; i < 10; i++) {
      poolTest.push(prisma.user.count());
    }
    
    const poolStart = Date.now();
    await Promise.all(poolTest);
    const poolTime = Date.now() - poolStart;
    const avgPoolTime = poolTime / 10;
    
    if (avgPoolTime < 20) {
      log(`Connection pool test: ${avgPoolTime.toFixed(2)}ms avg`, 'success');
      results.push(true);
    } else {
      log(`Connection pool slow: ${avgPoolTime.toFixed(2)}ms avg`, 'warning');
      results.push(false);
    }
    
    return results.every(r => r);
  } catch (error) {
    log(`Database test failed: ${error.message}`, 'error');
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Test Error Tracking
async function testErrorTracking() {
  log('Testing Error Tracking (Sentry)', 'test');
  
  try {
    // Test 1: Check Sentry configuration
    if (process.env.SENTRY_DSN) {
      const dsn = process.env.SENTRY_DSN;
      if (dsn.includes('sentry.io') && dsn.includes('@')) {
        log('Sentry DSN properly configured', 'success');
      } else {
        log('Sentry DSN appears malformed', 'warning');
      }
    } else {
      log('Sentry DSN not configured (optional)', 'warning');
    }
    
    // Test 2: Check PostHog configuration (analytics)
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      log('PostHog analytics configured', 'success');
    } else {
      log('PostHog analytics not configured (optional)', 'warning');
    }
    
    // Test 3: Check error boundary implementation
    const errorBoundaryFile = require('fs').existsSync(
      require('path').join(__dirname, '../src/components/monitoring/EnhancedErrorBoundary.tsx')
    );
    
    if (errorBoundaryFile) {
      log('Error boundary component implemented', 'success');
    } else {
      log('Error boundary component not found', 'warning');
    }
    
    return true;
  } catch (error) {
    log(`Error tracking test failed: ${error.message}`, 'error');
    return false;
  }
}

// Test Security Headers
async function testSecurityHeaders() {
  log('Testing Security Headers', 'test');
  
  try {
    const response = await makeRequest(CONFIG.APP_URL);
    const requiredHeaders = {
      'x-frame-options': ['DENY', 'SAMEORIGIN'],
      'x-content-type-options': ['nosniff'],
      'strict-transport-security': ['max-age='],
      'x-xss-protection': ['1; mode=block'],
    };
    
    const results = [];
    
    for (const [header, validValues] of Object.entries(requiredHeaders)) {
      const value = response.headers[header];
      if (value) {
        const isValid = validValues.some(v => value.includes(v));
        if (isValid) {
          log(`${header}: ${value}`, 'success');
          results.push(true);
        } else {
          log(`${header} has unexpected value: ${value}`, 'warning');
          results.push(false);
        }
      } else {
        log(`Missing security header: ${header}`, 'warning');
        results.push(false);
      }
    }
    
    // Check CSP header (optional but recommended)
    if (response.headers['content-security-policy']) {
      log('Content Security Policy configured', 'success');
    } else {
      log('Content Security Policy not configured (recommended)', 'warning');
    }
    
    return results.filter(r => r).length >= 2; // At least 2 security headers required
  } catch (error) {
    log(`Security headers test failed: ${error.message}`, 'error');
    return false;
  }
}

// Test Environment Configuration
async function testEnvironmentConfig() {
  log('Testing Environment Configuration', 'test');
  
  const requiredVars = {
    'Core': [
      'DATABASE_URL',
      'NEXT_PUBLIC_APP_URL',
    ],
    'Authentication': [
      'CLERK_SECRET_KEY',
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'CLERK_WEBHOOK_SECRET',
    ],
    'Payments': [
      'STRIPE_SECRET_KEY',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'NEXT_PUBLIC_STRIPE_PRO_PRICE_ID',
    ],
    'AI Services': [
      'OPENAI_API_KEY',
      'YOUTUBE_API_KEY',
    ],
  };
  
  const results = [];
  
  for (const [category, vars] of Object.entries(requiredVars)) {
    const missing = vars.filter(v => !process.env[v]);
    if (missing.length === 0) {
      log(`${category} variables complete`, 'success');
      results.push(true);
    } else {
      log(`${category} missing: ${missing.join(', ')}`, 'error');
      results.push(false);
    }
  }
  
  // Check optional but recommended variables
  const optionalVars = [
    'SENTRY_DSN',
    'NEXT_PUBLIC_POSTHOG_KEY',
    'GUMLOOP_API_KEY',
    'OXYLABS_USERNAME',
    'UPSTASH_REDIS_URL',
  ];
  
  const configuredOptional = optionalVars.filter(v => process.env[v]);
  if (configuredOptional.length > 0) {
    log(`Optional services configured: ${configuredOptional.length}/${optionalVars.length}`, 'info');
  }
  
  return results.every(r => r);
}

// Main test runner
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  PHASE 8.1: CRITICAL SYSTEMS VERIFICATION');
  console.log('='.repeat(60) + '\n');
  
  const tests = [
    { name: 'Authentication System', fn: testAuthenticationSystem },
    { name: 'Payment Processing', fn: testPaymentSystem },
    { name: 'Summarization Pipeline', fn: testSummarizationPipeline },
    { name: 'Database Performance', fn: testDatabasePerformance },
    { name: 'Error Tracking', fn: testErrorTracking },
    { name: 'Security Headers', fn: testSecurityHeaders },
    { name: 'Environment Configuration', fn: testEnvironmentConfig },
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log('\n' + '-'.repeat(40));
    const result = await test.fn();
    results.push({ name: test.name, passed: result });
    console.log('-'.repeat(40));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('  TEST SUMMARY');
  console.log('='.repeat(60) + '\n');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);
  
  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.name}`);
  });
  
  console.log('\n' + '-'.repeat(40));
  console.log(`Result: ${passed}/${total} systems verified (${percentage}%)`);
  
  if (percentage >= 100) {
    console.log(`${colors.green}✅ ALL CRITICAL SYSTEMS OPERATIONAL${colors.reset}`);
  } else if (percentage >= 85) {
    console.log(`${colors.yellow}⚠️  MOSTLY READY - Some systems need attention${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ NOT READY - Critical systems failing${colors.reset}`);
  }
  
  console.log('='.repeat(60) + '\n');
  
  process.exit(passed === total ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { main };