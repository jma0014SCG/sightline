/**
 * Security monitoring and logging service
 * Tracks security events, detects anomalies, and provides alerting
 */

import { logger } from "@/lib/logger";
import { Redis } from "@upstash/redis";

// Initialize Redis client if available
let redis: Redis | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = Redis.fromEnv();
}

/**
 * Security event types
 */
export enum SecurityEventType {
  RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
  AUTH_FAILURE = "auth_failure",
  WEBHOOK_REPLAY = "webhook_replay",
  INVALID_INPUT = "invalid_input",
  SUSPICIOUS_ACTIVITY = "suspicious_activity",
  CSRF_ATTEMPT = "csrf_attempt",
  XSS_ATTEMPT = "xss_attempt",
  SQL_INJECTION_ATTEMPT = "sql_injection_attempt",
  ACCESS_DENIED = "access_denied",
  CORS_VIOLATION = "cors_violation",
}

/**
 * Security event severity levels
 */
export enum SecuritySeverity {
  INFO = "info",
  WARNING = "warning",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Security event interface
 */
export interface SecurityEvent {
  id?: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  timestamp: Date;
  userId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  details: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Security metrics interface
 */
export interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  topIPs: Array<{ ip: string; count: number }>;
  topPaths: Array<{ path: string; count: number }>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

/**
 * Log a security event
 */
export async function logSecurityEvent(event: Omit<SecurityEvent, "id" | "timestamp">): Promise<void> {
  const fullEvent: SecurityEvent = {
    id: generateEventId(),
    timestamp: new Date(),
    ...event,
  };

  // Log to console/file via logger
  const logLevel = mapSeverityToLogLevel(event.severity);
  logger[logLevel]("Security Event", {
    type: event.type,
    severity: event.severity,
    userId: event.userId,
    ip: event.ip,
    path: event.path,
    details: event.details,
  });

  // Store in Redis for analytics if available
  if (redis) {
    try {
      const key = `security:event:${fullEvent.id}`;
      await redis.set(key, JSON.stringify(fullEvent), {
        ex: 86400 * 7, // Keep for 7 days
      });

      // Update metrics
      await updateSecurityMetrics(fullEvent);

      // Check for anomalies
      await checkForAnomalies(fullEvent);
    } catch (error) {
      logger.error("Failed to store security event in Redis", error);
    }
  }

  // Send alerts for critical events
  if (event.severity === SecuritySeverity.CRITICAL) {
    await sendSecurityAlert(fullEvent);
  }
}

/**
 * Update security metrics in Redis
 */
async function updateSecurityMetrics(event: SecurityEvent): Promise<void> {
  if (!redis) return;

  try {
    const hour = new Date().getHours();
    const day = new Date().toISOString().split("T")[0];

    // Increment counters
    await redis.hincrby(`security:metrics:${day}`, "total", 1);
    await redis.hincrby(`security:metrics:${day}`, `type:${event.type}`, 1);
    await redis.hincrby(`security:metrics:${day}`, `severity:${event.severity}`, 1);
    await redis.hincrby(`security:metrics:${day}`, `hour:${hour}`, 1);

    if (event.ip) {
      await redis.hincrby(`security:metrics:${day}:ips`, event.ip, 1);
    }

    if (event.path) {
      await redis.hincrby(`security:metrics:${day}:paths`, event.path, 1);
    }

    // Set expiry on metrics keys
    await redis.expire(`security:metrics:${day}`, 86400 * 30); // Keep for 30 days
  } catch (error) {
    logger.error("Failed to update security metrics", error);
  }
}

/**
 * Check for security anomalies
 */
async function checkForAnomalies(event: SecurityEvent): Promise<void> {
  if (!redis || !event.ip) return;

  try {
    const key = `security:anomaly:${event.ip}`;
    const window = 300; // 5 minutes

    // Count events from this IP in the time window
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, window);
    }

    // Alert if too many security events from one IP
    if (count > 10) {
      await logSecurityEvent({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.HIGH,
        ip: event.ip,
        details: {
          reason: "Multiple security events from single IP",
          eventCount: count,
          timeWindow: `${window} seconds`,
          originalEvent: event.type,
        },
      });
    }
  } catch (error) {
    logger.error("Failed to check for anomalies", error);
  }
}

/**
 * Send security alert for critical events
 */
