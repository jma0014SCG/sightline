-- Safe Database Index Creation Script
-- Uses CONCURRENTLY to avoid table locks in production
-- Run each statement separately to monitor progress

-- Index 1: Optimize Summary lookups by user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_summary_user_created 
  ON "Summary"("userId", "createdAt" DESC);

-- Index 2: Optimize User plan queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_plan 
  ON "User"("plan");

-- Index 3: Optimize Summary date sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_summary_created 
  ON "Summary"("createdAt" DESC);

-- Index 4: Optimize JOIN performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_summary_user_id 
  ON "Summary"("userId") 
  WHERE "userId" IS NOT NULL;

-- Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('User', 'Summary')
ORDER BY tablename, indexname;