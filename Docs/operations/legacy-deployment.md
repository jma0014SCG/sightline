---
title: "Production Deployment Guide"
description: "Legacy deployment guide for deploying Sightline.ai to production on Vercel platform"
type: "guide"
canonical_url: "/docs/operations/legacy-deployment"
version: "1.0"
last_updated: "2025-01-09"
audience: ["devops-engineers", "system-administrators"]
complexity: "advanced"
tags: ["deployment", "production", "vercel", "legacy", "operations"]
status: "legacy"
archive_reason: "superseded_by_modern_deployment"
superseded_by: ["/production-operations-guide"]
related_docs: ["/docs/operations/monitoring", "/production-operations-guide"]
---

# Production Deployment Guide

This guide walks you through deploying Sightline.ai to production on Vercel.

## Prerequisites

- [Vercel Account](https://vercel.com)
- [Neon Database](https://neon.tech) (or other PostgreSQL provider)
- [Google Cloud Console](https://console.cloud.google.com) for OAuth
- [Stripe Account](https://stripe.com) for payments
- [OpenAI API Key](https://platform.openai.com/api-keys)

## Step 1: Database Setup

1. **Create Production Database**

   ```bash
   # Create a new Neon project for production
   # Get the connection string from Neon dashboard
   ```

2. **Run Database Migrations**

   ```bash
   # Set DATABASE_URL temporarily
   export DATABASE_URL="your-production-database-url"
   pnpm run db:push
   ```

## Step 2: Vercel Deployment

1. **Install Vercel CLI**

   ```bash
   pnpm i -g vercel
   ```

2. **Link Project to Vercel**

   ```bash
   vercel link
   ```

3. **Set Environment Variables**

   ```bash
   # Required variables
   vercel env add NEXTAUTH_URL production
   vercel env add NEXTAUTH_SECRET production
   vercel env add DATABASE_URL production
   vercel env add GOOGLE_CLIENT_ID production
   vercel env add GOOGLE_CLIENT_SECRET production
   vercel env add OPENAI_API_KEY production
   vercel env add STRIPE_SECRET_KEY production
   vercel env add STRIPE_WEBHOOK_SECRET production
   vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
   
   # Optional variables
   vercel env add YOUTUBE_API_KEY production
   vercel env add SENTRY_DSN production
   vercel env add GUMLOOP_API_KEY production
   ```

4. **Deploy to Production**

   ```bash
   vercel --prod
   ```

## Step 3: Environment Variables Setup

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXTAUTH_URL` | Your production URL | `https://sightline.com` |
| `NEXTAUTH_SECRET` | JWT secret (32+ chars) | Generate with `openssl rand -base64 32` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host:5432/db` |
| `GOOGLE_CLIENT_ID` | Google OAuth ID | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | From Google Cloud Console |
| `OPENAI_API_KEY` | OpenAI API access | `sk-...` from OpenAI dashboard |
| `STRIPE_SECRET_KEY` | Stripe payments | `sk_live_...` for production |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks | `whsec_...` from Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public Stripe key | `pk_live_...` |

### Optional Variables

| Variable | Description | When to Use |
|----------|-------------|-------------|
| `YOUTUBE_API_KEY` | Enhanced video metadata | Better thumbnail/duration accuracy |
| `SENTRY_DSN` | Error tracking | Production monitoring |
| `GUMLOOP_API_KEY` | Enhanced summaries | If using Gumloop service |
| `UPSTASH_REDIS_REST_URL` | Background jobs | For async processing |
| `UPSTASH_REDIS_REST_TOKEN` | Redis auth token | With Upstash Redis |

## Step 4: Google OAuth Setup

1. **Update Authorized Redirect URIs**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Navigate to APIs & Services > Credentials
   - Add: `https://your-domain.com/api/auth/callback/google`

2. **Update Authorized JavaScript Origins**
   - Add: `https://your-domain.com`

## Step 5: Stripe Configuration

1. **Update Webhook Endpoint**
   - Go to Stripe Dashboard > Webhooks
   - Add endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Select events: `customer.subscription.*`, `invoice.*`

2. **Use Live Keys**
   - Switch from test keys (`sk_test_...`) to live keys (`sk_live_...`)
   - Update all Stripe-related environment variables

## Step 6: Domain & DNS

1. **Custom Domain (Optional)**

   ```bash
   # Add custom domain in Vercel dashboard
   # Update DNS records as shown
   ```

2. **SSL Certificate**
   - Automatically handled by Vercel
   - Verify at: `https://your-domain.com`

## Step 7: Performance Optimization

1. **Enable Vercel Analytics**

   ```bash
   vercel analytics
   ```

2. **Monitor Performance**
   - Check Core Web Vitals in Vercel dashboard
   - Monitor API response times

## Step 8: Security Setup

1. **Security Headers**
   - Already configured in `next.config.js`
   - Includes CSP, HSTS, and other security headers

2. **Rate Limiting**
   - Implemented in API routes
   - Monitor for abuse in Vercel logs

## Step 9: Monitoring & Alerts

1. **Error Tracking (Sentry)**

   ```bash
   # If using Sentry
   vercel env add SENTRY_DSN production
   vercel env add SENTRY_AUTH_TOKEN production
   ```

2. **Uptime Monitoring**
   - Use Vercel's built-in monitoring
   - Or external service like UptimeRobot

## Step 10: Post-Deployment Checklist

- [ ] App loads successfully at production URL
- [ ] Google OAuth login works
- [ ] Video summarization works end-to-end
- [ ] Stripe payments work (test with live mode)
- [ ] Database connections are stable
- [ ] Error tracking is receiving data (if enabled)
- [ ] All environment variables are set correctly
- [ ] SSL certificate is valid
- [ ] API endpoints respond correctly
- [ ] Share functionality works with production URLs

## Environment Variables Validation

Use our built-in validation:

```bash
# Pull production environment
vercel env pull .env.production.local

# Validate (after installing tsx)
pnpm install tsx
pnpm run env:validate
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check TypeScript errors: `pnpm run typecheck`
   - Check linting: `pnpm run lint`

2. **OAuth Redirect Errors**
   - Verify redirect URIs in Google Console
   - Check NEXTAUTH_URL matches domain

3. **Database Connection Issues**
   - Verify DATABASE_URL format
   - Check Neon IP allowlist settings
   - Test connection: `pnpm run db:studio`

4. **Stripe Webhook Failures**
   - Check webhook endpoint URL
   - Verify webhook secret matches
   - Check selected events

### Performance Monitoring

1. **Vercel Analytics**
   - Monitor page load times
   - Track Core Web Vitals
   - Identify slow API routes

2. **Database Performance**
   - Monitor query performance in Neon
   - Check connection pool usage
   - Optimize slow queries

## Production Maintenance

### Regular Tasks

1. **Security Updates**
   - Keep dependencies updated
   - Monitor security advisories
   - Rotate API keys regularly

2. **Performance Monitoring**
   - Review Vercel analytics weekly
   - Monitor error rates
   - Check database performance

3. **Backup Strategy**
   - Neon provides automatic backups
   - Export critical data regularly
   - Test restore procedures

### Scaling Considerations

1. **Database Scaling**
   - Monitor Neon usage metrics
   - Consider connection pooling (PgBouncer)
   - Plan for read replicas if needed

2. **API Rate Limits**
   - Monitor OpenAI usage
   - Consider caching strategies
   - Implement queue for heavy operations

3. **Storage**
   - Monitor Vercel bandwidth usage
   - Consider CDN for static assets
   - Plan for media storage if needed

## Support & Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Neon Documentation](https://neon.tech/docs)
- [Stripe Integration Guide](https://stripe.com/docs)

## Quick Deploy Script

```bash
#!/bin/bash
# Quick production deployment

echo "🚀 Deploying Sightline to production..."

# Build and test locally first
pnpm run build
pnpm run typecheck

# Deploy to Vercel
vercel --prod

echo "✅ Deployment complete!"
echo "🔗 Check your deployment at: https://your-domain.com"
```

---

**Next Steps**: After deployment, monitor the application closely for the first 24-48 hours to ensure stability and performance.
