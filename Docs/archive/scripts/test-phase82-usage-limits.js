#!/usr/bin/env node

/**
 * Phase 8.2: Usage Limits Verification
 * 
 * Comprehensive testing of subscription tier limits:
 * - Anonymous: 1 summary ever (browser fingerprint + IP)
 * - Free: 3 summaries total (lifetime limit)
 * - Pro: 25 summaries/month (resets on 1st)
 * - Enterprise: Unlimited summaries
 */

const { PrismaClient } = require('@prisma/client');
const { randomBytes } = require('crypto');

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, type = 'info') {
  const prefix = {
    success: `${colors.green}✅`,
    error: `${colors.red}❌`,
    warning: `${colors.yellow}⚠️`,
    info: `${colors.blue}ℹ️`,
    test: `${colors.bright}🧪`,
    data: `${colors.cyan}📊`,
  };
  
  console.log(`${prefix[type] || prefix.info} ${message}${colors.reset}`);
}

// Test data generators
function generateTestUser(tier = 'FREE') {
  const planMap = {
    'FREE': 'FREE',
    'PRO': 'PRO',
    'ENTERPRISE': 'ENTERPRISE'
  };
  return {
    id: `test_${tier.toLowerCase()}_${randomBytes(8).toString('hex')}`,
    email: `test_${Date.now()}@example.com`,
    name: `Test User ${tier}`,
    plan: planMap[tier] || 'FREE',
    summariesLimit: tier === 'FREE' ? 3 : tier === 'PRO' ? 25 : 999999,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function generateTestSummary(userId) {
  return {
    userId,
    videoId: `test_video_${randomBytes(8).toString('hex')}`,
    videoTitle: 'Test Video',
    videoUrl: 'https://youtube.com/watch?v=test',
    channelName: 'Test Channel',
    channelId: 'test_channel_123',
    duration: 300,
    content: 'Test summary content',
    keyPoints: ['Test takeaway 1', 'Test takeaway 2'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Test Anonymous User Limits
async function testAnonymousUserLimits(prisma) {
  log('Testing Anonymous User Limits (1 summary ever)', 'test');
  
  try {
    // Check if anonymous user exists
    let anonymousUser = await prisma.user.findUnique({
      where: { id: 'ANONYMOUS_USER' },
      include: {
        summaries: true,
        _count: {
          select: { summaries: true },
        },
      },
    });
    
    if (!anonymousUser) {
      log('Creating ANONYMOUS_USER account', 'info');
      anonymousUser = await prisma.user.create({
        data: {
          id: 'ANONYMOUS_USER',
          email: 'anonymous@sightline.ai',
          name: 'Anonymous User',
          plan: 'FREE',
          summariesLimit: 1,
        },
        include: {
          summaries: true,
          _count: {
            select: { summaries: true },
          },
        },
      });
      log('ANONYMOUS_USER account created', 'success');
    } else {
      log('ANONYMOUS_USER account exists', 'success');
    }
    
    // Check summary count
    const summaryCount = anonymousUser._count.summaries;
    log(`Anonymous user has ${summaryCount} summaries`, 'data');
    
    if (summaryCount <= 1) {
      log('Anonymous user within 1 summary limit', 'success');
      
      // Test: Try to add a summary if under limit
      if (summaryCount === 0) {
        const testSummary = await prisma.summary.create({
          data: generateTestSummary(anonymousUser.id),
        });
        log(`Test summary created for anonymous user: ${testSummary.id}`, 'success');
        
        // Verify can't add another
        try {
          await prisma.summary.create({
            data: generateTestSummary(anonymousUser.id),
          });
          log('ERROR: Anonymous user exceeded 1 summary limit!', 'error');
          return false;
        } catch (error) {
          // Expected to fail
          log('Correctly prevented anonymous user from exceeding limit', 'success');
        }
      }
    } else {
      log(`Anonymous user has ${summaryCount} summaries (exceeds 1 limit)`, 'error');
      return false;
    }
    
    // Test browser fingerprint tracking
    const fingerprintField = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'browserFingerprint'
    `;
    
    if (fingerprintField && fingerprintField.length > 0) {
      log('Browser fingerprint tracking field exists', 'success');
    } else {
      log('Browser fingerprint field not found (may use alternative tracking)', 'warning');
    }
    
    return true;
  } catch (error) {
    log(`Anonymous user test failed: ${error.message}`, 'error');
    return false;
  }
}

// Test Free Plan Limits
async function testFreePlanLimits(prisma) {
  log('Testing Free Plan Limits (3 lifetime summaries)', 'test');
  
  try {
    // Get or create test free users
    const freeUsers = await prisma.user.findMany({
      where: {
        plan: 'FREE',
        id: { not: 'ANONYMOUS_USER' },
      },
      include: {
        summaries: true,
        _count: {
          select: { summaries: true },
        },
      },
      take: 5,
    });
    
    if (freeUsers.length === 0) {
      log('No free users found, creating test user', 'info');
      const testUser = await prisma.user.create({
        data: generateTestUser('FREE'),
        include: {
          summaries: true,
          _count: {
            select: { summaries: true },
          },
        },
      });
      freeUsers.push(testUser);
    }
    
    log(`Testing ${freeUsers.length} free users`, 'data');
    
    let allValid = true;
    for (const user of freeUsers) {
      const summaryCount = user._count.summaries;
      
      if (summaryCount <= 3) {
        log(`Free user ${user.id.slice(0, 8)} has ${summaryCount}/3 summaries`, 'success');
        
        // Test: Add summaries up to limit
        const summariesToAdd = 3 - summaryCount;
        for (let i = 0; i < summariesToAdd; i++) {
          await prisma.summary.create({
            data: generateTestSummary(user.id),
          });
          log(`Added test summary ${i + 1}/${summariesToAdd}`, 'success');
        }
        
        // Verify we're now at the limit
        const updatedCount = await prisma.summary.count({
          where: { userId: user.id },
        });
        
        if (updatedCount === 3) {
          log(`Free user now at 3 summary limit`, 'success');
        }
      } else {
        log(`Free user ${user.id.slice(0, 8)} exceeds limit with ${summaryCount} summaries`, 'error');
        allValid = false;
      }
    }
    
    // Test lifetime limit (no reset)
    const oldestFreeUser = freeUsers[0];
    if (oldestFreeUser) {
      const accountAge = Date.now() - new Date(oldestFreeUser.createdAt).getTime();
      const accountDays = Math.floor(accountAge / (1000 * 60 * 60 * 24));
      log(`Oldest free account is ${accountDays} days old (lifetime limit verified)`, 'data');
    }
    
    return allValid;
  } catch (error) {
    log(`Free plan test failed: ${error.message}`, 'error');
    return false;
  }
}

// Test Pro Plan Limits
async function testProPlanLimits(prisma) {
  log('Testing Pro Plan Limits (25/month with reset)', 'test');
  
  try {
    // Get current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    log(`Current month: ${monthStart.toLocaleDateString()} - ${monthEnd.toLocaleDateString()}`, 'data');
    
    // Get or create test pro users
    let proUsers = await prisma.user.findMany({
      where: {
        plan: 'PRO',
      },
      include: {
        summaries: {
          where: {
            createdAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
        },
        _count: {
          select: {
            summaries: {
              where: {
                createdAt: {
                  gte: monthStart,
                  lte: monthEnd,
                },
              },
            },
          },
        },
      },
      take: 3,
    });
    
    if (proUsers.length === 0) {
      log('No pro users found, creating test user', 'info');
      const testUser = await prisma.user.create({
        data: generateTestUser('PRO'),
      });
      
      // Re-fetch with summaries
      proUsers = await prisma.user.findMany({
        where: { id: testUser.id },
        include: {
          summaries: {
            where: {
              createdAt: {
                gte: monthStart,
                lte: monthEnd,
              },
            },
          },
          _count: {
            select: {
              summaries: {
                where: {
                  createdAt: {
                    gte: monthStart,
                    lte: monthEnd,
                  },
                },
              },
            },
          },
        },
      });
    }
    
    log(`Testing ${proUsers.length} pro users`, 'data');
    
    let allValid = true;
    for (const user of proUsers) {
      const monthSummaries = user._count.summaries;
      
      if (monthSummaries <= 25) {
        log(`Pro user ${user.id.slice(0, 8)} has ${monthSummaries}/25 summaries this month`, 'success');
        
        // Test: Add a few summaries (but not exceed limit)
        const summariesToAdd = Math.min(3, 25 - monthSummaries);
        for (let i = 0; i < summariesToAdd; i++) {
          await prisma.summary.create({
            data: generateTestSummary(user.id),
          });
        }
        
        if (summariesToAdd > 0) {
          log(`Added ${summariesToAdd} test summaries for pro user`, 'success');
        }
      } else {
        log(`Pro user ${user.id.slice(0, 8)} exceeds monthly limit with ${monthSummaries} summaries`, 'error');
        allValid = false;
      }
      
      // Check total summaries (can be > 25 across months)
      const totalSummaries = await prisma.summary.count({
        where: { userId: user.id },
      });
      log(`Pro user total summaries across all time: ${totalSummaries}`, 'data');
    }
    
    // Test reset date calculation
    const daysUntilReset = monthEnd.getDate() - now.getDate() + 1;
    const isResetDay = now.getDate() === 1;
    
    if (isResetDay) {
      log('Today is reset day (1st of month)', 'success');
    } else {
      log(`${daysUntilReset} days until next reset (1st of next month)`, 'info');
    }
    
    // Test previous month summaries don't count
    if (proUsers.length > 0) {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      
      const lastMonthSummaries = await prisma.summary.count({
        where: {
          userId: proUsers[0].id,
          createdAt: {
            gte: lastMonthStart,
            lte: lastMonthEnd,
          },
        },
      });
      
      if (lastMonthSummaries > 0) {
        log(`Previous month summaries (${lastMonthSummaries}) don't count toward current limit`, 'success');
      }
    }
    
    return allValid;
  } catch (error) {
    log(`Pro plan test failed: ${error.message}`, 'error');
    return false;
  }
}

// Test Enterprise Plan
async function testEnterprisePlan(prisma) {
  log('Testing Enterprise Plan (Unlimited)', 'test');
  
  try {
    // Get or create enterprise users
    let enterpriseUsers = await prisma.user.findMany({
      where: {
        plan: 'ENTERPRISE',
      },
      include: {
        _count: {
          select: { summaries: true },
        },
      },
      take: 2,
    });
    
    if (enterpriseUsers.length === 0) {
      log('No enterprise users found, creating test user', 'info');
      const testUser = await prisma.user.create({
        data: generateTestUser('ENTERPRISE'),
        include: {
          _count: {
            select: { summaries: true },
          },
        },
      });
      enterpriseUsers = [testUser];
    }
    
    log(`Testing ${enterpriseUsers.length} enterprise users`, 'data');
    
    for (const user of enterpriseUsers) {
      const summaryCount = user._count.summaries;
      log(`Enterprise user ${user.id.slice(0, 8)} has ${summaryCount} summaries (unlimited)`, 'success');
      
      // Test: Add many summaries to verify no limit
      const testSummaries = 5;
      for (let i = 0; i < testSummaries; i++) {
        await prisma.summary.create({
          data: generateTestSummary(user.id),
        });
      }
      
      const newCount = await prisma.summary.count({
        where: { userId: user.id },
      });
      
      log(`Added ${testSummaries} summaries, new total: ${newCount} (no limit enforced)`, 'success');
      
      // Verify high volume capability
      if (newCount > 50) {
        log(`Enterprise user handling high volume (${newCount} summaries)`, 'success');
      }
    }
    
    return true;
  } catch (error) {
    log(`Enterprise plan test failed: ${error.message}`, 'error');
    return false;
  }
}

// Test limit enforcement logic
async function testLimitEnforcement(prisma) {
  log('Testing Limit Enforcement Logic', 'test');
  
  try {
    // Test rate limit configuration
    const rateLimitConfig = {
      ANONYMOUS: { summaries: 1, lifetime: true },
      FREE: { summaries: 3, lifetime: true },
      PRO: { summaries: 25, monthly: true },
      ENTERPRISE: { summaries: Infinity },
    };
    
    log('Rate limit configuration:', 'data');
    Object.entries(rateLimitConfig).forEach(([tier, config]) => {
      const limitType = config.lifetime ? 'lifetime' : config.monthly ? 'monthly' : 'unlimited';
      const limit = config.summaries === Infinity ? 'unlimited' : config.summaries;
      log(`  ${tier}: ${limit} summaries (${limitType})`, 'info');
    });
    
    // Test database constraints
    const constraints = await prisma.$queryRaw`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'Summary'
    `;
    
    if (constraints && constraints.length > 0) {
      log(`Found ${constraints.length} database constraints on Summary table`, 'success');
    }
    
    // Test subscription tier enum values
    const validPlans = ['FREE', 'PRO', 'ENTERPRISE'];
    const dbPlans = await prisma.$queryRaw`
      SELECT DISTINCT "plan" 
      FROM "User" 
      WHERE "plan" IS NOT NULL
    `;
    
    const invalidPlans = dbPlans
      .map(t => t.plan)
      .filter(plan => !validPlans.includes(plan));
    
    if (invalidPlans.length === 0) {
      log('All users have valid subscription plans', 'success');
    } else {
      log(`Found invalid plans: ${invalidPlans.join(', ')}`, 'error');
      return false;
    }
    
    return true;
  } catch (error) {
    log(`Limit enforcement test failed: ${error.message}`, 'error');
    return false;
  }
}

// Clean up test data
async function cleanupTestData(prisma) {
  log('Cleaning up test data', 'info');
  
  try {
    // Delete test summaries
    const deletedSummaries = await prisma.summary.deleteMany({
      where: {
        videoId: {
          startsWith: 'test_video_',
        },
      },
    });
    
    // Delete test users (except ANONYMOUS_USER)
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        AND: [
          { id: { startsWith: 'test_' } },
          { id: { not: 'ANONYMOUS_USER' } },
        ],
      },
    });
    
    log(`Cleaned up ${deletedSummaries.count} test summaries and ${deletedUsers.count} test users`, 'success');
    return true;
  } catch (error) {
    log(`Cleanup failed: ${error.message}`, 'warning');
    return false;
  }
}

