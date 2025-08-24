# Stripe Production Setup Guide

## Overview
Complete guide for setting up Stripe payments for Sightline.ai production deployment.

## Prerequisites
- Stripe account (sign up at stripe.com)
- Business verification completed
- Bank account connected for payouts
- Production domain configured

## Step 1: Activate Production Mode

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Toggle from **Test mode** to **Live mode** (top right)
3. Complete business verification if not done

## Step 2: Create Products and Pricing

### Create Pro Plan
1. Navigate to **Products**
2. Click **+ Add product**
3. Configure:
   - Name: "Sightline Pro"
   - Description: "25 summaries per month with advanced features"
   - Pricing:
     - Model: Recurring
     - Amount: $9.99/month (or your pricing)
     - Billing period: Monthly
     - Currency: USD
4. Save and copy the Price ID (format: `price_...`)
5. Save as `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`

### Create Enterprise Plan
1. Add another product
2. Configure:
   - Name: "Sightline Enterprise"
   - Description: "Unlimited summaries with priority support"
   - Pricing:
     - Model: Recurring
     - Amount: $29.99/month (or your pricing)
     - Billing period: Monthly
     - Currency: USD
3. Save and copy the Price ID
4. Save as `NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID`

## Step 3: Configure Webhook

### Create Webhook Endpoint
1. Navigate to **Developers** > **Webhooks**
2. Click **Add endpoint**
3. Configure:
   - Endpoint URL: `https://YOUR_DOMAIN.com/api/webhooks/stripe`
   - Events to listen for:
     - ✅ checkout.session.completed
     - ✅ customer.subscription.created
     - ✅ customer.subscription.updated
     - ✅ customer.subscription.deleted
     - ✅ invoice.payment_succeeded
     - ✅ invoice.payment_failed

### Get Webhook Secret
1. After creating, click on the webhook
2. Click **Reveal** under Signing secret
3. Copy the secret (format: `whsec_...`)
4. Save as `STRIPE_WEBHOOK_SECRET`

## Step 4: Get API Keys

Navigate to **Developers** > **API keys**:

1. **Secret Key**:
   - Click **Reveal live key**
   - Copy (format: `sk_live_...`)
   - Save as `STRIPE_SECRET_KEY`

2. **Publishable Key**:
   - Copy (format: `pk_live_...`)
   - Save as `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

## Step 5: Configure Checkout Settings

Navigate to **Settings** > **Checkout and Payment Links**:

1. **Checkout Page**:
   - Enable "Allow customers to adjust quantity" ❌
   - Enable "Collect billing address" ✅
   - Enable "Collect shipping address" ❌

2. **Customer Portal**:
   - Navigate to **Settings** > **Customer portal**
   - Configure:
     - ✅ Allow customers to update payment methods
     - ✅ Allow customers to update billing address
     - ✅ Allow customers to cancel subscriptions
     - ✅ Allow customers to view invoices
     - ❌ Allow customers to switch plans (handle in app)

## Step 6: Configure Payment Methods

Navigate to **Settings** > **Payment methods**:

1. Enable payment methods:
   - ✅ Card payments
   - ✅ Google Pay
   - ✅ Apple Pay
   - ✅ Link (Stripe's payment method)

2. Configure card settings:
   - ✅ Accept all major cards
   - ✅ Enable 3D Secure when required

## Step 7: Configure Tax Settings (Important!)

Navigate to **Settings** > **Tax**:

1. **Stripe Tax** (Recommended):
   - Enable Stripe Tax for automatic tax calculation
   - Configure tax registrations for your jurisdictions

2. **Manual Tax** (Alternative):
   - Set up tax rates for each region you operate in

## Step 8: Configure Email Receipts

Navigate to **Settings** > **Emails**:

1. **Customer emails**:
   - ✅ Successful payments
   - ✅ Failed payments
   - ✅ Refunds

2. **Customize email template**:
   - Add your logo
   - Customize colors to match brand
   - Add support contact information

## Step 9: Security Settings

Navigate to **Settings** > **Security**:

1. **Radar (Fraud Prevention)**:
   - Enable Radar for fraud protection
   - Use recommended rules or customize

2. **3D Secure**:
   - Set to "Recommended" for automatic 3D Secure

## Step 10: Test Configuration

### Test Checkout Flow
1. Create a test checkout session
2. Use test card: 4242 4242 4242 4242
3. Verify:
   - Checkout completes
   - Webhook fires
   - Database updates
   - User gets access

### Test Subscription Management
1. Access customer portal
2. Test updating payment method
3. Test canceling subscription
4. Verify database reflects changes

## Step 11: Production Readiness Checklist

### Business Requirements
- [ ] Business verified in Stripe
- [ ] Bank account connected
- [ ] Tax settings configured
- [ ] Terms of service URL added
- [ ] Privacy policy URL added

### Technical Configuration
- [ ] Products and prices created
- [ ] API keys in production environment
- [ ] Webhook endpoint deployed
- [ ] Webhook secret configured
- [ ] Payment methods enabled
- [ ] Customer portal configured

### Testing
- [ ] Checkout flow works end-to-end
- [ ] Webhooks process correctly
- [ ] Subscription updates work
- [ ] Cancellation works
- [ ] Customer portal accessible
- [ ] Email receipts sent

## Environment Variables Summary

```env
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID=price_...
```

## Webhook Processing Code Reference

Your webhook should handle these events:

```typescript
// api/webhooks/stripe/route.ts
switch (event.type) {
  case 'checkout.session.completed':
    // Create subscription record
    // Update user plan
    // Send welcome email
    
  case 'customer.subscription.updated':
    // Update subscription status
    // Handle plan changes
    
  case 'customer.subscription.deleted':
    // Mark subscription as canceled
    // Update user to free plan
    // Send cancellation email
    
  case 'invoice.payment_failed':
    // Send payment failed email
    // Maybe restrict access after X failures
}
```

## Monitoring and Analytics

### Key Metrics to Track
- Monthly Recurring Revenue (MRR)
- Churn rate
- Failed payment rate
- Conversion rate (free to paid)
- Average Revenue Per User (ARPU)

### Stripe Dashboard Monitoring
- Check **Home** for overview metrics
- Review **Payments** for transaction history
- Monitor **Radar** for blocked payments
- Check **Webhooks** for delivery failures

## Common Issues and Solutions

### Webhook Not Receiving Events
1. Verify endpoint URL is correct and HTTPS
2. Check webhook secret matches exactly
3. Ensure endpoint is publicly accessible
4. Review Stripe webhook attempt logs

### 3D Secure Failing
1. Ensure 3D Secure is enabled
2. Check if card issuer requires authentication
3. Verify return_url is set in checkout session

### Subscription Not Updating
1. Check webhook processing logs
2. Verify customer.subscription.* events are subscribed
3. Ensure database transaction completes

### Tax Calculation Issues
1. Verify tax settings are configured
2. Ensure customer address is collected
3. Check tax registration status

## Support Resources

- Stripe Documentation: https://stripe.com/docs
- API Reference: https://stripe.com/docs/api
- Support: https://support.stripe.com
- Status: https://status.stripe.com

## Security Best Practices

1. **Never log sensitive data** (full card numbers, CVV)
2. **Always verify webhook signatures**
3. **Use HTTPS for all endpoints**
4. **Implement idempotency keys** for critical operations
5. **Store minimum customer data** (let Stripe handle PCI compliance)
6. **Regular review** of Radar rules and blocked payments
7. **Monitor for unusual patterns** in payment activity