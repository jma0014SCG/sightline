# 🚀 Sightline Deployment Quick Reference

## Quick Start

### One-Command Deployment
```bash
pnpm deploy:full
```

This runs the complete orchestrated deployment with all validations and checks.

## Deployment Commands

### 🎯 Core Deployment
| Command | Description |
|---------|-------------|
| `pnpm deploy:orchestrate` | Run full deployment orchestration |
| `pnpm deploy:prepare` | Pre-deployment preparation and validation |
| `pnpm deploy:database` | Database setup and migrations |
| `pnpm deploy:backend` | Deploy backend to Railway |
| `pnpm deploy:frontend` | Deploy frontend to Vercel |
| `pnpm deploy:verify` | Post-deployment verification |
| `pnpm deploy:rollback` | Emergency rollback |

### 🔍 Validation & Monitoring
| Command | Description |
|---------|-------------|
| `pnpm validate:env:prod` | Validate production environment variables |
| `pnpm verify:production` | Comprehensive production verification |
| `pnpm health:dashboard` | Real-time deployment health dashboard |
| `pnpm monitor:db` | Database performance monitoring |
| `pnpm test:backend-url` | Test backend connectivity |

### 🧪 Testing
| Command | Description |
|---------|-------------|
| `node scripts/test-anonymous-flow.js` | Test anonymous user flow |
| `node scripts/test-pipeline.js` | Test summarization pipeline |
| `node scripts/test-security.js` | Security verification |
| `node scripts/test-api-surfaces.js` | API surface testing |

## Environment Setup

### Required Environment Variables

Create `.env.production.local` with:

```env
# Database
DATABASE_URL=postgresql://...

# Backend
NEXT_PUBLIC_BACKEND_URL=https://sightline-api-production.up.railway.app

# Authentication (Clerk)
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# Payments (Stripe)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID=price_...

# AI Services
OPENAI_API_KEY=sk-...
YOUTUBE_API_KEY=...

# Application
NEXT_PUBLIC_APP_URL=https://sightlineai.io
```

## Step-by-Step Deployment

### 1️⃣ Preparation
```bash
# Validate environment
pnpm validate:env:prod

# Build and test
pnpm build:prod
pnpm typecheck
pnpm lint
```

### 2️⃣ Database Setup
```bash
# Generate and push schema
pnpm db:generate
pnpm db:push

# Verify database
node scripts/validate-database.js
```

### 3️⃣ Backend Deployment (Railway)
```bash
# Deploy backend
cd api && railway up

# Get deployment URL
railway status

# Test backend
curl https://your-backend.railway.app/api/health
```

### 4️⃣ Frontend Deployment (Vercel)
```bash
# Link project
pnpm vercel:link

# Deploy preview
pnpm deploy:preview

# Deploy production
pnpm deploy
```

### 5️⃣ Verification
```bash
# Run comprehensive verification
pnpm verify:production

# Monitor health
pnpm health:dashboard
```

## Monitoring Dashboard

### Real-Time Health Monitoring
```bash
pnpm health:dashboard
```

Shows:
- Service status (Frontend, Backend, Database)
- Response times
- System metrics
- Recent alerts
- Overall health score

## Emergency Procedures

### 🔴 Rollback
```bash
# Automated rollback
pnpm deploy:rollback

# Manual rollback
vercel rollback
cd api && railway down && railway up --rollback
```

### 🚨 Common Issues

#### Backend URL Not Working
```bash
pnpm test:backend-url
# Check CORS configuration in api/index.py
```

#### Database Connection Errors
```bash
node scripts/test-db.js
node scripts/validate-database.js
```

#### Webhook Failures
```bash
node scripts/verify-clerk-webhooks.js
# Check webhook secrets and endpoints
```

## GitHub Actions CI/CD

The repository includes automated deployment pipeline:

1. **Quality Checks** - Linting, type checking, security audit
2. **Test Suite** - Unit, integration, and API tests
3. **Build Analysis** - Bundle size and optimization checks
4. **Database Migration** - Automated schema updates
5. **Backend Deployment** - Railway deployment
6. **Frontend Deployment** - Vercel deployment
7. **Verification** - Post-deployment health checks
8. **Rollback** - Automatic rollback on failure

### Manual Trigger
Go to Actions → Production Deployment Pipeline → Run workflow

## Service URLs

| Service | Production URL |
|---------|---------------|
| Frontend | https://sightlineai.io |
| Backend API | https://sightline-api-production.up.railway.app |
| Health Check | https://sightline-api-production.up.railway.app/api/health |
| Database | Neon (PostgreSQL) |

## Support Resources

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Railway Dashboard](https://railway.app/dashboard)
- [Neon Dashboard](https://console.neon.tech)
- [Clerk Dashboard](https://dashboard.clerk.com)
- [Stripe Dashboard](https://dashboard.stripe.com)

## Quick Health Check

```bash
# All-in-one health check
curl -s https://sightlineai.io > /dev/null && echo "✅ Frontend OK" || echo "❌ Frontend Failed"
curl -s https://sightline-api-production.up.railway.app/api/health > /dev/null && echo "✅ Backend OK" || echo "❌ Backend Failed"
pnpm verify:production
```

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrated
- [ ] Backend deployed and accessible
- [ ] Frontend deployed and running
- [ ] Webhooks configured
- [ ] Authentication working
- [ ] Payment flow tested
- [ ] Summarization pipeline tested
- [ ] Monitoring active
- [ ] SSL certificates valid
- [ ] CORS configured
- [ ] Rate limiting enabled
- [ ] Error tracking active

---

For detailed deployment documentation, see [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md)