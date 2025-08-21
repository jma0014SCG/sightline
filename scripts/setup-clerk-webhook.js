#!/usr/bin/env node

/**
 * Clerk Webhook Configuration Helper
 * Provides instructions and verification for webhook setup
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function checkEnvFile() {
  console.log('\n=== CLERK WEBHOOK CONFIGURATION ===\n');
  
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check current status
  const hasWebhookSecret = envContent.includes('CLERK_WEBHOOK_SECRET=whsec_');
  const currentSecret = envContent.match(/CLERK_WEBHOOK_SECRET=(.+)/)?.[1];
  
  if (hasWebhookSecret && currentSecret && currentSecret !== 'whsec_your_webhook_secret_here') {
    console.log(`${colors.green}✅ CLERK_WEBHOOK_SECRET is configured${colors.reset}`);
    console.log(`   Current value: ${currentSecret.substring(0, 20)}...`);
    return true;
  }
  
  console.log(`${colors.yellow}⚠️ CLERK_WEBHOOK_SECRET needs configuration${colors.reset}\n`);
  
  console.log('Follow these steps to configure:\n');
  console.log(`${colors.cyan}1. Go to Clerk Dashboard${colors.reset}`);
  console.log('   https://dashboard.clerk.com/');
  console.log('\n2. Navigate to: Webhooks → Endpoints');
  console.log('\n3. Add endpoint URL:');
  console.log(`   ${colors.blue}https://your-domain.vercel.app/api/webhooks/clerk${colors.reset}`);
  console.log('\n4. Enable these events:');
  console.log('   ✓ user.created');
  console.log('   ✓ user.updated');
  console.log('   ✓ user.deleted');
  console.log('\n5. Copy the Signing Secret (starts with whsec_)');
  console.log('\n6. Add to .env.local:');
  console.log(`   ${colors.yellow}CLERK_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE${colors.reset}`);
  
  // Generate placeholder if needed
  if (!hasWebhookSecret) {
    console.log(`\n${colors.yellow}Adding placeholder to .env.local...${colors.reset}`);
    
    const updatedContent = envContent + '\n# Clerk Webhook Secret - Get from Clerk Dashboard\nCLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here\n';
    fs.writeFileSync(envPath, updatedContent);
    
    console.log(`${colors.green}✅ Added placeholder to .env.local${colors.reset}`);
  }
  
  console.log('\n=== VERCEL DEPLOYMENT ===\n');
  console.log('For production deployment:');
  console.log('1. Go to Vercel Dashboard → Project Settings → Environment Variables');
  console.log('2. Add CLERK_WEBHOOK_SECRET with the value from Clerk');
  console.log('3. Redeploy for changes to take effect');
  
  console.log('\n=== TEST WEBHOOK ===\n');
  console.log('After configuration:');
  console.log('1. Use Clerk Dashboard webhook testing tool');
  console.log('2. Or run: node scripts/verify-clerk-webhooks.js');
  
  return false;
}

function generateInstructions() {
  const instructions = `
# Clerk Webhook Setup Instructions

## Development Environment

1. **Get Webhook Secret from Clerk**
   - Go to: https://dashboard.clerk.com/
   - Navigate to: Webhooks → Endpoints
   - Click "Add Endpoint"
   - URL: http://localhost:3000/api/webhooks/clerk
   - Enable events: user.created, user.updated, user.deleted
   - Copy the Signing Secret

2. **Add to .env.local**
   \`\`\`
   CLERK_WEBHOOK_SECRET=whsec_[your_secret_here]
   \`\`\`

3. **Test locally**
   \`\`\`bash
   node scripts/verify-clerk-webhooks.js
   \`\`\`

## Production Environment (Vercel)

1. **Add Production Endpoint in Clerk**
   - URL: https://your-app.vercel.app/api/webhooks/clerk
   - Same events as development
   - Copy the Production Signing Secret

2. **Add to Vercel Environment Variables**
   - Go to: Vercel Dashboard → Project Settings
   - Environment Variables → Add
   - Name: CLERK_WEBHOOK_SECRET
   - Value: whsec_[production_secret]
   - Environment: Production

3. **Redeploy**
   - Trigger a new deployment for env vars to take effect

## Verification

Run this after setup:
\`\`\`bash
node scripts/verify-clerk-webhooks.js
\`\`\`

Expected output:
- ✅ Webhook endpoint exists
- ✅ CLERK_WEBHOOK_SECRET configured
- ✅ Webhook processed successfully
`;

  const instructionPath = path.join(__dirname, '..', 'CLERK_WEBHOOK_SETUP.md');
  fs.writeFileSync(instructionPath, instructions);
  console.log(`\n${colors.green}✅ Created setup instructions: CLERK_WEBHOOK_SETUP.md${colors.reset}`);
}

function main() {
  const isConfigured = checkEnvFile();
  generateInstructions();
  
  if (!isConfigured) {
    console.log(`\n${colors.yellow}⚠️ Action Required: Configure CLERK_WEBHOOK_SECRET${colors.reset}`);
    console.log(`   See CLERK_WEBHOOK_SETUP.md for detailed instructions`);
  }
}

main();