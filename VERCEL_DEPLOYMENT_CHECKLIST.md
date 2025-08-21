# Vercel Production Deployment Checklist

## 🔐 Environment Variables for Vercel

Copy these exact values to Vercel Dashboard → Settings → Environment Variables:

### Core Variables (REQUIRED)
```bash
DATABASE_URL=postgresql://neondb_owner:npg_XsFhlf67yAHS@ep-plain-king-aec6xvqs-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Clerk Authentication (REQUIRED)
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_cG9zaXRpdmUtd2FydGhvZy01Mi5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_vs5Zp3LwpoH7g1DJvsi5QP2SbrtBWZYbOTUJXvmeKs
CLERK_WEBHOOK_SECRET=whsec_PaeT8jLMDpdjKfSszvYfMJYrmpv1+Kqk
```

### Stripe Payments (REQUIRED)
```bash
STRIPE_SECRET_KEY=sk_test_51QvIZPCy13fiBRAHTogRm4oTEpgT4MtNxDyU6e6WG88xuLmwZ1xovtIZYP0IeVZ21g4qevF3DNbLxpRWi4UE48jq00lW9AjEH2
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51QvIZPCy13fiBRAHDj5Y5pL5TbanirimJLwpDcF2fbuh30VdOvFWSUYJPc8HEsm7rg29PeRgjUN8ePa3afDO4SV700Rcl74peq
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_1RnjYKCy13fiBRAHpaHORqNS
STRIPE_WEBHOOK_SECRET=[GET FROM STRIPE DASHBOARD - PRODUCTION ENDPOINT]
```

### AI Services (REQUIRED)
```bash
OPENAI_API_KEY=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
```

### Analytics & Monitoring (RECOMMENDED)
```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_EgtUjw9REtsX23jzQ1CIBTsOrIugQHadTka52KCa3Nu
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_SENTRY_DSN=https://bb465c822a831ab57b8aa21bf3221455@o4509767726465024.ingest.us.sentry.io/4509767749271552
```

### Transcript Services (OPTIONAL)
```bash
GUMLOOP_API_KEY=b29a51e34c8d475b9a936d9dbc078d24
OXYLABS_USERNAME=sightlineai_Sh2z6
OXYLABS_PASSWORD=Y1q48uCXoMEW_C
```

### Feature Flags
```bash
NEXT_PUBLIC_IMPROVED_SUMMARY_LAYOUT=true
```

## 📋 Pre-Deployment Steps

### 1. Local Build Test
```bash
# Clean install and build
rm -rf node_modules .next
pnpm install
pnpm build
pnpm start  # Test production build locally
```

### 2. Code Quality Checks
```bash
pnpm lint:fix
pnpm typecheck
pnpm format
```

### 3. Git Preparation
```bash
git add .
git commit -m "deploy: production deployment with Phase 8 optimizations"
git push origin main
```

## 🚀 Deployment Steps

### Option 1: Vercel CLI
```bash
# If not linked yet
vercel link

# Deploy to production
vercel --prod
```

### Option 2: GitHub Integration
Simply push to main branch if Vercel is connected to your GitHub repo

### Option 3: Manual via Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click "Deploy"

## ✅ Post-Deployment Verification

### Immediate Tests (First 5 minutes)
- [ ] **Site Access**: https://your-app.vercel.app loads
- [ ] **Console Check**: No errors in browser console
- [ ] **Auth Flow**: Sign up with test email
- [ ] **Anonymous Summary**: Create summary without login
- [ ] **Authenticated Summary**: Create summary after login
- [ ] **Payment Test**: Use Stripe test card `4242 4242 4242 4242`

### API Endpoints
- [ ] `https://your-app.vercel.app/api/health` returns 200
- [ ] `https://your-app.vercel.app/api/webhooks/clerk` returns 405 (GET not allowed)
- [ ] `https://your-app.vercel.app/api/webhooks/stripe` returns 405 (GET not allowed)

### Webhook Configuration

#### Clerk Dashboard
1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Navigate to Webhooks → Endpoints
3. Add endpoint: `https://your-app.vercel.app/api/webhooks/clerk`
4. Enable events:
   - user.created
   - user.updated
   - user.deleted
5. Verify signing secret matches: `whsec_PaeT8jLMDpdjKfSszvYfMJYrmpv1+Kqk`

#### Stripe Dashboard
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to Webhooks
3. Add endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
4. Enable events:
   - checkout.session.completed
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
5. Copy the signing secret to `STRIPE_WEBHOOK_SECRET` in Vercel

## 📊 Monitoring (First 24 Hours)

### Vercel Dashboard
- [ ] Check Functions tab for errors
- [ ] Monitor response times
- [ ] Check bandwidth usage

### External Services
- [ ] **Clerk**: Check webhook logs for failures
- [ ] **Stripe**: Monitor payment events
- [ ] **Neon**: Check database metrics
- [ ] **PostHog**: Verify events are being tracked
- [ ] **Sentry**: Check for any errors

### Performance Metrics
Expected values after optimization:
- Database queries: <100ms
- API response: <200ms
- Page load: <3s on 3G
- Throughput: >70 req/s

## 🔄 Rollback Plan

### Quick Rollback
```bash
vercel rollback
```

### Via Dashboard
1. Go to Vercel Dashboard → Deployments
2. Find last stable deployment
3. Click "..." → "Promote to Production"

## 🐛 Troubleshooting

### Common Issues & Solutions

**Build Fails**
- Check Node version compatibility
- Verify all dependencies in package.json
- Check for TypeScript errors

**Database Connection Issues**
```bash
# Verify connection string includes SSL
?sslmode=require
```

**Webhook Failures**
- No trailing slashes in URLs
- Exact secret match (no extra spaces)
- Endpoints must be publicly accessible

**Environment Variable Issues**
- No quotes around values in Vercel
- No trailing spaces
- All required variables set

## 📝 Final Checklist

### Before Going Live
- [ ] All environment variables added to Vercel
- [ ] Webhooks configured in Clerk and Stripe
- [ ] Database indexes verified (already applied)
- [ ] Usage limits working (already implemented)
- [ ] Caching layer active (already implemented)
- [ ] Python API deployed and healthy
- [ ] Custom domain configured (if applicable)

### After Going Live
- [ ] Share the URL with team
- [ ] Monitor for first 100 users
- [ ] Set up alerts for errors
- [ ] Plan for scaling if needed

## 🎉 Launch Commands

```bash
# One-line deployment
pnpm lint:fix && pnpm typecheck && pnpm build && vercel --prod

# Or use package.json script
pnpm deploy:prod
```

---

**Note**: Replace `your-app.vercel.app` with your actual Vercel domain throughout this document.

**Important**: The STRIPE_WEBHOOK_SECRET needs to be obtained from Stripe Dashboard after creating the production webhook endpoint.

Good luck with your launch! 🚀