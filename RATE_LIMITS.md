---
title: "Rate Limits"
description: "API rate limiting configuration and enforcement for Sightline.ai platform"
type: "reference"
canonical_url: "/rate-limits"
version: "1.0"
last_updated: "2025-01-09"
audience: ["developers", "operators", "api-users"]
complexity: "intermediate"
tags: ["api", "rate-limits", "security", "quotas", "performance"]
security_level: "important"
review_schedule: "quarterly"
related_docs: ["/security", "/architecture", "/api/"]
---

# Rate Limits

**API rate limiting configuration and enforcement for Sightline.ai platform**

## Overview

Sightline.ai implements comprehensive rate limiting to ensure fair usage, prevent abuse, and maintain platform stability. Our rate limiting system protects both user experience and infrastructure resources through intelligent quota management across different user tiers.

### Rate Limiting Philosophy

- **Fair Usage**: Ensure all users have equitable access to platform resources
- **Abuse Prevention**: Protect against DDoS attacks and malicious usage patterns
- **Quality of Service**: Maintain consistent performance under varying load conditions
- **Progressive Enhancement**: Higher limits for paid plans to support power users

### Implementation Approach

- **Multi-Layer Protection**: Rate limits at application, API, and infrastructure levels
- **User-Aware Limits**: Different quotas based on authentication status and subscription plan
- **Browser Fingerprinting**: Anonymous user tracking without cookies for privacy compliance
- **Graceful Degradation**: Clear error messages with retry guidance when limits exceeded

---

## User Plan Rate Limits

### Summary of Plans

| Plan | Summary Creation | Summary Views | Key Features |
|------|------------------|---------------|--------------|
| **Anonymous** | 1 lifetime | 10/hour | Try before signup |
| **Free** | 3 lifetime | 300/hour | Personal exploration |
| **Pro** | 25/month | 1,000/hour | Professional usage |
| **Enterprise** | Unlimited | 2,000/hour | Team collaboration |

### Anonymous Users

**Identification Method**: Browser fingerprinting + IP address combination

| Operation | Limit | Window | Notes |
|-----------|-------|---------|-------|
| **Create Summary** | 1 | Lifetime | One-time trial experience |
| **View Summary** | 10 | 1 hour | Access to created summary |
| **Health Check** | 60 | 1 minute | System status monitoring |

**Key Characteristics**:
- No account creation required
- Single summary creation allowed ever
- Seamless upgrade to authenticated plans
- Summary ownership transferable upon signup

### Free Plan Users

**Authentication Required**: Clerk account with email verification

| Operation | Limit | Window | Purpose |
|-----------|-------|---------|---------|
| **Create Summary** | 3 | Lifetime | Extended trial for personal use |
| **View Summary** | 300 | 1 hour | High-frequency access to library |
| **Update Summary** | 60 | 1 hour | Content editing and organization |
| **Delete Summary** | 30 | 1 hour | Library management |
| **Library Operations** | 100 | 1 hour | Browse and search summaries |
| **Authentication** | 60 | 1 hour | Sign-in, profile updates |
| **Billing Operations** | 20 | 1 hour | Plan comparison, upgrade flow |

### Pro Plan Users

**Subscription**: $9/month with Stripe integration

| Operation | Limit | Window | Business Value |
|-----------|-------|---------|----------------|
| **Create Summary** | 25 | Monthly | Professional content creation |
| **View Summary** | 1,000 | 1 hour | High-volume content consumption |
| **Update Summary** | 200 | 1 hour | Extensive content management |
| **Delete Summary** | 100 | 1 hour | Advanced library organization |
| **Library Operations** | 500 | 1 hour | Power user browsing |
| **Authentication** | 60 | 1 hour | Account management |
| **Billing Operations** | 20 | 1 hour | Subscription management |

**Monthly Reset**: Limits reset on the 1st of each month at 00:00 UTC

### Enterprise Plan Users

**Subscription**: Custom pricing with dedicated support

| Operation | Limit | Window | Enterprise Benefits |
|-----------|-------|---------|---------------------|
| **Create Summary** | Unlimited | - | No creation restrictions |
| **View Summary** | 2,000 | 1 hour | Highest throughput for teams |
| **Update Summary** | 500 | 1 hour | Extensive content collaboration |
| **Delete Summary** | 200 | 1 hour | Advanced content lifecycle |
| **Library Operations** | 1,000 | 1 hour | Team-scale browsing |
| **Authentication** | 60 | 1 hour | Standard account operations |
| **Billing Operations** | 20 | 1 hour | Enterprise billing management |

**Special Features**:
- Dedicated support channel
- Custom rate limit adjustments available
- Priority processing queue
- Advanced analytics and reporting

---

