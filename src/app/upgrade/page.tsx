'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { api } from '@/components/providers/TRPCProvider'
import { useToast } from '@/components/providers/ToastProvider'

const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: [
      '3 video summaries total',
      'Basic AI summarization',
      'Personal library',
      'Standard support',
    ],
    current: false,
    available: false,
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: '$9.99',
    period: 'per month',
    features: [
      '25 video summaries per month',
      'Advanced AI summarization',
      'Personal library with search',
      'Export to PDF/Markdown',
      'Priority support',
      'Videos up to 2 hours',
    ],
    current: false,
    available: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: '$29.99',
    period: 'per month',
    features: [
      '100 video summaries per month',
      'Team workspaces',
      'Bulk channel processing',
      'API access',
      'Custom integrations',
      'Dedicated support',
      'Unlimited video length',
    ],
    current: false,
    available: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID,
  },
]

export default function UpgradePage() {
  const router = useRouter()
  const { userId, isLoaded, isSignedIn } = useAuth()
  const { showError } = useToast()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Get user's current plan
  const { data: userData } = api.auth.getCurrentUser.useQuery(undefined, {
    enabled: isSignedIn && isLoaded,
  })
  
  // Create checkout session mutation
  const createCheckout = api.billing.createCheckoutSession.useMutation({
    onSuccess: async (data) => {
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    },
    onError: (error) => {
      showError(error.message || 'Failed to start checkout process')
      setIsProcessing(false)
    },
  })
  
  const handleUpgrade = async (planId: string, priceId?: string) => {
    if (!isSignedIn) {
      showError('Please sign in to upgrade your plan')
      router.push('/sign-in?redirect=/upgrade')
      return
    }
    
    if (!priceId) {
      showError('This plan is not available for upgrade')
      return
    }
    
    setSelectedPlan(planId)
    setIsProcessing(true)
    
    try {
      await createCheckout.mutateAsync({ 
        priceId,
        successUrl: `${window.location.origin}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/upgrade`,
      })
    } catch (error) {
      // Error is handled in onError
      setSelectedPlan(null)
    }
  }
  
  // Update plans with current status
  const plansWithStatus = PLANS.map(plan => ({
    ...plan,
    current: userData?.plan === plan.id,
  }))
  
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Unlock more summaries and advanced features to accelerate your learning
          </p>
        </div>
        
        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {plansWithStatus.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-8 ${
                plan.current
                  ? 'bg-primary-50 border-2 border-primary-500'
                  : 'bg-white border border-gray-200 hover:shadow-lg transition-shadow'
              }`}
            >
              {/* Current Plan Badge */}
              {plan.current && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Current Plan
                  </span>
                </div>
              )}
              
              {/* Plan Header */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="ml-2 text-gray-600">/{plan.period}</span>
                </div>
              </div>
              
              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              
              {/* Action Button */}
              <button
                onClick={() => handleUpgrade(plan.id, plan.priceId)}
                disabled={
                  plan.current ||
                  !plan.available ||
                  isProcessing ||
                  !isSignedIn
                }
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  plan.current
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : !plan.available
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isProcessing && selectedPlan === plan.id
                    ? 'bg-primary-600 text-white cursor-wait'
                    : 'bg-primary-500 text-white hover:bg-primary-600'
                }`}
              >
                {plan.current ? (
                  'Current Plan'
                ) : !plan.available ? (
                  'Not Available'
                ) : isProcessing && selectedPlan === plan.id ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Processing...
                  </span>
                ) : (
                  'Upgrade'
                )}
              </button>
            </div>
          ))}
        </div>
        
        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-800">
              <strong>Secure Payment:</strong> Your payment is processed securely through Stripe. 
              You can cancel or change your subscription at any time from your billing settings.
            </p>
          </div>
        </div>
        
        {/* Back Link */}
        <div className="text-center mt-8">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 underline"
          >
            Back to previous page
          </button>
        </div>
      </div>
    </div>
  )
}