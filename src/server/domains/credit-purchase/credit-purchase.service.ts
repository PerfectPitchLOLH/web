import type { CreditService } from '@/server/domains/credit/credit.service'
import { db } from '@/server/lib/database'
import { sendCreditPurchaseEmail } from '@/server/lib/email'
import { stripe } from '@/server/lib/stripe'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import type { CreditPurchaseRepository } from './credit-purchase.repository'
import type { CreditPurchaseEntity } from './credit-purchase.types'

const MAX_PURCHASES_PER_HOUR = 5
const MAX_AMOUNT_EUR = 100

export class CreditPurchaseService {
  constructor(
    private repository: CreditPurchaseRepository,
    private creditService: CreditService,
  ) {}

  async createPurchaseRecord(
    userId: string,
    paymentIntentId: string,
    bundleId: string,
    bundleName: string,
    minutes: number,
    amount: number,
    currency: string,
  ): Promise<CreditPurchaseEntity> {
    await this.validatePurchase(userId, amount)

    const existing =
      await this.repository.findByPaymentIntentId(paymentIntentId)

    if (existing) {
      return existing
    }

    try {
      return await this.repository.create({
        userId,
        stripePaymentIntentId: paymentIntentId,
        bundleId,
        bundleName,
        minutes,
        amount,
        currency,
        status: 'pending',
        metadata: {
          createdVia: 'payment_intent',
        },
      })
    } catch {
      throw new ApiError(
        'INTERNAL_ERROR',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Erreur lors de la création de l'achat",
      )
    }
  }

  async processPaymentSuccess(
    paymentIntentId: string,
  ): Promise<CreditPurchaseEntity> {
    const alreadyGranted =
      await this.repository.isCreditsAlreadyGranted(paymentIntentId)

    if (alreadyGranted) {
      console.log(
        `[CreditPurchase] Credits already granted for payment ${paymentIntentId}, skipping`,
      )
      const purchase =
        await this.repository.findByPaymentIntentId(paymentIntentId)
      if (!purchase) {
        throw new ApiError(
          'PURCHASE_NOT_FOUND',
          HTTP_STATUS.NOT_FOUND,
          'Purchase record not found',
        )
      }
      return purchase
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== 'succeeded') {
      throw new ApiError(
        'PAYMENT_NOT_SUCCEEDED',
        HTTP_STATUS.BAD_REQUEST,
        `Payment status is ${paymentIntent.status}, expected succeeded`,
      )
    }

    const purchase =
      await this.repository.findByPaymentIntentId(paymentIntentId)

    if (!purchase) {
      const userId = paymentIntent.metadata.userId
      const bundleId = paymentIntent.metadata.bundleId
      const bundleName = paymentIntent.metadata.bundleName || bundleId
      const minutes = parseInt(paymentIntent.metadata.minutes || '0', 10)

      if (!userId || !bundleId) {
        throw new ApiError(
          'INVALID_PAYMENT_METADATA',
          HTTP_STATUS.BAD_REQUEST,
          'Payment Intent metadata is incomplete',
        )
      }

      const newPurchase = await this.repository.create({
        userId,
        stripePaymentIntentId: paymentIntentId,
        bundleId,
        bundleName,
        minutes,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: 'succeeded',
        metadata: paymentIntent.metadata as any,
      })

      await this.grantCredits(newPurchase)
      return this.repository.markCreditsGranted(paymentIntentId)
    }

    await this.repository.updateStatus(paymentIntentId, 'succeeded')
    await this.grantCredits(purchase)
    return this.repository.markCreditsGranted(paymentIntentId)
  }

  private async grantCredits(purchase: CreditPurchaseEntity): Promise<void> {
    const activeSubscription = await db.subscription.findFirst({
      where: {
        userId: purchase.userId,
        status: { in: ['active', 'trialing'] },
      },
    })

    if (!activeSubscription) {
      throw new ApiError(
        'NO_ACTIVE_SUBSCRIPTION',
        HTTP_STATUS.PAYMENT_REQUIRED,
        'NO_ACTIVE_SUBSCRIPTION: Un abonnement actif est requis pour recevoir des crédits',
      )
    }

    await this.creditService.purchaseBundle(
      purchase.userId,
      purchase.bundleId as any,
      purchase.stripePaymentIntentId,
    )

    console.log(
      `[CreditPurchase] Granted ${purchase.minutes} minutes to user ${purchase.userId} for payment ${purchase.stripePaymentIntentId}`,
    )
  }

