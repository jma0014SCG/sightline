# 🔐 Clerk Production Setup Guide for Sightline.ai

**Generated**: 2025-08-25  
**Status**: Production-Ready Architecture Design  
**Deployment Target**: Vercel (Frontend) + Railway (Backend API)

## 📊 Current Architecture Analysis

### Integration Points
1. **Authentication Layer**: ClerkProvider in `src/app/layout.tsx`
2. **Middleware**: Combined auth + rate limiting + CORS in `src/middleware.ts`
3. **Webhook Handler**: User sync at `/api/webhooks/clerk`
4. **Database Sync**: Prisma User model synchronized with Clerk
5. **Security**: Webhook replay protection via Upstash Redis

### Key Components
- **Frontend Auth**: Modal-based flow with anonymous user support
- **Session Management**: 7-day lifetime, 30-minute inactivity timeout
- **User Sync**: Real-time database synchronization via webhooks
- **Rate Limiting**: Integrated middleware protection
- **CORS**: API route protection with domain validation

## 🚀 Production Setup Steps

### Step 1: Clerk Dashboard Configuration

#### 1.1 Create Production Instance
```
1. Go to https://dashboard.clerk.com
2. Create new application: "Sightline Production"
3. Select production environment
```

#### 1.2 Configure Domains
```
Primary Domain: sightlineai.io
Allowed Domains:
  - sightlineai.io
  - *.sightlineai.io
  - sightline-*.vercel.app (for preview deployments)
```

#### 1.3 Authentication Methods
```yaml
Email:
  - Required: true
  - Verification: Email link
  - Password: Optional

OAuth Providers:
  Google:
    - Enabled: true
    - Scopes: email, profile
  GitHub:
    - Enabled: true (optional)
    - Scopes: user:email
  
Sign-in Methods:
  - Email + Password
  - Email Magic Link
  - OAuth (Google, GitHub)
```

### Step 2: Production URLs Configuration

```yaml
# Application URLs
Sign-in URL: /sign-in
Sign-up URL: /sign-up
After sign-in URL: /library
After sign-up URL: /library
Home URL: /

# OAuth Redirect URLs
Production:
  - https://sightlineai.io/sign-in
  - https://sightlineai.io/sign-up
  - https://sightlineai.io/api/auth/callback

Preview Deployments:
  - https://sightline-*.vercel.app/sign-in
  - https://sightline-*.vercel.app/sign-up
  - https://sightline-*.vercel.app/api/auth/callback
```

### Step 3: Webhook Configuration

#### 3.1 Create Webhook Endpoint
```yaml
Endpoint URL: https://sightlineai.io/api/webhooks/clerk
Events:
  - user.created
  - user.updated
  - user.deleted
  - session.created (optional for analytics)
  - session.ended (optional for analytics)
```

#### 3.2 Webhook Security Setup
```javascript
// Existing implementation includes:
- Svix signature verification
- Replay attack prevention (5-minute window)
- Timestamp validation
- Redis-based event tracking
- Exponential backoff for retries
```

### Step 4: Environment Variables

#### 4.1 Production Environment (.env.production)
```bash
# Clerk Production Keys
CLERK_SECRET_KEY="sk_live_..." # From Clerk Dashboard
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..." # From Clerk Dashboard
CLERK_WEBHOOK_SECRET="whsec_..." # From Webhook Settings

# Additional Security
CLERK_JWT_KEY="..." # For JWT verification (optional)
CLERK_API_VERSION="v1" # API version lock

# Session Configuration
CLERK_SESSION_LIFETIME="604800" # 7 days in seconds
CLERK_INACTIVITY_TIMEOUT="1800" # 30 minutes in seconds
```

#### 4.2 Vercel Environment Variables
```bash
# Set via Vercel Dashboard or CLI
vercel env add CLERK_SECRET_KEY production
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
vercel env add CLERK_WEBHOOK_SECRET production
```

### Step 5: Security Hardening

#### 5.1 Attack Protection
```yaml
Bot Protection:
  - Enable: true
  - Challenge Type: Invisible CAPTCHA
  - Threshold: Medium

Rate Limiting:
  - Sign-in attempts: 5 per minute
  - Sign-up attempts: 3 per minute
  - Password reset: 3 per hour
  - API calls: 100 per minute

Session Security:
  - Multi-factor: Optional
  - Device tracking: Enabled
  - Concurrent sessions: 5 max
```

#### 5.2 Content Security Policy
```javascript
// Add to middleware.ts for production
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.sightlineai.io;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://img.clerk.com;
  font-src 'self';
  connect-src 'self' https://clerk.sightlineai.io https://api.clerk.com;
`;
```

### Step 6: Middleware Configuration

#### 6.1 Update Middleware for Production
```typescript
// src/middleware.ts - Production configuration
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health(.*)",
  "/api/webhooks(.*)",
  "/share/(.*)",
]);

const isApiRoute = createRouteMatcher([
  "/api/(.*)",
  "/trpc/(.*)",
]);

