/**
 * Cached Summary Operations
 * Wraps database queries with caching layer for performance
 */

import { prisma } from '@/lib/db/prisma';
import { queryCache, getCachedSummaryCount, getCachedMonthlySummaries } from '@/server/cache/queryCache';
import type { Summary, User } from '@prisma/client';

/**
 * Get user's summary count with caching
 */
export async function getCachedUserSummaryCount(userId: string): Promise<number> {
  return getCachedSummaryCount(userId, async () => {
    return prisma.summary.count({
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
  });
}

/**
 * Get user's monthly summary count (for Pro users)
 */
export async function getCachedUserMonthlySummaryCount(userId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  return getCachedMonthlySummaries(userId, async () => {
    return prisma.summary.count({
      where: {
        userId,
        createdAt: { gte: monthStart },
        NOT: {
          metadata: {
            path: ['archived'],
            equals: true
          }
        }
      }
    });
  });
}

/**
 * Get recent summaries with caching
 */
export async function getCachedRecentSummaries(
  limit: number = 10
): Promise<Summary[]> {
  return queryCache.getCached(
    `global:recent:summaries:${limit}`,
    async () => {
      return prisma.summary.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        where: {
          NOT: {
            metadata: {
              path: ['archived'],
              equals: true
            }
          }
        }
      });
    },
    30 // 30 seconds TTL
  );
}

/**
 * Check usage limits with caching
 */
export async function checkCachedUsageLimit(userId: string): Promise<{
  allowed: boolean;
  limit: number;
  current: number;
  remaining: number;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  if (!user) {
    return { allowed: false, limit: 0, current: 0, remaining: 0 };
  }
  
  const limits: Record<string, number> = {
    ANONYMOUS: 1,
    FREE: 3,
    PRO: 25,
    ENTERPRISE: 999999
  };
  
  const limit = limits[user.plan] || 3;
  
  // Use cached counts
  const current = user.plan === 'PRO' 
    ? await getCachedUserMonthlySummaryCount(userId)
    : await getCachedUserSummaryCount(userId);
  
  return {
    allowed: current < limit,
    limit,
    current,
    remaining: Math.max(0, limit - current)
  };
}

/**
 * Invalidate user caches after summary creation
 */
export function invalidateUserCaches(userId: string): void {
  queryCache.invalidateUser(userId);
  // Also invalidate global caches
  queryCache.invalidate('global:recent');
}