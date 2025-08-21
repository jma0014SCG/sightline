/**
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
    throw new Error(`Usage limit exceeded: ${result.reason}. Current: ${result.current}/${result.limit}`);
  }
}