## API Endpoint Rate Limits

### Core API Operations

#### Summary Management
```typescript
// Create Summary Endpoint
POST /api/trpc/summary.create
Rate Limits: Plan-based (see User Plan Rate Limits)
Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

// Get Summary Endpoint  
GET /api/trpc/summary.getById
Rate Limits: Plan-based viewing limits
Caching: 24-hour cache for public summaries
```

#### Library Operations
```typescript
// Get User Library
GET /api/trpc/library.getUserSummaries
Rate Limits: 100-1000/hour based on plan
Pagination: Max 50 items per request

// Search Library
POST /api/trpc/library.search
Rate Limits: Same as library operations
Search Optimization: Cached results for common queries
```

#### Authentication Flow
```typescript
// Clerk Webhooks
POST /api/webhooks/clerk
Rate Limits: 1,000 requests/hour
Signature Verification: Required for all requests
```

#### Progress Tracking
```typescript
// Real-time Progress Updates
GET /api/progress/{taskId}
Rate Limits: 120 requests/minute
Purpose: Live summarization status updates
Optimization: High-frequency polling support
```

### Webhook Endpoints

| Endpoint | Provider | Rate Limit | Security |
|----------|----------|------------|----------|
| `/api/webhooks/clerk` | Clerk | 1,000/hour | Signature verification |
| `/api/webhooks/stripe` | Stripe | 1,000/hour | Signature verification |
| `/api/webhooks/posthog` | PostHog | 500/hour | API key validation |

---

## External API Quotas

### OpenAI Integration

**Service**: GPT-4o-mini for video summarization

| Metric | Limit | Cost Impact |
|--------|-------|-------------|
| **Tokens per Minute** | 90,000 | $0.15 per 1K input tokens |
| **Requests per Minute** | 200 | API call frequency limit |
| **Monthly Budget** | $500 | Operational cost ceiling |
| **Concurrent Requests** | 20 | Parallel processing limit |

**Usage Optimization**:
- Content-based caching to reduce duplicate processing
- Token-efficient prompt engineering
- Automatic retry with exponential backoff

### YouTube API

**Service**: YouTube Data API v3 for video metadata

| Operation | Cost (Units) | Daily Quota |
|-----------|--------------|-------------|
| **Video Details** | 1 unit | 10,000 units/day |
| **Search Operation** | 100 units | Rarely used |
| **Channel Information** | 1 unit | As needed |

**Quota Management**:
- Efficient API usage to maximize daily quota
- Metadata caching for 7 days
- Fallback to alternative video sources

### Stripe API

**Service**: Payment processing and subscription management

| Operation Type | Rate Limit | Usage Pattern |
|----------------|------------|---------------|
| **API Requests** | 100/second | Subscription operations |
| **Webhook Delivery** | 1,000/hour | Event processing |
| **Dashboard Requests** | Standard | Manual operations |

---

## Technical Implementation

### Rate Limiting Headers

All API responses include standard rate limiting headers:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 25
X-RateLimit-Remaining: 23
X-RateLimit-Reset: 1704729600
X-RateLimit-Policy: 25 per month
Content-Type: application/json
```

**Header Definitions**:
- `X-RateLimit-Limit`: Maximum requests allowed in window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when window resets
- `X-RateLimit-Policy`: Human-readable policy description

### Error Response Format

When rate limits are exceeded, the API returns a structured error:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 3600,
    "limit": 25,
    "window": "month",
    "resetAt": "2025-02-01T00:00:00Z"
  }
}
```

**HTTP Status Code**: `429 Too Many Requests`

### Rate Limit Key Generation

#### Anonymous Users
```typescript
const key = `rate_limit:anon:${fingerprint}:${ip}:${endpoint}`
// Example: rate_limit:anon:abc123def456:192.168.1.1:create_summary
```

#### Authenticated Users
```typescript
const key = `rate_limit:user:${userId}:${endpoint}`
// Example: rate_limit:user:user_2N1K8Q7Xe9fzY5mR:create_summary
```

#### Global Operations
```typescript
const key = `rate_limit:global:${endpoint}`
// Example: rate_limit:global:webhooks_clerk
```

### Storage Implementation

**Development Environment**: In-memory Map with periodic cleanup
**Production Environment**: Redis with automatic expiration

```typescript
// Production Redis Configuration
const rateLimitStore = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  keyPrefix: 'rate_limit:',
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
})
```

---

## Monitoring & Operations

### Rate Limit Violation Alerts

**Critical Alerts** (Immediate Response Required):
- Anonymous users exceeding baseline traffic patterns
- Enterprise users hitting system limits
- External API quota approaching 90% usage
- Suspicious coordinated rate limit violations

