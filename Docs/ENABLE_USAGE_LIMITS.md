# Enabling Usage Limits in Production

Currently, usage limits are disabled for testing. Here's how to re-enable them for production:

## 1. Update User Model Default Limits

In `prisma/schema.prisma`, the current limits are:
- Free tier: 5 summaries
- Pro tier: Unlimited (set high limit)
- Enterprise: Unlimited

To change limits:

```prisma
model User {
  // ...
  summariesLimit         Int       @default(5) // Change this for free tier
}
```

## 2. Enable Limit Checking

In `server/api/routers/summary.ts`, find the create endpoint and uncomment/add:

```typescript
// Check usage limits
if (ctx.session.user.summariesUsed >= ctx.session.user.summariesLimit) {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'You have reached your monthly summary limit. Please upgrade your plan.',
  })
}
```

## 3. Set Plan-Based Limits

In `server/api/routers/billing.ts`, when updating subscriptions:

```typescript
// Set limits based on plan
const limits = {
  FREE: 5,
  PRO: 100,      // Or unlimited
  ENTERPRISE: 1000  // Or unlimited
}
```

## 4. Reset Monthly Usage

Create a cron job or scheduled function to reset usage monthly:

```typescript
// Reset all users' summariesUsed to 0 on the 1st of each month
await prisma.user.updateMany({
  data: {
    summariesUsed: 0
  }
})
```

## 5. Display Limits in UI

The library page already shows usage. Make sure it's visible:
- Current: X/Y summaries used
- Warning when approaching limit
- Clear upgrade CTA when at limit

## 6. Grace Period (Optional)

Consider allowing 1-2 summaries over limit with warnings:

```typescript
const GRACE_SUMMARIES = 2
if (user.summariesUsed >= user.summariesLimit + GRACE_SUMMARIES) {
  // Hard block
} else if (user.summariesUsed >= user.summariesLimit) {
  // Allow but show strong warning
}
```

## Implementation Checklist

- [ ] Update default limits in schema
- [ ] Run database migration
- [ ] Enable limit checking in summary creation
- [ ] Test with different plan types
- [ ] Set up monthly reset (Vercel cron or similar)
- [ ] Update UI to show limits clearly
- [ ] Test upgrade flow when limit reached

## Testing

1. Set a test user to have used 4/5 summaries
2. Create one more (should work with warning)
3. Try to create another (should be blocked)
4. Upgrade plan (should unlock)
5. Verify monthly reset works

Remember: Be generous with limits initially to encourage usage!