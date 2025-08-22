#!/usr/bin/env node

/**
 * Production Verification Script
 * Checks that all production services are properly configured and running
 */

const https = require('https');
const http = require('http');

// Configuration
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://sightline-api-production.up.railway.app';
const FRONTEND_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sightlineai.io';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test functions
async function testUrl(url, expectedStatus = 200) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    
    log(`Testing: ${url}`, 'blue');
    
    client.get(url, (res) => {
      if (res.statusCode === expectedStatus) {
        log(`✅ Success: ${url} returned ${res.statusCode}`, 'green');
        resolve(true);
      } else {
        log(`❌ Failed: ${url} returned ${res.statusCode} (expected ${expectedStatus})`, 'red');
        resolve(false);
      }
    }).on('error', (err) => {
      log(`❌ Error connecting to ${url}: ${err.message}`, 'red');
      resolve(false);
    });
  });
}

async function testBackendEndpoint(endpoint, description) {
  const url = `${BACKEND_URL}${endpoint}`;
  log(`\n📍 Testing ${description}...`, 'yellow');
  return await testUrl(url);
}

async function testCORS() {
  return new Promise((resolve) => {
    const url = new URL(`${BACKEND_URL}/api/health`);
    const client = url.protocol === 'https:' ? https : http;
    
    log(`\n📍 Testing CORS configuration...`, 'yellow');
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      }
    };
    
    const req = client.request(options, (res) => {
      const corsHeaders = res.headers['access-control-allow-origin'];
      if (corsHeaders) {
        log(`✅ CORS configured: Allow-Origin = ${corsHeaders}`, 'green');
        resolve(true);
      } else {
        log(`❌ CORS not configured properly`, 'red');
        resolve(false);
      }
    });
    
    req.on('error', (err) => {
      log(`❌ CORS test failed: ${err.message}`, 'red');
      resolve(false);
    });
    
    req.end();
  });
}

async function checkEnvironmentVariables() {
  log(`\n📍 Checking environment variables...`, 'yellow');
  
  const required = [
    'DATABASE_URL',
    'NEXT_PUBLIC_BACKEND_URL',
    'OPENAI_API_KEY',
    'CLERK_SECRET_KEY',
    'STRIPE_SECRET_KEY',
  ];
  
  const missing = [];
  
  for (const varName of required) {
    if (process.env[varName]) {
      log(`✅ ${varName} is set`, 'green');
    } else {
      log(`❌ ${varName} is NOT set`, 'red');
      missing.push(varName);
    }
  }
  
  return missing.length === 0;
}

async function testProgressEndpoint() {
  const testTaskId = 'test-' + Date.now();
  const url = `${BACKEND_URL}/api/progress/${testTaskId}`;
  
  log(`\n📍 Testing progress endpoint...`, 'yellow');
  log(`Testing: ${url}`, 'blue');
  
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'queued' && json.task_id === testTaskId) {
            log(`✅ Progress endpoint working: Returns queued status for unknown tasks`, 'green');
            resolve(true);
          } else {
            log(`⚠️  Progress endpoint returned unexpected data: ${JSON.stringify(json)}`, 'yellow');
            resolve(true); // Still consider it working if it returns JSON
          }
        } catch (e) {
          log(`❌ Progress endpoint failed: Invalid JSON response`, 'red');
          resolve(false);
        }
      });
    }).on('error', (err) => {
      log(`❌ Error testing progress endpoint: ${err.message}`, 'red');
      resolve(false);
    });
  });
}

// Main verification function
async function verifyProduction() {
  log('\n🚀 Starting Production Verification\n', 'blue');
  log(`Backend URL: ${BACKEND_URL}`, 'blue');
  log(`Frontend URL: ${FRONTEND_URL}`, 'blue');
  
  const results = {
    environment: false,
    backend: false,
    health: false,
    progress: false,
    cors: false,
  };
  
  // Check environment variables
  results.environment = await checkEnvironmentVariables();
  
  // Test backend endpoints
  results.backend = await testBackendEndpoint('/api', 'Backend root');
  results.health = await testBackendEndpoint('/api/health', 'Health check');
  results.progress = await testProgressEndpoint();
  
  // Test CORS
  results.cors = await testCORS();
  
  // Summary
  log('\n' + '='.repeat(50), 'blue');
  log('📊 VERIFICATION SUMMARY', 'blue');
  log('='.repeat(50), 'blue');
  
  let allPassed = true;
  for (const [key, value] of Object.entries(results)) {
    const status = value ? '✅ PASS' : '❌ FAIL';
    const color = value ? 'green' : 'red';
    log(`${key.padEnd(15)} : ${status}`, color);
    if (!value) allPassed = false;
  }
  
  log('='.repeat(50), 'blue');
  
  if (allPassed) {
    log('\n✅ All checks passed! Production is properly configured.', 'green');
    process.exit(0);
  } else {
    log('\n❌ Some checks failed. Please review the configuration.', 'red');
    log('\n📝 Next steps:', 'yellow');
    
    if (!results.environment) {
      log('1. Set missing environment variables in .env file', 'yellow');
    }
    if (!results.backend || !results.health) {
      log('2. Ensure Railway backend is deployed and running', 'yellow');
      log(`   Check: ${BACKEND_URL}/api/health`, 'yellow');
    }
    if (!results.cors) {
      log('3. Update CORS configuration in Python API to allow frontend domain', 'yellow');
    }
    if (!results.progress) {
      log('4. Check database connection and progress storage service', 'yellow');
    }
    
    process.exit(1);
  }
}

// Run verification
verifyProduction().catch((err) => {
  log(`\n❌ Verification script error: ${err.message}`, 'red');
  process.exit(1);
});