// Simple pricing configuration without Stripe imports

export const PRICING_PLANS = {
  FREE: {
    name: 'Free',
    description: 'Perfect for getting started',
    price: 0,
    paymentLink: null,
    features: [
      '1 summary/month',
      'Personal library access',
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
  ENTERPRISE: {
    name: 'Enterprise',
    description: 'For power users and teams',
    price: 29.99,
    paymentLink: null, // Will be added when ready
    features: [
      '100 summaries/month',
      'Summarize entire channels',
      'Team collaboration',
      'Personal library access',
      'Markdown exports',
      'Priority support',
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