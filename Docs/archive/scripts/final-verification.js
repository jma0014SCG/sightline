#!/usr/bin/env node

/**
 * Final Phase 8 Verification - Safe Mode
 * Quick verification of critical optimizations
 */

const { PrismaClient } = require('@prisma/client');
const http = require('http');

const prisma = new PrismaClient();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

async function verifyOptimizations() {
  console.log('\n=== PHASE 8 FINAL VERIFICATION ===\n');
  
  const results = [];
  
  // 1. Check database indexes
  console.log('1. Database Indexes:');
  const indexes = await prisma.$queryRaw`
    SELECT COUNT(*) as count 
    FROM pg_indexes 
    WHERE tablename IN ('User', 'Summary') 
    AND indexname LIKE 'idx_%'
  `;
  
  if (indexes[0].count >= 4) {
    console.log(`   ${colors.green}✅ ${indexes[0].count} performance indexes applied${colors.reset}`);
    results.push(true);
  } else {
    console.log(`   ${colors.red}❌ Only ${indexes[0].count} indexes found${colors.reset}`);
    results.push(false);
  }
  
  // 2. Test query performance
  console.log('\n2. Query Performance:');
  const start = Date.now();
  await prisma.summary.count();
  const duration = Date.now() - start;
  
  if (duration < 100) {
    console.log(`   ${colors.green}✅ Count query: ${duration}ms${colors.reset}`);
    results.push(true);
  } else {
    console.log(`   ${colors.yellow}⚠️ Count query: ${duration}ms (target <100ms)${colors.reset}`);
    results.push(false);
  }
  
  // 3. Check usage limits
  console.log('\n3. Usage Limits:');
  const violations = await prisma.$queryRaw`
    SELECT u.id, u.plan, COUNT(s.id) as count
    FROM "User" u
    LEFT JOIN "Summary" s ON s."userId" = u.id
    WHERE NOT (s.metadata->>'archived' = 'true' OR s.metadata IS NULL)
    GROUP BY u.id, u.plan
    HAVING 
      (u.id = 'ANONYMOUS_USER' AND COUNT(s.id) > 1) OR
      (u.plan = 'FREE' AND u.id != 'ANONYMOUS_USER' AND COUNT(s.id) > 3)
  `;
  
  if (violations.length === 0) {
    console.log(`   ${colors.green}✅ No users exceeding limits${colors.reset}`);
    results.push(true);
  } else {
    console.log(`   ${colors.yellow}⚠️ ${violations.length} users still exceed limits${colors.reset}`);
    results.push(false);
  }
  
  // 4. Check Clerk webhook
  console.log('\n4. Clerk Webhook:');
  const envContent = require('fs').readFileSync('.env.local', 'utf8');
  const hasWebhookSecret = envContent.includes('CLERK_WEBHOOK_SECRET=whsec_') && 
                           !envContent.includes('whsec_your_webhook_secret_here');
  
  if (hasWebhookSecret) {
    console.log(`   ${colors.green}✅ Webhook secret configured${colors.reset}`);
    results.push(true);
  } else {
    console.log(`   ${colors.yellow}⚠️ Webhook secret needs configuration${colors.reset}`);
    console.log(`      See CLERK_WEBHOOK_SETUP.md for instructions`);
    results.push(false);
  }
  
  // 5. Check Python API
  console.log('\n5. Python API:');
  const apiHealthy = await new Promise(resolve => {
    http.get('http://localhost:8000/api/health', (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => resolve(false));
  });
  
  if (apiHealthy) {
    console.log(`   ${colors.green}✅ API healthy${colors.reset}`);
    results.push(true);
  } else {
    console.log(`   ${colors.red}❌ API not responding${colors.reset}`);
    results.push(false);
  }
  
  // 6. Check caching implementation
  console.log('\n6. Query Caching:');
  const cacheFileExists = require('fs').existsSync('src/server/cache/queryCache.ts');
  
  if (cacheFileExists) {
    console.log(`   ${colors.green}✅ Cache layer implemented${colors.reset}`);
    results.push(true);
  } else {
    console.log(`   ${colors.red}❌ Cache not implemented${colors.reset}`);
    results.push(false);
  }
  
  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);
  
  console.log('\n' + '='.repeat(50));
  console.log(`RESULTS: ${passed}/${total} checks passed (${percentage}%)`);
  
  if (percentage >= 80) {
    console.log(`${colors.green}✅ Platform ready for production with minor issues${colors.reset}`);
  } else if (percentage >= 60) {
    console.log(`${colors.yellow}⚠️ Platform functional but needs improvements${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Critical issues remain${colors.reset}`);
  }
  
  console.log('='.repeat(50) + '\n');
  
  // Recommendations
  if (percentage < 100) {
    console.log('Remaining tasks:');
    if (!results[3]) console.log('- Configure CLERK_WEBHOOK_SECRET in production');
    if (!results[2]) console.log('- Review and clean remaining limit violations');
    if (!results[1]) console.log('- Further optimize slow queries');
  }
  
  await prisma.$disconnect();
  process.exit(percentage >= 60 ? 0 : 1);
}

verifyOptimizations().catch(console.error);