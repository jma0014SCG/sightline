# Production Database Migration Checklist

## Pre-Migration Requirements

### 1. Environment Preparation
- [ ] Production database instance created (Neon, Supabase, or other PostgreSQL)
- [ ] Connection string tested and validated
- [ ] SSL/TLS encryption enabled
- [ ] Connection pooling configured (recommended: 25 connections)
- [ ] Read replica configured (optional but recommended)

### 2. Backup Strategy
- [ ] Full database backup taken
- [ ] Backup restoration tested in staging environment
- [ ] Point-in-time recovery enabled
- [ ] Backup retention policy defined (minimum 30 days)

### 3. Migration Files Review
- [ ] All migrations reviewed for breaking changes
- [ ] Migration rollback scripts prepared
- [ ] Data migration scripts tested
- [ ] Schema compatibility verified

## Migration Steps

### Phase 1: Schema Baseline (If Existing Database)

```bash
# 1. Generate baseline migration from existing database
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/0_init/migration.sql

# 2. Create migration directory
mkdir -p prisma/migrations/0_init

# 3. Mark as applied
npx prisma migrate resolve --applied 0_init
```

### Phase 2: Apply New Migrations

```bash
# 1. Generate migration for any pending changes
npx prisma migrate dev --name production_ready --create-only

# 2. Review generated SQL
cat prisma/migrations/*/migration.sql

# 3. Apply migrations in production
npx prisma migrate deploy
```

### Phase 3: Verify Migration

```bash
# 1. Check migration status
npx prisma migrate status

# 2. Validate schema
node scripts/validate-database.js

# 3. Test critical operations
node scripts/test-api-surfaces.js
```

## Critical Tables Verification

### Required Tables
- [x] **User** - Authentication and subscription data
  - Indexes: email (unique)
  - Critical columns: id, email, plan, summariesLimit
  
- [x] **Summary** - Video summaries with rich content
  - Indexes: userId, videoId, userId_videoId (unique)
  - Critical columns: id, userId, videoId, content, all JSON fields
  
- [x] **ShareLink** - Public sharing functionality
  - Indexes: slug (unique)
  - Critical columns: id, slug, summaryId, userId
  
- [x] **UsageEvent** - Usage tracking for limits
  - Indexes: userId, eventType, userId_eventType_createdAt
  - Critical columns: id, userId, eventType, createdAt
  
- [x] **Category** - Summary categorization
  - Indexes: name (unique)
  - Critical columns: id, name
  
- [x] **Tag** - Entity tagging
  - Indexes: name (unique), type
  - Critical columns: id, name, type
  
- [ ] **Progress** - Async task tracking
  - Indexes: expiresAt
  - Critical columns: taskId, data, expiresAt
  - ⚠️ **Note**: May be handled in-memory, verify if table needed

## Performance Optimization

### Index Verification
```sql
-- Check existing indexes
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Verify critical performance indexes exist
-- Summary table
CREATE INDEX IF NOT EXISTS "Summary_userId_idx" ON "Summary"("userId");
CREATE INDEX IF NOT EXISTS "Summary_videoId_idx" ON "Summary"("videoId");
CREATE INDEX IF NOT EXISTS "Summary_userId_uploadDate_idx" ON "Summary"("userId", "uploadDate");
CREATE INDEX IF NOT EXISTS "Summary_userId_isFavorite_idx" ON "Summary"("userId", "isFavorite");

-- UsageEvent table
CREATE INDEX IF NOT EXISTS "UsageEvent_userId_eventType_createdAt_idx" 
ON "UsageEvent"("userId", "eventType", "createdAt");
```

### Connection Pool Settings
```javascript
// Recommended Prisma connection pool settings
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Production settings
  connectionLimit: 25,      // Max connections
  connectTimeout: 10000,    // 10 seconds
  pool: {
    min: 2,                // Minimum connections
    max: 25,               // Maximum connections
    idleTimeoutMillis: 30000,  // 30 seconds idle timeout
    acquireTimeoutMillis: 10000, // 10 seconds acquire timeout
  }
});
```

## Rollback Plan

### Immediate Rollback (< 5 minutes)
```bash
# 1. Stop application
pm2 stop sightline-app

# 2. Rollback last migration
npx prisma migrate resolve --rolled-back MIGRATION_NAME

# 3. Restore from backup if needed
pg_restore -d DATABASE_URL backup.sql

# 4. Restart application with previous version
pm2 start sightline-app
```

### Emergency Recovery
1. Switch to read replica (if available)
2. Restore from latest backup
3. Apply migrations up to stable point
4. Verify data integrity
5. Switch traffic back

## Post-Migration Validation

### Data Integrity Checks
- [ ] Row counts match expectations
- [ ] No orphaned records
- [ ] Foreign key constraints valid
- [ ] Unique constraints enforced

### Performance Validation
- [ ] Query performance acceptable (< 100ms for simple queries)
- [ ] Index usage confirmed (EXPLAIN ANALYZE)
- [ ] Connection pool healthy
- [ ] No blocking queries

### Application Testing
- [ ] All tRPC endpoints responding
- [ ] FastAPI endpoints functional
- [ ] Authentication working
- [ ] Payment processing functional
- [ ] Summary creation/retrieval working

## Monitoring Setup

### Key Metrics to Monitor
1. **Query Performance**
   - p95 query time < 200ms
   - p99 query time < 500ms
   
2. **Connection Pool**
   - Active connections < 80% of max
   - Connection wait time < 100ms
   
3. **Database Size**
   - Storage usage < 80% of limit
   - Table growth rate normal
   
4. **Error Rates**
   - Connection errors < 0.1%
   - Query errors < 0.01%

### Alert Thresholds
```yaml
alerts:
  - name: high_query_time
    condition: p95_query_time > 500ms
    severity: warning
    
  - name: connection_pool_exhausted
    condition: active_connections > 90%
    severity: critical
    
  - name: storage_nearly_full
    condition: storage_usage > 90%
    severity: warning
```

## Production Go-Live Checklist

### Final Verification
- [ ] All migrations applied successfully
- [ ] Database validation script passes
- [ ] API surface tests pass
- [ ] Performance benchmarks met
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Backup strategy implemented
- [ ] Rollback plan tested
- [ ] Documentation updated

### Sign-offs Required
- [ ] Engineering lead approval
- [ ] DevOps approval
- [ ] Security review completed
- [ ] Load testing completed

## Notes

### Known Issues
1. **Progress Table**: Currently may be handled in-memory. Verify if database table is needed for production persistence.

2. **Constraint Names**: Some UNIQUE constraints may have auto-generated names that differ from expected patterns but functionality is preserved.

3. **BigInt Handling**: Some statistics queries may need explicit casting for BigInt columns.

### Migration Tools
- **Prisma Migrate**: Primary migration tool
- **pg_dump/pg_restore**: For backup and restore
- **pgAdmin**: For visual database management
- **DataGrip**: For advanced SQL operations

### Support Contacts
- Database Admin: [Contact Info]
- DevOps Team: [Contact Info]
- On-call Engineer: [Contact Info]