// Simple pricing configuration without Stripe imports

export const PRICING_PLANS = {
  FREE: {
    name: 'Free',
    description: 'Try before you buy',
    price: 0,
    paymentLink: null,
    features: [
      '3-day trial',
      '20 videos library size',
      'Markdown export',
      'Standard processing',
    ],
  },
  PRO: {
    name: 'Pro',
    description: 'Most popular for individuals',
    price: 9.99,
    paymentLink: 'https://buy.stripe.com/14A6oG8pd5Zf6L3cuk0ZW00',
    features: [
      '25 summaries / day',
      '500 videos library size',
      'Markdown + Notion & Slack export',
      'Standard priority queue',
    ],
  },
  COMPLETE: {
    name: 'Complete',
    description: 'For power users',
    price: 24.99,
    paymentLink: 'https://buy.stripe.com/8x28wOaxl1IZ5GZ0LC0ZW01',
    features: [
      'Unlimited daily summaries',
      'Unlimited library size',
      'All export options + PDF & PowerPoint',
      '⚡ Blazing-fast priority queue',
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