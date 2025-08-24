---
title: "Environment Setup Guide"
description: "Comprehensive environment configuration for Sightline.ai development and production deployment"
type: "guide"
canonical_url: "/docs/development/environment-setup"
version: "2.0"
last_updated: "2025-01-09"
audience: ["developers", "contributors", "operators"]
complexity: "intermediate"
tags: ["environment", "setup", "configuration", "development", "production"]
prerequisites: ["Node.js 18+", "Python 3.12+", "Git", "pnpm"]
estimated_time: "30 minutes setup"
related_docs: ["/contributing", "/architecture", "/production-operations"]
---

# Environment Setup Guide

**Comprehensive environment configuration for Sightline.ai development and production deployment**

## Quick Setup

Run the automated setup script to get started quickly:

```bash
pnpm env:setup
```

Validate your configuration:

```bash
pnpm env:validate
```

For a quick check (allows missing optional variables):

```bash
pnpm env:check
```

## Required Environment Variables

### 1. Database (Required)

**DATABASE_URL** - PostgreSQL connection string

- **Provider:** [Neon](https://neon.tech/) (Vercel Postgres recommended)
- **Format:** `postgresql://user:password@host:5432/database?sslmode=require`
- **Setup:**
  1. Create account at [neon.tech](https://neon.tech/) or use Vercel Postgres
  2. Create a new project
  3. Copy the connection string from the dashboard
  4. Add to `.env.local`

**NEXT_PUBLIC_APP_URL** - Application base URL

- **Development:** `http://localhost:3000`
- **Production:** Your deployed URL (e.g., `https://sightline.ai`)

### 2. Authentication (Required - Clerk)

**CLERK_SECRET_KEY** - Server-side Clerk API key

- **Format:** `sk_test_...` (development) or `sk_live_...` (production)
- **Setup:**
  1. Create account at [clerk.com](https://clerk.com/)
  2. Create a new application
  3. Copy the secret key from API Keys section

**NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY** - Client-side Clerk key

- **Format:** `pk_test_...` (development) or `pk_live_...` (production)
- **Same source:** Clerk dashboard → API Keys

**CLERK_WEBHOOK_SECRET** - Webhook verification secret

- **Setup:** Clerk Dashboard → Webhooks → Create webhook
- **Endpoint:** `https://yourdomain.com/api/webhooks/clerk`
- **Events:** `user.created`, `user.updated`, `user.deleted`

### 3. AI Processing (Required)

**OPENAI_API_KEY** - AI summarization and classification

- **Format:** `sk-proj-...` (new format) or `sk-...` (legacy)
- **Setup:**
  1. Create account at [platform.openai.com](https://platform.openai.com/)
  2. Navigate to API Keys section
  3. Create new secret key
  4. Copy key immediately (not shown again)

**YOUTUBE_API_KEY** - Video metadata extraction (optional)

- **Setup:**
  1. Go to [Google Cloud Console](https://console.cloud.google.com/)
  2. Enable YouTube Data API v3
  3. Create API key credential
  4. Restrict to YouTube Data API v3

### 4. Payments (Required - Stripe)

**STRIPE_SECRET_KEY** - Server-side Stripe operations

- **Format:** `sk_test_...` (development) or `sk_live_...` (production)
- **Setup:**
  1. Create account at [stripe.com](https://stripe.com/)
  2. Navigate to Dashboard → Developers → API keys
  3. Copy the secret key

**NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY** - Client-side Stripe operations

- **Format:** `pk_test_...` (development) or `pk_live_...` (production)
- **Same source:** Stripe Dashboard → API keys

**STRIPE_WEBHOOK_SECRET** - Webhook verification

- **Setup:** Stripe Dashboard → Webhooks → Add endpoint
- **Endpoint:** `https://yourdomain.com/api/webhooks/stripe`
- **Events:** `invoice.payment_succeeded`, `customer.subscription.updated`

**NEXT_PUBLIC_STRIPE_PRO_PRICE_ID** - Pro plan price ID
**NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID** - Enterprise plan price ID (if applicable)

- **Source:** Stripe Dashboard → Products → Pricing table

## Optional Environment Variables

### Advanced Transcript Services

**GUMLOOP_API_KEY** - Enhanced transcript processing with AI features

- **Format:** `gum_...`
- **Setup:** Create account at [gumloop.com](https://gumloop.com/)
- **Additional Variables:**
  - `GUMLOOP_USER_ID` - Your Gumloop user identifier
  - `GUMLOOP_FLOW_ID` - Specific flow ID for transcript processing

**OXYLABS_USERNAME** & **OXYLABS_PASSWORD** - Proxy service for restricted content

- **Setup:** Create account at [oxylabs.io](https://oxylabs.io/)
- **Purpose:** Bypass geographic restrictions on video content

### Analytics & Product Intelligence

**NEXT_PUBLIC_POSTHOG_KEY** - Product analytics and user behavior tracking

- **Format:** `phc_...`
- **Setup:** Create project at [posthog.com](https://posthog.com/)
- **Additional Variables:**
  - `NEXT_PUBLIC_POSTHOG_HOST` - PostHog instance URL (default: `https://us.i.posthog.com`)

### Email Marketing Integration

**MAILERLITE_API_KEY** - Email campaign automation

- **Setup:** Create account at [mailerlite.com](https://mailerlite.com/)
- **Purpose:** User onboarding sequences and newsletter management

### LLM Monitoring & Optimization

**LANGCHAIN_API_KEY** - LLM performance monitoring via LangSmith

- **Setup:** Create account at [smith.langchain.com](https://smith.langchain.com/)
- **Additional Variables:**
  - `LANGCHAIN_PROJECT` - Project name (default: `sightline-ai`)
- **Purpose:** Monitor AI model performance, costs, and optimization opportunities

### Monitoring & Error Tracking

**SENTRY_DSN** - Error tracking and performance monitoring

- **Format:** `https://...@...ingest.sentry.io/...`
- **Setup:** Create project at [sentry.io](https://sentry.io/)
- **Additional Variables:**
  - `SENTRY_ORG` - Organization slug
  - `SENTRY_PROJECT` - Project name
  - `SENTRY_AUTH_TOKEN` - Authentication token for releases

### Caching & Performance

**UPSTASH_REDIS_REST_URL** - Redis caching layer

- **Format:** `https://your-redis-url.upstash.io`
- **Setup:** Create database at [upstash.com](https://upstash.com/)
- **Additional Variables:**
  - `UPSTASH_REDIS_REST_TOKEN` - Authentication token
- **Purpose:** Job queues, session storage, rate limiting

## Environment Validation

Check if your environment is properly configured:

```bash
# Validate all environment variables
pnpm env:validate

# Quick check (allows missing optional vars)
pnpm env:check
```

## Development vs Production Configuration

### Development Environment

**Core Settings:**

- `NODE_ENV="development"`
- `NEXT_PUBLIC_APP_URL="http://localhost:3000"`
- Use test/development keys for all external services
- Use local database or development branch

**Development Optimizations:**

- Enable `SKIP_ENV_VALIDATION=true` for faster startup during development
- Use test mode for all payment processing
- Enable debug logging for troubleshooting

```bash
# Development-specific commands
pnpm dev              # Start development servers
pnpm db:push          # Push schema changes (development)
pnpm env:check        # Quick validation (allows missing optional vars)
```

### Production Environment

**Core Settings:**

- `NODE_ENV="production"`
- `NEXT_PUBLIC_APP_URL="https://your-domain.com"`
- Use live/production keys for all external services
- Use production database with connection pooling
- Remove `SKIP_ENV_VALIDATION` for strict validation

**Production Requirements:**

```bash
# Production deployment commands
pnpm build:prod       # Production build with optimizations
pnpm db:migrate       # Run database migrations (production)
pnpm env:validate     # Strict validation of all variables
```

**Security Considerations:**

- All Stripe keys must be live keys (`sk_live_`, `pk_live_`)
- Database connections must use SSL (`?sslmode=require`)
- Webhook secrets must match production endpoints
- API keys should be restricted to production domains only

### Vercel Deployment

**Environment Variable Management:**

```bash
# Link to Vercel project
pnpm vercel:link

# Pull environment variables from Vercel
pnpm vercel:env

# Deploy to production
pnpm deploy

# Deploy preview branch
pnpm deploy:preview
```

**Vercel-Specific Variables:**

- Variables are automatically available in the Vercel environment
- Use Vercel Dashboard → Project Settings → Environment Variables
- Separate variables by environment (Development, Preview, Production)

## Security Best Practices

1. **Never commit** `.env.local` or `.env` files
2. **Use different keys** for development and production
3. **Rotate secrets** regularly
4. **Restrict API keys** to necessary permissions only
5. **Monitor usage** of all API keys

## Troubleshooting Common Issues

### Environment Validation Errors

**"Invalid environment variables" error:**

- Run `pnpm env:validate` to see specific validation failures
- Check format requirements (OpenAI keys: `sk-`, Stripe: `sk_test_`/`sk_live_`)
- Ensure no trailing spaces or quotes in variable values

**Missing required variables:**

- Copy from `.env.example` if missing variables
- Check if variables are environment-specific (development vs production)
- Verify variable names match exactly (case-sensitive)

### Database Connection Issues

**Database connection fails:**

- Verify `DATABASE_URL` format: `postgresql://user:password@host:5432/database?sslmode=require`
- Check Neon dashboard for correct connection parameters
- Ensure database allows connections from your IP
- Confirm SSL mode is enabled (`?sslmode=require`)

**Prisma errors:**

- Run `pnpm db:generate` after schema changes
- Use `pnpm db:push` for development, `pnpm db:migrate` for production
- Check if database schema is up to date

### Authentication Problems

**Clerk authentication errors:**

- Verify domain settings in Clerk Dashboard → Domains
- Ensure `NEXT_PUBLIC_APP_URL` matches your current URL exactly
- Check webhook endpoints are correctly configured
- Confirm both publishable and secret keys are from same Clerk application

**Webhook failures:**

- Verify webhook URLs match your deployed endpoints
- Check webhook secrets match between service and environment
- Ensure endpoints are publicly accessible (not localhost for production)

### External Service Issues

**OpenAI API errors:**

- Verify API key format starts with `sk-` (new format) or `sk-proj-`
- Check usage limits and billing status at platform.openai.com
- Ensure model availability (GPT-4o-mini recommended)

**Stripe integration problems:**

- Confirm using correct keys for environment (test vs live)
- Verify webhook endpoint matches Stripe dashboard configuration
- Check webhook signing secret matches environment variable

**YouTube API limitations:**

- Monitor quota usage at Google Cloud Console
- Implement fallback transcript services (Gumloop, native extraction)
- Check API key restrictions and referrer settings

### Performance & Monitoring

**Slow application performance:**

- Enable Redis caching with Upstash
- Monitor with Sentry performance tracking
- Check PostHog for user experience metrics

**Memory issues:**

- Verify Node.js version compatibility (18+ required)
- Monitor Vercel function memory usage
- Consider optimizing large dependencies

### Getting Help

1. Check the [Bug Tracking document](bug-tracking.md)
2. Validate environment with `pnpm env:validate`
3. Check API service status pages
4. Review service documentation links above

## Complete Environment Variable Reference

### Development Environment (.env.local)

```bash
# ============================================
# CORE APPLICATION SETTINGS
# ============================================
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_VERSION="1.0.0"

# ============================================
# DATABASE (Required)
# ============================================
# Get from Neon: https://neon.tech/
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# ============================================
# AUTHENTICATION - CLERK (Required)
# ============================================
# Get from: https://clerk.com/
CLERK_SECRET_KEY="sk_test_your-clerk-secret-key"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_your-clerk-publishable-key"
CLERK_WEBHOOK_SECRET="whsec_your-clerk-webhook-secret"

# ============================================
# AI SERVICES (Required)
# ============================================
# OpenAI - Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY="sk-proj-your-openai-api-key"

# YouTube API (Optional) - Get from: https://console.developers.google.com/
YOUTUBE_API_KEY="your-youtube-api-key"

# ============================================
# PAYMENTS - STRIPE (Required)
# ============================================
# Get from: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY="sk_test_your-stripe-secret-key"
STRIPE_WEBHOOK_SECRET="whsec_your-stripe-webhook-secret"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your-stripe-publishable-key"
# Stripe Price IDs (Get from Stripe Dashboard > Products)
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID="price_your-pro-price-id"
NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID="price_your-enterprise-price-id"

# ============================================
# OPTIONAL: ANALYTICS & MONITORING
# ============================================
# Sentry (Error Tracking) - Get from: https://sentry.io/
NEXT_PUBLIC_SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
SENTRY_ORG="your-sentry-organization-slug"
SENTRY_PROJECT="your-sentry-project-name"
SENTRY_AUTH_TOKEN="your-sentry-auth-token"

# PostHog (Product Analytics) - Get from: https://posthog.com/
NEXT_PUBLIC_POSTHOG_KEY="phc_your-posthog-project-key"
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"

# ============================================
# OPTIONAL: ENHANCED SERVICES
# ============================================
# MailerLite (Email Marketing) - Get from: https://app.mailerlite.com/integrations/api
MAILERLITE_API_KEY="your-mailerlite-api-key"

# LangSmith (LLM Monitoring) - Get from: https://smith.langchain.com/
LANGCHAIN_API_KEY="your-langsmith-api-key"
LANGCHAIN_PROJECT="sightline-ai"

# Upstash Redis (Caching) - Get from: https://upstash.com/
UPSTASH_REDIS_REST_URL="https://your-redis-url.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-redis-token"

# Gumloop (Enhanced Transcription) - Get from: https://docs.gumloop.com/api-reference/sdk/python
GUMLOOP_API_KEY="your-gumloop-api-key"
GUMLOOP_USER_ID="your-gumloop-user-id"
GUMLOOP_FLOW_ID="your-gumloop-flow-id"

# Oxylabs (Proxy Service) - Get from: https://oxylabs.io/
OXYLABS_USERNAME="your-oxylabs-username"
OXYLABS_PASSWORD="your-oxylabs-password"
```

### Production Environment Variables

For production deployment, ensure:

- Change all test keys to live keys (`sk_live_`, `pk_live_`)
- Update `NEXT_PUBLIC_APP_URL` to your production domain
- Use production database URL
- Configure webhooks for production endpoints
- Remove or disable development-only optimizations

## Validation Notes

### Environment Schema Validation

The application includes automatic environment validation in `src/lib/env.ts`. Note that some variables documented here may not be included in the validation schema yet. If you encounter validation errors for documented variables, they may need to be added to the schema.

**Common Discrepancies:**

- Stripe price IDs may use different naming conventions (`STRIPE_PRO_PRICE_ID` vs `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`)
- Some optional services (Gumloop, Oxylabs) may not be in validation schema
- Sentry uses `NEXT_PUBLIC_SENTRY_DSN` in configuration files, not `SENTRY_DSN`

**To add missing variables to validation:**

1. Edit `src/lib/env.ts`
2. Add the variable to the `envSchema` object with appropriate Zod validation
3. Mark as `.optional()` if not required for basic functionality

---

*Last Updated: January 9, 2025 | Version: 2.0*  
*Environment setup guide - Consolidated and updated for comprehensive service integration*
