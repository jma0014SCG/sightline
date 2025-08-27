#!/usr/bin/env node

/**
 * Test Railway Backend Connection
 * Run this to diagnose Railway backend connectivity issues
 */

const https = require('https');

const RAILWAY_URL = 'https://sightline-ai-backend-production.up.railway.app';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const url = `${RAILWAY_URL}${path}`;
    log(`\n📡 Testing: ${url}`, colors.cyan);
    
    const startTime = Date.now();
    
    https.get(url, (res) => {
      const responseTime = Date.now() - startTime;
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const result = {
          path,
          status: res.statusCode,
          statusMessage: res.statusMessage,
          responseTime,
          headers: res.headers,
          data: data.substring(0, 500) // Limit response data
        };
        
        if (res.statusCode === 200) {
          log(`✅ Success: ${res.statusCode} ${res.statusMessage} (${responseTime}ms)`, colors.green);
        } else {
          log(`⚠️ Status: ${res.statusCode} ${res.statusMessage} (${responseTime}ms)`, colors.yellow);
        }
        
        resolve(result);
      });
    }).on('error', (err) => {
      log(`❌ Error: ${err.message}`, colors.red);
      reject(err);
    });
  });
}

async function runTests() {
  log('\n🚀 Railway Backend Connection Test', colors.bright + colors.magenta);
  log('=' .repeat(50), colors.magenta);
  
  const endpoints = [
    '/api/health',
    '/api',
    '/api/progress/test-123'
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const result = await testEndpoint(endpoint);
      results.push(result);
      
      // Parse JSON if possible
      try {
        const json = JSON.parse(result.data);
        log(`📄 Response: ${JSON.stringify(json, null, 2)}`, colors.reset);
      } catch {
        log(`📄 Response: ${result.data.substring(0, 200)}...`, colors.reset);
      }
      
    } catch (error) {
      results.push({
        path: endpoint,
        error: error.message
      });
    }
  }
  
  // Summary
  log('\n' + '=' .repeat(50), colors.magenta);
  log('📊 Test Summary', colors.bright + colors.cyan);
  log('=' .repeat(50), colors.magenta);
  
  const successful = results.filter(r => r.status === 200).length;
  const failed = results.filter(r => r.error || r.status !== 200).length;
  
  log(`✅ Successful: ${successful}/${results.length}`, colors.green);
  if (failed > 0) {
    log(`❌ Failed: ${failed}/${results.length}`, colors.red);
  }
  
  // Check CORS headers
  const healthCheck = results.find(r => r.path === '/api/health');
  if (healthCheck && healthCheck.headers) {
    log('\n🔒 CORS Headers:', colors.cyan);
    const corsHeaders = [
      'access-control-allow-origin',
      'access-control-allow-credentials',
      'access-control-allow-methods',
      'access-control-allow-headers'
    ];
    
    corsHeaders.forEach(header => {
      const value = healthCheck.headers[header];
      if (value) {
        log(`  ${header}: ${value}`, colors.green);
      } else {
        log(`  ${header}: NOT SET`, colors.yellow);
      }
    });
  }
  
  // Recommendations
  log('\n💡 Recommendations:', colors.bright + colors.yellow);
  if (successful === results.length) {
    log('✅ Railway backend is fully operational!', colors.green);
    log('✅ All endpoints are responding correctly.', colors.green);
  } else {
    log('⚠️ Some endpoints are not responding as expected.', colors.yellow);
    log('📝 Check Railway logs for errors: https://railway.app', colors.reset);
    log('📝 Verify environment variables are set in Railway dashboard', colors.reset);
    log('📝 Ensure the Railway service is deployed and running', colors.reset);
  }
  
  // Environment variable check
  log('\n🔧 Environment Variables Check:', colors.cyan);
  const envVars = [
    'NEXT_PUBLIC_BACKEND_URL',
    'BACKEND_URL',
    'NEXT_PUBLIC_API_URL'
  ];
  
  envVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      log(`  ${varName}: ${value}`, colors.green);
    } else {
      log(`  ${varName}: NOT SET (will use fallback)`, colors.yellow);
    }
  });
}

// Run the tests
runTests().catch(error => {
  log(`\n💥 Unexpected error: ${error.message}`, colors.red);
  process.exit(1);
});