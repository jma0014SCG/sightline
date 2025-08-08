---
title: "Production Operations Guide"
description: "Comprehensive operational guide for running Sightline.ai in production environments"
type: "guide"
canonical_url: "/operations/production-guide"
version: "1.0"
last_updated: "2025-01-09"
audience: ["system-administrators", "devops-engineers", "operators"]
complexity: "advanced"
tags: ["operations", "production", "deployment", "monitoring", "troubleshooting", "scaling"]
status: "active"
estimated_time: "45 minutes read"
related_docs: ["/docs/operations/monitoring", "/docs/operations/troubleshooting", "/security"]
---

# Production Operations Guide

Comprehensive operational guide for running Sightline.ai in production, covering deployment, monitoring, maintenance, troubleshooting, and scaling strategies.

## 📚 Table of Contents

- [Overview](#overview)
- [Production Architecture](#production-architecture)
- [Deployment Operations](#deployment-operations)
- [Monitoring & Observability](#monitoring--observability)
- [Security Operations](#security-operations)
- [Performance Management](#performance-management)
- [Troubleshooting Runbooks](#troubleshooting-runbooks)
- [Maintenance Procedures](#maintenance-procedures)
- [Scaling Strategies](#scaling-strategies)
- [Disaster Recovery](#disaster-recovery)
- [Operational Metrics](#operational-metrics)

## Overview

Sightline.ai operates on a serverless architecture using Vercel for hosting, Neon for database, and multiple third-party services for AI processing. This guide provides production-ready operational procedures for maintaining high availability and performance.

### Service Level Objectives (SLOs)

- **Availability**: 99.9% uptime (8.7 hours downtime/year)
- **Response Time**: <2s for page loads, <30s for summarization
- **Error Rate**: <0.1% for critical user flows
- **Recovery Time**: <5 minutes for critical incidents

### Architecture Components

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Users/CDN     │    │  Vercel Edge    │    │  External APIs  │
│   (Global)      │────│   Functions     │────│   (AI/Video)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                         ┌─────────────────┐
                         │  Neon Database  │
                         │  (Primary)      │
                         └─────────────────┘
```

---

# Deployment Operations

## Modern Deployment Stack (2025)

### Current Production Stack

- **Platform**: Vercel (Next.js 14 with App Router)
- **Database**: Neon PostgreSQL (Serverless)
- **Authentication**: Clerk (replaces NextAuth)
- **Payments**: Stripe (Live mode)
- **AI Processing**: OpenAI GPT-4o-mini
- **Monitoring**: Sentry (optional), Vercel Analytics
- **CDN**: Vercel Edge Network

### Environment Variables (Updated for Clerk)

#### Required Production Variables

```bash
# Application
DATABASE_URL=postgresql://user:pass@ep-example.us-east-1.aws.neon.tech/neondb
NEXT_PUBLIC_APP_URL=https://sightline.ai

# Clerk Authentication (Updated)
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# Stripe Payments
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...

# AI Services
OPENAI_API_KEY=sk-proj-...

# Optional Services
YOUTUBE_API_KEY=AIza...
GUMLOOP_API_KEY=gl_...
OXYLABS_USERNAME=user
OXYLABS_PASSWORD=pass
SENTRY_DSN=https://...@sentry.io/...
```

### Deployment Checklist (Updated)

**Pre-Deployment:**

- [ ] Update Clerk production settings (domains, redirects)
- [ ] Configure Stripe live webhooks
- [ ] Set up Neon production database with proper connection pooling
- [ ] Verify all environment variables are set correctly
- [ ] Run full test suite including E2E tests
- [ ] Validate API rate limits and usage quotas

**Deployment Process:**

```bash
# 1. Final quality checks
pnpm lint && pnpm typecheck && pnpm test && pnpm build

# 2. Deploy to Vercel
vercel --prod

# 3. Run post-deployment verification
./scripts/verify-production.sh

# 4. Update monitoring dashboards
# 5. Notify team of successful deployment
```

**Post-Deployment:**

- [ ] Test authentication flow (Clerk sign-in/up)
- [ ] Verify payment processing (test transaction)
- [ ] Test video summarization end-to-end
- [ ] Check all external integrations (OpenAI, YouTube API)
- [ ] Monitor error rates and response times
- [ ] Verify SSL certificates and security headers

### Rollback Procedures

**Automated Rollback (Vercel):**

```bash
# Get deployment ID to rollback to
vercel rollback <deployment-url>

# Or through Vercel Dashboard:
# 1. Go to deployments
# 2. Click "Promote to Production" on previous stable deployment
```

**Manual Rollback Steps:**

1. **Identify Last Known Good Deployment**: Check Vercel dashboard for stable version
2. **Database Considerations**: Ensure no breaking schema changes
3. **Environment Variables**: Verify configuration compatibility
4. **External Services**: Check API integrations still work
5. **Monitoring**: Watch metrics for 30 minutes post-rollback

---

# Monitoring & Observability

## Key Metrics Dashboard

### Application Performance

- **Page Load Time**: Target <2s (P95), Critical >5s
- **API Response Time**: Target <200ms (P95), Critical >1s  
- **Summarization Time**: Target <30s (P95), Critical >60s
- **Error Rate**: Target <0.1%, Critical >1%

### Business Metrics

- **Summary Creation Rate**: Summaries/hour, success rate
- **User Conversion**: Anonymous → Registered → Paid
- **Plan Usage**: Free/Pro/Complete utilization
- **Revenue Tracking**: MRR, churn rate, upgrade rate

### Infrastructure Metrics

- **Database**: Connection count, query performance, storage usage
- **Function Execution**: Invocation count, duration, memory usage
- **Third-party APIs**: OpenAI usage, rate limits, error rates
- **CDN Performance**: Cache hit ratio, bandwidth usage

## Monitoring Setup

### Vercel Analytics (Built-in)

```bash
# Enable Vercel Analytics
vercel analytics enable

# View metrics
vercel analytics --json | jq '.performance'
```

**Key Vercel Metrics:**

- Real User Metrics (RUM)
- Core Web Vitals (LCP, FID, CLS)
- Function invocation performance
- Edge cache performance

### Sentry Integration (Error Tracking)

```typescript
// sentry.client.config.ts (recommended setup)
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Filter out known non-critical errors
    if (event.exception?.values?.[0]?.value?.includes('ChunkLoadError')) {
      return null
    }
    return event
  }
})
```

### Database Monitoring (Neon)

- **Connection Pooling**: Monitor active connections, queue depth
- **Query Performance**: Slow query log, execution plans
- **Storage Usage**: Database size growth, backup status
- **Connection Limits**: Track connection pool usage

### Custom Health Checks

```bash
# API health check endpoint
curl https://sightline.ai/api/health

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  "openai": "available", 
  "timestamp": "2025-01-09T10:30:00Z"
}
```

---

# Security Operations

## Security Monitoring

### Authentication Security (Clerk)

- **Failed Login Attempts**: Monitor for brute force attacks
- **Session Management**: Track session duration, concurrent sessions
- **Webhook Validation**: Ensure all Clerk webhooks are properly verified
- **User Management**: Monitor suspicious account creation patterns

### API Security

- **Rate Limiting**: Track anonymous vs. authenticated usage
- **Input Validation**: Monitor for malicious URLs or content
- **SQL Injection Attempts**: Database query monitoring
- **XSS Prevention**: CSP violation reports

### Infrastructure Security

```bash
# Security header validation
curl -I https://sightline.ai | grep -E "(Strict-Transport-Security|X-Frame-Options|Content-Security-Policy)"

# Expected headers:
# Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
# X-Frame-Options: SAMEORIGIN  
# Content-Security-Policy: default-src 'self'; ...
```

### Vulnerability Management

- **Dependency Scanning**: Weekly `pnpm audit` and security updates
- **Code Analysis**: Static analysis with ESLint security rules
- **Secret Management**: Environment variable access auditing
- **Third-party Integration**: Monitor OAuth scope changes, API key rotation

---

# Performance Management

## Performance Budgets

### Frontend Performance

- **Bundle Size**: <500KB initial, <2MB total
- **Core Web Vitals**: LCP <2.5s, FID <100ms, CLS <0.1
- **Time to Interactive**: <3s on 3G connection
- **First Contentful Paint**: <1.5s

### API Performance

- **tRPC Procedures**: <200ms (P95)
- **FastAPI Endpoints**: <500ms for summarization start
- **Database Queries**: <50ms (P95) for simple queries
- **Third-party APIs**: <2s timeout with retries

### Optimization Strategies

#### Frontend Optimization

```typescript
// Implement proper code splitting
import dynamic from 'next/dynamic'

const SummaryViewer = dynamic(() => import('@/components/SummaryViewer'), {
  loading: () => <SummaryViewerSkeleton />,
  ssr: false // For client-heavy components
})
```

#### Database Optimization

```sql
-- Monitor slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Optimize common queries with indexes
CREATE INDEX CONCURRENTLY idx_summaries_user_created 
ON summaries(user_id, created_at DESC);
```

#### Caching Strategy

- **Static Assets**: Vercel Edge CDN (1 year cache)
- **API Responses**: Implement Redis for expensive operations
- **Database**: Connection pooling with PgBouncer
- **Third-party APIs**: Cache OpenAI responses for similar content

---

# Troubleshooting Runbooks

## Critical Incident Response

### Severity Levels

- **P0 (Critical)**: Complete service outage, security breach
- **P1 (High)**: Major feature broken, significant user impact  
- **P2 (Medium)**: Minor feature issues, performance degradation
- **P3 (Low)**: Cosmetic issues, minor bugs

### Incident Response Process

#### P0/P1 Incident Runbook

1. **Immediate Response (0-5 minutes)**
   - Assess impact and scope
   - Check Vercel status page and deployment history
   - Verify external service status (Clerk, Stripe, OpenAI, Neon)

2. **Investigation (5-15 minutes)**
   - Check error logs in Sentry
   - Review recent deployments
   - Test core user flows manually

3. **Resolution (15-30 minutes)**
   - Rollback if deployment-related
   - Scale resources if capacity issue
   - Contact vendor support if third-party issue

4. **Communication (Ongoing)**
   - Update status page
   - Notify users if widespread impact
   - Post-incident review within 24 hours

### Common Issues & Solutions

#### "Service Unavailable" / 500 Errors

```bash
# Check deployment status
vercel deployments

# Check function logs
vercel logs --follow

# Check database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Rollback if deployment issue
vercel rollback <previous-deployment-url>
```

#### Authentication Issues (Clerk)

```bash
# Verify Clerk configuration
curl -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  https://api.clerk.com/v1/instance

# Check webhook endpoints
curl -X GET https://sightline.ai/api/webhooks/clerk

# Common fixes:
# 1. Verify CLERK_SECRET_KEY is live key, not test
# 2. Check allowed origins in Clerk dashboard
# 3. Verify webhook signing secret matches
```

#### Database Connection Issues

```sql
-- Check connection count
SELECT count(*) FROM pg_stat_activity;

-- Check for long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- Kill problematic connections if needed
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE ...;
```

#### Payment Processing Issues (Stripe)

```bash
# Check webhook delivery in Stripe Dashboard
# Verify STRIPE_WEBHOOK_SECRET matches
# Test webhook endpoint manually:
curl -X POST https://sightline.ai/api/webhooks/stripe \
  -H "stripe-signature: test" \
  -d "test webhook"

# Common fixes:
# 1. Update webhook URL in Stripe dashboard
# 2. Verify webhook events are enabled
# 3. Check for Stripe API rate limits
```

#### Summarization Failures

```bash
# Check OpenAI API status
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# Check FastAPI backend
curl https://sightline.ai/api/health

# Common fixes:
# 1. Verify OpenAI API key is active
# 2. Check rate limits and usage quotas
# 3. Test YouTube video accessibility
# 4. Verify transcript availability
```

---

# Maintenance Procedures

## Regular Maintenance Tasks

### Daily Tasks (Automated)

- Health check monitoring
- Error rate monitoring
- Performance metrics review
- Security alert monitoring

### Weekly Tasks

```bash
# 1. Dependency security audit
pnpm audit --audit-level=high

# 2. Database maintenance
# (Neon handles this automatically, but monitor)

# 3. Performance review
# Check Vercel Analytics for trends

# 4. Backup verification
# Verify Neon automatic backups are working
```

### Monthly Tasks

- Complete security audit
- Performance optimization review
- Cost optimization analysis
- User feedback review and prioritization
- Disaster recovery testing

### Quarterly Tasks

- Full dependency updates
- Security penetration testing
- Capacity planning review
- Business continuity plan update

## Database Maintenance

### Schema Migrations

```bash
# Production migration process
1. Backup database before migration
2. Test migration on staging environment
3. Plan for rollback scenario
4. Apply migration during low-traffic period
5. Monitor performance after migration

# Safe migration example
npx prisma migrate deploy
```

### Index Management

```sql
-- Monitor index usage
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE tablename = 'summaries';

-- Add indexes concurrently (non-blocking)
CREATE INDEX CONCURRENTLY idx_summaries_tags 
ON summaries USING GIN (tags);
```

### Data Archival

```sql
-- Archive old anonymous summaries (>90 days)
DELETE FROM summaries 
WHERE user_id = 'ANONYMOUS_USER' 
AND created_at < NOW() - INTERVAL '90 days';

-- Archive old progress tracking data
DELETE FROM progress_tracking 
WHERE created_at < NOW() - INTERVAL '7 days';
```

---

# Scaling Strategies

## Traffic Growth Planning

### Current Capacity Baselines

- **Vercel Functions**: 100GB-hr/month (Pro plan)
- **Database**: 1GB storage, 10M queries/month (Neon)
- **OpenAI**: Rate limits vary by usage tier
- **Concurrent Users**: ~1000 based on current architecture

### Scaling Triggers

- **Database**: >80% storage usage or >8M queries/month
- **Function Execution**: >80GB-hr monthly usage
- **API Rate Limits**: Approaching 80% of OpenAI limits
- **Response Time**: P95 >3s for page loads, >45s for summarization

### Vertical Scaling (Immediate)

#### Database Scaling (Neon)

```bash
# Upgrade to higher compute tier
# Enable read-replicas for read-heavy workloads
# Implement connection pooling with PgBouncer

# Monitor with:
SELECT * FROM pg_stat_database WHERE datname = 'neondb';
```

#### Function Optimization

```typescript
// Optimize memory usage for better performance
export const config = {
  runtime: 'nodejs18.x',
  memory: 1024, // Increase from default 512MB
  maxDuration: 300, // 5 minutes for summarization
}
```

### Horizontal Scaling (Growth Phase)

#### Multi-Region Deployment

```bash
# Deploy to multiple Vercel regions
vercel --regions sfo1,iad1,fra1

# Use regional database read replicas
# Implement geo-routing for optimal performance
```

#### Microservices Architecture

```text
Current:     [Next.js + FastAPI] → [Neon DB]
Future:      [Next.js] → [API Gateway] → [Summarization Service]
                                      → [User Management Service]
                                      → [Payment Service]
```

#### Background Job Processing

```typescript
// Implement queue for heavy operations
import { Queue } from 'bullmq'

const summarizationQueue = new Queue('summarization', {
  connection: { host: 'redis-server', port: 6379 }
})

// Process summarization asynchronously
await summarizationQueue.add('summarize', { videoUrl, userId })
```

### Cost Optimization

#### Resource Monitoring

```bash
# Monitor Vercel usage
vercel billing

# Optimize function memory allocation
vercel functions --optimize

# Database cost optimization
# Use connection pooling to reduce connection costs
# Archive old data to reduce storage costs
```

#### Caching Strategy

```typescript
// Implement intelligent caching
const cache = {
  summaries: 24 * 60 * 60, // 1 day
  userProfiles: 5 * 60, // 5 minutes
  videoMetadata: 7 * 24 * 60 * 60, // 1 week
}
```

---

# Disaster Recovery

## Backup Strategy

### Database Backups (Neon)

- **Automatic Backups**: Point-in-time recovery for 7 days (free tier)
- **Extended Backups**: 30-day retention (paid tier)
- **Manual Snapshots**: Before major updates or migrations
- **Cross-region Backup**: For critical data protection

### Application Backups

```bash
# Export user data regularly
pnpm run export-user-data > backup-$(date +%Y%m%d).json

# Configuration backup
git tag production-$(date +%Y%m%d)
git push origin production-$(date +%Y%m%d)
```

### Recovery Procedures

#### Database Recovery

```bash
# Point-in-time recovery (Neon)
# 1. Go to Neon Console > Branches
# 2. Create new branch from specific timestamp
# 3. Update DATABASE_URL to new branch
# 4. Deploy with new connection string

# Full database restore from backup
psql $NEW_DATABASE_URL < backup.sql
```

#### Application Recovery

```bash
# Deploy from known-good state
git checkout production-backup-tag
vercel --prod

# Restore environment variables
vercel env pull .env.backup
# Manually restore from secure backup location
```

## Business Continuity

### Service Dependencies

- **Critical**: Vercel, Neon, Clerk (blocks core functionality)
- **Important**: Stripe (blocks paid features), OpenAI (blocks summarization)
- **Optional**: YouTube API, Sentry (degrades experience)

### Fallback Strategies

- **OpenAI Outage**: Queue requests, show status message
- **Database Outage**: Show cached data, defer writes
- **Authentication Outage**: Allow anonymous usage only
- **Payment Outage**: Allow existing users, defer new subscriptions

### Communication Plan

- **Internal**: Slack alerts, email notifications for incidents
- **External**: Status page updates, email to affected users
- **Documentation**: Incident post-mortems, runbook updates

---

# Operational Metrics

## Key Performance Indicators (KPIs)

### Technical KPIs

- **Availability**: 99.9% uptime SLO
- **Performance**: P95 response time <2s
- **Quality**: Error rate <0.1%
- **Scalability**: Handle 10x current traffic

### Business KPIs

- **User Growth**: Monthly active users, conversion rate
- **Revenue**: Monthly recurring revenue, churn rate
- **Usage**: Summaries created per day, plan utilization
- **Quality**: User satisfaction (NPS), support ticket volume

### Operational Efficiency

- **Deploy Frequency**: Target daily deploys
- **Lead Time**: Feature to production <1 week
- **Recovery Time**: Mean time to recovery <5 minutes
- **Change Failure Rate**: <5% of deploys cause incidents

## Monitoring Automation

### Alert Configurations

```yaml
alerts:
  critical:
    - error_rate > 1%
    - response_time_p95 > 5s
    - availability < 99%
  warning:
    - error_rate > 0.1%
    - response_time_p95 > 2s
    - database_connections > 80%
```

### Automated Responses

```bash
# Auto-scaling trigger
if [ $error_rate -gt 1 ]; then
  vercel scale --memory=1024
  notify_team "Auto-scaled due to high error rate"
fi

# Auto-rollback trigger
if [ $availability -lt 95 ]; then
  vercel rollback
  notify_team "Auto-rollback due to availability drop"
fi
```

---

## Support & Resources

### Internal Documentation

- [API Documentation](API_DOCUMENTATION.md) - Complete API reference
- [Security Policy](SECURITY.md) - Security measures and procedures
- [Monitoring Guide](MONITORING.md) - Detailed monitoring setup
- [Bug Tracking](Docs/development/bug-tracking.md) - Known issues and resolutions

### External Resources

- [Vercel Production Checklist](https://vercel.com/guides/production-checklist)
- [Neon Production Guide](https://neon.tech/docs/guides/production-checklist)
- [Clerk Production Setup](https://clerk.com/docs/deployments/production)
- [Stripe Production Integration](https://stripe.com/docs/production-checklist)

### Emergency Contacts

- **Platform Issues**: Vercel Support, Neon Support
- **Security Issues**: <security@sightline.ai>
- **Payment Issues**: Stripe Support
- **AI Issues**: OpenAI Support

---

*Last Updated: January 9, 2025 | Version: 1.0*

**⚡ Quick Reference**: For immediate incident response, see [Troubleshooting Runbooks](#troubleshooting-runbooks). For regular maintenance, see [Maintenance Procedures](#maintenance-procedures).