**Warning Alerts** (Monitor and Review):
- Pro users consistently hitting monthly limits
- Unusual geographic traffic patterns
- External API usage trending above normal
- Rate limit effectiveness below 95%

### Usage Pattern Analysis

#### Key Metrics to Monitor

| Metric | Threshold | Action |
|--------|-----------|--------|
| **Anonymous Conversion Rate** | <5% | Review onboarding flow |
| **Plan Upgrade Rate** | <10% | Analyze limit effectiveness |
| **Rate Limit Hit Rate** | >15% | Consider limit adjustments |
| **External API Usage** | >80% | Scale quotas proactively |

#### Operational Dashboards

**Real-time Monitoring**:
- Current rate limit utilization by plan
- External API quota consumption
- Rate limit violation frequency and patterns
- User plan distribution and usage trends

**Historical Analysis**:
- Monthly usage patterns and growth trends
- Rate limit effectiveness and user impact
- External API cost optimization opportunities
- Plan upgrade correlation with rate limit hits

### Quota Management

#### Scaling Triggers

**Automatic Scaling**:
- OpenAI quota increases when approaching 80% usage
- Additional Redis instances for rate limit storage
- CDN cache expansion for high-traffic content

**Manual Review Required**:
- Enterprise plan limit customization
- Seasonal traffic pattern adjustments
- External API provider plan upgrades
- Rate limit policy refinements

#### Emergency Procedures

**Rate Limit Bypass** (Critical Issues Only):
- Temporary rate limit increases via feature flags
- Emergency contact procedures for external APIs
- Incident response for rate limiting system failures
- User communication protocols for service impacts

---

## Security Considerations

### DDoS Protection

**Multi-Layer Defense**:
1. **CDN Level**: Vercel Edge Network with automatic DDoS protection
2. **Application Level**: Rate limiting with progressive penalties
3. **Database Level**: Connection pooling and query optimization
4. **External APIs**: Circuit breakers with automatic fallback

### Anonymous User Fingerprinting

**Privacy-Compliant Approach**:
- Browser characteristics without personal identification
- IP address hashing with salt rotation
- No persistent storage of user behavior
- GDPR compliance for EU users

**Fingerprinting Components**:
```typescript
const fingerprint = {
  screen: `${screen.width}x${screen.height}`,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  language: navigator.language,
  platform: navigator.platform,
  hash: 'generated_hash_without_pii'
}
```

### Plan Enforcement

**Usage Validation**:
- Server-side verification of all rate limit checks
- Subscription status validation via Stripe webhooks
- Plan downgrade handling with grace periods
- Usage audit logs for compliance and debugging

**Bypass Prevention**:
- Rate limit keys include user authentication context
- Client-side manipulation protection
- Multiple request signature validation
- Coordinated attack pattern detection

### Rate Limit Security

**Protection Against Abuse**:
- Progressive penalties for repeat violators
- Automatic temporary bans for severe violations
- IP-based blocking for malicious traffic patterns
- User account suspension for policy violations

---

## FAQ & Troubleshooting

### Common Questions

**Q: Why was my request rate limited?**
A: Check the `X-RateLimit-*` headers in the response. You may have exceeded your plan's limits or made requests too frequently.

**Q: Can I increase my rate limits?**
A: Yes, upgrade to a higher plan (Pro or Enterprise) for increased limits. Enterprise plans offer custom limit negotiations.

**Q: How do I monitor my API usage?**
A: Use the user dashboard to track your summary creation and view counts, or monitor the rate limit headers in API responses.

**Q: What happens if external APIs are rate limited?**
A: We implement automatic retries and fallback mechanisms. Users receive clear status updates during processing delays.

### Common Issues

#### Rate Limit Headers Missing
**Cause**: Caching layer stripping headers  
**Solution**: Verify API endpoint configuration and cache bypass for dynamic content

#### Anonymous Users Can't Create Summaries
**Cause**: Browser fingerprinting failure or IP blocking  
**Solution**: Check fingerprinting script and whitelist IP ranges

#### External API Quota Exceeded
**Cause**: High usage or service changes  
**Solution**: Monitor quotas proactively and implement usage forecasting

---

## Related Documentation

- **[Security Policy](SECURITY.md)** - Rate limiting as part of overall security strategy
- **[API Documentation](API/)** - Complete API reference with rate limit examples
- **[Architecture Guide](ARCHITECTURE.md)** - System design including rate limiting infrastructure
- **[Monitoring Guide](Docs/operations/monitoring.md)** - Operational monitoring setup and dashboards

---

*Last Updated: January 9, 2025 | Version: 1.0*  
*Next Review: April 9, 2025*

**📞 Support**: For rate limit adjustments or Enterprise plan discussions, contact [support@sightline.ai](mailto:support@sightline.ai)