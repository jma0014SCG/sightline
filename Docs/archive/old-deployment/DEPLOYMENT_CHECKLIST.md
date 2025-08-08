# 🚀 Production Deployment Checklist

**Date**: ___________  
**Deployment Engineer**: ___________  
**Production URL**: https://___________

---

## 📋 Pre-Deployment Checklist

### 1. Production Database Setup
- [ ] Create new Neon project at https://console.neon.tech
- [ ] Copy production database URL: `postgresql://___________`
- [ ] Save database credentials securely
- [ ] Test connection locally:
  ```bash
  export DATABASE_URL="your-production-url"
  npx prisma db push
  ```

### 2. Generate Production Secrets
- [ ] Generate NEXTAUTH_SECRET:
  ```bash
  openssl rand -base64 32
  ```
  Result: ___________
  
- [ ] Save all secrets in password manager

### 3. Stripe Production Setup
- [ ] Switch to live mode in Stripe Dashboard
- [ ] Copy production keys:
  - Secret Key (sk_live_...): ___________
  - Publishable Key (pk_live_...): ___________
- [ ] Note: Webhook secret will be generated after deployment

### 4. Production Environment Variables

Copy this template and fill in your values:

```env
# Core Configuration
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-generated-secret-here

# Database
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Stripe (Production Keys)
STRIPE_SECRET_KEY=sk_live_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-key

# Optional but Recommended
YOUTUBE_API_KEY=your-youtube-api-key
GUMLOOP_API_KEY=your-gumloop-key
```

---

## 🛠️ Deployment Steps

### Step 1: Install Vercel CLI
```bash
pnpm i -g vercel
```
- [ ] Vercel CLI installed
- [ ] Logged in: `vercel login`

### Step 2: Link Project
```bash
cd /Users/jeffaxelrod/Documents/Sightline
vercel link
```
- [ ] Project linked to Vercel
- [ ] Project name noted: ___________

### Step 3: Set Environment Variables
```bash
# Set each variable one by one
vercel env add NEXTAUTH_URL production
vercel env add NEXTAUTH_SECRET production
vercel env add DATABASE_URL production
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_SECRET production
vercel env add OPENAI_API_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production

# Optional variables
vercel env add YOUTUBE_API_KEY production
vercel env add GUMLOOP_API_KEY production
```
- [ ] All required variables set
- [ ] Verified in Vercel dashboard

### Step 4: Deploy to Production
```bash
vercel --prod
```
- [ ] Deployment successful
- [ ] Production URL noted: https://___________
- [ ] No build errors

---

## 🔧 Post-Deployment Configuration

### 1. Google OAuth Setup
- [ ] Go to https://console.cloud.google.com
- [ ] Select your project
- [ ] APIs & Services → Credentials
- [ ] Add authorized redirect URI:
  ```
  https://your-domain.com/api/auth/callback/google
  ```
- [ ] Add authorized JavaScript origins:
  ```
  https://your-domain.com
  ```
- [ ] Save changes

### 2. Stripe Webhook Configuration
- [ ] Go to https://dashboard.stripe.com/webhooks
- [ ] Add endpoint:
  ```
  https://your-domain.com/api/webhooks/stripe
  ```
- [ ] Select events:
  - [x] customer.subscription.created
  - [x] customer.subscription.updated
  - [x] customer.subscription.deleted
  - [x] invoice.payment_succeeded
  - [x] invoice.payment_failed
- [ ] Copy webhook signing secret: whsec___________
- [ ] Update in Vercel:
  ```bash
  vercel env add STRIPE_WEBHOOK_SECRET production
  ```
- [ ] Redeploy to apply: `vercel --prod`

### 3. Domain Configuration (if custom domain)
- [ ] Add domain in Vercel dashboard
- [ ] Update DNS records as instructed
- [ ] Wait for SSL certificate (automatic)
- [ ] Update NEXTAUTH_URL to custom domain
- [ ] Redeploy with new URL

---

## ✅ Production Testing Checklist

### Authentication Flow
- [ ] Sign up with Google
- [ ] Sign in/out works
- [ ] Protected routes redirect properly
- [ ] Session persists on refresh

### Core Features
- [ ] Submit YouTube URL for summarization
- [ ] Summary generates correctly
- [ ] All content sections display properly
- [ ] Library page loads summaries
- [ ] Search and filters work
- [ ] Delete summary works

### Sharing System
- [ ] Create share link
- [ ] Access shared link (incognito)
- [ ] Toggle public/private
- [ ] View count increments

### Payment System
- [ ] Pricing page displays
- [ ] Checkout flow works (use test card)
- [ ] Subscription created in Stripe
- [ ] Billing page shows subscription

### Performance & Security
- [ ] Pages load quickly
- [ ] No console errors
- [ ] HTTPS working
- [ ] Rate limiting active (test with multiple requests)

---

## 🚨 Launch Day Monitoring

### First Hour
- [ ] Monitor Vercel logs for errors
- [ ] Check database connections
- [ ] Verify API keys working
- [ ] Test user registration

### First Day
- [ ] Monitor error rates
- [ ] Check API usage (OpenAI, YouTube)
- [ ] Review user feedback
- [ ] Check payment processing

### First Week
- [ ] Analyze usage patterns
- [ ] Review performance metrics
- [ ] Gather user feedback
- [ ] Plan improvements

---

## 📞 Emergency Contacts

### Critical Issues
- **Vercel Status**: https://vercel-status.com
- **Neon Status**: https://status.neon.tech
- **Stripe Status**: https://status.stripe.com

### Rollback Plan
If critical issues arise:
1. Revert to previous deployment in Vercel
2. Investigate issues in development
3. Fix and redeploy

---

## 🎉 Launch Checklist Complete!

- [ ] All items checked
- [ ] Team notified
- [ ] Monitoring active
- [ ] Ready for users!

**Deployment completed at**: ___________