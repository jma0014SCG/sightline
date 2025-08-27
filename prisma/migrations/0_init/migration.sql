-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."Plan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "plan" "public"."Plan" NOT NULL DEFAULT 'FREE',
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "stripeCurrentPeriodEnd" TIMESTAMP(3),
    "summariesUsed" INTEGER NOT NULL DEFAULT 0,
    "summariesLimit" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Summary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "videoTitle" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "thumbnailUrl" TEXT,
    "content" TEXT NOT NULL,
    "keyPoints" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "commentCount" INTEGER,
    "description" TEXT,
    "likeCount" INTEGER,
    "uploadDate" TIMESTAMP(3),
    "viewCount" INTEGER,
    "debunkedAssumptions" JSONB,
    "enrichment" JSONB,
    "frameworks" JSONB,
    "inPractice" JSONB,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "keyMoments" JSONB,
    "language" TEXT NOT NULL DEFAULT 'en',
    "lastViewedAt" TIMESTAMP(3),
    "learningPack" JSONB,
    "playbooks" JSONB,
    "processingSource" TEXT,
    "processingVersion" TEXT,
    "rating" INTEGER,
    "speakers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "synopsis" TEXT,
    "thinkingStyle" JSONB,
    "userNotes" TEXT,

    CONSTRAINT "Summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShareLink" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summaryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."progress" (
    "task_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progress_pkey" PRIMARY KEY ("task_id")
);

-- CreateTable
CREATE TABLE "public"."UsageEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "summaryId" TEXT,
    "videoId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_SummaryTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SummaryTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_SummaryCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SummaryCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "public"."User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeSubscriptionId_key" ON "public"."User"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "idx_user_plan" ON "public"."User"("plan");

-- CreateIndex
CREATE INDEX "Summary_userId_idx" ON "public"."Summary"("userId");

-- CreateIndex
CREATE INDEX "Summary_videoId_idx" ON "public"."Summary"("videoId");

-- CreateIndex
CREATE INDEX "Summary_viewCount_idx" ON "public"."Summary"("viewCount");

-- CreateIndex
CREATE INDEX "Summary_uploadDate_idx" ON "public"."Summary"("uploadDate");

-- CreateIndex
CREATE INDEX "Summary_userId_viewCount_idx" ON "public"."Summary"("userId", "viewCount");

-- CreateIndex
CREATE INDEX "Summary_userId_uploadDate_idx" ON "public"."Summary"("userId", "uploadDate");

-- CreateIndex
CREATE INDEX "Summary_userId_isFavorite_idx" ON "public"."Summary"("userId", "isFavorite");

-- CreateIndex
CREATE INDEX "Summary_userId_rating_idx" ON "public"."Summary"("userId", "rating");

-- CreateIndex
CREATE INDEX "Summary_processingSource_idx" ON "public"."Summary"("processingSource");

-- CreateIndex
CREATE INDEX "Summary_userId_processingSource_idx" ON "public"."Summary"("userId", "processingSource");

-- CreateIndex
CREATE INDEX "idx_summary_created" ON "public"."Summary"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_summary_user" ON "public"."Summary"("userId");

-- CreateIndex
CREATE INDEX "idx_summary_user_created" ON "public"."Summary"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_summary_user_date_range" ON "public"."Summary"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Summary_userId_videoId_key" ON "public"."Summary"("userId", "videoId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_slug_key" ON "public"."ShareLink"("slug");

-- CreateIndex
CREATE INDEX "ShareLink_slug_idx" ON "public"."ShareLink"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "public"."Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "public"."Tag"("name");

-- CreateIndex
CREATE INDEX "Tag_type_idx" ON "public"."Tag"("type");

-- CreateIndex
CREATE INDEX "progress_expires_at_idx" ON "public"."progress"("expires_at");

-- CreateIndex
CREATE INDEX "idx_progress_expires" ON "public"."progress"("expires_at");

-- CreateIndex
CREATE INDEX "UsageEvent_userId_idx" ON "public"."UsageEvent"("userId");

-- CreateIndex
CREATE INDEX "UsageEvent_eventType_idx" ON "public"."UsageEvent"("eventType");

-- CreateIndex
CREATE INDEX "UsageEvent_userId_eventType_idx" ON "public"."UsageEvent"("userId", "eventType");

-- CreateIndex
CREATE INDEX "UsageEvent_createdAt_idx" ON "public"."UsageEvent"("createdAt");

-- CreateIndex
CREATE INDEX "UsageEvent_userId_eventType_createdAt_idx" ON "public"."UsageEvent"("userId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "_SummaryTags_B_index" ON "public"."_SummaryTags"("B");

-- CreateIndex
CREATE INDEX "_SummaryCategories_B_index" ON "public"."_SummaryCategories"("B");

-- AddForeignKey
ALTER TABLE "public"."Summary" ADD CONSTRAINT "Summary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShareLink" ADD CONSTRAINT "ShareLink_summaryId_fkey" FOREIGN KEY ("summaryId") REFERENCES "public"."Summary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShareLink" ADD CONSTRAINT "ShareLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UsageEvent" ADD CONSTRAINT "UsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_SummaryTags" ADD CONSTRAINT "_SummaryTags_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Summary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_SummaryTags" ADD CONSTRAINT "_SummaryTags_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_SummaryCategories" ADD CONSTRAINT "_SummaryCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_SummaryCategories" ADD CONSTRAINT "_SummaryCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Summary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

