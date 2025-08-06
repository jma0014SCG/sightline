# API Rate Limits

This document defines the rate limiting policies for the Sightline.ai platform API endpoints.

## Overview

Rate limiting is implemented to:
- Prevent abuse and ensure fair usage
- Protect against DDoS attacks
- Manage external API quotas efficiently
- Ensure consistent performance for all users

## Rate Limit Structure

### Authentication Levels

1. **Anonymous Users**
   - Identified by browser fingerprint + IP address
   - Most restrictive limits
   - No API key required

2. **Authenticated Free Users**
   - Identified by Clerk user ID
   - Higher limits than anonymous
   - Subject to plan restrictions

3. **Authenticated Pro Users**
   - Premium rate limits
   - Priority processing
   - Higher quotas

4. **Enterprise Users**
   - Custom rate limits
   - Dedicated resources
   - Contact sales for details

## Endpoint Rate Limits

### Public Endpoints

| Endpoint | Anonymous | Free User | Pro User | Time Window |
|----------|-----------|-----------|----------|-------------|
| `GET /api/health` | 60/min | 60/min | 60/min | 1 minute |
| `POST /api/trpc/summary.createAnonymous` | 1/lifetime | N/A | N/A | Lifetime |
| `POST /api/trpc/summary.getAnonymous` | 10/hour | N/A | N/A | 1 hour |

### Authenticated Endpoints

| Endpoint | Free User | Pro User | Enterprise | Time Window |
|----------|-----------|----------|------------|-------------|
| `POST /api/trpc/summary.create` | 3/lifetime | 25/month | Unlimited | See notes |
| `GET /api/trpc/library.getAll` | 100/hour | 500/hour | 1000/hour | 1 hour |
| `GET /api/trpc/summary.getById` | 300/hour | 1000/hour | 2000/hour | 1 hour |
| `PUT /api/trpc/summary.update` | 60/hour | 200/hour | 500/hour | 1 hour |
| `DELETE /api/trpc/summary.delete` | 30/hour | 100/hour | 200/hour | 1 hour |
| `POST /api/trpc/auth.*` | 60/hour | 60/hour | 60/hour | 1 hour |
| `POST /api/trpc/billing.*` | 20/hour | 20/hour | 20/hour | 1 hour |

### Special Endpoints

| Endpoint | Limit | Notes |
|----------|-------|-------|
| `/api/webhooks/clerk` | 1000/hour | Webhook verification required |
| `/api/webhooks/stripe` | 1000/hour | Webhook verification required |
| `/api/progress/:taskId` | 120/min | Real-time progress tracking |

## External API Quotas

### OpenAI API
- **Tokens per minute**: 90,000 (GPT-4o-mini)
- **Requests per minute**: 200
- **Monthly budget**: $500 (adjustable)

### YouTube Data API
- **Daily quota**: 10,000 units
- **Search cost**: 100 units per request
- **Video details**: 1 unit per video

### Stripe API
- **Requests per second**: 100
- **Webhook events**: Unlimited (with verification)

## Rate Limit Headers

All API responses include rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1641024000
X-RateLimit-Policy: free-tier
```

## Error Responses

When rate limited, the API returns:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 60,
    "limit": 100,
    "window": "1h",
    "resetAt": "2024-01-09T12:00:00Z"
  }
}
```

HTTP Status Code: `429 Too Many Requests`

## Implementation Details

### Rate Limit Storage
- **Development**: In-memory storage
- **Production**: Redis/Upstash (when configured)
- **Fallback**: Database-backed rate limiting

### Rate Limit Keys
```typescript
// Anonymous users
`rate_limit:anon:${fingerprint}:${ip}:${endpoint}`

// Authenticated users
`rate_limit:user:${userId}:${endpoint}`

// Global limits
`rate_limit:global:${endpoint}`
```

### Bypass Mechanisms
- Internal health checks
- Webhook endpoints (with signature verification)
- Admin override tokens (Enterprise only)

## Best Practices for Clients

1. **Implement exponential backoff** when receiving 429 responses
2. **Cache responses** when possible to reduce API calls
3. **Use webhook notifications** instead of polling when available
4. **Batch operations** where supported
5. **Monitor rate limit headers** proactively

## Rate Limit Adjustments

### Requesting Higher Limits
1. Pro users: Automatic increase with subscription
2. High-volume users: Contact support@sightline.ai
3. Enterprise: Custom limits via sales@sightline.ai

### Temporary Increases
Available for:
- Product launches
- Migration periods
- Special events

Contact support with justification and expected duration.

## Monitoring and Alerts

### For Developers
- Dashboard at `/admin/rate-limits` (admin only)
- Alerts when users hit 80% of limits
- Daily reports of rate limit violations

### For Users
- Usage dashboard in account settings
- Email alerts at 80% and 100% of quota
- Monthly usage reports for Pro users

## Future Improvements

1. **Dynamic rate limiting** based on system load
2. **Burst allowances** for temporary spikes
3. **API key scoping** for fine-grained limits
4. **Cost-based limiting** for expensive operations
5. **Real-time usage API** for quota monitoring

---

Last Updated: 2025-01-09
Version: 1.0.0