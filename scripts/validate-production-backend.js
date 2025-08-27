#!/usr/bin/env node

/**
 * Validate Production Backend Configuration
 * Checks all environment variables and backend connectivity
 */

require('dotenv').config({ path: '.env.production' });

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

function checkEnvVar(name, critical = false) {
  const value = process.env[name];
  const icon = value ? '✅' : (critical ? '❌' : '⚠️');
  const color = value ? colors.green : (critical ? colors.red : colors.yellow);
  
  if (value) {
    // Mask sensitive values
    let displayValue = value;
    if (name.includes('KEY') || name.includes('SECRET') || name.includes('TOKEN')) {
      displayValue = value.substring(0, 10) + '...' + value.substring(value.length - 4);
    } else if (name.includes('URL') && value.includes('@')) {
      // Mask database URLs
      displayValue = value.replace(/:[^:@]+@/, ':****@');
    }
    log(`${icon} ${name}: ${displayValue}`, color);
  } else {
    log(`${icon} ${name}: NOT SET${critical ? ' (CRITICAL!)' : ''}`, color);
  }
  
  return !!value;
}

async function validateConfiguration() {
  log('\n🔍 Production Backend Configuration Validation', colors.bright + colors.magenta);
  log('=' .repeat(60), colors.magenta);
  
  // Critical Backend URLs
  log('\n📡 Backend API Configuration:', colors.cyan);
  const backendUrlSet = checkEnvVar('NEXT_PUBLIC_BACKEND_URL', true);
  checkEnvVar('BACKEND_URL', true);
  checkEnvVar('NEXT_PUBLIC_API_URL', false);
  
  // Database Configuration
  log('\n💾 Database Configuration:', colors.cyan);
  const dbUrlSet = checkEnvVar('DATABASE_URL', true);
  checkEnvVar('DATABASE_URL_UNPOOLED', false);
  
  // Authentication
  log('\n🔐 Authentication (Clerk):', colors.cyan);
  checkEnvVar('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', true);
  checkEnvVar('CLERK_SECRET_KEY', true);
  checkEnvVar('CLERK_WEBHOOK_SECRET', false);
  
  // AI Services
  log('\n🤖 AI Services:', colors.cyan);
  checkEnvVar('OPENAI_API_KEY', true);
  checkEnvVar('GUMLOOP_API_KEY', false);
  checkEnvVar('GUMLOOP_USER_ID', false);
  
  // Payments
  log('\n💳 Payment Processing (Stripe):', colors.cyan);
  checkEnvVar('STRIPE_SECRET_KEY', true);
  checkEnvVar('STRIPE_WEBHOOK_SECRET', false);
  checkEnvVar('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', true);
  checkEnvVar('STRIPE_PRO_PRICE_ID', false);
  checkEnvVar('STRIPE_ENTERPRISE_PRICE_ID', false);
  
  // Monitoring
  log('\n📊 Monitoring & Analytics:', colors.cyan);
  checkEnvVar('NEXT_PUBLIC_SENTRY_DSN', false);
  checkEnvVar('SENTRY_AUTH_TOKEN', false);
  checkEnvVar('NEXT_PUBLIC_POSTHOG_KEY', false);
  
  // Validate Backend URL Format
  log('\n🔧 Backend URL Validation:', colors.cyan);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  
  if (backendUrl) {
    if (backendUrl.includes('railway.app')) {
      log('✅ Backend URL points to Railway: ' + backendUrl, colors.green);
    } else if (backendUrl.includes('localhost')) {
      log('⚠️ Backend URL points to localhost - OK for development', colors.yellow);
    } else {
      log('⚠️ Backend URL has unexpected format: ' + backendUrl, colors.yellow);
    }
    
    // Test backend connectivity
    log('\n🧪 Testing Backend Connectivity...', colors.cyan);
    try {
      const https = require('https');
      const url = new URL(backendUrl + '/api/health');
      
      await new Promise((resolve, reject) => {
        https.get(url, (res) => {
          if (res.statusCode === 200) {
            log('✅ Backend is reachable and healthy!', colors.green);
            resolve();
          } else {
            log(`⚠️ Backend returned status ${res.statusCode}`, colors.yellow);
            resolve();
          }
        }).on('error', (err) => {
          log(`❌ Cannot connect to backend: ${err.message}`, colors.red);
          resolve();
        });
      });
    } catch (error) {
      log(`❌ Error testing backend: ${error.message}`, colors.red);
    }
  } else {
    log('❌ NEXT_PUBLIC_BACKEND_URL not set - Backend will not work!', colors.red);
  }
  
  // Database URL Validation
  log('\n💾 Database URL Validation:', colors.cyan);
  const dbUrl = process.env.DATABASE_URL;
  
  if (dbUrl) {
    if (dbUrl.includes('ep-royal-sun-aer2owja')) {
      log('✅ Database points to production branch (ep-royal-sun)', colors.green);
    } else if (dbUrl.includes('ep-plain-king')) {
      log('⚠️ Database points to development branch (ep-plain-king)', colors.yellow);
      log('   Update to production: ep-royal-sun-aer2owja-pooler', colors.yellow);
    } else {
      log('⚠️ Unknown database endpoint', colors.yellow);
    }
  }
  
  // Summary and Recommendations
  log('\n' + '=' .repeat(60), colors.magenta);
  log('📋 Configuration Summary', colors.bright + colors.cyan);
  log('=' .repeat(60), colors.magenta);
  
  const criticalMissing = !backendUrlSet || !dbUrlSet;
  
  if (criticalMissing) {
    log('\n❌ CRITICAL ISSUES FOUND:', colors.bright + colors.red);
    if (!backendUrlSet) {
      log('   - NEXT_PUBLIC_BACKEND_URL must be set for production', colors.red);
      log('     Set to: https://sightline-ai-backend-production.up.railway.app', colors.yellow);
    }
    if (!dbUrlSet) {
      log('   - DATABASE_URL must be set for production', colors.red);
      log('     Use production branch connection string', colors.yellow);
    }
    
    log('\n📝 TO FIX:', colors.bright + colors.yellow);
    log('1. Update environment variables in Vercel dashboard', colors.reset);
    log('2. Redeploy with: vercel --prod --force', colors.reset);
  } else {
    log('\n✅ All critical configurations are set!', colors.bright + colors.green);
    log('📝 Next steps:', colors.cyan);
    log('1. Deploy to Vercel: vercel --prod --force', colors.reset);
    log('2. Test summary creation on production', colors.reset);
    log('3. Monitor logs for any errors', colors.reset);
  }
  
  // Vercel CLI Check
  log('\n🚀 Deployment Commands:', colors.cyan);
  log('# Pull latest environment variables from Vercel:', colors.reset);
  log('vercel env pull .env.production', colors.bright);
  log('\n# Deploy to production:', colors.reset);
  log('vercel --prod --force', colors.bright);
  log('\n# Check deployment logs:', colors.reset);
  log('vercel logs --prod', colors.bright);
}

// Run validation
validateConfiguration().catch(error => {
  log(`\n💥 Unexpected error: ${error.message}`, colors.red);
  process.exit(1);
});