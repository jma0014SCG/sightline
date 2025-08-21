#!/usr/bin/env node

/**
 * Safe Database Index Application
 * Applies performance indexes without blocking operations
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

async function applyIndexes() {
  console.log('\n=== APPLYING DATABASE INDEXES (SAFE MODE) ===\n');
  
  const indexes = [
    {
      name: 'idx_summary_user_created',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_summary_user_created 
            ON "Summary"("userId", "createdAt" DESC)`
    },
    {
      name: 'idx_user_plan',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_plan 
            ON "User"("plan")`
    },
    {
      name: 'idx_summary_created',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_summary_created 
            ON "Summary"("createdAt" DESC)`
    },
    {
      name: 'idx_summary_user_id',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_summary_user_id 
            ON "Summary"("userId") 
            WHERE "userId" IS NOT NULL`
    }
  ];
  
  let successCount = 0;
  
  for (const index of indexes) {
    try {
      console.log(`Creating index: ${index.name}...`);
      await prisma.$executeRawUnsafe(index.sql);
      console.log(`${colors.green}✅ Created index: ${index.name}${colors.reset}`);
      successCount++;
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`${colors.yellow}⚠️ Index already exists: ${index.name}${colors.reset}`);
        successCount++;
      } else {
        console.error(`${colors.red}❌ Failed to create index ${index.name}: ${error.message}${colors.reset}`);
      }
    }
  }
  
  // Verify indexes
  console.log('\n=== VERIFYING INDEXES ===\n');
  
  const existingIndexes = await prisma.$queryRaw`
    SELECT 
      tablename,
      indexname
    FROM pg_indexes
    WHERE tablename IN ('User', 'Summary')
    AND indexname LIKE 'idx_%'
    ORDER BY tablename, indexname
  `;
  
  console.log('Existing performance indexes:');
  existingIndexes.forEach(idx => {
    console.log(`  ${colors.blue}📊 ${idx.tablename}.${idx.indexname}${colors.reset}`);
  });
  
  // Test query performance
  console.log('\n=== TESTING QUERY PERFORMANCE ===\n');
  
  const tests = [
    {
      name: 'User count',
      query: () => prisma.user.count()
    },
    {
      name: 'Recent summaries',
      query: () => prisma.summary.findMany({ 
        take: 10, 
        orderBy: { createdAt: 'desc' } 
      })
    },
    {
      name: 'User summaries',
      query: () => prisma.summary.count({ 
        where: { userId: 'ANONYMOUS_USER' } 
      })
    }
  ];
  
  for (const test of tests) {
    const start = Date.now();
    try {
      await test.query();
      const duration = Date.now() - start;
      const status = duration < 50 ? colors.green : duration < 100 ? colors.yellow : colors.red;
      console.log(`${status}${test.name}: ${duration}ms${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}${test.name}: Error${colors.reset}`);
    }
  }
  
  console.log(`\n${colors.green}Successfully applied ${successCount}/${indexes.length} indexes${colors.reset}`);
  
  return successCount === indexes.length;
}

async function main() {
  try {
    const success = await applyIndexes();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();