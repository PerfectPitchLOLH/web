import { NextRequest } from 'next/server'
import Stripe from 'stripe'

import { creditService } from '@/server/domains/credit'
import { subscriptionService } from '@/server/domains/subscription'
import { STRIPE_WEBHOOK_EVENTS } from '@/server/domains/subscription/subscription.constants'
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

  try {
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

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        if (paymentIntent.metadata.bundleId && paymentIntent.metadata.userId) {
          await creditService.purchaseBundle(
            paymentIntent.metadata.userId,
            paymentIntent.metadata.bundleId as any,
          )
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return createSuccessResponse({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      'Erreur lors du traitement du webhook',
      undefined,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    )
  }
}
