/**
 * Webhook security service for replay attack prevention and validation
 * Uses Redis to track processed webhook events
 */

import { Redis } from "@upstash/redis";

// Initialize Redis client
let redis: Redis | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = Redis.fromEnv();
}

// Configuration
const WEBHOOK_REPLAY_WINDOW = 300; // 5 minutes in seconds
const WEBHOOK_TIMESTAMP_TOLERANCE = 300; // 5 minutes tolerance for timestamp validation

/**
 * Webhook validation result
 */
export interface WebhookValidationResult {
  valid: boolean;
  error?: string;
  isReplay?: boolean;
}

/**
 * Prevent webhook replay attacks by tracking processed events
 * @param eventId - Unique identifier for the webhook event
 * @param timestamp - Timestamp of the webhook event (in seconds)
 * @returns Validation result
 */
export async function preventWebhookReplay(
  eventId: string,
  timestamp: number
): Promise<WebhookValidationResult> {
  // If Redis is not configured, skip replay protection but log warning
  if (!redis) {
    console.warn("Webhook replay protection disabled: Redis not configured");
    return { valid: true };
  }

  try {
    // Validate timestamp is within acceptable window
    const now = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(now - timestamp);

    if (timeDiff > WEBHOOK_TIMESTAMP_TOLERANCE) {
      return {
        valid: false,
        error: `Webhook timestamp outside acceptable window (${timeDiff}s difference)`,
      };
    }

    // Check if we've already processed this event
    const key = `webhook:processed:${eventId}`;
    const exists = await redis.exists(key);

    if (exists) {
      return {
        valid: false,
        error: "Webhook event already processed",
        isReplay: true,
      };
    }

    // Mark event as processed with TTL (2x the replay window for safety)
    await redis.set(key, JSON.stringify({
      processedAt: now,
      timestamp: timestamp,
    }), {
      ex: WEBHOOK_REPLAY_WINDOW * 2,
    });

    return { valid: true };
  } catch (error) {
    console.error("Webhook replay protection error:", error);
    // Fail open to maintain availability
    return { valid: true };
  }
}

/**
 * Webhook retry tracking for reliability
 */
export interface WebhookRetryInfo {
  eventId: string;
  attempts: number;
  lastAttempt: number;
  nextRetry?: number;
  success: boolean;
}

/**
 * Track webhook processing attempts for retry logic
 * @param eventId - Unique identifier for the webhook event
 * @param success - Whether the processing was successful
 * @returns Retry information
 */
export async function trackWebhookRetry(
  eventId: string,
  success: boolean
): Promise<WebhookRetryInfo> {
  if (!redis) {
    return {
      eventId,
      attempts: 1,
      lastAttempt: Date.now(),
      success,
    };
  }

  const key = `webhook:retry:${eventId}`;
  const now = Math.floor(Date.now() / 1000);

  try {
    // Get existing retry info
    const existingData = await redis.get(key);
    let retryInfo: WebhookRetryInfo;

    if (existingData) {
      retryInfo = JSON.parse(existingData as string);
      retryInfo.attempts += 1;
      retryInfo.lastAttempt = now;
      retryInfo.success = success;
    } else {
      retryInfo = {
        eventId,
        attempts: 1,
        lastAttempt: now,
        success,
      };
    }

    // If not successful, calculate next retry time (exponential backoff)
    if (!success && retryInfo.attempts < 5) {
      const backoffSeconds = Math.min(300, Math.pow(2, retryInfo.attempts) * 10);
      retryInfo.nextRetry = now + backoffSeconds;
    }

    // Store retry info with TTL
    await redis.set(key, JSON.stringify(retryInfo), {
      ex: 86400, // Keep for 24 hours
    });

    return retryInfo;
  } catch (error) {
    console.error("Webhook retry tracking error:", error);
    return {
      eventId,
      attempts: 1,
      lastAttempt: now,
      success,
    };
  }
}

/**
 * Validate webhook request headers
 * @param headers - Request headers
 * @param requiredHeaders - List of required header names
 * @returns Validation result
 */
export function validateWebhookHeaders(
  headers: Headers | Record<string, string>,
  requiredHeaders: string[]
): WebhookValidationResult {
  const missingHeaders: string[] = [];

  for (const headerName of requiredHeaders) {
    const value = headers instanceof Headers 
      ? headers.get(headerName)
      : headers[headerName];
    
    if (!value) {
      missingHeaders.push(headerName);
    }
  }

  if (missingHeaders.length > 0) {
    return {
      valid: false,
      error: `Missing required headers: ${missingHeaders.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Validate webhook payload size
 * @param payload - Webhook payload
 * @param maxSizeBytes - Maximum allowed size in bytes
 * @returns Validation result
 */
export function validateWebhookPayloadSize(
  payload: string | Buffer,
  maxSizeBytes: number = 1048576 // 1MB default
): WebhookValidationResult {
  const size = Buffer.byteLength(payload);

  if (size > maxSizeBytes) {
    return {
      valid: false,
      error: `Webhook payload too large: ${size} bytes (max: ${maxSizeBytes} bytes)`,
    };
  }

  return { valid: true };
}

/**
 * Clean up old webhook tracking data
 * @param olderThanSeconds - Remove entries older than this many seconds
 * @returns Number of entries removed
 */
export async function cleanupWebhookData(
  olderThanSeconds: number = 86400 // 24 hours default
): Promise<number> {
  if (!redis) {
    return 0;
  }

  try {
    // This would require scanning keys, which is expensive
    // In production, use Redis TTL feature (which we already do)
    // This function is mainly for manual cleanup if needed
    console.log(`Webhook data cleanup requested for entries older than ${olderThanSeconds}s`);
    return 0;
  } catch (error) {
    console.error("Webhook cleanup error:", error);
    return 0;
  }
}

/**
 * Get webhook processing statistics
 * @param timeWindowSeconds - Time window for statistics
 * @returns Processing statistics
 */
export async function getWebhookStats(
  timeWindowSeconds: number = 3600
): Promise<{
  processed: number;
  replaysBlocked: number;
  failedValidation: number;
}> {
  // This would require additional tracking in Redis
  // For now, return placeholder stats
  return {
    processed: 0,
    replaysBlocked: 0,
    failedValidation: 0,
  };
}