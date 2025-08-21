#!/usr/bin/env node

/**
 * Safe Usage Limit Violation Cleanup
 * Archives excess summaries without deleting data
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

async function findViolations() {
  console.log('\n=== FINDING USAGE LIMIT VIOLATIONS ===\n');
  
  // Anonymous user check
  const anonymousUser = await prisma.user.findUnique({
    where: { id: 'ANONYMOUS_USER' },
    include: {
      summaries: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });
  
  const violations = [];
  
  if (anonymousUser && anonymousUser.summaries.length > 1) {
    violations.push({
      user: anonymousUser,
      limit: 1,
      excess: anonymousUser.summaries.length - 1,
      type: 'ANONYMOUS'
    });
    console.log(`${colors.red}❌ ANONYMOUS_USER: ${anonymousUser.summaries.length} summaries (limit: 1)${colors.reset}`);
  }
  
  // Free users check
  const freeUsers = await prisma.user.findMany({
    where: { 
      plan: 'FREE',
      id: { not: 'ANONYMOUS_USER' }
    },
    include: {
      summaries: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });
  
  for (const user of freeUsers) {
    if (user.summaries.length > 3) {
      violations.push({
        user,
        limit: 3,
        excess: user.summaries.length - 3,
        type: 'FREE'
      });
      console.log(`${colors.red}❌ Free user ${user.id}: ${user.summaries.length} summaries (limit: 3)${colors.reset}`);
    }
  }
  
  // Pro users monthly check
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const proUsers = await prisma.user.findMany({
    where: { plan: 'PRO' },
    include: {
      summaries: {
        where: {
          createdAt: { gte: monthStart }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });
  
  for (const user of proUsers) {
    if (user.summaries.length > 25) {
      violations.push({
        user,
        limit: 25,
        excess: user.summaries.length - 25,
        type: 'PRO_MONTHLY'
      });
      console.log(`${colors.red}❌ Pro user ${user.id}: ${user.summaries.length} summaries this month (limit: 25)${colors.reset}`);
    }
  }
  
  return violations;
}

async function archiveExcessSummaries(violations, dryRun = true) {
  console.log(`\n=== ${dryRun ? 'DRY RUN - ' : ''}ARCHIVING EXCESS SUMMARIES ===\n`);
  
  let totalArchived = 0;
  
  for (const violation of violations) {
    const { user, limit, excess, type } = violation;
    
    console.log(`\n${colors.cyan}Processing ${type} user: ${user.id}${colors.reset}`);
    console.log(`  Current: ${user.summaries.length} summaries`);
    console.log(`  Limit: ${limit} summaries`);
    console.log(`  To archive: ${excess} summaries`);
    
    // Get summaries to archive (oldest ones)
    const summariesToArchive = user.summaries.slice(limit);
    
    if (!dryRun) {
      // Add archived flag to Summary model if it doesn't exist
      try {
        // Archive by adding a flag (safer than deletion)
        for (const summary of summariesToArchive) {
          await prisma.summary.update({
            where: { id: summary.id },
            data: { 
              // Add metadata to indicate archival
              metadata: {
                ...(summary.metadata || {}),
                archived: true,
                archivedAt: new Date().toISOString(),
                archivedReason: `Exceeded ${type} limit`
              }
            }
          });
        }
        
        console.log(`  ${colors.green}✅ Archived ${summariesToArchive.length} summaries${colors.reset}`);
        totalArchived += summariesToArchive.length;
      } catch (error) {
        console.log(`  ${colors.red}❌ Failed to archive: ${error.message}${colors.reset}`);
      }
    } else {
      console.log(`  ${colors.yellow}⚠️ Would archive ${summariesToArchive.length} summaries (dry run)${colors.reset}`);
      summariesToArchive.forEach(s => {
        console.log(`    - ${s.videoTitle} (${new Date(s.createdAt).toLocaleDateString()})`);
      });
    }
  }
  
  return totalArchived;
}

async function createEnforcementMiddleware() {
  console.log('\n=== CREATING ENFORCEMENT MIDDLEWARE ===\n');
  
  const middlewarePath = '/Users/jeffaxelrod/Documents/Sightline/src/server/middleware/usageLimits.ts';
  
  const middlewareCode = `/**
 * Usage Limits Enforcement Middleware
 * Enforces subscription tier limits for summaries
 */

