# 🚀 Sightline Production Deployment Guide

## 📊 Project Analysis Summary

### Current State
- **Framework**: Next.js 14 with TypeScript
- **Backend**: FastAPI Python (Railway deployment)
- **Database**: PostgreSQL (Neon)
- **Authentication**: Clerk
- **Payments**: Stripe
- **Hosting**: Vercel (Frontend) + Railway (Backend)

### Deployment Configuration Status
✅ **Configured**:
- Vercel configuration (vercel.json)
- Railway configuration (railway.json)
- Build scripts and commands
- Security headers and CORS settings

⚠️ **Needs Configuration**:
- Backend URL environment variable
- API credentials verification
- Production database setup
- Webhook endpoints

## 🔍 Production Readiness Checklist

### 1. Environment Variables
```bash
# Run environment validation
pnpm env:validate

# Check missing variables
node scripts/validate-production-env.js
```

**Required Variables**:
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `NEXT_PUBLIC_BACKEND_URL` - Railway backend URL
- [ ] `OPENAI_API_KEY` - For AI summarization
- [ ] `CLERK_SECRET_KEY` & `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] `STRIPE_SECRET_KEY` & webhook secrets
- [ ] `NEXT_PUBLIC_APP_URL` - Production domain

### 2. Database Setup
```bash
# Generate Prisma client
pnpm db:generate

# Push schema to production database
pnpm db:push

# Run migrations (if any)
pnpm db:migrate

# Verify database connection
node scripts/test-db.js
```

### 3. Backend API (Railway)
```bash
# Deploy to Railway
cd api
railway up

# Get deployment URL
railway status

# Test backend health
curl https://your-app.railway.app/api/health
```

### 4. Frontend (Vercel)
```bash
# Link to Vercel project
pnpm vercel:link

# Pull environment variables
pnpm vercel:env

# Deploy preview
pnpm deploy:preview

# Deploy to production
pnpm deploy
```

## 📋 Step-by-Step Deployment Workflow

### Phase 1: Pre-Deployment Setup

#### Step 1.1: Environment Configuration
```bash
# Create production environment file
cp .env.example .env.production.local

# Edit with production values
nano .env.production.local
```

#### Step 1.2: Database Setup
```bash
# 1. Create Neon database at https://neon.tech
# 2. Copy connection string
# 3. Add to .env.production.local as DATABASE_URL

# Test connection
node scripts/check-prod-db.js

# Apply schema
pnpm db:push
```

#### Step 1.3: Third-Party Services
1. **Clerk Setup**:
   - Create production app at clerk.com
   - Configure OAuth providers
   - Set up webhook endpoint
   - Run: `node scripts/setup-clerk-webhook.js`

2. **Stripe Setup**:
   - Create products and prices
   - Configure webhook endpoints
   - Test payment flow

3. **OpenAI**:
   - Verify API key has sufficient credits
   - Test summarization pipeline: `node scripts/test-pipeline.js`

### Phase 2: Backend Deployment (Railway)

#### Step 2.1: Railway Setup
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project (if new)
railway init

# Link existing project
railway link
```

#### Step 2.2: Configure Railway Environment
```bash
# Set environment variables
railway variables set OPENAI_API_KEY="your-key"
railway variables set DATABASE_URL="your-neon-url"
railway variables set GUMLOOP_API_KEY="your-key"
railway variables set OXYLABS_USERNAME="your-username"
railway variables set OXYLABS_PASSWORD="your-password"
```

#### Step 2.3: Deploy Backend
```bash
# Deploy to Railway
railway up

# Get deployment URL
railway status

# Save URL to environment
export NEXT_PUBLIC_BACKEND_URL="https://sightline-api-production.up.railway.app"
```

### Phase 3: Frontend Deployment (Vercel)

#### Step 3.1: Vercel Setup
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link project
pnpm vercel:link
```

#### Step 3.2: Configure Vercel Environment
```bash
# Add environment variables in Vercel Dashboard
# Or use CLI:
vercel env add NEXT_PUBLIC_BACKEND_URL production
vercel env add DATABASE_URL production
vercel env add CLERK_SECRET_KEY production
# ... add all required variables
```

#### Step 3.3: Deploy Frontend
```bash
# Build and test locally
pnpm build:prod
pnpm start

