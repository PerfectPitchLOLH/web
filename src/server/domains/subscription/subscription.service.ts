import Stripe from 'stripe'

import { stripe } from '@/server/lib/stripe'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import type { CreditService } from '../credit/credit.service'
import type { CreditPurchaseRepository } from '../credit-purchase/credit-purchase.repository'
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
    private creditPurchaseRepository: CreditPurchaseRepository,
  ) {}

  async getUserSubscription(userId: string): Promise<UserSubscriptionInfo> {
    const subscription = await this.repository.findSubscriptionWithPlan(userId)
    const invoices = await this.repository.findInvoicesByUserId(userId)

    const creditPurchases =
      await this.creditPurchaseRepository.findSucceededByUserId(userId)

    const creditInvoices = creditPurchases.map((purchase) => ({
      id: purchase.id,
      userId: purchase.userId,
      stripeInvoiceId: purchase.stripePaymentIntentId,
      amount: purchase.amount / 100,
      currency: purchase.currency,
      status: 'paid',
      createdAt: purchase.createdAt,
      paidAt: purchase.creditsGrantedAt,
      updatedAt: purchase.updatedAt,
      hostedInvoiceUrl: null,
      invoicePdf: (purchase as any).invoicePdf ?? null,
      description: `Achat de ${purchase.bundleName} (${purchase.minutes} minutes)`,
    }))

    const allInvoices = [...invoices, ...creditInvoices].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

    return {
      hasActiveSubscription: subscription !== null,
      subscription,
      invoices: allInvoices,
    }
  }

  async createCheckoutSession(
    userId: string,
    email: string,
    request: CreateCheckoutSessionRequest,
  ): Promise<CreateCheckoutSessionResponse> {
    console.log(
      '[SubscriptionService] Looking up plan for price ID:',
      request.priceId,
    )
    const plan = await this.repository.findPlanByStripePriceId(request.priceId)

    if (!plan) {
      console.error(
        '[SubscriptionService] Plan not found for price ID:',
        request.priceId,
      )
      throw new ApiError(
        'INVALID_PLAN',
        HTTP_STATUS.BAD_REQUEST,
        'Plan invalide',
      )
    }

    console.log('[SubscriptionService] Found plan:', {
      id: plan.id,
      name: plan.name,
      priceId: plan.stripePriceId,
    })

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

  async createUpgradeCheckoutSession(
    userId: string,
    newPriceId: string,
  ): Promise<CreateCheckoutSessionResponse> {
    console.log('[UPGRADE_CHECKOUT] Création session Checkout pour upgrade:', {
      userId,
      newPriceId,
    })

    const subscription = await this.repository.findSubscriptionByUserId(userId)

    if (!subscription || subscription.status !== 'active') {
      throw new ApiError(
        'SUBSCRIPTION_NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Aucun abonnement actif',
      )
    }

    const newPlan = await this.repository.findPlanByStripePriceId(newPriceId)

    if (!newPlan) {
      throw new ApiError(
        'INVALID_PLAN',
        HTTP_STATUS.BAD_REQUEST,
        'Plan invalide',
      )
    }

    const customer = await this.repository.findCustomerByUserId(userId)

    if (!customer) {
      throw new ApiError(
        'CUSTOMER_NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Client introuvable',
      )
    }

    console.log('[UPGRADE_CHECKOUT] Création session avec:', {
      customerId: customer.stripeCustomerId,
      currentSubscriptionId: subscription.stripeSubscriptionId,
      newPriceId,
      newPlanName: newPlan.name,
    })

    const session = await stripe.checkout.sessions.create({
      customer: customer.stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: newPriceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          userId,
          planId: newPlan.id,
          upgradeFrom: subscription.stripeSubscriptionId,
        },
      },
      success_url: `${process.env.API_URL}/dashboard/subscription?upgrade=success`,
      cancel_url: `${process.env.API_URL}/dashboard/subscription?upgrade=cancelled`,
      metadata: {
        userId,
        planId: newPlan.id,
        isUpgrade: 'true',
        oldSubscriptionId: subscription.stripeSubscriptionId,
      },
    })

    if (!session.url) {
      throw new ApiError(
        'CHECKOUT_SESSION_FAILED',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Impossible de créer la session de paiement',
      )
    }

    console.log('[UPGRADE_CHECKOUT] Session créée avec succès:', {
      sessionId: session.id,
      url: session.url,
    })

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

    let userId = stripeSubscription.metadata.userId

    if (!userId) {
      const customer = await this.repository.findCustomerByStripeId(
        stripeSubscription.customer as string,
      )

      if (!customer) {
        throw new ApiError(
          'CUSTOMER_NOT_FOUND',
          HTTP_STATUS.NOT_FOUND,
          'Client non trouvé',
        )
      }

      userId = customer.userId
    }

    const firstItem = stripeSubscription.items.data[0]

    const subscription = await this.repository.createSubscription({
      userId,
      planId: plan.id,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: stripeSubscription.customer as string,
      status: stripeSubscription.status as SubscriptionStatus,
      currentPeriodStart: new Date(
        (firstItem as any).current_period_start * 1000,
      ),
      currentPeriodEnd: new Date((firstItem as any).current_period_end * 1000),
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

    const latestInvoice =
      typeof stripeSubscription.latest_invoice === 'string'
        ? stripeSubscription.latest_invoice
        : stripeSubscription.latest_invoice?.id

    await this.creditService.refillMonthlyCredits(
      userId,
      plan.transcriptionMinutes,
      latestInvoice,
    )

    return subscription
  }

  async handleSubscriptionUpdated(
    stripeSubscriptionId: string,
  ): Promise<SubscriptionEntity | null> {
    const stripeSubscription =
      await stripe.subscriptions.retrieve(stripeSubscriptionId)

    const existingSubscription =
      await this.repository.findSubscriptionByStripeId(stripeSubscriptionId)

    let oldPriceId: string | null = null
    if (existingSubscription) {
      const oldPlan = await this.repository.findPlanById(
        existingSubscription.planId,
      )
      oldPriceId = oldPlan?.stripePriceId ?? null
    }

    const newPriceId = stripeSubscription.items.data[0]?.price.id
    let newPlanId: string | undefined

    if (oldPriceId && newPriceId && oldPriceId !== newPriceId) {
      const oldPlan = await this.repository.findPlanByStripePriceId(oldPriceId)
      const newPlan = await this.repository.findPlanByStripePriceId(newPriceId)

      if (oldPlan && newPlan && existingSubscription) {
        newPlanId = newPlan.id
        await this.creditService.handlePlanChange(
          existingSubscription.userId,
          oldPlan.transcriptionMinutes,
          newPlan.transcriptionMinutes,
          stripeSubscription.customer as string,
        )
      }
    }

    const firstItem = stripeSubscription.items.data[0]

    const subscription = await this.repository.updateSubscription(
      stripeSubscriptionId,
      {
        ...(newPlanId && { planId: newPlanId }),
        status: stripeSubscription.status as SubscriptionStatus,
        currentPeriodStart: new Date(
          (firstItem as any).current_period_start * 1000,
        ),
        currentPeriodEnd: new Date(
          (firstItem as any).current_period_end * 1000,
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
      const otherActiveSubscriptions =
        await this.repository.findActiveSubscriptionsByUserId(
          subscription.userId,
        )

      const hasOtherActiveSubscription = otherActiveSubscriptions.some(
        (sub) => sub.id !== subscription.id,
      )

      if (!hasOtherActiveSubscription) {
        await this.creditService.grantSubscriptionCredits(
          subscription.userId,
          0,
        )
      }
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
      try {
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
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(
            `[Invoice] Invoice ${stripeInvoiceId} already created by another request, continuing`,
          )
        } else {
          throw error
        }
      }
    }

    const invoiceSubscription = (stripeInvoice as any).subscription
    if (invoiceSubscription && typeof invoiceSubscription === 'string') {
      const subscription =
        await this.repository.findSubscriptionByStripeId(invoiceSubscription)

      if (subscription) {
        const isFirstInvoice =
          stripeInvoice.billing_reason === 'subscription_create'

        if (!isFirstInvoice) {
          const plan = await this.repository.findPlanById(subscription.planId)

          if (plan) {
            await this.creditService.refillMonthlyCredits(
              subscription.userId,
              plan.transcriptionMinutes,
              stripeInvoiceId,
            )
          }
        }
      }
    } else {
      const lines = stripeInvoice.lines.data
      const packageLine = lines.find((line) =>
        line.description?.toLowerCase().includes('crédit'),
      )

      if (packageLine) {
        const linePrice = (packageLine as any).price
        if (linePrice?.metadata?.bundleId) {
          await this.creditService.purchaseBundle(
            customer.userId,
            linePrice.metadata.bundleId as any,
            stripeInvoiceId,
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

  async cancelSubscription(userId: string): Promise<void> {
    const subscription = await this.repository.findSubscriptionByUserId(userId)

    if (!subscription || subscription.status !== 'active') {
      throw new ApiError(
        'SUBSCRIPTION_NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Aucun abonnement actif',
      )
    }

    if (subscription.userId !== userId) {
      throw new ApiError(
        'UNAUTHORIZED',
        HTTP_STATUS.UNAUTHORIZED,
        'Unauthorized to cancel this subscription',
      )
    }

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })

    await this.repository.updateSubscription(
      subscription.stripeSubscriptionId,
      {
        cancelAtPeriodEnd: true,
      },
    )
  }

  async reactivateSubscription(userId: string): Promise<void> {
    const subscription = await this.repository.findSubscriptionByUserId(userId)

    if (!subscription) {
      throw new ApiError(
        'SUBSCRIPTION_NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Aucun abonnement trouvé',
      )
    }

    if (!subscription.cancelAtPeriodEnd) {
      throw new ApiError(
        'SUBSCRIPTION_NOT_CANCELING',
        HTTP_STATUS.BAD_REQUEST,
        "L'abonnement n'est pas en cours de résiliation",
      )
    }

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    })

    await this.repository.updateSubscription(
      subscription.stripeSubscriptionId,
      {
        cancelAtPeriodEnd: false,
      },
    )
  }

  async upgradeSubscription(
    userId: string,
    newPriceId: string,
  ): Promise<CreateCheckoutSessionResponse> {
    console.log('[UPGRADE] Redirection vers Stripe Checkout pour upgrade')
    return this.createUpgradeCheckoutSession(userId, newPriceId)
  }

  async upgradeSubscriptionDirect(
    userId: string,
    newPriceId: string,
  ): Promise<void> {
    const subscription = await this.repository.findSubscriptionByUserId(userId)

    if (!subscription || subscription.status !== 'active') {
      throw new ApiError(
        'SUBSCRIPTION_NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Aucun abonnement actif',
      )
    }

    const newPlan = await this.repository.findPlanByStripePriceId(newPriceId)

    if (!newPlan) {
      throw new ApiError(
        'INVALID_PLAN',
        HTTP_STATUS.BAD_REQUEST,
        'Plan invalide',
      )
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId,
    )

    const itemId = stripeSubscription.items.data[0]?.id

    if (!itemId) {
      throw new ApiError(
        'SUBSCRIPTION_ITEM_NOT_FOUND',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Item d'abonnement introuvable",
      )
    }

    console.log("[UPGRADE_DIRECT] Tentative d'upgrade direct:", {
      userId,
      subscriptionId: subscription.stripeSubscriptionId,
      currentPlanId: subscription.planId,
      newPriceId,
      newPlanId: newPlan.id,
      itemId,
    })

    try {
      const updatedSubscription: Stripe.Subscription =
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          items: [{ id: itemId, price: newPriceId }],
          proration_behavior: 'create_prorations',
        })

      console.log('[UPGRADE_DIRECT] Abonnement mis à jour avec succès:', {
        subscriptionId: updatedSubscription.id,
        status: updatedSubscription.status,
        currentPeriodEnd: new Date(
          (updatedSubscription as any).current_period_end * 1000,
        ),
        latestInvoice: updatedSubscription.latest_invoice,
        items: updatedSubscription.items.data.map((item) => ({
          id: item.id,
          priceId: item.price.id,
        })),
      })
    } catch (error) {
      console.error('[UPGRADE_DIRECT] Erreur lors de la mise à jour Stripe:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorType: (error as any)?.type,
        errorCode: (error as any)?.code,
        stripeError: (error as any)?.raw,
      })
      throw new ApiError(
        'STRIPE_UPDATE_FAILED',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        `Échec de la mise à jour de l'abonnement: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      )
    }
  }

  async grantWelcomeCredits(userId: string, email: string): Promise<void> {
    await this.creditService.getUserCreditsBalance(userId)

    await this.repository.createOrUpdateCustomer({
      userId,
      stripeCustomerId: `temp_${userId}`,
      email,
      name: null,
      defaultPaymentMethod: null,
    })
  }
}
