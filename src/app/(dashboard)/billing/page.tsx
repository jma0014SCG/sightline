'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Settings,
  Loader2 
} from 'lucide-react'
import { PricingPlans } from '@/components/organisms/PricingPlans'
import { api } from '@/lib/api/trpc'
import { formatPrice } from '@/lib/pricing'
import { cn } from '@/lib/utils'

function BillingPageContent() {
  const searchParams = useSearchParams()
  const [showAlert, setShowAlert] = useState(false)
  const [alertType, setAlertType] = useState<'success' | 'error'>('success')
  const [alertMessage, setAlertMessage] = useState('')

  // Check for success/cancel params from Stripe
  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')

    if (success) {
      setAlertType('success')
      setAlertMessage('Payment successful! Your subscription is now active.')
      setShowAlert(true)
    } else if (canceled) {
      setAlertType('error')
      setAlertMessage('Payment was canceled. You can try again anytime.')
      setShowAlert(true)
    }
  }, [searchParams])

  const { data: subscription, isLoading: subscriptionLoading } = api.billing.getSubscription.useQuery()
  const { data: usage, isLoading: usageLoading } = api.billing.getUsageStats.useQuery()

  const createPortalSession = api.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url
      }
    },
    onError: (error) => {
      console.error('Portal error:', error)
      setAlertType('error')
      setAlertMessage('Failed to open billing portal. Please try again.')
      setShowAlert(true)
    },
  })

  const handleManageBilling = () => {
    createPortalSession.mutate({
      returnUrl: window.location.href,
    })
  }

  if (subscriptionLoading || usageLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const hasActiveSubscription = subscription?.isSubscriptionActive
  const currentPlan = subscription?.plan as any

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="mt-2 text-gray-600">Manage your subscription and billing information</p>
      </div>

      {/* Alert */}
      {showAlert && (
        <div className={cn(
          "flex items-center gap-3 rounded-lg border p-4",
          alertType === 'success' 
            ? "border-green-200 bg-green-50 text-green-800"
            : "border-red-200 bg-red-50 text-red-800"
        )}>
          {alertType === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span className="text-sm">{alertMessage}</span>
          <button
            onClick={() => setShowAlert(false)}
            className="ml-auto text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Current Plan Status */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
            <div className="mt-2 flex items-center gap-4">
              <span className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
                currentPlan === 'FREE' && "bg-gray-100 text-gray-700",
                currentPlan === 'PRO' && "bg-primary-100 text-primary-700",
                currentPlan === 'ENTERPRISE' && "bg-purple-100 text-purple-700"
              )}>
                {subscription?.planConfig?.name || currentPlan}
              </span>
              {hasActiveSubscription && subscription?.stripeCurrentPeriodEnd && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  Renews {new Date(subscription.stripeCurrentPeriodEnd).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          
          {hasActiveSubscription && (
            <button
              onClick={handleManageBilling}
              disabled={createPortalSession.isPending}
              className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {createPortalSession.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Settings className="h-4 w-4" />
              )}
              Manage Billing
            </button>
          )}
        </div>

        {/* Plan Price */}
        {subscription?.planConfig && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {formatPrice(subscription.planConfig.price)}
              </span>
              {subscription.planConfig.price > 0 && (
                <span className="text-sm text-gray-500">per month</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Usage Statistics */}
      {usage && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Usage Statistics</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Current Month Usage */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">This Month</p>
                <p className="text-lg font-semibold text-gray-900">
                  {usage.currentMonthUsage}
                  {usage.monthlyLimit > 0 && (
                    <span className="text-sm font-normal text-gray-500">
                      {' '}/ {usage.monthlyLimit}
                    </span>
                  )}
                  {' '}summaries
                </p>
              </div>
            </div>

            {/* Total Usage */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Created</p>
                <p className="text-lg font-semibold text-gray-900">{usage.totalSummaries} summaries</p>
              </div>
            </div>

            {/* Limit Status */}
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                usage.isLimitReached ? "bg-red-100" : "bg-gray-100"
              )}>
                <CreditCard className={cn(
                  "h-5 w-5",
                  usage.isLimitReached ? "text-red-600" : "text-gray-600"
                )} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className={cn(
                  "text-lg font-semibold",
                  usage.isLimitReached ? "text-red-600" : "text-green-600"
                )}>
                  {usage.isLimitReached ? 'Limit Reached' : 'Active'}
                </p>
              </div>
            </div>
          </div>

          {/* Usage Warning */}
          {usage.isLimitReached && (
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <p className="text-sm font-medium text-amber-800">
                  Monthly limit reached
                </p>
              </div>
              <p className="mt-1 text-sm text-amber-700">
                You&apos;ve reached your monthly summary limit. Upgrade to Pro for unlimited summaries.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pricing Plans */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {hasActiveSubscription ? 'Change Your Plan' : 'Upgrade Your Plan'}
          </h2>
          <p className="mt-2 text-gray-600">
            {hasActiveSubscription 
              ? 'Switch to a different plan that better fits your needs'
              : 'Get more summaries and unlock premium features'
            }
          </p>
        </div>
        <PricingPlans currentPlan={currentPlan} />
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    }>
      <BillingPageContent />
    </Suspense>
  )
}