export default clerkMiddleware((auth, req) => {
  // Protect all routes except public ones
  if (!isPublicRoute(req)) {
    auth().protect();
  }
  
  // Add security headers for API routes
  if (isApiRoute(req)) {
    // Rate limiting and CORS are already handled
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

### Step 7: Database Synchronization

#### 7.1 Enhanced User Sync
```typescript
// Enhance webhook handler for production
export async function POST(req: Request) {
  // Existing validation...
  
  // Add production logging
  if (process.env.NODE_ENV === 'production') {
    console.log(`[Clerk Webhook] Processing ${eventType} for user ${id}`);
  }
  
  // Add metrics tracking
  await trackWebhookMetrics(eventType, id);
  
  // Existing user sync logic...
}
```

### Step 8: Monitoring & Observability

#### 8.1 Key Metrics to Track
```yaml
Authentication Metrics:
  - Sign-up conversion rate
  - Sign-in success rate
  - OAuth vs Email ratio
  - Session duration
  - Active users (DAU/MAU)

Security Metrics:
  - Failed sign-in attempts
  - Webhook replay blocks
  - Rate limit hits
  - Suspicious activity

Performance Metrics:
  - Webhook processing time
  - Database sync latency
  - Auth middleware overhead
```

#### 8.2 Monitoring Setup
```javascript
// Add to monitoring service
const clerkMetrics = {
  signUpRate: "clerk.signup.success",
  signInRate: "clerk.signin.success",
  webhookLatency: "clerk.webhook.latency",
  userSyncErrors: "clerk.sync.errors",
};
```

### Step 9: Testing Production Setup

#### 9.1 Pre-Launch Checklist
- [ ] All environment variables set in Vercel
- [ ] Webhook endpoint accessible from Clerk
- [ ] OAuth redirect URLs configured correctly
- [ ] Rate limiting tested and calibrated
- [ ] Session timeout working as expected
- [ ] User sync to database verified
- [ ] Anonymous user flow functional
- [ ] Security headers in place
- [ ] CSP policy not blocking Clerk resources
- [ ] Monitoring dashboards configured

#### 9.2 Test Scenarios
```bash
# Test webhook connectivity
curl -X POST https://sightlineai.io/api/webhooks/clerk \
  -H "Content-Type: application/json" \
  -H "svix-id: test" \
  -H "svix-timestamp: $(date +%s)000" \
  -H "svix-signature: test"

# Test authentication flow
1. Sign up with email
2. Sign in with Google OAuth
3. Verify session persistence
4. Test sign out
5. Test anonymous user limits
```

### Step 10: Rollback Plan

#### 10.1 Quick Rollback Steps
```bash
# If issues arise:
1. Revert to previous Clerk keys in Vercel
2. Disable webhook endpoint temporarily
3. Switch to development instance if critical
4. Review logs for root cause
```

#### 10.2 Emergency Contacts
```yaml
Support Channels:
  - Clerk Support: support@clerk.com
  - Clerk Status: https://status.clerk.com
  - Vercel Support: Via dashboard
  - Internal: Team escalation chain
```

## 🔄 Migration Strategy

### Phase 1: Staging Deployment (Day 1)
1. Deploy to Vercel preview with production Clerk test keys
2. Test all authentication flows
3. Verify webhook processing
4. Check rate limiting and security

### Phase 2: Gradual Rollout (Day 2-3)
1. Deploy to production with 10% traffic
2. Monitor metrics and error rates
3. Gradually increase to 100% over 48 hours
4. Keep development instance as fallback

### Phase 3: Full Production (Day 4+)
1. Switch all traffic to production Clerk
2. Archive development instance
3. Update documentation
4. Team training on new setup

## 📈 Performance Optimizations

### Caching Strategy
```typescript
// Implement user session caching
const sessionCache = new Map();
const SESSION_CACHE_TTL = 300000; // 5 minutes

// Cache Clerk user objects
const userCache = new LRUCache({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
});
```

### Edge Runtime Optimization
```typescript
// Use Edge runtime for auth routes
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
```

## 🚨 Common Issues & Solutions

### Issue 1: Webhook Timeouts
**Solution**: Implement async processing with queue
```typescript
// Add to webhook handler
await addToQueue('user-sync', userData);
return new Response('Accepted', { status: 202 });
```

### Issue 2: OAuth Redirect Loops
**Solution**: Verify exact URL matches in Clerk dashboard

### Issue 3: Session Not Persisting
**Solution**: Check SameSite cookie settings and domain configuration

### Issue 4: Rate Limiting Too Aggressive
**Solution**: Adjust thresholds based on actual usage patterns

## 📝 Final Notes

- Keep Clerk SDK updated for security patches
- Review Clerk changelog monthly for new features
- Maintain separate development instance for testing
- Document any custom modifications to standard flow
- Regular security audits of webhook implementation

## 🔗 Resources

- [Clerk Production Checklist](https://clerk.com/docs/deployments/checklist)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Webhook Security Best Practices](https://clerk.com/docs/webhooks/overview)