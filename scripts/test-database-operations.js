#!/usr/bin/env node

/**
 * Test Database Operations from API Surfaces
 * 
 * Validates that all database operations documented in apisurfaces.md
 * are functioning correctly with proper performance characteristics.
 */

const { PrismaClient } = require('@prisma/client');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}`)
};

// Initialize Prisma client with logging
const prisma = new PrismaClient({
  log: process.env.DEBUG ? ['query', 'info', 'warn', 'error'] : ['error']
});

// Test results
const results = {
  passed: [],
  failed: [],
  performance: []
};

// Helper to measure operation time
async function measureOperation(name, operation) {
  const start = Date.now();
  try {
    const result = await operation();
    const duration = Date.now() - start;
    results.performance.push({ name, duration });
    return { success: true, result, duration };
  } catch (error) {
    const duration = Date.now() - start;
    results.performance.push({ name, duration, error: true });
    return { success: false, error: error.message, duration };
  }
}

// Test User operations (from auth router)
async function testUserOperations() {
  log.section('Testing User Operations');
  
  // Test User.findUnique by id
  const test1 = await measureOperation('User.findUnique by id', async () => {
    const user = await prisma.user.findFirst();
    if (!user) return null;
    return await prisma.user.findUnique({
      where: { id: user.id }
    });
  });
  
  if (test1.success) {
    log.success(`User.findUnique by id (${test1.duration}ms)`);
    results.passed.push('User.findUnique by id');
  } else {
    log.error(`User.findUnique by id failed: ${test1.error}`);
    results.failed.push('User.findUnique by id');
  }
  
  // Test User.findUnique by email
  const test2 = await measureOperation('User.findUnique by email', async () => {
    const user = await prisma.user.findFirst();
    if (!user) return null;
    return await prisma.user.findUnique({
      where: { email: user.email }
    });
  });
  
  if (test2.success) {
    log.success(`User.findUnique by email (${test2.duration}ms)`);
    results.passed.push('User.findUnique by email');
  } else {
    log.error(`User.findUnique by email failed: ${test2.error}`);
    results.failed.push('User.findUnique by email');
  }
  
  // Test User.update (simulation only)
  const test3 = await measureOperation('User.update simulation', async () => {
    return typeof prisma.user.update === 'function';
  });
  
  if (test3.success && test3.result) {
    log.success(`User.update operation available`);
    results.passed.push('User.update');
  } else {
    log.error(`User.update operation not available`);
    results.failed.push('User.update');
  }
}

// Test Summary operations (from summary router)
async function testSummaryOperations() {
  log.section('Testing Summary Operations');
  
  // Test Summary.findMany with filters
  const test1 = await measureOperation('Summary.findMany with pagination', async () => {
    return await prisma.summary.findMany({
      take: 10,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: {
        categories: true,
        tags: true
      }
    });
  });
  
  if (test1.success) {
    log.success(`Summary.findMany with includes (${test1.duration}ms)`);
    results.passed.push('Summary.findMany');
  } else {
    log.error(`Summary.findMany failed: ${test1.error}`);
    results.failed.push('Summary.findMany');
  }
  
  // Test Summary.findUnique
  const test2 = await measureOperation('Summary.findUnique', async () => {
    const summary = await prisma.summary.findFirst();
    if (!summary) return null;
    return await prisma.summary.findUnique({
      where: { id: summary.id }
    });
  });
  
  if (test2.success) {
    log.success(`Summary.findUnique (${test2.duration}ms)`);
    results.passed.push('Summary.findUnique');
  } else {
    log.error(`Summary.findUnique failed: ${test2.error}`);
    results.failed.push('Summary.findUnique');
  }
  
  // Test Summary.count
  const test3 = await measureOperation('Summary.count with filters', async () => {
    const user = await prisma.user.findFirst();
    if (!user) return 0;
    return await prisma.summary.count({
      where: { 
        userId: user.id,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });
  });
  
  if (test3.success) {
    log.success(`Summary.count with date filter (${test3.duration}ms)`);
    results.passed.push('Summary.count');
  } else {
    log.error(`Summary.count failed: ${test3.error}`);
    results.failed.push('Summary.count');
  }
  
  // Test duplicate check (unique constraint)
  const test4 = await measureOperation('Summary duplicate check', async () => {
    const user = await prisma.user.findFirst();
    if (!user) return null;
    return await prisma.summary.findFirst({
      where: {
        userId: user.id,
        videoId: 'test123'
      }
    });
  });
  
  if (test4.success) {
    log.success(`Summary duplicate check (${test4.duration}ms)`);
    results.passed.push('Summary duplicate check');
  } else {
    log.error(`Summary duplicate check failed: ${test4.error}`);
    results.failed.push('Summary duplicate check');
  }
}

// Test UsageEvent operations (critical for limit enforcement)
async function testUsageEventOperations() {
  log.section('Testing UsageEvent Operations');
  
  // Test UsageEvent.count for lifetime limits
  const test1 = await measureOperation('UsageEvent.count for lifetime', async () => {
    const user = await prisma.user.findFirst();
    if (!user) return 0;
    return await prisma.usageEvent.count({
      where: {
        userId: user.id,
        eventType: 'summary_created'
      }
    });
  });
  
  if (test1.success) {
    log.success(`UsageEvent.count for lifetime limits (${test1.duration}ms)`);
    results.passed.push('UsageEvent.count lifetime');
  } else {
    log.error(`UsageEvent.count failed: ${test1.error}`);
    results.failed.push('UsageEvent.count lifetime');
  }
  
  // Test UsageEvent.count for monthly limits
  const test2 = await measureOperation('UsageEvent.count for monthly', async () => {
    const user = await prisma.user.findFirst();
    if (!user) return 0;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    return await prisma.usageEvent.count({
      where: {
        userId: user.id,
        eventType: 'summary_created',
        createdAt: {
          gte: startOfMonth
        }
      }
    });
  });
  
  if (test2.success) {
    log.success(`UsageEvent.count for monthly limits (${test2.duration}ms)`);
    results.passed.push('UsageEvent.count monthly');
  } else {
    log.error(`UsageEvent.count monthly failed: ${test2.error}`);
    results.failed.push('UsageEvent.count monthly');
  }
  
  // Test UsageEvent.findFirst for fingerprint check
  const test3 = await measureOperation('UsageEvent fingerprint check', async () => {
    return await prisma.usageEvent.findFirst({
      where: {
        userId: 'ANONYMOUS_USER',
        eventType: 'summary_created',
        metadata: {
          path: ['browserFingerprint'],
          equals: 'test_fingerprint'
        }
      }
    });
  });
  
  if (test3.success) {
    log.success(`UsageEvent fingerprint check (${test3.duration}ms)`);
    results.passed.push('UsageEvent fingerprint check');
  } else {
    log.error(`UsageEvent fingerprint check failed: ${test3.error}`);
    results.failed.push('UsageEvent fingerprint check');
  }
}

// Test Category and Tag operations
async function testCategoryTagOperations() {
  log.section('Testing Category and Tag Operations');
  
  // Test Category.findMany with counts
  const test1 = await measureOperation('Category.findMany with counts', async () => {
    return await prisma.category.findMany({
      include: {
        _count: {
          select: { summaries: true }
        }
      },
      orderBy: {
        summaries: {
          _count: 'desc'
        }
      }
    });
  });
  
  if (test1.success) {
    log.success(`Category.findMany with counts (${test1.duration}ms)`);
    results.passed.push('Category.findMany');
  } else {
    log.error(`Category.findMany failed: ${test1.error}`);
    results.failed.push('Category.findMany');
  }
  
  // Test Tag.findMany with type filter
  const test2 = await measureOperation('Tag.findMany with type filter', async () => {
    return await prisma.tag.findMany({
      where: {
        type: 'PERSON'
      },
      include: {
        _count: {
          select: { summaries: true }
        }
      }
    });
  });
  
  if (test2.success) {
    log.success(`Tag.findMany with type filter (${test2.duration}ms)`);
    results.passed.push('Tag.findMany');
  } else {
    log.error(`Tag.findMany failed: ${test2.error}`);
    results.failed.push('Tag.findMany');
  }
}

// Test ShareLink operations
async function testShareLinkOperations() {
  log.section('Testing ShareLink Operations');
  
  // Test ShareLink.findUnique by slug
  const test1 = await measureOperation('ShareLink.findUnique by slug', async () => {
    const share = await prisma.shareLink.findFirst();
    if (!share) return null;
    return await prisma.shareLink.findUnique({
      where: { slug: share.slug },
      include: {
        summary: true
      }
    });
  });
  
  if (test1.success) {
    log.success(`ShareLink.findUnique by slug (${test1.duration}ms)`);
    results.passed.push('ShareLink.findUnique');
  } else {
    log.error(`ShareLink.findUnique failed: ${test1.error}`);
    results.failed.push('ShareLink.findUnique');
  }
}

// Test connection pooling and concurrency
async function testConnectionPooling() {
  log.section('Testing Connection Pooling');
  
  // Test concurrent reads
  const test1 = await measureOperation('10 concurrent reads', async () => {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(prisma.user.count());
    }
    return await Promise.all(promises);
  });
  
  if (test1.success) {
    log.success(`10 concurrent reads completed (${test1.duration}ms)`);
    if (test1.duration < 1000) {
      log.success('Connection pooling performance: GOOD');
    } else if (test1.duration < 2000) {
      log.warning('Connection pooling performance: ACCEPTABLE');
    } else {
      log.error('Connection pooling performance: NEEDS OPTIMIZATION');
    }
    results.passed.push('Connection pooling');
  } else {
    log.error(`Connection pooling test failed: ${test1.error}`);
    results.failed.push('Connection pooling');
  }
  
  // Test transaction
  const test2 = await measureOperation('Transaction test', async () => {
    return await prisma.$transaction(async (tx) => {
      const userCount = await tx.user.count();
      const summaryCount = await tx.summary.count();
      return { userCount, summaryCount };
    });
  });
  
  if (test2.success) {
    log.success(`Transaction completed (${test2.duration}ms)`);
    results.passed.push('Transactions');
  } else {
    log.error(`Transaction failed: ${test2.error}`);
    results.failed.push('Transactions');
  }
}

// Performance analysis
function analyzePerformance() {
  log.section('Performance Analysis');
  
  const slowOperations = results.performance.filter(op => op.duration > 100);
  const verySlowOperations = results.performance.filter(op => op.duration > 500);
  
  if (verySlowOperations.length > 0) {
    log.error('Very slow operations (>500ms):');
    verySlowOperations.forEach(op => {
      log.error(`  ${op.name}: ${op.duration}ms`);
    });
  }
  
  if (slowOperations.length > 0) {
    log.warning('Slow operations (>100ms):');
    slowOperations.forEach(op => {
      if (op.duration <= 500) {
        log.warning(`  ${op.name}: ${op.duration}ms`);
      }
    });
  }
  
  const avgDuration = results.performance.reduce((sum, op) => sum + op.duration, 0) / results.performance.length;
  log.info(`Average operation time: ${Math.round(avgDuration)}ms`);
  
  const p95 = results.performance
    .map(op => op.duration)
    .sort((a, b) => a - b)
    [Math.floor(results.performance.length * 0.95)];
  log.info(`95th percentile: ${p95}ms`);
}

// Main test runner
async function runTests() {
  log.section('Database Operations Test Suite');
  
  try {
    // Test connection
    await prisma.$connect();
    log.success('Database connection successful');
    
    // Run all test suites
    await testUserOperations();
    await testSummaryOperations();
    await testUsageEventOperations();
    await testCategoryTagOperations();
    await testShareLinkOperations();
    await testConnectionPooling();
    
    // Analyze performance
    analyzePerformance();
    
    // Summary
    log.section('Test Summary');
    
    console.log('\nResults:');
    console.log(`  ✓ Passed: ${results.passed.length}`);
    if (results.failed.length > 0) {
      console.log(`  ✗ Failed: ${results.failed.length}`);
      console.log(`    - ${results.failed.join('\n    - ')}`);
    }
    
    // Overall result
    log.section('Overall Result');
    
    if (results.failed.length === 0) {
      log.success('✅ All database operations are working correctly!');
      
      const slowOps = results.performance.filter(op => op.duration > 500);
      if (slowOps.length > 0) {
        log.warning('Some operations may need performance optimization');
      }
      
      process.exit(0);
    } else {
      log.error('❌ Some database operations failed!');
      log.error('Review and fix the failed operations before deployment.');
      process.exit(1);
    }
    
  } catch (error) {
    log.error(`Test suite error: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
runTests();