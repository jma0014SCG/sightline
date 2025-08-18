# Clerk Production Setup Guide

## Overview
This guide covers the complete setup of Clerk authentication for Sightline.ai production deployment.

## Prerequisites
- Clerk account (sign up at clerk.com)
- Production domain configured
- Access to deploy webhooks

## Step 1: Create Production Instance

1. Log in to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create new application or switch to production instance
3. Set application name: "Sightline Production"

## Step 2: Configure Authentication Methods

### Enable Sign-in Methods
1. Navigate to **User & Authentication** > **Email, Phone, Username**
2. Configure:
   - ✅ Email address (required)
   - ✅ Google OAuth
   - ✅ GitHub OAuth (optional)
   - ❌ Phone number (not used)

### OAuth Configuration

#### Google OAuth
1. Go to **User & Authentication** > **Social connections**
2. Enable Google
3. Configure redirect URLs:
   ```
   https://YOUR_DOMAIN.com/sign-in
   https://YOUR_DOMAIN.com/sign-up
   https://YOUR_DOMAIN.com/library
   ```

#### GitHub OAuth (Optional)
1. Enable GitHub in social connections
2. Add same redirect URLs as above

## Step 3: Configure URLs

Navigate to **Paths** and configure:

```
Sign-in URL: /sign-in
Sign-up URL: /sign-up
After sign-in URL: /library
After sign-up URL: /library
```

## Step 4: Webhook Configuration

### Create Webhook Endpoint
1. Navigate to **Webhooks**
2. Add endpoint:
   - URL: `https://YOUR_DOMAIN.com/api/webhooks/clerk`
   - Events to subscribe:
     - ✅ user.created
     - ✅ user.updated
     - ✅ user.deleted

### Get Webhook Secret
1. After creating webhook, click on it
2. Copy the **Signing Secret** (starts with `whsec_`)
3. Save as `CLERK_WEBHOOK_SECRET` in environment

## Step 5: Get API Keys

Navigate to **API Keys**:

1. **Secret Key** (Backend):
   - Copy the secret key (starts with `sk_live_`)
   - Save as `CLERK_SECRET_KEY`

2. **Publishable Key** (Frontend):
   - Copy the publishable key (starts with `pk_live_`)
   - Save as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

## Step 6: Session Configuration

Navigate to **Sessions**:

1. Set session lifetime: 7 days
2. Enable "Refresh token rotation"
3. Set inactivity timeout: 30 minutes

## Step 7: Security Settings

Navigate to **Security**:

1. **Allowed Domains**:
   ```
   YOUR_DOMAIN.com
   *.YOUR_DOMAIN.com
   ```

2. **Attack Protection**:
   - ✅ Enable bot protection
   - ✅ Enable rate limiting
   - Set rate limit: 10 attempts per minute

## Step 8: User Management

### Configure User Profiles
1. Navigate to **User & Authentication** > **Profile**
2. Set required fields:
   - Email (required, cannot change)
   - Name (optional)
   - Image URL (optional)

### Configure Roles (if needed)
1. Navigate to **Roles**
2. Default roles are sufficient for Sightline

## Step 9: Test Configuration

### Test Webhook
1. In Clerk Dashboard, go to webhook settings
2. Send test event (user.created)
3. Verify your endpoint receives it

### Test Authentication Flow
1. Try sign up with email
2. Try sign in with Google OAuth
3. Verify user appears in Clerk Dashboard
4. Verify user syncs to your database

## Step 10: Production Checklist

Before going live:

- [ ] All API keys are in production environment
- [ ] Webhook endpoint is deployed and accessible
- [ ] Webhook secret is configured
- [ ] OAuth redirect URLs match production domain
- [ ] Rate limiting is enabled
- [ ] Bot protection is enabled
- [ ] Session settings are configured
- [ ] Test user can sign up and sign in
- [ ] Webhook creates user in database
- [ ] User sync works correctly

## Environment Variables Summary

```env
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
```

## Troubleshooting

### Webhook Not Receiving Events
1. Check webhook URL is correct
2. Verify endpoint is publicly accessible
3. Check webhook secret matches
4. Review Clerk webhook logs

### Users Not Syncing to Database
1. Verify webhook is configured for user.created
2. Check DATABASE_URL is correct
3. Review application logs for errors
4. Ensure Prisma schema is migrated

### OAuth Not Working
1. Verify redirect URLs match exactly
2. Check OAuth app credentials
3. Ensure domains are whitelisted
4. Review browser console for errors

## Monitoring

### Key Metrics to Track
- Sign-up rate
- Sign-in success rate
- OAuth vs email ratio
- Webhook delivery success
- Session duration

### Clerk Dashboard Monitoring
- Check **Analytics** for usage patterns
- Review **Logs** for errors
- Monitor **Webhooks** for failures

## Support

- Clerk Documentation: https://clerk.com/docs
- Support: support@clerk.com
- Status: https://status.clerk.com