# 🔐 OAuth Authentication Fix Guide

**Issue**: "The OAuth client was not found. Error 401: invalid_client"
**Root Cause**: Configuration mismatch between Clerk test instance and custom domain

## 🚨 Problem Analysis

### Configuration Mismatch
- **Clerk Instance**: `positive-warthog-52.clerk.accounts.dev` (test environment)
- **Custom Domain**: `clerk.sightlineai.io` (production domain)
- **OAuth Providers**: Configured for test domain, not custom domain
- **Result**: OAuth providers can't find the client configuration

## ✅ Solution Applied

### Immediate Fix: Use Default Clerk Domain
1. **Commented out** `NEXT_PUBLIC_CLERK_FRONTEND_API` in environment files
2. This allows Clerk to use its default domain: `positive-warthog-52.clerk.accounts.dev`
3. OAuth providers will now find the correct client configuration

## 🔧 Required Actions in Vercel Dashboard

### Step 1: Remove Custom Domain Variable
1. Go to [Vercel Dashboard](https://vercel.com/jma0014-gmailcoms-projects/sightline-ai/settings/environment-variables)
2. Find `NEXT_PUBLIC_CLERK_FRONTEND_API`
3. **Delete** or **comment out** this variable
4. Click "Save"

### Step 2: Redeploy Application
```bash
vercel --prod --force
```

Or trigger redeployment from Vercel dashboard.

## 🎯 Long-term Solution (Production)

### Option 1: Continue with Test Instance
- Keep using `positive-warthog-52.clerk.accounts.dev`
- No custom domain needed
- OAuth will work immediately

### Option 2: Proper Production Setup
1. **Create Production Clerk Instance**
   - Go to [Clerk Dashboard](https://dashboard.clerk.com)
   - Create new production application
   - Get production keys (will start with `pk_live_`)

2. **Configure OAuth Providers**
   - Add Google OAuth with correct redirect URLs
   - Configure for your domain: `sightlineai.io`

3. **Update Environment Variables**
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
   CLERK_SECRET_KEY="sk_live_..."
   ```

4. **Set up Custom Domain** (if desired)
   - Configure `clerk.sightlineai.io` in Clerk dashboard
   - Add CNAME record in DNS
   - Wait for propagation

## 📝 OAuth Provider Configuration

### Google OAuth Setup (in Google Cloud Console)
**Authorized redirect URIs**:
- For test: `https://positive-warthog-52.clerk.accounts.dev/v1/oauth_callback`
- For production: `https://sightlineai.io/api/auth/callback`

### GitHub OAuth Setup (if used)
**Authorization callback URL**:
- For test: `https://positive-warthog-52.clerk.accounts.dev/v1/oauth_callback`
- For production: `https://sightlineai.io/api/auth/callback`

## ✨ Verification Steps

1. **Clear browser cache and cookies**
2. **Visit**: https://sightline-az2umghwi-jma0014-gmailcoms-projects.vercel.app
3. **Click** "Sign Up" or "Sign In"
4. **Try** Google OAuth
5. **Should** redirect to Google and back successfully

## 🔍 Troubleshooting

If OAuth still fails:
1. **Check browser console** for errors
2. **Verify** environment variables in Vercel
3. **Ensure** OAuth providers are enabled in Clerk dashboard
4. **Check** redirect URLs match exactly

## 📞 Support Resources
- [Clerk Support](https://clerk.com/support)
- [Clerk OAuth Documentation](https://clerk.com/docs/authentication/social-connections/oauth)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)

---
*Fix applied: Removed custom domain configuration to use default Clerk test domain*