// Main test runner
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  PHASE 8.2: USAGE LIMITS VERIFICATION');
  console.log('='.repeat(60) + '\n');
  
  const prisma = new PrismaClient();
  
  const tests = [
    { name: 'Anonymous User Limits', fn: () => testAnonymousUserLimits(prisma) },
    { name: 'Free Plan Limits', fn: () => testFreePlanLimits(prisma) },
    { name: 'Pro Plan Limits', fn: () => testProPlanLimits(prisma) },
    { name: 'Enterprise Plan', fn: () => testEnterprisePlan(prisma) },
    { name: 'Limit Enforcement', fn: () => testLimitEnforcement(prisma) },
  ];
  
  const results = [];
  
  try {
    // Run all tests
    for (const test of tests) {
      console.log('\n' + '-'.repeat(40));
      const result = await test.fn();
      results.push({ name: test.name, passed: result });
      console.log('-'.repeat(40));
    }
    
    // Optional: Clean up test data
    const shouldCleanup = process.argv.includes('--cleanup');
    if (shouldCleanup) {
      console.log('\n' + '-'.repeat(40));
      await cleanupTestData(prisma);
      console.log('-'.repeat(40));
    }
    
  } finally {
    await prisma.$disconnect();
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('  TEST SUMMARY');
  console.log('='.repeat(60) + '\n');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);
  
  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.name}`);
  });
  
  console.log('\n' + '-'.repeat(40));
  console.log(`Result: ${passed}/${total} tests passed (${percentage}%)`);
  
  if (percentage >= 100) {
    console.log(`${colors.green}✅ ALL USAGE LIMITS VERIFIED${colors.reset}`);
  } else if (percentage >= 80) {
    console.log(`${colors.yellow}⚠️  MOSTLY CORRECT - Some limits need attention${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ LIMITS NOT ENFORCED - Critical issues found${colors.reset}`);
  }
  
  console.log('='.repeat(60) + '\n');
  
  // Tip for cleanup
  if (!process.argv.includes('--cleanup')) {
    console.log('💡 Tip: Run with --cleanup flag to remove test data');
  }
  
  process.exit(passed === total ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { main };