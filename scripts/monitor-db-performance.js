#!/usr/bin/env node

/**
 * Database Performance Monitoring
 * Identifies slow queries and provides optimization recommendations
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'info', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
});

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

async function monitorPerformance() {
  console.log('\n' + '='.repeat(60));
  console.log('  DATABASE PERFORMANCE MONITORING');
  console.log('='.repeat(60) + '\n');
  
  const slowQueries = [];
  
  // Monitor query events
  prisma.$on('query', (e) => {
    const duration = e.duration;
    const query = e.query.substring(0, 100);
    
    if (duration > 50) {
      slowQueries.push({ query, duration, params: e.params });
      console.log(`${colors.red}⚠️ SLOW QUERY (${duration}ms):${colors.reset}`);
      console.log(`  ${query}...`);
      
      // Provide optimization suggestions
      if (query.includes('JOIN') && duration > 100) {
        console.log(`${colors.yellow}  💡 Consider: Adding indexes on JOIN columns${colors.reset}`);
      }
      if (query.includes('COUNT(*)') && duration > 50) {
        console.log(`${colors.yellow}  💡 Consider: Using approximate counts or caching${colors.reset}`);
      }
      if (query.includes('ORDER BY') && query.includes('createdAt')) {
        console.log(`${colors.yellow}  💡 Consider: Adding index on createdAt column${colors.reset}`);
      }
    } else if (duration > 20) {
      console.log(`${colors.yellow}⚡ Query took ${duration}ms: ${query.substring(0, 50)}...${colors.reset}`);
    }
  });
  
  // Test common query patterns
  console.log('Testing common query patterns...\n');
  
  const tests = [
    {
      name: 'User lookup by ID',
      query: () => prisma.user.findUnique({ where: { id: 'test_user' } })
    },
    {
      name: 'Recent summaries with user',
      query: () => prisma.summary.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: true }
      })
    },
    {
      name: 'User summaries count',
      query: () => prisma.summary.count({
        where: { userId: 'test_user' }
      })
    },
    {
      name: 'Monthly summaries for Pro users',
      query: () => prisma.summary.findMany({
        where: {
          user: { plan: 'PRO' },
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        include: { user: true }
      })
    }
  ];
  
  for (const test of tests) {
    console.log(`\nTesting: ${test.name}`);
    const start = Date.now();
    try {
      await test.query();
      const duration = Date.now() - start;
      
      if (duration < 20) {
        console.log(`${colors.green}✅ Fast: ${duration}ms${colors.reset}`);
      } else if (duration < 50) {
        console.log(`${colors.yellow}⚡ Acceptable: ${duration}ms${colors.reset}`);
      } else {
        console.log(`${colors.red}⚠️ Slow: ${duration}ms${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    }
  }
  
  // Recommendations
  console.log('\n' + '='.repeat(60));
  console.log('  OPTIMIZATION RECOMMENDATIONS');
  console.log('='.repeat(60) + '\n');
  
  if (slowQueries.length > 0) {
    console.log(`Found ${slowQueries.length} slow queries (>50ms)\n`);
    console.log('Recommended indexes to add:');
    console.log('1. CREATE INDEX idx_summary_user_created ON "Summary"("userId", "createdAt" DESC);');
    console.log('2. CREATE INDEX idx_user_plan ON "User"("plan");');
    console.log('3. CREATE INDEX idx_summary_created ON "Summary"("createdAt" DESC);');
    console.log('\nConsider:');
    console.log('- Implementing query result caching for counts');
    console.log('- Using database views for complex JOIN queries');
    console.log('- Adding connection pooling optimization');
  } else {
    console.log(`${colors.green}✅ No slow queries detected!${colors.reset}`);
  }
  
  await prisma.$disconnect();
}

monitorPerformance().catch(console.error);
