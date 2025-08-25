# 🚀 Clerk Production Deployment Checklist

**Status**: Ready for Deployment  
**Date**: 2025-08-25  
**Production Keys**: ✅ Configured

## 🔑 Your Production Keys Status

- ✅ **Publishable Key**: `pk_live_...aW8k` (Added to .env.production.local)
- ✅ **Secret Key**: `sk_live_...S9Nl` (Added to .env.production.local)
- ⚠️ **Webhook Secret**: Pending (Must get from Clerk Dashboard)

## 📋 Deployment Steps

### Step 1: Configure Clerk Dashboard ⚠️ REQUIRED

1. **Go to Clerk Dashboard**: https://dashboard.clerk.com
2. **Select/Create Production Instance**: "Sightline Production"
3. **Configure Domains**:
   ```
   Primary: sightlineai.io
   Add: *.vercel.app (for preview deployments)
   ```

4. **Create Webhook Endpoint**:
   - Navigate to: **Webhooks** → **Create Endpoint**
   - URL: `https://sightlineai.io/api/webhooks/clerk`
   - Events to subscribe:
     - ✅ user.created
     - ✅ user.updated  
     - ✅ user.deleted
   - **COPY THE SIGNING SECRET** (starts with `whsec_`)

5. **Configure OAuth** (if using):
   - Google OAuth redirect URLs:
     ```
     https://sightlineai.io/sign-in
     https://sightlineai.io/sign-up
     https://sightlineai.io/library
     ```

### Step 2: Add Keys to Vercel

**Option A: Using Script (Recommended)**
```bash
# Run the deployment script
./scripts/deploy-clerk-production.sh

# When prompted, add the webhook secret:
vercel env add CLERK_WEBHOOK_SECRET production
# Paste: whsec_[your-webhook-secret]
```

**Option B: Manual via Vercel Dashboard**
1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to: Settings → Environment Variables
4. Add each variable for `production` environment:
   - `CLERK_SECRET_KEY`: sk_live_qfXWjE94YzNu56qkjW2Xi37PtPGJql7zQgs39BS9Nl
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: pk_live_Y2xlcmsuc2lnaHRsaW5lYWkuaW8k
   - `CLERK_WEBHOOK_SECRET`: [webhook secret from Clerk Dashboard]

### Step 3: Deploy to Production

```bash
# Deploy to production
pnpm deploy

# Or deploy with specific commit
vercel --prod
```

### Step 4: Verify Deployment

#### 4.1 Test Authentication Flow
- [ ] Sign up with email works
- [ ] Sign in with email works
- [ ] Google OAuth works (if configured)
- [ ] Sign out works
- [ ] Session persists on refresh

#### 4.2 Test Webhook
```bash
# Check webhook logs in Clerk Dashboard
# Navigate to: Webhooks → Your Endpoint → Logs

# Test user creation:
1. Create a new user
2. Check database for user record
3. Verify webhook processed successfully
```

#### 4.3 Test Anonymous User Flow
- [ ] Anonymous user can create 1 summary
- [ ] Limit enforced after 1 summary
- [ ] Prompt to sign up appears

### Step 5: Monitor Production

#### Check These Metrics
1. **Clerk Dashboard**:
   - Active users
   - Sign-in success rate
   - Webhook delivery rate

2. **Vercel Dashboard**:
   - Function logs for `/api/webhooks/clerk`
   - Error rate
   - Response times

3. **Database**:
   - User sync success
   - No duplicate users
   - Subscription data intact

## ⚠️ Critical Reminders

1. **NEVER commit `.env.production.local` to git**
2. **Keep webhook secret secure** - it validates webhook authenticity
3. **Test in preview deployment first** if possible
4. **Have rollback plan ready** - keep old auth working temporarily

## 🔧 Troubleshooting

### Issue: Webhook not working
```bash
# Check webhook logs in Clerk Dashboard
# Verify URL is exactly: https://sightlineai.io/api/webhooks/clerk
# Ensure webhook secret matches in Vercel
```

### Issue: Users not syncing to database
```bash
# Check Vercel function logs
vercel logs --follow

# Verify DATABASE_URL is set in Vercel
vercel env pull
```

### Issue: OAuth redirect errors
```bash
# Verify redirect URLs in Clerk Dashboard match exactly
# Check browser console for errors
# Ensure domains are whitelisted
```

## ✅ Final Checklist

Before marking complete:

- [ ] Clerk Dashboard configured with production domain
- [ ] Webhook endpoint created and secret copied
- [ ] All 3 environment variables added to Vercel
- [ ] Deployed to production
- [ ] Authentication flow tested
- [ ] Webhook tested and working
- [ ] User sync to database verified
- [ ] Anonymous user limits working
- [ ] Monitoring configured
- [ ] Team notified of changes

## 📞 Support Contacts

- **Clerk Support**: https://clerk.com/support
- **Clerk Status**: https://status.clerk.com
- **Vercel Support**: Via dashboard
- **Internal Team**: [Your escalation process]

## 🎉 Success Criteria

Deployment is successful when:
1. Users can sign up/in without errors
2. Webhook processes all events successfully
3. Database sync works reliably
4. No authentication errors in logs
5. Performance metrics are acceptable (<200ms auth checks)

---

**Security Note**: After deployment, rotate these keys every 90 days for best security practices.