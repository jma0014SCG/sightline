'use client'

import { Check, Zap, Users, Crown } from 'lucide-react'
import { PRICING_PLANS, formatPrice, type PricingPlan } from '@/lib/pricing'
import { cn } from '@/lib/utils'

interface PricingPlansProps {
  currentPlan?: PricingPlan
  showCurrentPlan?: boolean
}

export function PricingPlans({ currentPlan, showCurrentPlan = true }: PricingPlansProps) {
  const handleSelectPlan = (paymentLink: string | null) => {
    if (paymentLink) {
      window.open(paymentLink, '_blank')
    }
  }

  const getPlanIcon = (planKey: string) => {
    switch (planKey) {
      case 'FREE':
        return <Zap className="h-8 w-8" />
      case 'PRO':
        return <Crown className="h-8 w-8" />
      case 'COMPLETE':
        return <Users className="h-8 w-8" />
      default:
        return <Zap className="h-8 w-8" />
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-base font-semibold leading-7 text-primary-600">Pricing</h2>
        <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Choose the right plan for you
        </p>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          Start free, then add a site plan to go live. Account plans unlock additional features.
        </p>
      </div>

      <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8 xl:gap-x-12">
        {Object.entries(PRICING_PLANS).map(([planKey, plan]) => {
          const isCurrentPlan = currentPlan === planKey
          const isPopular = planKey === 'PRO'
          const isFree = planKey === 'FREE'

          return (
            <div
              key={planKey}
              className={cn(
                'flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 ring-gray-200 xl:p-10',
                isPopular && 'lg:z-10 lg:rounded-3xl lg:ring-2 lg:ring-primary-600'
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-x-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-lg',
                      planKey === 'FREE' && 'bg-gray-100 text-gray-600',
                      planKey === 'PRO' && 'bg-primary-100 text-primary-600',
                      planKey === 'COMPLETE' && 'bg-purple-100 text-purple-600'
                    )}>
                      {getPlanIcon(planKey)}
                    </div>
                    <h3
                      id={planKey}
                      className={cn(
                        'text-lg font-semibold leading-8',
                        isPopular ? 'text-primary-600' : 'text-gray-900'
                      )}
                    >
                      {plan.name}
                    </h3>
                  </div>
                  {isPopular && (
                    <p className="rounded-full bg-primary-600/10 px-2.5 py-1 text-xs font-semibold leading-5 text-primary-600">
                      Most popular
                    </p>
                  )}
                </div>

                <p className="mt-4 text-sm leading-6 text-gray-600">{plan.description}</p>

                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-gray-900">
                    {formatPrice(plan.price)}
                  </span>
                  {!isFree && (
                    <span className="text-sm font-semibold leading-6 text-gray-600">/month</span>
                  )}
                </p>

                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-primary-600" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                {showCurrentPlan && isCurrentPlan ? (
                  <div className="flex items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-600">
                    Current plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleSelectPlan(plan.paymentLink)}
                    disabled={!isFree}
                    className={cn(
                      'mt-10 block w-full rounded-md px-3 py-2 text-center text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                      isFree
                        ? 'bg-primary-600 text-white shadow-sm hover:bg-primary-500 focus-visible:outline-primary-600'
                        : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    )}
                  >
                    {isFree ? (
                      'Get started'
                    ) : (
                      'Coming soon'
                    )}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}