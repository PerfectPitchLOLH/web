import { stripe } from '@/server/lib/stripe'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import type { SubscriptionRepository } from '../subscription/subscription.repository'
import type {
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  PaymentIntentStatus,
} from './payment.types'

export class PaymentService {
  constructor(private subscriptionRepository: SubscriptionRepository) {}

  async createPaymentIntent(
    userId: string,
    email: string,
    request: CreatePaymentIntentRequest,
  ): Promise<CreatePaymentIntentResponse> {
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

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(request.amount * 100),
      currency: request.currency ?? 'eur',
      customer: customer.stripeCustomerId,
      metadata: {
        userId,
        ...request.metadata,
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

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
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
