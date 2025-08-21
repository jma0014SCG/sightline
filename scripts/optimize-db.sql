-- Performance optimization indexes for Sightline database
-- Run with: npx prisma db execute --file scripts/optimize-db.sql

-- Indexes for Summary table (most queried)
CREATE INDEX IF NOT EXISTS "idx_summary_user_created" ON "Summary"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_summary_user" ON "Summary"("userId");
CREATE INDEX IF NOT EXISTS "idx_summary_created" ON "Summary"("createdAt" DESC);

-- Indexes for User table
CREATE INDEX IF NOT EXISTS "idx_user_plan" ON "User"("plan");

-- Composite index for user summaries queries with date filtering
CREATE INDEX IF NOT EXISTS "idx_summary_user_date_range" ON "Summary"("userId", "createdAt");

-- Index for summary counting per user
CREATE INDEX IF NOT EXISTS "idx_summary_user_count" ON "Summary"("userId") WHERE "userId" IS NOT NULL;