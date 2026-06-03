import type { CreditPurchaseService } from '@/server/domains/credit-purchase/credit-purchase.service'
import { stripe } from '@/server/lib/stripe'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import type { SubscriptionRepository } from '../subscription/subscription.repository'
import type {
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  PaymentIntentStatus,
} from './payment.types'

export class PaymentService {
  constructor(
    private subscriptionRepository: SubscriptionRepository,
    private creditPurchaseService?: CreditPurchaseService,
  ) {}

  async createPaymentIntent(
    userId: string,
    email: string,
    request: CreatePaymentIntentRequest,
  ): Promise<CreatePaymentIntentResponse> {
    if (!userId || !email) {
      throw new ApiError(
        'INTERNAL_ERROR',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'userId and email are required',
      )
    }

    let customer =
      await this.subscriptionRepository.findCustomerByUserId(userId)

    if (!customer) {
      const stripeCustomer = await stripe.customers.create({
        email,
        metadata: {
          userId,
        },
      })

      customer = await this.subscriptionRepository.createOrUpdateCustomer({
        userId,
        stripeCustomerId: stripeCustomer.id,
        email,
        name: null,
        defaultPaymentMethod: null,
      })
    }

    const sanitizedMetadata: Record<string, string> = {}
    if (request.metadata) {
      const {
        userId: _,
        stripeCustomerId: __,
        ...safeMetadata
      } = request.metadata as any
      Object.keys(safeMetadata).forEach((key) => {
        if (
          typeof safeMetadata[key] === 'string' ||
          typeof safeMetadata[key] === 'number'
        ) {
          sanitizedMetadata[key] = String(safeMetadata[key])
        }
      })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(request.amount * 100),
      currency: request.currency ?? 'eur',
      customer: customer.stripeCustomerId,
      metadata: {
        userId,
        ...sanitizedMetadata,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    if (!paymentIntent.client_secret) {
      throw new ApiError(
        'PAYMENT_INTENT_FAILED',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Impossible de créer l'intention de paiement",
      )
    }

    if (
      this.creditPurchaseService &&
      request.metadata?.bundleId &&
      request.metadata?.bundleName &&
      request.metadata?.minutes
    ) {
      await this.creditPurchaseService.createPurchaseRecord(
        userId,
        paymentIntent.id,
        request.metadata.bundleId as string,
        request.metadata.bundleName as string,
        parseInt(request.metadata.minutes as string, 10),
        paymentIntent.amount,
        paymentIntent.currency,
      )
    }

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    }
  }

  async createCheckoutSession(
    userId: string,
    email: string,
    request: CreateCheckoutSessionRequest,
  ): Promise<CreateCheckoutSessionResponse> {
    if (!userId || !email) {
      throw new ApiError(
        'INTERNAL_ERROR',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'userId and email are required',
      )
    }

    let customer =
      await this.subscriptionRepository.findCustomerByUserId(userId)

    if (!customer) {
      const stripeCustomer = await stripe.customers.create({
        email,
        metadata: {
          userId,
        },
      })

      customer = await this.subscriptionRepository.createOrUpdateCustomer({
        userId,
        stripeCustomerId: stripeCustomer.id,
        email,
        name: null,
        defaultPaymentMethod: null,
      })
    }

    const session = await stripe.checkout.sessions.create({
      customer: customer.stripeCustomerId,
      mode: 'payment',
      line_items: [
        {
          price: request.priceId,
          quantity: 1,
        },
      ],
      invoice_creation: {
        enabled: true,
      },
      success_url: `${process.env.API_URL}/dashboard/subscription?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.API_URL}/dashboard/subscription?payment=canceled`,
      metadata: {
        userId,
        bundleId: request.bundleId,
        bundleName: request.bundleName,
        minutes: request.minutes.toString(),
      },
    })

    if (!session.url) {
      throw new ApiError(
        'CHECKOUT_SESSION_FAILED',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Impossible de créer la session de paiement',
      )
    }

    return {
      sessionId: session.id,
      url: session.url,
    }
  }

  async getPaymentIntentStatus(
    paymentIntentId: string,
  ): Promise<PaymentIntentStatus> {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
    }
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<void> {
    await stripe.paymentIntents.cancel(paymentIntentId)
  }
}
