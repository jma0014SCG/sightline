import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { syncUserPlan } from '@/lib/stripe/planSync'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import type { Plan } from '@prisma/client'

// Disable body parsing for webhook
export const runtime = 'nodejs'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Map Stripe price IDs to plans
function getPlanFromPriceId(priceId: string): Plan {
  const priceMap: Record<string, Plan> = {
    [process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!]: 'PRO',
    [process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID!]: 'ENTERPRISE',
  }
  
  return priceMap[priceId] || 'FREE'
}

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

    logger.info(`Processing Stripe webhook: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription' && session.customer && session.subscription) {
          // Get the subscription details
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )
          
          // Get user by customer ID
          const user = await prisma.user.findUnique({
            where: { stripeCustomerId: session.customer as string },
          })
          
          if (!user) {
            // Try to find user by email and update customer ID
            const email = session.customer_email
            if (email) {
              const userByEmail = await prisma.user.findUnique({
                where: { email },
              })
              
              if (userByEmail) {
                await prisma.user.update({
                  where: { id: userByEmail.id },
                  data: { stripeCustomerId: session.customer as string },
                })
                
                // Now process the subscription
                await handleSubscriptionChange(
                  userByEmail.id,
                  subscription,
                  session.customer as string
                )
              } else {
                logger.error('User not found for email:', email)
              }
            }
          } else {
            await handleSubscriptionChange(
              user.id,
              subscription,
              session.customer as string
            )
          }
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        // Get user by customer ID
        const user = await prisma.user.findUnique({
          where: { stripeCustomerId: subscription.customer as string },
        })
        
        if (user) {
          await handleSubscriptionChange(
            user.id,
            subscription,
            subscription.customer as string
          )
        } else {
          logger.error('User not found for customer:', subscription.customer)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        // Get user by customer ID
        const user = await prisma.user.findUnique({
          where: { stripeCustomerId: subscription.customer as string },
        })
        
        if (user) {
          await handleSubscriptionCanceled(user.id)
        } else {
          logger.error('User not found for customer:', subscription.customer)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        
        // Reset monthly usage on successful payment
        if (invoice.subscription && typeof invoice.subscription === 'string') {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription
          )
          
          const user = await prisma.user.findUnique({
            where: { stripeCustomerId: subscription.customer as string },
          })
          
          if (user && user.plan !== 'FREE') {
            // This is a renewal - could reset monthly counters here if needed
            logger.info(`Payment succeeded for user ${user.id}, plan ${user.plan}`)
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        logger.warn('Payment failed for invoice:', invoice.id)
        
        // Could send email notification or mark account as at-risk
        break
      }

      default:
        logger.debug(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionChange(
  userId: string,
  subscription: Stripe.Subscription,
  customerId: string
) {
  try {
    // Get the price ID from the subscription
    const priceId = subscription.items.data[0]?.price.id
    if (!priceId) {
      logger.error('No price ID found in subscription:', subscription.id)
      return
    }

    // Determine the plan from the price ID
    const plan = getPlanFromPriceId(priceId)
    
    // Sync the plan across Clerk and Prisma
    await syncUserPlan(
      userId,
      plan,
      customerId,
      subscription.id
    )
    
    // Update additional subscription metadata in Prisma
    await prisma.user.update({
      where: { id: userId },
      data: {
        stripePriceId: priceId,
        stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    })
    
    logger.info(`Successfully updated user ${userId} to ${plan} plan`)
  } catch (error) {
    logger.error(`Failed to handle subscription change for user ${userId}:`, error)
    throw error
  }
}

async function handleSubscriptionCanceled(userId: string) {
  try {
    // Downgrade to free plan
    await syncUserPlan(userId, 'FREE', undefined, undefined)
    
    // Clear subscription data
    await prisma.user.update({
      where: { id: userId },
      data: {
        stripePriceId: null,
        stripeCurrentPeriodEnd: null,
      },
    })
    
    logger.info(`Successfully downgraded user ${userId} to FREE plan`)
  } catch (error) {
    logger.error(`Failed to cancel subscription for user ${userId}:`, error)
    throw error
  }
}