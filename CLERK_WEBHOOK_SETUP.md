
# Clerk Webhook Setup Instructions

## Development Environment

1. **Get Webhook Secret from Clerk**
   - Go to: https://dashboard.clerk.com/
   - Navigate to: Webhooks → Endpoints
   - Click "Add Endpoint"
   - URL: http://localhost:3000/api/webhooks/clerk
   - Enable events: user.created, user.updated, user.deleted
   - Copy the Signing Secret

2. **Add to .env.local**
   ```
   CLERK_WEBHOOK_SECRET=whsec_[your_secret_here]
   ```

3. **Test locally**
   ```bash
   node scripts/verify-clerk-webhooks.js
   ```

## Production Environment (Vercel)

1. **Add Production Endpoint in Clerk**
   - URL: https://your-app.vercel.app/api/webhooks/clerk
   - Same events as development
   - Copy the Production Signing Secret

2. **Add to Vercel Environment Variables**
   - Go to: Vercel Dashboard → Project Settings
   - Environment Variables → Add
   - Name: CLERK_WEBHOOK_SECRET
   - Value: whsec_[production_secret]
   - Environment: Production

3. **Redeploy**
   - Trigger a new deployment for env vars to take effect

## Verification

Run this after setup:
```bash
node scripts/verify-clerk-webhooks.js
```

Expected output:
- ✅ Webhook endpoint exists
- ✅ CLERK_WEBHOOK_SECRET configured
- ✅ Webhook processed successfully