import { prisma } from '~/server/db';

export interface UsageLimitResult {
  allowed: boolean;
  limit: number;
  current: number;
  remaining: number;
  reason?: string;
}

export async function checkUsageLimit(userId: string): Promise<UsageLimitResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { 
      _count: { 
        select: { summaries: true } 
      } 
    }
  });

  if (!user) {
    return {
      allowed: false,
      limit: 0,
      current: 0,
      remaining: 0,
      reason: 'User not found'
    };
  }

  const limits: Record<string, number> = {
    ANONYMOUS: 1,
    FREE: 3,
    PRO: 25, // per month
    ENTERPRISE: 999999
  };

  const limit = limits[user.plan] || 3;

  // For PRO users, check monthly limit
  if (user.plan === 'PRO') {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyCount = await prisma.summary.count({
      where: {
        userId,
        createdAt: { gte: monthStart },
        // Exclude archived summaries
        NOT: {
          metadata: {
            path: ['archived'],
            equals: true
          }
        }
      }
    });

    return {
      allowed: monthlyCount < limit,
      limit,
      current: monthlyCount,
      remaining: Math.max(0, limit - monthlyCount),
      reason: monthlyCount >= limit ? 'Monthly limit reached' : undefined
    };
  }

  // For other tiers, check lifetime limit
  const totalCount = await prisma.summary.count({
    where: {
      userId,
      // Exclude archived summaries
      NOT: {
        metadata: {
          path: ['archived'],
          equals: true
        }
      }
    }
  });

  return {
    allowed: totalCount < limit,
    limit,
    current: totalCount,
    remaining: Math.max(0, limit - totalCount),
    reason: totalCount >= limit ? 'Lifetime limit reached' : undefined
  };
}

// Hook to use in tRPC procedures
export async function enforceUsageLimit(userId: string): Promise<void> {
  const result = await checkUsageLimit(userId);
  
  if (!result.allowed) {
    throw new Error(\`Usage limit exceeded: \${result.reason}. Current: \${result.current}/\${result.limit}\`);
  }
}`;

  const fs = require('fs');
  const path = require('path');
  
  // Create middleware directory if it doesn't exist
  const middlewareDir = path.dirname(middlewarePath);
  if (!fs.existsSync(middlewareDir)) {
    fs.mkdirSync(middlewareDir, { recursive: true });
  }
  
  fs.writeFileSync(middlewarePath, middlewareCode);
  console.log(`${colors.green}✅ Created usage limit enforcement middleware${colors.reset}`);
  console.log(`   Location: ${middlewarePath}`);
}

async function main() {
  try {
    // Find violations
    const violations = await findViolations();
    
    if (violations.length === 0) {
      console.log(`\n${colors.green}✅ No usage limit violations found!${colors.reset}`);
      await createEnforcementMiddleware();
      process.exit(0);
    }
    
    console.log(`\n${colors.yellow}Found ${violations.length} users exceeding limits${colors.reset}`);
    
    // Dry run first
    await archiveExcessSummaries(violations, true);
    
    // Ask for confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log(`\n${colors.yellow}⚠️ This will archive excess summaries (they won't be deleted)${colors.reset}`);
    
    rl.question('Do you want to proceed? (yes/no): ', async (answer) => {
      if (answer.toLowerCase() === 'yes') {
        const archived = await archiveExcessSummaries(violations, false);
        console.log(`\n${colors.green}✅ Archived ${archived} summaries total${colors.reset}`);
      } else {
        console.log(`\n${colors.yellow}⚠️ Archival cancelled${colors.reset}`);
      }
      
      await createEnforcementMiddleware();
      
      rl.close();
      await prisma.$disconnect();
      process.exit(0);
    });
    
  } catch (error) {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();