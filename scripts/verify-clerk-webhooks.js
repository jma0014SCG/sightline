#!/usr/bin/env node

/**
 * Verify Clerk Webhooks in Production Environment
 */

const https = require('https');
const crypto = require('crypto');

const CONFIG = {
  PROD_URL: process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : require('http');
    
    const req = lib.request({
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function verifyClerkWebhooks() {
  console.log('\n' + '='.repeat(60));
  console.log('  CLERK WEBHOOK VERIFICATION');
  console.log('='.repeat(60) + '\n');
  
  const isProduction = CONFIG.PROD_URL.includes('vercel.app') || CONFIG.PROD_URL.includes('sightline.ai');
  console.log(`Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`URL: ${CONFIG.PROD_URL}\n`);
  
  // Test 1: Check webhook endpoint availability
  console.log('1. Testing webhook endpoint availability...');
  try {
    const healthCheck = await makeRequest(`${CONFIG.PROD_URL}/api/webhooks/clerk`, {
      method: 'GET'
    });
    
    if (healthCheck.status === 405 || healthCheck.status === 401) {
      console.log(`${colors.green}✅ Webhook endpoint exists (returns ${healthCheck.status} for GET)${colors.reset}`);
    } else if (healthCheck.status === 404) {
      console.log(`${colors.red}❌ Webhook endpoint not found${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠️ Could not reach webhook endpoint: ${error.message}${colors.reset}`);
  }
  
  // Test 2: Verify signature validation
  console.log('\n2. Testing signature validation...');
  
  if (!CONFIG.CLERK_WEBHOOK_SECRET) {
    console.log(`${colors.yellow}⚠️ CLERK_WEBHOOK_SECRET not configured${colors.reset}`);
    console.log('   In production, this must be set from Clerk Dashboard');
    
    if (isProduction) {
      console.log(`${colors.red}   ❌ CRITICAL: Production environment missing webhook secret${colors.reset}`);
      return false;
    }
  } else {
    console.log(`${colors.green}✅ CLERK_WEBHOOK_SECRET configured${colors.reset}`);
  }
  
  // Test 3: Send test webhook with valid signature
  console.log('\n3. Testing webhook processing...');
  
  const testPayload = {
    type: 'user.created',
    data: {
      id: `test_${Date.now()}`,
      email_addresses: [{ email_address: 'test@example.com' }],
      first_name: 'Test',
      last_name: 'User',
    }
  };
  
  const timestamp = Date.now().toString();
  const signedContent = `${timestamp}.${JSON.stringify(testPayload)}`;
  const signature = crypto
    .createHmac('sha256', CONFIG.CLERK_WEBHOOK_SECRET || 'test_secret')
    .update(signedContent)
    .digest('base64');
  
  try {
    const response = await makeRequest(`${CONFIG.PROD_URL}/api/webhooks/clerk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'svix-id': `test_${Date.now()}`,
        'svix-timestamp': timestamp,
        'svix-signature': `v1,${signature}`,
      },
      body: JSON.stringify(testPayload),
    });
    
    if (response.status === 200) {
      console.log(`${colors.green}✅ Webhook processed successfully${colors.reset}`);
    } else if (response.status === 401) {
      console.log(`${colors.yellow}⚠️ Signature verification active (expected in production)${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️ Unexpected response: ${response.status}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Webhook test failed: ${error.message}${colors.reset}`);
  }
  
  // Test 4: Verify Clerk Dashboard configuration
  console.log('\n4. Clerk Dashboard Configuration Checklist:');
  console.log('   [ ] Webhook endpoint added in Clerk Dashboard');
  console.log(`   [ ] Endpoint URL: ${CONFIG.PROD_URL}/api/webhooks/clerk`);
  console.log('   [ ] Events enabled: user.created, user.updated, user.deleted');
  console.log('   [ ] Webhook signing secret copied to environment variables');
  console.log('   [ ] Webhook endpoint verified in Clerk Dashboard');
  
  if (isProduction) {
    console.log(`\n${colors.yellow}⚠️ IMPORTANT: Production webhook issues are often due to:${colors.reset}`);
    console.log('   1. Missing or incorrect CLERK_WEBHOOK_SECRET in Vercel environment');
    console.log('   2. Webhook endpoint URL mismatch in Clerk Dashboard');
    console.log('   3. SSL certificate issues (use https:// in production)');
    console.log('   4. Rate limiting or firewall blocking Clerk IPs');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('  RECOMMENDATIONS');
  console.log('='.repeat(60));
  console.log('\n1. Verify environment variables in Vercel dashboard');
  console.log('2. Check Clerk Dashboard webhook logs for failures');
  console.log('3. Ensure webhook endpoint URL matches deployed URL');
  console.log('4. Test with Clerk\'s webhook testing tool in dashboard');
  
  return true;
}

verifyClerkWebhooks().catch(console.error);
