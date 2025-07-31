import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
}

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
  typescript: true,
})

// Pricing plans configuration
export const PRICING_PLANS = {
  FREE: {
    name: 'Free',
    description: 'Perfect for trying out Sightline',
    price: 0,
    priceId: null,
    features: [
      'Up to 5 video summaries per month',
      'Basic AI summarization',
      'Personal library',
      'Standard support',
    ],
    limitations: {
      summariesPerMonth: 5,
      videoDurationLimit: 1200, // 20 minutes
    },
  },
  PRO: {
    name: 'Pro',
    description: 'For individuals who consume lots of content',
    price: 9.99,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      'Unlimited video summaries',
      'Advanced AI summarization',
      'Personal library with search',
      'Export to PDF/Markdown',
      'Priority support',
      'Videos up to 2 hours',
    ],
    limitations: {
      summariesPerMonth: -1, // Unlimited
      videoDurationLimit: 7200, // 2 hours
    },
  },
  ENTERPRISE: {
    name: 'Enterprise',
    description: 'For teams and organizations',
    price: 29.99,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    features: [
      'Everything in Pro',
      'Team workspaces',
      'Bulk channel processing',
      'API access',
      'Custom integrations',
      'Dedicated support',
      'Unlimited video length',
    ],
    limitations: {
      summariesPerMonth: -1, // Unlimited
      videoDurationLimit: -1, // Unlimited
    },
  },
} as const

export type PricingPlan = keyof typeof PRICING_PLANS

// Helper functions
export function getPlanByPriceId(priceId: string): PricingPlan | null {
  for (const [planKey, plan] of Object.entries(PRICING_PLANS)) {
    if (plan.priceId === priceId) {
      return planKey as PricingPlan
    }
  }
  return null
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(price)
}

export function isUserOnPlan(userPlan: string, requiredPlan: PricingPlan): boolean {
  const planHierarchy = ['FREE', 'PRO', 'ENTERPRISE']
  const userPlanIndex = planHierarchy.indexOf(userPlan)
  const requiredPlanIndex = planHierarchy.indexOf(requiredPlan)
  
  return userPlanIndex >= requiredPlanIndex
}