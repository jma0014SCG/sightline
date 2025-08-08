# Environment Setup Guide

**Comprehensive environment configuration for Sightline.ai development and production deployment**

## Quick Setup

Run the setup script to get started quickly:

```bash
pnpm env:setup
```

Validate your configuration:

```bash
pnpm env:validate
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
**NEXT_PUBLIC_STRIPE_COMPLETE_PRICE_ID** - Complete plan price ID (if applicable)
- **Source:** Stripe Dashboard → Products → Pricing table

## Optional Environment Variables

### Transcript Services (Enhanced Processing)

**GUMLOOP_API_KEY** - Enhanced transcript processing
- **Setup:** Create account at [gumloop.com](https://gumloop.com/)

**OXYLABS_USERNAME** & **OXYLABS_PASSWORD** - Proxy service for restricted content
- **Setup:** Create account at [oxylabs.io](https://oxylabs.io/)

### Monitoring & Analytics

**SENTRY_DSN** - Error tracking and monitoring
- **Setup:** Create project at [sentry.io](https://sentry.io/)
- **Format:** `https://...@...ingest.sentry.io/...`

**UPSTASH_REDIS_URL** - Caching layer (optional)
- **Setup:** Create database at [upstash.com](https://upstash.com/)

## Environment Validation

Check if your environment is properly configured:

```bash
# Validate all environment variables
pnpm env:validate

# Quick check (allows missing optional vars)
pnpm env:check
```

## Development vs Production

### Development
- Use test keys for all services
- Use local database or development branch
- Set `NODE_ENV=development`
- Enable `SKIP_ENV_VALIDATION=true` for faster development

### Production
- Use production keys
- Use production database
- Set `NODE_ENV=production`
- Remove `SKIP_ENV_VALIDATION`

## Security Best Practices

1. **Never commit** `.env.local` or `.env` files
2. **Use different keys** for development and production
3. **Rotate secrets** regularly
4. **Restrict API keys** to necessary permissions only
5. **Monitor usage** of all API keys

## Troubleshooting

### Common Issues

**"Invalid environment variables" error:**
- Run `pnpm env:validate` to see which variables are missing
- Check the format matches the expected pattern (e.g., OpenAI keys start with `sk-`)

**Database connection fails:**
- Verify the DATABASE_URL format
- Check if the database allows connections from your IP
- Ensure SSL mode is properly configured

**Clerk authentication errors:**
- Verify domain settings in Clerk dashboard
- Check NEXT_PUBLIC_APP_URL matches your current URL
- Ensure webhook endpoints are correctly configured

### Getting Help

1. Check the [Bug Tracking document](bug-tracking.md)
2. Validate environment with `pnpm env:validate`
3. Check API service status pages
4. Review service documentation links above

## Example .env.local

```bash
# Core Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# Authentication (Clerk)
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# AI Services  
OPENAI_API_KEY="sk-proj-..."
YOUTUBE_API_KEY="AIza..." # optional

# Payments (Stripe)
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID="price_..."

# Optional Services
SENTRY_DSN="https://...@...ingest.sentry.io/..."
UPSTASH_REDIS_URL="redis://..."
GUMLOOP_API_KEY="gum_..."
OXYLABS_USERNAME="..."
OXYLABS_PASSWORD="..."
```

---

*Environment setup guide - Updated January 2025 for Clerk authentication and current service architecture*