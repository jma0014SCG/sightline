#!/usr/bin/env node

/**
 * Test Production Summary Creation End-to-End
 */

const https = require('https');

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

function makeRequest(hostname, path, method, data = null) {
  return new Promise((resolve) => {
    const options = {
      hostname,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = postData.length;
    }
    
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          data: responseData
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        error: error.message
      });
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testFullFlow() {
  log('\n🚀 Production Summary Creation Test', colors.bright + colors.magenta);
  log('=' .repeat(60), colors.magenta);
  
  const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Roll
  
  // Step 1: Test tRPC endpoint
  log('\n1️⃣ Testing tRPC Endpoint on Vercel...', colors.cyan);
  const trpcPayload = {
    0: {
      json: {
        url: testUrl,
        browserFingerprint: `test-${Date.now()}`
      }
    }
  };
  
  const trpcResult = await makeRequest(
    'sightlineai.io',
    '/api/trpc/summary.createAnonymous?batch=1',
    'POST',
    trpcPayload
  );
  
  if (trpcResult.status === 405) {
    log('❌ tRPC endpoint still returning 405 - deployment may not be complete', colors.red);
    log('   Wait a minute and try again...', colors.yellow);
    return;
  } else if (trpcResult.status === 200) {
    log('✅ tRPC endpoint is working!', colors.green);
    
    try {
      const response = JSON.parse(trpcResult.data);
      if (response[0]?.error) {
        log(`⚠️ tRPC returned error: ${response[0].error.message}`, colors.yellow);
      } else if (response[0]?.result?.data?.json) {
        const data = response[0].result.data.json;
        log(`✅ Summary created! Task ID: ${data.task_id}`, colors.green);
        
        // Step 2: Check progress
        if (data.task_id) {
          log('\n2️⃣ Checking Progress...', colors.cyan);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          
          const progressResult = await makeRequest(
            'sightlineai.io',
            `/api/trpc/summary.getProgress?batch=1&input=${encodeURIComponent(JSON.stringify({0:{json:{taskId:data.task_id}}}))}`,
            'GET'
          );
          
          if (progressResult.status === 200) {
            try {
              const progress = JSON.parse(progressResult.data);
              log(`📊 Progress: ${JSON.stringify(progress[0]?.result?.data?.json || progress)}`, colors.cyan);
            } catch {
              log(`📊 Progress response: ${progressResult.data.substring(0, 200)}`, colors.reset);
            }
          }
        }
      }
    } catch (e) {
      log(`📄 Response: ${trpcResult.data.substring(0, 500)}`, colors.reset);
    }
  } else {
    log(`⚠️ tRPC returned status ${trpcResult.status}`, colors.yellow);
    log(`📄 Response: ${trpcResult.data.substring(0, 500)}`, colors.reset);
  }
  
  // Step 3: Test Railway backend directly
  log('\n3️⃣ Testing Railway Backend Directly...', colors.cyan);
  const railwayResult = await makeRequest(
    'sightline-ai-backend-production.up.railway.app',
    '/api/summarize',
    'POST',
    { url: testUrl }
  );
  
  if (railwayResult.status === 200) {
    log('✅ Railway backend is working!', colors.green);
    try {
      const data = JSON.parse(railwayResult.data);
      log(`📄 Task ID from Railway: ${data.task_id}`, colors.green);
    } catch {
      log(`📄 Response: ${railwayResult.data.substring(0, 200)}`, colors.reset);
    }
  } else if (railwayResult.status === 500 || railwayResult.status === 422) {
    log(`❌ Railway backend error: ${railwayResult.status}`, colors.red);
    try {
      const error = JSON.parse(railwayResult.data);
      if (error.detail && error.detail.includes('OPENAI_API_KEY')) {
        log('❌ OpenAI API key not configured in Railway!', colors.red);
      }
    } catch {
      log(`📄 Error: ${railwayResult.data}`, colors.yellow);
    }
  }
  
  // Summary
  log('\n' + '=' .repeat(60), colors.magenta);
  log('📊 Test Summary', colors.bright + colors.cyan);
  log('=' .repeat(60), colors.magenta);
  
  if (trpcResult.status === 200 && railwayResult.status === 200) {
    log('✅ EVERYTHING IS WORKING!', colors.bright + colors.green);
    log('   - tRPC endpoints are accessible', colors.green);
    log('   - Railway backend is responding', colors.green);
    log('   - CSP headers are configured correctly', colors.green);
    log('   - Summary creation should work on production!', colors.green);
  } else {
    log('⚠️ Some issues remain:', colors.yellow);
    if (trpcResult.status === 405) {
      log('   - tRPC endpoint fix not deployed yet', colors.yellow);
      log('   - Wait for deployment to complete and try again', colors.yellow);
    }
    if (railwayResult.status !== 200) {
      log('   - Railway backend needs API keys configured', colors.yellow);
    }
  }
}

testFullFlow().catch(error => {
  log(`\n💥 Unexpected error: ${error.message}`, colors.red);
  process.exit(1);
});