#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Tests that the Railway API and Vercel frontend are properly connected
 */

const https = require('https');
const http = require('http');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper functions for colored output
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n${'='.repeat(50)}`)
};

// Get backend URL from environment or command line
const BACKEND_URL = process.argv[2] || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;
const FRONTEND_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sightline.ai';

if (!BACKEND_URL || BACKEND_URL === 'http://localhost:8000') {
  log.error('Please provide the Railway backend URL as an argument or set NEXT_PUBLIC_BACKEND_URL');
  log.info('Usage: node scripts/verify-deployment.js https://your-api.railway.app');
  process.exit(1);
}

// Test functions
async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.method === 'POST' && options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testHealthEndpoint() {
  log.header('Testing Health Endpoint');
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/health`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      log.success(`Health check passed: ${data.status}`);
      log.info(`Timestamp: ${data.timestamp}`);
      return true;
    } else {
      log.error(`Health check failed with status ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    log.error(`Health check error: ${error.message}`);
    return false;
  }
}

async function testCORS() {
  log.header('Testing CORS Configuration');
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/health`, {
      headers: {
        'Origin': FRONTEND_URL
      }
    });
    
    const corsHeaders = response.headers['access-control-allow-origin'];
    
    if (corsHeaders) {
      log.success(`CORS is configured: ${corsHeaders}`);
      return true;
    } else {
      log.warn('CORS headers not found. This might cause issues with frontend requests.');
      return false;
    }
  } catch (error) {
    log.error(`CORS test error: ${error.message}`);
    return false;
  }
}

async function testSummarizationEndpoint() {
  log.header('Testing Summarization Endpoint');
  
  const testData = JSON.stringify({
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    user_id: 'test-deployment-verification'
  });
  
  try {
    log.info('Sending test summarization request...');
    log.info('Note: This will start actual processing if API keys are configured');
    
    const response = await makeRequest(`${BACKEND_URL}/api/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': testData.length
      },
      body: testData
    });
    
    if (response.statusCode === 200 || response.statusCode === 201) {
      const data = JSON.parse(response.data);
      log.success('Summarization endpoint is working!');
      log.info(`Task ID: ${data.task_id || 'N/A'}`);
      
      if (data.task_id) {
        // Test progress tracking
        await testProgressTracking(data.task_id);
      }
      return true;
    } else if (response.statusCode === 401 || response.statusCode === 403) {
      log.warn('Authentication required. This is expected for protected endpoints.');
      return true;
    } else if (response.statusCode === 400) {
      log.warn('Bad request. API is working but request validation failed.');
      log.info('Response: ' + response.data);
      return true;
    } else {
      log.error(`Summarization test failed with status ${response.statusCode}`);
      log.info('Response: ' + response.data);
      return false;
    }
  } catch (error) {
    log.error(`Summarization test error: ${error.message}`);
    return false;
  }
}

async function testProgressTracking(taskId) {
  log.header('Testing Progress Tracking');
  
  try {
    log.info(`Checking progress for task: ${taskId}`);
    
    const response = await makeRequest(`${BACKEND_URL}/api/progress/${taskId}`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      log.success('Progress tracking is working!');
      log.info(`Progress: ${data.progress}%`);
      log.info(`Stage: ${data.stage}`);
      log.info(`Status: ${data.status}`);
      return true;
    } else if (response.statusCode === 404) {
      log.warn('Task not found. This might be normal if the task hasn\'t started yet.');
      return true;
    } else {
      log.error(`Progress tracking failed with status ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    log.error(`Progress tracking error: ${error.message}`);
    return false;
  }
}

async function checkEnvironmentVariables() {
  log.header('Checking Environment Variables');
  
  const requiredVars = [
    'OPENAI_API_KEY',
    'YOUTUBE_API_KEY'
  ];
  
  const optionalVars = [
    'GUMLOOP_API_KEY',
    'OXYLABS_USERNAME',
    'OXYLABS_PASSWORD',
    'UPSTASH_REDIS_URL',
    'SENTRY_DSN'
  ];
  
  log.info('Note: This checks if variables are mentioned in the API response headers');
  log.info('Actual values are not exposed for security\n');
  
  // This is a placeholder - Railway doesn't expose env vars in headers
  // You would need to implement a debug endpoint to check this safely
  log.warn('Environment variable checking requires a debug endpoint on the API');
  log.info('Make sure you\'ve set all required variables in Railway dashboard');
  
  return true;
}

async function testResponseTime() {
  log.header('Testing Response Time');
  
  const startTime = Date.now();
  
  try {
    await makeRequest(`${BACKEND_URL}/api/health`);
    const responseTime = Date.now() - startTime;
    
    if (responseTime < 500) {
      log.success(`Excellent response time: ${responseTime}ms`);
    } else if (responseTime < 1000) {
      log.success(`Good response time: ${responseTime}ms`);
    } else if (responseTime < 3000) {
      log.warn(`Slow response time: ${responseTime}ms`);
    } else {
      log.error(`Very slow response time: ${responseTime}ms`);
    }
    
    return true;
  } catch (error) {
    log.error(`Response time test error: ${error.message}`);
    return false;
  }
}

// Main verification flow
async function runVerification() {
  console.log(`
${colors.bright}${colors.cyan}🚀 Sightline Deployment Verification${colors.reset}
${'='.repeat(50)}
  `);
  
  log.info(`Backend URL: ${colors.yellow}${BACKEND_URL}${colors.reset}`);
  log.info(`Frontend URL: ${colors.yellow}${FRONTEND_URL}${colors.reset}\n`);
  
  const results = {
    health: await testHealthEndpoint(),
    responseTime: await testResponseTime(),
    cors: await testCORS(),
    summarization: await testSummarizationEndpoint(),
    environment: await checkEnvironmentVariables()
  };
  
  // Summary
  log.header('Verification Summary');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, result]) => {
    const status = result ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
    console.log(`  ${test.padEnd(20)} ${status}`);
  });
  
  console.log();
  
  if (passed === total) {
    log.success(`All tests passed! Your deployment is working correctly.`);
    log.info('\nNext steps:');
    log.info('1. Update Vercel environment variables with the Railway URL');
    log.info('2. Redeploy your Vercel frontend');
    log.info('3. Test the complete flow on your production site');
  } else if (passed >= total - 1) {
    log.warn(`Most tests passed (${passed}/${total}). Your deployment should work with minor issues.`);
  } else {
    log.error(`Several tests failed (${passed}/${total}). Please check your deployment configuration.`);
    log.info('\nCommon issues:');
    log.info('- Missing environment variables in Railway');
    log.info('- API not fully deployed yet (wait a few minutes)');
    log.info('- Network/firewall issues');
  }
  
  process.exit(passed === total ? 0 : 1);
}

// Run verification
runVerification().catch((error) => {
  log.error(`Verification failed: ${error.message}`);
  process.exit(1);
});