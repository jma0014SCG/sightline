// Simple pricing configuration without Stripe imports

export const PRICING_PLANS = {
  FREE: {
    name: 'Free',
    description: 'Try before you buy',
    price: 0,
    paymentLink: null,
    features: [
      '3 summaries ever',
    ],
  },
  PRO: {
    name: 'Pro',
    description: 'Most popular for individuals',
    price: 9.99,
    paymentLink: 'https://buy.stripe.com/14A6oG8pd5Zf6L3cuk0ZW00',
    features: [
      '25 summaries/month',
      'Personal library access',
      'Markdown exports',
    ],
  },
  COMPLETE: {
    name: 'Complete',
    description: 'For power users',
    price: 24.99,
    paymentLink: null, // Disabled for "coming soon"
    features: [
      'Summarize entire channels in minutes',
      'Comprehensive strategy breakdowns and timelines',
      'Unlimited summaries',
      'Personal library access',
      'Markdown export',
    ],
  },
} as const

export type PricingPlan = keyof typeof PRICING_PLANS

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(price)
}