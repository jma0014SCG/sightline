import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
}

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
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
      '1 video summary per month',
      'Basic AI summarization',
      'Personal library',
      'Standard support',
    ],
    limitations: {
      summariesPerMonth: 1,
      videoDurationLimit: 1200, // 20 minutes
    },
  },
  PRO: {
    name: 'Pro',
    description: 'For individuals who consume lots of content',
    price: 9.99,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      '25 video summaries per month',
      'Advanced AI summarization',
      'Personal library with search',
      'Export to PDF/Markdown',
      'Priority support',
      'Videos up to 2 hours',
    ],
    limitations: {
      summariesPerMonth: 25,
      videoDurationLimit: 7200, // 2 hours
    },
  },
  ENTERPRISE: {
    name: 'Enterprise',
    description: 'For teams and organizations',
    price: 29.99,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    features: [
      '100 video summaries per month',
      'Team workspaces',
      'Bulk channel processing',
      'API access',
      'Custom integrations',
      'Dedicated support',
      'Unlimited video length',
    ],
    limitations: {
      summariesPerMonth: 100,
      videoDurationLimit: -1, // Unlimited
    },
  },
} as const

export type PricingPlan = keyof typeof PRICING_PLANS

/**
 * Get pricing plan by Stripe price ID
 * 
 * Maps Stripe price IDs back to internal pricing plan keys. Used to determine
 * which plan a user is subscribed to based on their Stripe subscription.
 * Returns null if the price ID doesn't match any known plan.
 * 
 * @param {string} priceId - The Stripe price ID to look up
 * @returns {PricingPlan | null} The corresponding plan key or null if not found
 * @example
 * ```typescript
 * const plan = getPlanByPriceId('price_1234567890')
 * if (plan === 'PRO') {
 *   // User has Pro plan
 * }
 * ```
 * 
 * @category Payments
 * @since 1.0.0
 */
export function getPlanByPriceId(priceId: string): PricingPlan | null {
  for (const [planKey, plan] of Object.entries(PRICING_PLANS)) {
    if (plan.priceId === priceId) {
      return planKey as PricingPlan
    }
  }
  return null
}

/**
 * Format price as USD currency string
 * 
 * Converts numeric price to properly formatted USD currency string using
 * Intl.NumberFormat. Used throughout the application for consistent price display.
 * 
 * @param {number} price - Price amount in dollars (not cents)
 * @returns {string} Formatted currency string (e.g., '$9.99')
 * @example
 * ```typescript
 * formatPrice(9.99)  // '$9.99'
 * formatPrice(0)     // '$0.00'
 * formatPrice(100)   // '$100.00'
 * ```
 * 
 * @category Payments
 * @since 1.0.0
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(price)
}

/**
 * Check if user's plan meets or exceeds required plan level
 * 
 * Compares user's current plan against a required plan using plan hierarchy.
 * Plans are ordered FREE < PRO < ENTERPRISE, so Pro users can access Free features,
 * Enterprise users can access Pro and Free features, etc.
 * 
 * @param {string} userPlan - The user's current plan
 * @param {PricingPlan} requiredPlan - The minimum required plan level
 * @returns {boolean} True if user's plan meets or exceeds required level
 * @example
 * ```typescript
 * isUserOnPlan('PRO', 'FREE')       // true (Pro user can access Free features)
 * isUserOnPlan('FREE', 'PRO')       // false (Free user cannot access Pro features)
 * isUserOnPlan('ENTERPRISE', 'PRO') // true (Enterprise user can access Pro features)
 * ```
 * 
 * @category Payments
 * @since 1.0.0
 */
export function isUserOnPlan(userPlan: string, requiredPlan: PricingPlan): boolean {
  const planHierarchy = ['FREE', 'PRO', 'ENTERPRISE']
  const userPlanIndex = planHierarchy.indexOf(userPlan)
  const requiredPlanIndex = planHierarchy.indexOf(requiredPlan)
  
  return userPlanIndex >= requiredPlanIndex
}