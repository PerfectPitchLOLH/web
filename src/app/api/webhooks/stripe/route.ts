import { NextRequest } from 'next/server'
import Stripe from 'stripe'

import { creditPurchaseService } from '@/server/domains/credit-purchase'
import {
  subscriptionRepository,
  subscriptionService,
} from '@/server/domains/subscription'
import { STRIPE_WEBHOOK_EVENTS } from '@/server/domains/subscription/subscription.constants'
import { db } from '@/server/lib/database'
import { stripe, STRIPE_CONFIG } from '@/server/lib/stripe'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import {
  createErrorResponse,
  createSuccessResponse,
} from '@/server/shared/utils/api.utils'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return createErrorResponse(
      'VALIDATION_ERROR',
      'Signature Stripe manquante',
      undefined,
      HTTP_STATUS.BAD_REQUEST,
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_CONFIG.webhookSecret,
    )
  } catch (err) {
    const error = err as Error
    return createErrorResponse(
      'VALIDATION_ERROR',
      `Webhook Error: ${error.message}`,
      undefined,
      HTTP_STATUS.BAD_REQUEST,
    )
  }

  const existingEvent = await subscriptionRepository.findWebhookEventByStripeId(
    event.id,
  )

  if (existingEvent?.processed) {
    console.log(`[Webhook] Event ${event.id} already processed, skipping`)
    return createSuccessResponse({ received: true, skipped: true })
  }

  if (!existingEvent) {
    try {
      await subscriptionRepository.createWebhookEvent({
        stripeEventId: event.id,
        eventType: event.type,
        payload: event as any,
        processed: false,
        processedAt: null,
        error: null,
        retryCount: 0,
      })
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(
          `[Webhook] Event ${event.id} already created by another request, continuing`,
        )
      } else {
        throw error
      }
    }
  }

  try {
    await db.$transaction(async () => {
      switch (event.type) {
        case STRIPE_WEBHOOK_EVENTS.CUSTOMER_SUBSCRIPTION_CREATED: {
          const subscription = event.data.object as Stripe.Subscription
          await subscriptionService.handleSubscriptionCreated(subscription.id)
          break
        }

        case STRIPE_WEBHOOK_EVENTS.CUSTOMER_SUBSCRIPTION_UPDATED: {
          const subscription = event.data.object as Stripe.Subscription
          await subscriptionService.handleSubscriptionUpdated(subscription.id)
          break
        }

        case STRIPE_WEBHOOK_EVENTS.CUSTOMER_SUBSCRIPTION_DELETED: {
          const subscription = event.data.object as Stripe.Subscription
          await subscriptionService.handleSubscriptionDeleted(subscription.id)
          break
        }

        case STRIPE_WEBHOOK_EVENTS.INVOICE_PAYMENT_SUCCEEDED: {
          const invoice = event.data.object as Stripe.Invoice
          await subscriptionService.handleInvoicePaymentSucceeded(invoice.id)
          break
        }

        case STRIPE_WEBHOOK_EVENTS.INVOICE_PAYMENT_FAILED: {
          const invoice = event.data.object as Stripe.Invoice
          await subscriptionService.handleInvoicePaymentFailed(invoice.id)
          break
        }

        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session

          if (session.metadata?.bundleId && session.metadata?.userId) {
            await creditPurchaseService.processCheckoutSuccess(session.id)
          }
          break
        }

        case 'checkout.session.expired': {
          const session = event.data.object as Stripe.Checkout.Session

          if (session.metadata?.bundleId) {
            await creditPurchaseService.handleCheckoutExpired(session.id)
          }
          break
        }

        default:
          console.log(`Unhandled event type: ${event.type}`)
      }
    })

    await subscriptionRepository.markWebhookEventProcessed(event.id)

    return createSuccessResponse({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)

    await subscriptionRepository.markWebhookEventProcessed(
      event.id,
      error instanceof Error ? error.message : 'Unknown error',
    )

    return createErrorResponse(
      'INTERNAL_ERROR',
      'Erreur lors du traitement du webhook',
      undefined,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    )
  }
}
