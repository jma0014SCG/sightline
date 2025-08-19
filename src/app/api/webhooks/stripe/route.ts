import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe, getPlanByPriceId } from '@/lib/stripe'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

// Disable body parsing for this endpoint
export const runtime = 'nodejs'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = headers().get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      logger.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    logger.info('Processing Stripe webhook:', { eventType: event.type })

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription' && session.customer) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )
          
          await handleSubscriptionChange(subscription)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionChange(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCanceled(subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        
        if ((invoice as any).subscription && typeof (invoice as any).subscription === 'string') {
          const subscription = await stripe.subscriptions.retrieve(
            (invoice as any).subscription as string
          )
          await handleSubscriptionChange(subscription)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        logger.warn('Payment failed for invoice:', { invoiceId: invoice.id })
        // You could send an email notification here
        break
      }

      default:
        logger.debug(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const subscriptionId = subscription.id
  
  // Get the user by Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  })

  if (!user) {
    logger.error('User not found for Stripe customer:', customerId)
    return
  }

  // Get the price ID from the subscription
  const priceId = subscription.items.data[0]?.price.id
  if (!priceId) {
    logger.error('No price ID found in subscription:', subscriptionId)
    return
  }

  // Determine the plan from the price ID
  const plan = getPlanByPriceId(priceId)
  if (!plan) {
    logger.error('Unknown price ID:', priceId)
    return
  }

  // Update user with subscription information
  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: plan,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      // Reset usage limits based on new plan
      summariesLimit: plan === 'FREE' ? 3 : (plan === 'PRO' ? 25 : -1), // FREE: 3 ever, PRO: 25/month, others unlimited
    },
  })

  logger.info(`Updated user ${user.id} to ${plan} plan`)
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  
  // Get the user by Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  })

  if (!user) {
    logger.error('User not found for Stripe customer:', customerId)
    return
  }

  // Downgrade user to free plan
  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: 'FREE',
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
      summariesLimit: 3, // Free tier limit - 3 summaries ever
    },
  })

  logger.info(`Downgraded user ${user.id} to FREE plan`)
}