async function sendSecurityAlert(event: SecurityEvent): Promise<void> {
  // Log critical alert
  logger.error("CRITICAL SECURITY ALERT", {
    type: event.type,
    severity: event.severity,
    userId: event.userId,
    ip: event.ip,
    path: event.path,
    details: event.details,
  });

  // In production, you would send alerts via:
  // - Email
  // - Slack/Discord webhook
  // - PagerDuty
  // - SMS via Twilio
  // etc.

  // For now, just ensure it's prominently logged
  console.error("🚨 CRITICAL SECURITY EVENT 🚨", JSON.stringify(event, null, 2));
}

/**
 * Get security metrics for a time range
 */
export async function getSecurityMetrics(
  startDate: Date,
  endDate: Date
): Promise<SecurityMetrics | null> {
  if (!redis) return null;

  try {
    const metrics: SecurityMetrics = {
      totalEvents: 0,
      eventsByType: {},
      eventsBySeverity: {},
      topIPs: [],
      topPaths: [],
      timeRange: { start: startDate, end: endDate },
    };

    // Get metrics for each day in range
    const days = getDaysInRange(startDate, endDate);
    
    for (const day of days) {
      const dayMetrics = await redis.hgetall(`security:metrics:${day}`);
      
      if (dayMetrics) {
        // Aggregate totals
        metrics.totalEvents += parseInt(dayMetrics.total as string || "0");

        // Aggregate by type
        for (const [key, value] of Object.entries(dayMetrics)) {
          if (key.startsWith("type:")) {
            const type = key.replace("type:", "");
            metrics.eventsByType[type] = (metrics.eventsByType[type] || 0) + parseInt(value as string);
          }
          if (key.startsWith("severity:")) {
            const severity = key.replace("severity:", "");
            metrics.eventsBySeverity[severity] = (metrics.eventsBySeverity[severity] || 0) + parseInt(value as string);
          }
        }

        // Get top IPs
        const ips = await redis.hgetall(`security:metrics:${day}:ips`);
        if (ips) {
          for (const [ip, count] of Object.entries(ips)) {
            const existing = metrics.topIPs.find((item) => item.ip === ip);
            if (existing) {
              existing.count += parseInt(count as string);
            } else {
              metrics.topIPs.push({ ip, count: parseInt(count as string) });
            }
          }
        }

        // Get top paths
        const paths = await redis.hgetall(`security:metrics:${day}:paths`);
        if (paths) {
          for (const [path, count] of Object.entries(paths)) {
            const existing = metrics.topPaths.find((item) => item.path === path);
            if (existing) {
              existing.count += parseInt(count as string);
            } else {
              metrics.topPaths.push({ path, count: parseInt(count as string) });
            }
          }
        }
      }
    }

    // Sort top IPs and paths
    metrics.topIPs.sort((a, b) => b.count - a.count);
    metrics.topPaths.sort((a, b) => b.count - a.count);

    // Limit to top 10
    metrics.topIPs = metrics.topIPs.slice(0, 10);
    metrics.topPaths = metrics.topPaths.slice(0, 10);

    return metrics;
  } catch (error) {
    logger.error("Failed to get security metrics", error);
    return null;
  }
}

/**
 * Helper functions
 */

function generateEventId(): string {
  return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function mapSeverityToLogLevel(severity: SecuritySeverity): "info" | "warn" | "error" {
  switch (severity) {
    case SecuritySeverity.INFO:
      return "info";
    case SecuritySeverity.WARNING:
      return "warn";
    case SecuritySeverity.HIGH:
    case SecuritySeverity.CRITICAL:
      return "error";
    default:
      return "info";
  }
}

function getDaysInRange(start: Date, end: Date): string[] {
  const days: string[] = [];
  const current = new Date(start);
  
  while (current <= end) {
    days.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return days;
}

/**
 * Security monitoring middleware helper
 * Use this in API routes to track security events
 */
export function trackSecurityEvent(
  req: Request,
  type: SecurityEventType,
  severity: SecuritySeverity,
  details: Record<string, any>
): void {
  // Extract request metadata
  const url = new URL(req.url);
  const headers = req.headers;

  logSecurityEvent({
    type,
    severity,
    ip: headers.get("x-forwarded-for") || headers.get("x-real-ip") || "unknown",
    userAgent: headers.get("user-agent") || undefined,
    path: url.pathname,
    method: req.method,
    details,
    metadata: {
      host: url.host,
      origin: headers.get("origin"),
      referer: headers.get("referer"),
    },
  }).catch((error) => {
    logger.error("Failed to track security event", error);
  });
}