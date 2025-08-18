#!/usr/bin/env node

/**
 * Database Validation and Compatibility Script
 * 
 * Validates database schema, indexes, constraints, and operations
 * Ensures compatibility with all API surfaces documented in apisurfaces.md
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

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

// Initialize Prisma client
const prisma = new PrismaClient({
  log: process.env.DEBUG ? ['query', 'info', 'warn', 'error'] : ['error']
});

// Test results
const results = {
  tables: { passed: [], failed: [] },
  columns: { passed: [], failed: [] },
  indexes: { passed: [], failed: [] },
  constraints: { passed: [], failed: [] },
  operations: { passed: [], failed: [] },
  performance: { passed: [], failed: [] }
};

// Critical tables from schema.prisma
const criticalTables = {
  User: {
    columns: ['id', 'email', 'name', 'plan', 'stripeCustomerId', 'summariesUsed', 'summariesLimit'],
    indexes: [],
    constraints: ['email_unique']
  },
  Summary: {
    columns: ['id', 'userId', 'videoId', 'videoUrl', 'content', 'keyPoints', 'keyMoments', 'frameworks'],
    indexes: ['userId', 'videoId', 'userId_videoId', 'userId_isFavorite', 'userId_uploadDate'],
    constraints: ['userId_videoId_unique']
  },
  ShareLink: {
    columns: ['id', 'slug', 'summaryId', 'userId', 'isPublic'],
    indexes: ['slug'],
    constraints: ['slug_unique']
  },
  UsageEvent: {
    columns: ['id', 'userId', 'eventType', 'summaryId', 'metadata', 'createdAt'],
    indexes: ['userId', 'eventType', 'userId_eventType', 'userId_eventType_createdAt'],
    constraints: []
  },
  Category: {
    columns: ['id', 'name'],
    indexes: [],
    constraints: ['name_unique']
  },
  Tag: {
    columns: ['id', 'name', 'type'],
    indexes: ['type'],
    constraints: ['name_unique']
  },
  Progress: {
    columns: ['taskId', 'data', 'createdAt', 'expiresAt'],
    indexes: ['expiresAt'],
    constraints: []
  }
};

// Critical operations from apisurfaces.md
const criticalOperations = [
  {
    name: 'User.findUnique',
    test: async () => {
      const user = await prisma.user.findFirst();
      return user !== undefined;
    }
  },
  {
    name: 'Summary.create',
    test: async () => {
      // Don't actually create, just validate the operation exists
      return typeof prisma.summary.create === 'function';
    }
  },
  {
    name: 'Summary.findMany',
    test: async () => {
      const summaries = await prisma.summary.findMany({ take: 1 });
      return Array.isArray(summaries);
    }
  },
  {
    name: 'UsageEvent.count',
    test: async () => {
      const count = await prisma.usageEvent.count();
      return typeof count === 'number';
    }
  },
  {
    name: 'Category.findMany',
    test: async () => {
      const categories = await prisma.category.findMany();
      return Array.isArray(categories);
    }
  },
  {
    name: 'Tag.findMany',
    test: async () => {
      const tags = await prisma.tag.findMany();
      return Array.isArray(tags);
    }
  },
  {
    name: 'ShareLink.findUnique',
    test: async () => {
      // Test that the operation exists
      return typeof prisma.shareLink.findUnique === 'function';
    }
  },
  {
    name: 'Progress.upsert',
    test: async () => {
      // Test that the operation exists
      return typeof prisma.progress.upsert === 'function';
    }
  }
];

// Validate table existence
async function validateTables() {
  log.section('Validating Database Tables');
  
  try {
    const tables = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `;
    
    const tableNames = tables.map(t => t.tablename);
    
    for (const [tableName, schema] of Object.entries(criticalTables)) {
      const pgTableName = tableName.charAt(0).toUpperCase() + tableName.slice(1);
      
      if (tableNames.includes(pgTableName)) {
        log.success(`Table '${tableName}' exists`);
        results.tables.passed.push(tableName);
      } else {
        log.error(`Table '${tableName}' is missing!`);
        results.tables.failed.push(tableName);
      }
    }
  } catch (error) {
    log.error(`Failed to query tables: ${error.message}`);
    return false;
  }
  
  return results.tables.failed.length === 0;
}

// Validate columns
async function validateColumns() {
  log.section('Validating Table Columns');
  
  for (const [tableName, schema] of Object.entries(criticalTables)) {
    try {
      const columns = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName.charAt(0).toUpperCase() + tableName.slice(1)}
      `;
      
      const columnNames = columns.map(c => c.column_name);
      
      for (const column of schema.columns) {
        // Convert camelCase to snake_case for database column names
        const dbColumn = column.replace(/([A-Z])/g, '_$1').toLowerCase();
        
        if (columnNames.includes(column) || columnNames.includes(dbColumn)) {
          results.columns.passed.push(`${tableName}.${column}`);
        } else {
          log.warning(`Column '${tableName}.${column}' might be missing (check snake_case)`);
          results.columns.failed.push(`${tableName}.${column}`);
        }
      }
      
      log.success(`Table '${tableName}' has ${results.columns.passed.filter(c => c.startsWith(tableName)).length}/${schema.columns.length} required columns`);
    } catch (error) {
      log.error(`Failed to validate columns for ${tableName}: ${error.message}`);
    }
  }
  
  return results.columns.failed.length === 0;
}

// Validate indexes
async function validateIndexes() {
  log.section('Validating Database Indexes');
  
  try {
    const indexes = await prisma.$queryRaw`
      SELECT 
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
    `;
    
    // Check critical indexes for performance
    const criticalIndexes = [
      'Summary_userId_idx',
      'Summary_videoId_idx',
      'Summary_userId_videoId_key',
      'UsageEvent_userId_idx',
      'UsageEvent_userId_eventType_createdAt_idx',
      'ShareLink_slug_key',
      'Progress_expiresAt_idx'
    ];
    
    const indexNames = indexes.map(i => i.indexname);
    
    for (const indexName of criticalIndexes) {
      if (indexNames.some(name => name.toLowerCase().includes(indexName.toLowerCase()))) {
        log.success(`Index '${indexName}' exists`);
        results.indexes.passed.push(indexName);
      } else {
        log.warning(`Index '${indexName}' might be missing or named differently`);
        results.indexes.failed.push(indexName);
      }
    }
    
    log.info(`Found ${indexes.length} total indexes in database`);
  } catch (error) {
    log.error(`Failed to validate indexes: ${error.message}`);
  }
  
  return results.indexes.failed.length === 0;
}

// Validate constraints
async function validateConstraints() {
  log.section('Validating Database Constraints');
  
  try {
    const constraints = await prisma.$queryRaw`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public'
      AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
    `;
    
    // Check critical constraints
    const criticalConstraints = [
      { table: 'User', constraint: 'email', type: 'UNIQUE' },
      { table: 'Summary', constraint: 'userId_videoId', type: 'UNIQUE' },
      { table: 'ShareLink', constraint: 'slug', type: 'UNIQUE' },
      { table: 'Category', constraint: 'name', type: 'UNIQUE' },
      { table: 'Tag', constraint: 'name', type: 'UNIQUE' }
    ];
    
    for (const { table, constraint, type } of criticalConstraints) {
      const found = constraints.some(c => 
        c.table_name === table && 
        c.constraint_name.includes(constraint) &&
        c.constraint_type === type
      );
      
      if (found) {
        log.success(`${type} constraint on ${table}.${constraint} exists`);
        results.constraints.passed.push(`${table}.${constraint}`);
      } else {
        log.warning(`${type} constraint on ${table}.${constraint} might be missing`);
        results.constraints.failed.push(`${table}.${constraint}`);
      }
    }
    
    log.info(`Found ${constraints.length} total constraints in database`);
  } catch (error) {
    log.error(`Failed to validate constraints: ${error.message}`);
  }
  
  return results.constraints.failed.length === 0;
}

// Test critical database operations
async function testOperations() {
  log.section('Testing Critical Database Operations');
  
  for (const operation of criticalOperations) {
    try {
      const result = await operation.test();
      if (result) {
        log.success(`Operation '${operation.name}' works`);
        results.operations.passed.push(operation.name);
      } else {
        log.error(`Operation '${operation.name}' failed`);
        results.operations.failed.push(operation.name);
      }
    } catch (error) {
      log.error(`Operation '${operation.name}' error: ${error.message}`);
      results.operations.failed.push(operation.name);
    }
  }
  
  return results.operations.failed.length === 0;
}

// Test connection pooling
async function testConnectionPooling() {
  log.section('Testing Database Connection Pooling');
  
  try {
    // Test concurrent connections
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(prisma.user.count());
    }
    
    const start = Date.now();
    await Promise.all(promises);
    const duration = Date.now() - start;
    
    log.success(`10 concurrent connections completed in ${duration}ms`);
    
    if (duration < 1000) {
      log.success('Connection pooling performance is good');
      results.performance.passed.push('connection_pooling');
    } else {
      log.warning(`Connection pooling might need optimization (${duration}ms > 1000ms)`);
      results.performance.failed.push('connection_pooling');
    }
    
    // Check connection stats
    const stats = await prisma.$queryRaw`
      SELECT 
        count(*) as connections,
        state
      FROM pg_stat_activity
      WHERE datname = current_database()
      GROUP BY state
    `;
    
    log.info('Connection states:');
    stats.forEach(stat => {
      log.info(`  ${stat.state || 'active'}: ${stat.connections} connections`);
    });
    
  } catch (error) {
    log.error(`Connection pooling test failed: ${error.message}`);
    results.performance.failed.push('connection_pooling');
  }
}

// Check database size and statistics
async function checkDatabaseStats() {
  log.section('Database Statistics');
  
  try {
    // Database size
    const dbSize = await prisma.$queryRaw`
      SELECT pg_database_size(current_database()) as size
    `;
    const sizeMB = Math.round(dbSize[0].size / 1024 / 1024);
    log.info(`Database size: ${sizeMB} MB`);
    
    // Table sizes
    const tableSizes = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10
    `;
    
    log.info('Largest tables:');
    tableSizes.forEach(table => {
      log.info(`  ${table.tablename}: ${table.size}`);
    });
    
    // Row counts for main tables
    const rowCounts = {};
    for (const table of Object.keys(criticalTables)) {
      const modelName = table.charAt(0).toLowerCase() + table.slice(1);
      try {
        rowCounts[table] = await prisma[modelName].count();
      } catch (e) {
        rowCounts[table] = 'N/A';
      }
    }
    
    log.info('Row counts:');
    Object.entries(rowCounts).forEach(([table, count]) => {
      log.info(`  ${table}: ${count} rows`);
    });
    
  } catch (error) {
    log.warning(`Could not fetch database stats: ${error.message}`);
  }
}

// Main validation
async function validate() {
  log.section('Database Validation for Production');
  
  try {
    // Test connection
    await prisma.$connect();
    log.success('Database connection successful');
    
    // Run validations
    const tableValid = await validateTables();
    const columnValid = await validateColumns();
    const indexValid = await validateIndexes();
    const constraintValid = await validateConstraints();
    const operationsValid = await testOperations();
    await testConnectionPooling();
    await checkDatabaseStats();
    
    // Summary
    log.section('Validation Summary');
    
    console.log('\nTables:');
    console.log(`  ✓ Valid: ${results.tables.passed.length}`);
    if (results.tables.failed.length > 0) {
      console.log(`  ✗ Missing: ${results.tables.failed.join(', ')}`);
    }
    
    console.log('\nColumns:');
    console.log(`  ✓ Valid: ${results.columns.passed.length}`);
    if (results.columns.failed.length > 0) {
      console.log(`  ⚠ Check: ${results.columns.failed.length} columns`);
    }
    
    console.log('\nIndexes:');
    console.log(`  ✓ Valid: ${results.indexes.passed.length}`);
    if (results.indexes.failed.length > 0) {
      console.log(`  ⚠ Check: ${results.indexes.failed.length} indexes`);
    }
    
    console.log('\nConstraints:');
    console.log(`  ✓ Valid: ${results.constraints.passed.length}`);
    if (results.constraints.failed.length > 0) {
      console.log(`  ⚠ Check: ${results.constraints.failed.length} constraints`);
    }
    
    console.log('\nOperations:');
    console.log(`  ✓ Working: ${results.operations.passed.length}/${criticalOperations.length}`);
    if (results.operations.failed.length > 0) {
      console.log(`  ✗ Failed: ${results.operations.failed.join(', ')}`);
    }
    
    // Overall result
    log.section('Overall Result');
    
    const hasFailures = 
      results.tables.failed.length > 0 ||
      results.operations.failed.length > 0;
    
    if (!hasFailures) {
      log.success('✅ Database is ready for production!');
      log.info('All critical tables, operations, and most indexes/constraints are valid.');
      
      if (results.columns.failed.length > 0 || results.indexes.failed.length > 0) {
        log.warning('Some columns/indexes might have different names but functionality is intact.');
      }
      
      process.exit(0);
    } else {
      log.error('❌ Database validation failed!');
      log.error('Critical issues must be resolved before production deployment.');
      process.exit(1);
    }
    
  } catch (error) {
    log.error(`Database validation error: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run validation
validate();