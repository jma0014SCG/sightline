# Environment Setup Guide

This guide helps you set up all the required environment variables for Sightline.ai.

## Quick Setup

Run the setup script to get started quickly:

```bash
npm run env:setup
```

## Required Environment Variables

### 1. Database (Required)

**DATABASE_URL** - PostgreSQL connection string
- **Provider:** [Neon](https://neon.tech/) (recommended)
- **Format:** `postgresql://user:password@host:5432/database?sslmode=require`
- **Setup:**
  1. Create account at [neon.tech](https://neon.tech/)
  2. Create a new project
  3. Copy the connection string from the dashboard
  4. Add to `.env.local`

### 2. Authentication (Required)

**NEXTAUTH_URL** - Your application URL
- **Development:** `http://localhost:3000`
- **Production:** Your deployed URL

**NEXTAUTH_SECRET** - Secret for signing JWT tokens
- **Requirement:** Minimum 32 characters
- **Generate:** `openssl rand -base64 32`

### 3. Google OAuth (Required)

**GOOGLE_CLIENT_ID** & **GOOGLE_CLIENT_SECRET**
- **Setup:**
  1. Go to [Google Cloud Console](https://console.developers.google.com/)
  2. Create a new project or select existing
  3. Enable Google+ API
  4. Create OAuth 2.0 credentials
  5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
  6. Copy Client ID and Secret

### 4. OpenAI (Required)

**OPENAI_API_KEY** - For AI summarization
- **Setup:**
  1. Create account at [OpenAI](https://platform.openai.com/)
  2. Go to [API Keys](https://platform.openai.com/api-keys)
  3. Create new secret key
  4. Copy the key (starts with `sk-`)

## Optional Environment Variables

### YouTube API (Optional)

**YOUTUBE_API_KEY** - For enhanced video metadata
- **Setup:**
  1. Go to [Google Cloud Console](https://console.developers.google.com/)
  2. Enable YouTube Data API v3
  3. Create API key
  4. Restrict key to YouTube Data API v3

### Stripe (Required for Payments)

**STRIPE_SECRET_KEY**, **STRIPE_WEBHOOK_SECRET**, **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**
- **Setup:**
  1. Create account at [Stripe](https://dashboard.stripe.com/)
  2. Get keys from [API Keys page](https://dashboard.stripe.com/apikeys)
  3. Use test keys for development (start with `sk_test_` and `pk_test_`)
  4. Set up webhook endpoint for subscription events

### Monitoring & Analytics (Optional)

**SENTRY_DSN** - Error tracking
- **Setup:** Create project at [Sentry](https://sentry.io/)

**LANGCHAIN_API_KEY** - LLM observability
- **Setup:** Create account at [LangSmith](https://smith.langchain.com/)

**UPSTASH_REDIS_REST_URL** & **UPSTASH_REDIS_REST_TOKEN** - Job queues
- **Setup:** Create database at [Upstash](https://upstash.com/)

## Environment Validation

Check if your environment is properly configured:

```bash
# Validate all environment variables
npm run env:validate

# Quick check (allows missing optional vars)
npm run env:check
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
- Run `npm run env:validate` to see which variables are missing
- Check the format matches the expected pattern (e.g., OpenAI keys start with `sk-`)

**Database connection fails:**
- Verify the DATABASE_URL format
- Check if the database allows connections from your IP
- Ensure SSL mode is properly configured

**OAuth redirect errors:**
- Verify redirect URIs match in Google Console
- Check NEXTAUTH_URL matches your current URL

### Getting Help

1. Check the [Bug Tracking document](./Docs/Bug_tracking.md)
2. Validate environment with `npm run env:validate`
3. Check API service status pages
4. Review service documentation links above

## Example .env.local

```bash
# Copy from .env.example and fill in your values
NODE_ENV=development
SKIP_ENV_VALIDATION=true

DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-32-character-secret-here"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
OPENAI_API_KEY="sk-your-openai-key"
```