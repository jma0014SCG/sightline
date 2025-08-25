#!/usr/bin/env node

/**
 * Clerk Production Setup Verification Script
 * This script verifies that Clerk is properly configured for production
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvFile() {
  log('\n🔍 Checking Environment Files...', 'blue');
  
  const envFiles = [
    '.env.local',
    '.env.production.local',
    '.env',
  ];
  
  let foundClerkKeys = false;
  
  for (const file of envFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      if (content.includes('CLERK_SECRET_KEY')) {
        log(`  ✅ Found Clerk keys in ${file}`, 'green');
        foundClerkKeys = true;
        
        // Check for production keys
        if (content.includes('sk_live_')) {
          log(`  ✅ Production secret key detected`, 'green');
        } else if (content.includes('sk_test_')) {
          log(`  ⚠️  Test secret key detected - use production key for deployment`, 'yellow');
        }
        
        if (content.includes('pk_live_')) {
          log(`  ✅ Production publishable key detected`, 'green');
        } else if (content.includes('pk_test_')) {
          log(`  ⚠️  Test publishable key detected - use production key for deployment`, 'yellow');
        }
        
        if (content.includes('CLERK_WEBHOOK_SECRET') && !content.includes('CLERK_WEBHOOK_SECRET=""')) {
          log(`  ✅ Webhook secret configured`, 'green');
        } else {
          log(`  ⚠️  Webhook secret not configured - get from Clerk Dashboard`, 'yellow');
        }
      }
    }
  }
  
  if (!foundClerkKeys) {
    log('  ❌ No Clerk keys found in environment files', 'red');
    return false;
  }
  
  return true;
}

function checkVercelEnv() {
  log('\n🔍 Checking Vercel Environment...', 'blue');
  
  try {
    // Check if Vercel CLI is installed
    execSync('vercel --version', { stdio: 'ignore' });
    log('  ✅ Vercel CLI installed', 'green');
    
    // Try to list environment variables (requires being linked to a project)
    try {
      const output = execSync('vercel env ls production 2>&1', { encoding: 'utf-8' });
      
      if (output.includes('CLERK_SECRET_KEY')) {
        log('  ✅ CLERK_SECRET_KEY found in Vercel', 'green');
      } else {
        log('  ⚠️  CLERK_SECRET_KEY not found in Vercel production env', 'yellow');
      }
      
      if (output.includes('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY')) {
        log('  ✅ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY found in Vercel', 'green');
      } else {
        log('  ⚠️  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY not found in Vercel production env', 'yellow');
      }
      
      if (output.includes('CLERK_WEBHOOK_SECRET')) {
        log('  ✅ CLERK_WEBHOOK_SECRET found in Vercel', 'green');
      } else {
        log('  ⚠️  CLERK_WEBHOOK_SECRET not found in Vercel production env', 'yellow');
      }
    } catch (error) {
      log('  ℹ️  Could not check Vercel env vars - ensure project is linked', 'yellow');
      log('     Run: vercel link', 'yellow');
    }
  } catch (error) {
    log('  ⚠️  Vercel CLI not installed or not linked', 'yellow');
    log('     Install with: npm i -g vercel', 'yellow');
    return false;
  }
  
  return true;
}

function checkCodeConfiguration() {
  log('\n🔍 Checking Code Configuration...', 'blue');
  
  // Check middleware.ts
  const middlewarePath = path.join(process.cwd(), 'src', 'middleware.ts');
  if (fs.existsSync(middlewarePath)) {
    const content = fs.readFileSync(middlewarePath, 'utf-8');
    if (content.includes('@clerk/nextjs')) {
      log('  ✅ Clerk middleware configured', 'green');
    } else {
      log('  ❌ Clerk middleware not found', 'red');
    }
  } else {
    log('  ❌ middleware.ts not found', 'red');
  }
  
  // Check webhook route
  const webhookPath = path.join(process.cwd(), 'src', 'app', 'api', 'webhooks', 'clerk', 'route.ts');
  if (fs.existsSync(webhookPath)) {
    log('  ✅ Clerk webhook route exists', 'green');
    
    const content = fs.readFileSync(webhookPath, 'utf-8');
    if (content.includes('user.created') && content.includes('user.updated')) {
      log('  ✅ Webhook handles user events', 'green');
    }
  } else {
    log('  ❌ Webhook route not found at /api/webhooks/clerk', 'red');
  }
  
  // Check layout.tsx for ClerkProvider
  const layoutPath = path.join(process.cwd(), 'src', 'app', 'layout.tsx');
  if (fs.existsSync(layoutPath)) {
    const content = fs.readFileSync(layoutPath, 'utf-8');
    if (content.includes('ClerkProvider')) {
      log('  ✅ ClerkProvider configured in layout', 'green');
    } else {
      log('  ❌ ClerkProvider not found in layout', 'red');
    }
  }
  
  return true;
}

function printNextSteps() {
  log('\n📋 Next Steps:', 'blue');
  log('\n1. Configure Clerk Dashboard:', 'yellow');
  log('   - Go to: https://dashboard.clerk.com');
  log('   - Create/select production instance');
  log('   - Add domain: sightlineai.io');
  log('   - Create webhook: https://sightlineai.io/api/webhooks/clerk');
  log('   - Copy webhook secret');
  
  log('\n2. Add Webhook Secret:', 'yellow');
  log('   vercel env add CLERK_WEBHOOK_SECRET production');
  
  log('\n3. Deploy to Production:', 'yellow');
  log('   pnpm deploy');
  
  log('\n4. Test Authentication:', 'yellow');
  log('   - Sign up with email');
  log('   - Check database for user sync');
  log('   - Verify webhook in Clerk Dashboard logs');
}

function main() {
  log('🔐 Clerk Production Setup Verification', 'blue');
  log('=====================================', 'blue');
  
  const envOk = checkEnvFile();
  const vercelOk = checkVercelEnv();
  const codeOk = checkCodeConfiguration();
  
  log('\n📊 Summary:', 'blue');
  
  if (envOk && vercelOk && codeOk) {
    log('  ✅ Setup appears ready for production!', 'green');
  } else {
    log('  ⚠️  Some configuration needed - see above', 'yellow');
  }
  
  printNextSteps();
  
  log('\n💡 Run ./scripts/deploy-clerk-production.sh to add keys to Vercel', 'blue');
}

// Run the verification
main();