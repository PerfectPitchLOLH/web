import { stripe } from '@/server/lib/stripe'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import { CREDIT_TRANSACTION_TYPES } from '../credit/credit.constants'
import type { CreditService } from '../credit/credit.service'
import { SUBSCRIPTION_STATUS } from './subscription.constants'
import type { SubscriptionRepository } from './subscription.repository'
import type {
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  CreatePortalSessionResponse,
  SubscriptionEntity,
  SubscriptionStatus,
  UserSubscriptionInfo,
} from './subscription.types'

export class SubscriptionService {
  constructor(
    private repository: SubscriptionRepository,
    private creditService: CreditService,
  ) {}

  async getUserSubscription(userId: string): Promise<UserSubscriptionInfo> {
    const subscription = await this.repository.findSubscriptionWithPlan(userId)
    const invoices = await this.repository.findInvoicesByUserId(userId)

    return {
      hasActiveSubscription: subscription !== null,
      subscription,
      invoices,
    }
  }

  async createCheckoutSession(
    userId: string,
    email: string,
    request: CreateCheckoutSessionRequest,
  ): Promise<CreateCheckoutSessionResponse> {
    const plan = await this.repository.findPlanByStripePriceId(request.priceId)

    if (!plan) {
      throw new ApiError(
        'INVALID_PLAN',
        HTTP_STATUS.BAD_REQUEST,
        'Plan invalide',
      )
    }

    const existingSubscription =
      await this.repository.findSubscriptionByUserId(userId)

    if (existingSubscription && existingSubscription.status === 'active') {
      throw new ApiError(
        'SUBSCRIPTION_EXISTS',
        HTTP_STATUS.CONFLICT,
        'Vous avez déjà un abonnement actif',
      )
    }

    let customer = await this.repository.findCustomerByUserId(userId)

    if (!customer) {
      const stripeCustomer = await stripe.customers.create({
        email,
        metadata: {
          userId,
        },
      })

      customer = await this.repository.createOrUpdateCustomer({
        userId,
        stripeCustomerId: stripeCustomer.id,
        email,
        name: stripeCustomer.name ?? null,
        defaultPaymentMethod: null,
      })
    }

    const session = await stripe.checkout.sessions.create({
      customer: customer.stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: request.priceId,
          quantity: 1,
        },
      ],
      success_url:
        request.successUrl ?? `${process.env.API_URL}/dashboard?success=true`,
      cancel_url:
        request.cancelUrl ?? `${process.env.API_URL}/dashboard/subscription`,
      metadata: {
        userId,
        planId: plan.id,
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

  async createPortalSession(
    userId: string,
    returnUrl?: string,
  ): Promise<CreatePortalSessionResponse> {
    const customer = await this.repository.findCustomerByUserId(userId)

    if (!customer) {
      throw new ApiError(
        'CUSTOMER_NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Client non trouvé',
      )
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripeCustomerId,
      return_url: returnUrl ?? `${process.env.API_URL}/dashboard/subscription`,
    })

    return {
      url: session.url,
    }
  }

  async handleSubscriptionCreated(
    stripeSubscriptionId: string,
  ): Promise<SubscriptionEntity> {
    const stripeSubscription =
      await stripe.subscriptions.retrieve(stripeSubscriptionId)

    const plan = await this.repository.findPlanByStripePriceId(
      stripeSubscription.items.data[0]?.price.id ?? '',
    )

    if (!plan) {
      throw new ApiError(
        'PLAN_NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Plan non trouvé',
      )
    }

    const userId = stripeSubscription.metadata.userId

    if (!userId) {
      throw new ApiError(
        'USER_ID_MISSING',
        HTTP_STATUS.BAD_REQUEST,
        'User ID manquant',
      )
    }

    const subscription = await this.repository.createSubscription({
      userId,
      planId: plan.id,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: stripeSubscription.customer as string,
      status: stripeSubscription.status as SubscriptionStatus,
      currentPeriodStart: new Date(
        (stripeSubscription as any).current_period_start * 1000,
      ),
      currentPeriodEnd: new Date(
        (stripeSubscription as any).current_period_end * 1000,
      ),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      canceledAt: stripeSubscription.canceled_at
        ? new Date(stripeSubscription.canceled_at * 1000)
        : null,
      trialStart: stripeSubscription.trial_start
        ? new Date(stripeSubscription.trial_start * 1000)
        : null,
      trialEnd: stripeSubscription.trial_end
        ? new Date(stripeSubscription.trial_end * 1000)
        : null,
    })

    await this.creditService.grantSubscriptionCredits(
      userId,
      plan.transcriptionMinutes,
    )

    return subscription
  }

  async handleSubscriptionUpdated(
    stripeSubscriptionId: string,
  ): Promise<SubscriptionEntity | null> {
    const stripeSubscription =
      await stripe.subscriptions.retrieve(stripeSubscriptionId)

    const subscription = await this.repository.updateSubscription(
      stripeSubscriptionId,
      {
        status: stripeSubscription.status as SubscriptionStatus,
        currentPeriodStart: new Date(
          (stripeSubscription as any).current_period_start * 1000,
        ),
        currentPeriodEnd: new Date(
          (stripeSubscription as any).current_period_end * 1000,
        ),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        canceledAt: stripeSubscription.canceled_at
          ? new Date(stripeSubscription.canceled_at * 1000)
          : null,
      },
    )

    return subscription
  }

  async handleSubscriptionDeleted(
    stripeSubscriptionId: string,
  ): Promise<SubscriptionEntity | null> {
    const subscription = await this.repository.updateSubscriptionStatus(
      stripeSubscriptionId,
      SUBSCRIPTION_STATUS.CANCELED,
      {
        canceledAt: new Date(),
      },
    )

    if (subscription) {
      await this.creditService.grantSubscriptionCredits(subscription.userId, 0)
    }

    return subscription
  }

  async handleInvoicePaymentSucceeded(stripeInvoiceId: string): Promise<void> {
    const stripeInvoice = await stripe.invoices.retrieve(stripeInvoiceId)

    const customer = await this.repository.findCustomerByStripeId(
      stripeInvoice.customer as string,
    )

    if (!customer) {
      throw new ApiError(
        'CUSTOMER_NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Client non trouvé',
      )
    }

    const existingInvoice = await this.repository.findInvoicesByUserId(
      customer.userId,
    )
    const invoice = existingInvoice.find(
      (inv) => inv.stripeInvoiceId === stripeInvoiceId,
    )

    if (invoice) {
      await this.repository.updateInvoice(stripeInvoiceId, {
        status: stripeInvoice.status ?? 'paid',
        paidAt: new Date(),
      })
    } else {
      await this.repository.createInvoice({
        userId: customer.userId,
        stripeInvoiceId,
        amount: stripeInvoice.amount_paid / 100,
        currency: stripeInvoice.currency,
        status: stripeInvoice.status ?? 'paid',
        hostedInvoiceUrl: stripeInvoice.hosted_invoice_url ?? null,
        invoicePdf: stripeInvoice.invoice_pdf ?? null,
        description: stripeInvoice.description ?? null,
        paidAt: new Date(),
      })
    }

    const invoiceSubscription = (stripeInvoice as any).subscription
    if (invoiceSubscription && typeof invoiceSubscription === 'string') {
      const subscription =
        await this.repository.findSubscriptionByStripeId(invoiceSubscription)

      if (subscription) {
        const plan = await this.repository.findPlanById(subscription.planId)

        if (plan) {
          await this.creditService.grantSubscriptionCredits(
            subscription.userId,
            plan.transcriptionMinutes,
          )
        }
      }
    }
  }

  async handleInvoicePaymentFailed(stripeInvoiceId: string): Promise<void> {
    const stripeInvoice = await stripe.invoices.retrieve(stripeInvoiceId)

    const customer = await this.repository.findCustomerByStripeId(
      stripeInvoice.customer as string,
    )

    if (!customer) {
      return
    }

    await this.repository.createInvoice({
      userId: customer.userId,
      stripeInvoiceId,
      amount: stripeInvoice.amount_due / 100,
      currency: stripeInvoice.currency,
      status: 'failed',
      hostedInvoiceUrl: stripeInvoice.hosted_invoice_url ?? null,
      invoicePdf: stripeInvoice.invoice_pdf ?? null,
      description: stripeInvoice.description ?? null,
      paidAt: null,
    })
  }

  async grantWelcomeCredits(userId: string, email: string): Promise<void> {
    const WELCOME_CREDITS = 3

    await this.creditService.getUserCreditsBalance(userId)

    const creditBalance = await this.creditService.getUserCreditsBalance(userId)

    const currentPurchased = creditBalance.purchasedMinutes

    await this.repository.createOrUpdateCustomer({
      userId,
      stripeCustomerId: `temp_${userId}`,
      email,
      name: null,
      defaultPaymentMethod: null,
    })

    const creditRepo = (this.creditService as any).repository
    await creditRepo.incrementPurchasedMinutes(userId, WELCOME_CREDITS)

    const newBalance = currentPurchased + WELCOME_CREDITS

    await creditRepo.createTransaction({
      userId,
      type: CREDIT_TRANSACTION_TYPES.BONUS,
      amount: WELCOME_CREDITS,
      balanceAfter: newBalance,
      description: `Crédits de bienvenue (${WELCOME_CREDITS} minutes gratuites)`,
      metadata: {
        type: 'welcome_bonus',
      },
    })
  }
}
