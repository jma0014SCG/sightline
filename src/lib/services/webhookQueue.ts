import { prisma } from '@/lib/db/prisma'

interface WebhookJob {
  id: string
  payload: any
  attempts: number
  maxAttempts: number
  nextRetryAt: Date | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
  createdAt: Date
  processedAt?: Date
}

/**
 * Adds a webhook to the retry queue
 */
export async function enqueueWebhook(
  webhookId: string,
  payload: any,
  maxAttempts = 5
): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "WebhookQueue" (
      id, 
      payload, 
      attempts, 
      "maxAttempts", 
      status, 
      "nextRetryAt", 
      "createdAt"
    )
    VALUES (
      ${webhookId},
      ${JSON.stringify(payload)}::jsonb,
      0,
      ${maxAttempts},
      'pending',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING
  `
}

/**
 * Processes pending webhooks from the queue
 */
export async function processWebhookQueue(
  handler: (payload: any) => Promise<void>
): Promise<void> {
  // Get next webhook to process
  const jobs = await prisma.$queryRaw<WebhookJob[]>`
    UPDATE "WebhookQueue"
    SET 
      status = 'processing',
      attempts = attempts + 1,
      "processedAt" = NOW()
    WHERE id IN (
      SELECT id 
      FROM "WebhookQueue"
      WHERE status IN ('pending', 'processing')
      AND (
        "nextRetryAt" IS NULL 
        OR "nextRetryAt" <= NOW()
      )
      AND attempts < "maxAttempts"
      ORDER BY "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `

  for (const job of jobs) {
    try {
      // Process the webhook
      await handler(job.payload)
      
      // Mark as completed
      await prisma.$executeRaw`
        UPDATE "WebhookQueue"
        SET 
          status = 'completed',
          "completedAt" = NOW()
        WHERE id = ${job.id}
      `
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const nextAttempt = job.attempts + 1
      const backoffMs = calculateExponentialBackoff(nextAttempt)
      const nextRetryAt = new Date(Date.now() + backoffMs)
      
      if (nextAttempt >= job.maxAttempts) {
        // Max attempts reached, mark as failed
        await prisma.$executeRaw`
          UPDATE "WebhookQueue"
          SET 
            status = 'failed',
            error = ${errorMessage},
            "failedAt" = NOW()
          WHERE id = ${job.id}
        `
        console.error(`Webhook ${job.id} failed after ${job.maxAttempts} attempts:`, errorMessage)
      } else {
        // Schedule for retry
        await prisma.$executeRaw`
          UPDATE "WebhookQueue"
          SET 
            status = 'pending',
            error = ${errorMessage},
            "nextRetryAt" = ${nextRetryAt}
          WHERE id = ${job.id}
        `
        console.log(`Webhook ${job.id} scheduled for retry at ${nextRetryAt}`)
      }
    }
  }
}

/**
 * Calculates exponential backoff delay with jitter
 */
function calculateExponentialBackoff(attempt: number): number {
  const baseDelay = 1000 // 1 second
  const maxDelay = 300000 // 5 minutes
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * exponentialDelay
  return Math.floor(exponentialDelay + jitter)
}

/**
 * Cleans up old completed or failed webhooks
 */
export async function cleanupWebhookQueue(daysToKeep = 7): Promise<number> {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)
  
  const result = await prisma.$executeRaw`
    DELETE FROM "WebhookQueue"
    WHERE status IN ('completed', 'failed')
    AND "createdAt" < ${cutoffDate}
  `
  
  return result
}

/**
 * Gets webhook queue statistics
 */
export async function getWebhookQueueStats(): Promise<{
  pending: number
  processing: number
  completed: number
  failed: number
}> {
  const stats = await prisma.$queryRaw<Array<{status: string, count: bigint}>>`
    SELECT status, COUNT(*) as count
    FROM "WebhookQueue"
    GROUP BY status
  `
  
  const result = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  }
  
  for (const stat of stats) {
    const status = stat.status as keyof typeof result
    if (status in result) {
      result[status] = Number(stat.count)
    }
  }
  
  return result
}