# Deploy preview
pnpm deploy:preview

# Verify preview deployment
# Then deploy to production
pnpm deploy
```

### Phase 4: Post-Deployment Verification

#### Step 4.1: Run Verification Script
```bash
# Comprehensive production verification
node scripts/verify-production.js

# Test all API surfaces
node scripts/test-api-surfaces.js

# Security verification
node scripts/test-security.js
```

#### Step 4.2: Configure Webhooks
1. **Clerk Webhooks**:
   ```bash
   # Verify webhook configuration
   node scripts/verify-clerk-webhooks.js
   ```
   - Endpoint: `https://yourdomain.com/api/webhooks/clerk`
   - Events: user.created, user.updated, user.deleted

2. **Stripe Webhooks**:
   - Endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Events: checkout.session.completed, customer.subscription.*

#### Step 4.3: Test Critical Flows
```bash
# Test anonymous user flow
node scripts/test-anonymous-flow.js

# Test authentication flow
node scripts/verify-clerk-setup.js

# Test summarization pipeline
node scripts/test-pipeline.js
```

### Phase 5: Monitoring Setup

#### Step 5.1: Error Tracking (Sentry)
```bash
# Configure Sentry
export NEXT_PUBLIC_SENTRY_DSN="your-sentry-dsn"
export SENTRY_AUTH_TOKEN="your-auth-token"

# Deploy with source maps
pnpm build:prod
```

#### Step 5.2: Analytics (PostHog)
```bash
# Add PostHog keys
export NEXT_PUBLIC_POSTHOG_KEY="your-key"
export NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"
```

#### Step 5.3: Database Monitoring
```bash
# Monitor database performance
node scripts/monitor-db-performance.js
```

## 🚨 Troubleshooting Common Issues

### Issue 1: Backend URL Not Working
```bash
# Test backend connectivity
pnpm test:backend-url

# Check CORS configuration
curl -X OPTIONS https://your-backend.railway.app/api/health \
  -H "Origin: https://yourdomain.com"
```

### Issue 2: Database Connection Errors
```bash
# Validate database
node scripts/validate-database.js

# Check connection
node scripts/test-database-operations.js
```

### Issue 3: Webhook Failures
```bash
# Test webhook endpoints
curl -X POST https://yourdomain.com/api/webhooks/clerk \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## ⚡ Quick Deployment Commands

```bash
# Complete deployment sequence
pnpm env:validate           # Validate environment
pnpm build:prod             # Build production
pnpm verify:production      # Run all checks
railway up                  # Deploy backend
pnpm deploy                 # Deploy frontend
```

## 📝 Final Checklist

- [ ] All environment variables configured
- [ ] Database migrated and seeded
- [ ] Backend deployed and accessible
- [ ] Frontend deployed and running
- [ ] Webhooks configured and tested
- [ ] Authentication flow working
- [ ] Payment flow working
- [ ] Summarization pipeline tested
- [ ] Monitoring and analytics active
- [ ] SSL certificates valid
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Error tracking active

## 🎉 Post-Launch Tasks

1. **Monitor Performance**:
   - Check Vercel Analytics
   - Review Sentry errors
   - Monitor database queries

2. **User Feedback**:
   - Set up feedback collection
   - Monitor support channels
   - Track user metrics

3. **Optimization**:
   - Analyze bundle size: `pnpm build:analyze`
   - Optimize images: `node scripts/optimize-images.js`
   - Review API performance

## 📞 Support Resources

- **Vercel Support**: https://vercel.com/support
- **Railway Docs**: https://docs.railway.app
- **Neon Docs**: https://neon.tech/docs
- **Clerk Docs**: https://clerk.com/docs
- **Stripe Docs**: https://stripe.com/docs

---

## 🔥 Emergency Rollback

If something goes wrong:

```bash
# Rollback Vercel deployment
vercel rollback

# Rollback Railway deployment
railway down
railway up --rollback

# Restore database backup
# Use Neon's point-in-time recovery
```

Remember to test thoroughly in preview/staging before production deployment!