  private async validatePurchase(
    userId: string,
    amountCents: number,
  ): Promise<void> {
    const amountEur = amountCents / 100

    if (amountEur > MAX_AMOUNT_EUR) {
      throw new ApiError(
        'AMOUNT_TOO_HIGH',
        HTTP_STATUS.BAD_REQUEST,
        `Le montant ne peut pas dépasser ${MAX_AMOUNT_EUR}€`,
      )
    }

    const recentPurchases = await this.repository.findRecentPurchasesByUserId(
      userId,
      60,
    )

    if (recentPurchases.length >= MAX_PURCHASES_PER_HOUR) {
      throw new ApiError(
        'RATE_LIMIT_EXCEEDED',
        HTTP_STATUS.TOO_MANY_REQUESTS,
        `RATE_LIMIT_EXCEEDED: Limite d'achats atteinte (${MAX_PURCHASES_PER_HOUR}/heure)`,
      )
    }
  }

  async processCheckoutSuccess(
    sessionId: string,
  ): Promise<CreditPurchaseEntity> {
    const alreadyGranted =
      await this.repository.isCreditsAlreadyGranted(sessionId)

    if (alreadyGranted) {
      console.log(
        `[CreditPurchase] Credits already granted for session ${sessionId}, skipping`,
      )
      const purchase = await this.repository.findByPaymentIntentId(sessionId)
      if (!purchase) {
        throw new ApiError(
          'PURCHASE_NOT_FOUND',
          HTTP_STATUS.NOT_FOUND,
          'Purchase record not found',
        )
      }
      return purchase
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['invoice'],
    })

    if (session.payment_status !== 'paid') {
      throw new ApiError(
        'PAYMENT_NOT_SUCCEEDED',
        HTTP_STATUS.BAD_REQUEST,
        `Payment status is ${session.payment_status}, expected paid`,
      )
    }

    const userId = session.metadata?.userId
    const bundleId = session.metadata?.bundleId
    const bundleName = session.metadata?.bundleName || bundleId
    const minutes = parseInt(session.metadata?.minutes || '0', 10)

    if (!userId || !bundleId) {
      throw new ApiError(
        'INVALID_PAYMENT_METADATA',
        HTTP_STATUS.BAD_REQUEST,
        'Checkout Session metadata is incomplete',
      )
    }

    const invoicePdf =
      session.invoice && typeof session.invoice === 'object'
        ? (session.invoice as any).invoice_pdf
        : null

    let purchase = await this.repository.findByPaymentIntentId(sessionId)

    if (!purchase) {
      purchase = await this.repository.create({
        userId,
        stripePaymentIntentId: sessionId,
        bundleId,
        bundleName: bundleName || bundleId,
        minutes,
        amount: session.amount_total || 0,
        currency: session.currency || 'eur',
        status: 'succeeded',
        invoicePdf,
        metadata: session.metadata as any,
      })
    } else {
      await this.repository.updateStatus(sessionId, 'succeeded')
    }

    await this.grantCredits(purchase)

    const user = await this.repository.findUserById(purchase.userId)
    if (user) {
      await sendCreditPurchaseEmail(
        user.email,
        user.name,
        purchase.minutes,
        purchase.amount,
      )
    }

    return this.repository.markCreditsGranted(sessionId)
  }

  async handleCheckoutExpired(sessionId: string): Promise<void> {
    const purchase = await this.repository.findByPaymentIntentId(sessionId)
    if (purchase) {
      await this.repository.updateStatus(sessionId, 'canceled')
    }
  }

  async handlePaymentFailed(paymentIntentId: string): Promise<void> {
    await this.repository.updateStatus(paymentIntentId, 'failed')
  }

  async handlePaymentCanceled(paymentIntentId: string): Promise<void> {
    await this.repository.updateStatus(paymentIntentId, 'canceled')
  }
}
