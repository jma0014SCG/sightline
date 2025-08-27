#!/usr/bin/env node

/**
 * Diagnose 405 Method Not Allowed Error
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

async function testSummarizeEndpoint() {
  log('\n🔍 Testing Railway Backend Summarize Endpoint', colors.bright + colors.magenta);
  log('=' .repeat(60), colors.magenta);
  
  const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Roll for testing
  const backendUrl = 'https://sightline-ai-backend-production.up.railway.app';
  
  return new Promise((resolve) => {
    const postData = JSON.stringify({ url: testUrl });
    
    const options = {
      hostname: 'sightline-ai-backend-production.up.railway.app',
      path: '/api/summarize',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        'Origin': 'https://sightlineai.io'
      }
    };
    
    log(`📡 Testing POST ${backendUrl}/api/summarize`, colors.cyan);
    log(`📦 Payload: ${postData}`, colors.cyan);
    
    const req = https.request(options, (res) => {
      log(`\n📊 Response Status: ${res.statusCode} ${res.statusMessage}`, 
          res.statusCode === 200 ? colors.green : colors.yellow);
      
      log('\n🔒 Response Headers:', colors.cyan);
      Object.entries(res.headers).forEach(([key, value]) => {
        if (key.toLowerCase().includes('cors') || key.toLowerCase().includes('allow')) {
          log(`  ${key}: ${value}`, colors.green);
        }
      });
      
      let data = '';
      res.on('data', (chunk) => data += chunk);
      
      res.on('end', () => {
        if (res.statusCode === 405) {
          log('\n❌ 405 Method Not Allowed - Backend rejected POST request', colors.red);
          log('🔍 Possible causes:', colors.yellow);
          log('  1. CORS policy blocking the request', colors.reset);
          log('  2. Backend not configured to accept POST on /api/summarize', colors.reset);
          log('  3. Missing required headers or authentication', colors.reset);
        } else if (res.statusCode === 200) {
          log('\n✅ Success! Backend accepted the request', colors.green);
          try {
            const json = JSON.parse(data);
            log(`📄 Response: task_id = ${json.task_id}`, colors.green);
          } catch {
            log(`📄 Response: ${data.substring(0, 200)}...`, colors.reset);
          }
        } else if (res.statusCode === 500 || res.statusCode === 422) {
          log(`\n⚠️ Backend Error (${res.statusCode})`, colors.yellow);
          try {
            const error = JSON.parse(data);
            log(`📄 Error: ${JSON.stringify(error, null, 2)}`, colors.yellow);
            
            if (error.detail && error.detail.includes('OPENAI_API_KEY')) {
              log('\n❌ CRITICAL: OpenAI API key not configured in Railway!', colors.red);
              log('🔧 Fix: Add OPENAI_API_KEY to Railway environment variables', colors.yellow);
            }
          } catch {
            log(`📄 Response: ${data}`, colors.reset);
          }
        }
        
        resolve();
      });
    });
    
    req.on('error', (error) => {
      log(`\n❌ Request failed: ${error.message}`, colors.red);
      resolve();
    });
    
    req.write(postData);
    req.end();
  });
}

async function testTRPCEndpoint() {
  log('\n🔍 Testing Vercel tRPC Endpoint', colors.bright + colors.magenta);
  log('=' .repeat(60), colors.magenta);
  
  const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  
  return new Promise((resolve) => {
    const payload = {
      0: {
        json: {
          url: testUrl,
          browserFingerprint: 'test-fingerprint-123'
        }
      }
    };
    
    const postData = JSON.stringify(payload);
    
    const options = {
      hostname: 'sightlineai.io',
      path: '/api/trpc/summary.createAnonymous?batch=1',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };
    
    log(`📡 Testing POST https://sightlineai.io/api/trpc/summary.createAnonymous`, colors.cyan);
    
    const req = https.request(options, (res) => {
      log(`\n📊 Response Status: ${res.statusCode} ${res.statusMessage}`, 
          res.statusCode === 200 ? colors.green : colors.yellow);
      
      let data = '';
      res.on('data', (chunk) => data += chunk);
      
      res.on('end', () => {
        if (res.statusCode === 405) {
          log('\n❌ 405 Method Not Allowed - tRPC endpoint rejected request', colors.red);
          log('🔍 This suggests the API route configuration is broken', colors.yellow);
        } else if (res.statusCode === 200) {
          log('\n✅ tRPC endpoint is working!', colors.green);
          try {
            const json = JSON.parse(data);
            if (json[0]?.error) {
              log(`⚠️ tRPC returned error: ${json[0].error.message}`, colors.yellow);
            } else {
              log('✅ Summary creation initiated successfully', colors.green);
            }
          } catch {
            log(`📄 Response: ${data.substring(0, 200)}...`, colors.reset);
          }
        }
        
        resolve();
      });
    });
    
    req.on('error', (error) => {
      log(`\n❌ Request failed: ${error.message}`, colors.red);
      resolve();
    });
    
    req.write(postData);
    req.end();
  });
}

async function runDiagnostics() {
  log('\n🚨 405 Error Diagnostic Tool', colors.bright + colors.cyan);
  log('=' .repeat(60), colors.cyan);
  
  // Test Railway backend directly
  await testSummarizeEndpoint();
  
  // Test Vercel tRPC endpoint
  await testTRPCEndpoint();
  
  // Recommendations
  log('\n💡 Recommendations:', colors.bright + colors.yellow);
  log('\n1️⃣ Check Railway Environment Variables:', colors.cyan);
  log('   Ensure these are set in Railway dashboard:', colors.reset);
  log('   - OPENAI_API_KEY (CRITICAL!)', colors.reset);
  log('   - GUMLOOP_API_KEY (optional)', colors.reset);
  log('   - DATABASE_URL (for progress tracking)', colors.reset);
  
  log('\n2️⃣ Check Vercel Deployment:', colors.cyan);
  log('   The CSP headers are now fixed', colors.reset);
  log('   Backend URLs are configured correctly', colors.reset);
  
  log('\n3️⃣ Test with curl:', colors.cyan);
  log('   curl -X POST https://sightline-ai-backend-production.up.railway.app/api/summarize \\', colors.bright);
  log('     -H "Content-Type: application/json" \\', colors.bright);
  log('     -d \'{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}\'', colors.bright);
}

runDiagnostics().catch(error => {
  log(`\n💥 Unexpected error: ${error.message}`, colors.red);
  process.exit(1);
});