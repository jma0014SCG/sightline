# Stripe Upgrade Flow Implementation

## Overview
This implementation provides a smooth, non-breaking upgrade flow with Stripe Checkout that syncs plans between Clerk publicMetadata and Prisma database.

## Key Principles Followed

✅ **Don't force sign-up before value**: Auth prompts only on valuable actions
✅ **Server-side limits**: All enforcement happens server-side, client localStorage is UX only  
✅ **Reset localStorage after signup**: Clears counts to prevent nagging
✅ **Simple happy path**: Shows success directly, no unnecessary processing states

## Files Created/Modified

### New Files
1. **`src/lib/stripe/planSync.ts`** - Plan synchronization helpers
   - `syncUserPlan()` - Updates both Clerk and Prisma
   - `ensureStripeCustomer()` - Gets or creates Stripe customer

2. **`src/app/upgrade/page.tsx`** - Upgrade selection page
   - Clean pricing cards UI
   - Handles authentication state
   - Creates checkout session

3. **`src/app/upgrade/success/page.tsx`** - Post-payment success page
   - Brief processing animation (3s)
   - Clears localStorage counts
   - Shows what's included
   - Direct CTAs to start using

4. **`src/app/api/stripe/webhook/route.ts`** - Enhanced webhook handler
   - Syncs plans to both Clerk and Prisma
   - Handles all subscription events
   - Comprehensive error handling

5. **`.env.example.upgrade`** - Environment variables template

### Modified Files
1. **`src/server/api/routers/billing.ts`** - Added import for planSync

## Implementation Flow

### 1. User Upgrade Journey
```
Home Page → Hits Limit → Upgrade Page → Stripe Checkout → Success Page
    ↓           ↓            ↓              ↓               ↓
No Auth    Shows Modal   Select Plan   Secure Payment   Plan Active
Required   (not forced)                  (Stripe)      Clear localStorage
```

### 2. Plan Synchronization
```
Stripe Webhook → Update Prisma User.plan → Update Clerk publicMetadata.plan
      ↓                  ↓                           ↓
subscription.*      summariesLimit            Available client-side
   events         FREE: 3, PRO: 25          via useUser().publicMetadata
```

### 3. Usage Enforcement
- Server-side: Check User.plan and UsageEvent count
- Client-side: localStorage for UX hints only (can be cleared)

## Setup Instructions

### 1. Environment Variables
Add to your `.env` file:
```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID=price_...
```

### 2. Stripe Dashboard Setup

1. **Create Products**:
   - Pro Plan: $9.99/month
   - Enterprise Plan: $29.99/month

2. **Configure Webhook**:
   - Endpoint: `https://your-domain.com/api/stripe/webhook`
   - Events to listen:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

3. **Customer Portal** (optional):
   - Enable at: https://dashboard.stripe.com/settings/billing/portal
   - Allows users to manage subscriptions

### 3. Local Development

Use Stripe CLI for webhook testing:
```bash
# Install
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Use the webhook secret from CLI output
```

### 4. Testing

Test cards for Stripe test mode:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0027 6000 3184`

## Code Integration Points

### Check User Plan (Client-Side)
```typescript
import { useUser } from '@clerk/nextjs'

function Component() {
  const { user } = useUser()
  const plan = user?.publicMetadata?.plan || 'FREE'
  
  if (plan === 'PRO') {
    // Show pro features
  }
}
```

### Check User Plan (Server-Side)
```typescript
// In tRPC procedure or API route
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { plan: true, summariesLimit: true }
})

if (user.plan === 'FREE' && usageCount >= 3) {
  throw new Error('Upgrade required')
}
```

### Trigger Upgrade Flow
```typescript
// Don't force signup immediately
function handleAction() {
  if (!isSignedIn) {
    // Store intent, but let them explore first
    localStorage.setItem('pending_action', 'summarize')
    // Only prompt on valuable action
    if (isValuableAction) {
      openSignUp()
    }
  } else if (hasReachedLimit) {
    router.push('/upgrade')
  } else {
    // Proceed with action
  }
}
```

### Clear localStorage After Signup
```typescript
// In success handler or after subscription
if (typeof window !== 'undefined') {
  localStorage.removeItem('sl_free_used')
  localStorage.removeItem('hasUsedFreeSummary')
  localStorage.removeItem('freeSummaryUsedAt')
}
```

## UX Best Practices Implemented

1. **No Forced Signup**: Users can explore without immediate auth
2. **Clear Value Prop**: Show what they get before asking for payment
3. **Simple Flow**: Minimal steps from decision to activation
4. **Fast Activation**: 3-second processing, then immediate access
5. **No Nagging**: localStorage cleared after upgrade
6. **Security**: All limits enforced server-side

## Monitoring

Check these for issues:
1. Stripe Dashboard → Payments for successful transactions
2. Stripe Dashboard → Webhooks for delivery status
3. Application logs for sync failures
4. Clerk Dashboard for publicMetadata updates
5. Database for User.plan updates

## Rollback Plan

If issues occur:
1. Webhook failures: Stripe retries automatically
2. Sync failures: Manual sync via admin panel
3. Complete rollback: Remove webhook endpoint, plans remain in DB

## Future Enhancements

- [ ] Add usage dashboard showing summaries used/remaining
- [ ] Email notifications approaching limit
- [ ] Granular plan features (video length, export formats)
- [ ] Team plans with shared quotas
- [ ] Annual billing discount option