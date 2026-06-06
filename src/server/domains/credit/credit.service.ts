import { db } from '@/server/lib/database'
import { sendLowCreditsEmail, sendNoCreditsEmail } from '@/server/lib/email'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import {
  CREDIT_BUNDLES_ARRAY,
  CREDIT_THRESHOLDS,
  CREDIT_TRANSACTION_TYPES,
} from './credit.constants'
import type { CreditRepository } from './credit.repository'
import type {
  CreditBundleId,
  CreditHistoryParams,
  CreditHistoryResponse,
  UserCreditsBalance,
} from './credit.types'

export class CreditService {
  constructor(private repository: CreditRepository) {}

  async getUserCreditsBalance(userId: string): Promise<UserCreditsBalance> {
    let credits = await this.repository.getUserCredits(userId)

    if (!credits) {
      credits = await this.repository.createOrUpdateUserCredits(userId, {
        monthlyCredits: 180,
        bonusCredits: 0,
        usedThisMonth: 0,
        lastMonthlyRefill: null,
      })
    }

    const remainingCredits = credits.monthlyCredits + credits.bonusCredits
    const totalCredits = remainingCredits + credits.usedThisMonth
    const usagePercent =
      totalCredits > 0 ? (credits.usedThisMonth / totalCredits) * 100 : 0

    return {
      userId: credits.userId,
      monthlyCredits: credits.monthlyCredits,
      bonusCredits: credits.bonusCredits,
      totalCredits,
      usedThisMonth: credits.usedThisMonth,
      remainingCredits,
      lastMonthlyRefill: credits.lastMonthlyRefill,
      alerts: {
        lowBalance: usagePercent >= CREDIT_THRESHOLDS.WARNING_PERCENT,
        outOfCredits: remainingCredits <= 0,
      },
    }
  }

  async purchaseBundle(
    userId: string,
    bundleId: CreditBundleId,
    paymentReferenceId?: string,
  ): Promise<UserCreditsBalance> {
    const bundle = CREDIT_BUNDLES_ARRAY.find((b) => b.id === bundleId)

    if (!bundle) {
      throw new ApiError(
        'INVALID_BUNDLE',
        HTTP_STATUS.BAD_REQUEST,
        'Bundle ID invalide',
      )
    }

    const activeSubscription = await db.subscription.findFirst({
      where: {
        userId,
        status: { in: ['active', 'trialing'] },
      },
    })

    if (!activeSubscription) {
      throw new ApiError(
        'NO_ACTIVE_SUBSCRIPTION',
        HTTP_STATUS.PAYMENT_REQUIRED,
        'Un abonnement actif est requis pour acheter des crédits supplémentaires',
      )
    }

    const currentCredits = await this.repository.getUserCredits(userId)

    if (!currentCredits) {
      throw new ApiError(
        'USER_CREDITS_NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Crédits utilisateur non trouvés',
      )
    }

    const seconds = bundle.minutes * 60

    const updatedCredits = await this.repository.addBonusCredits(
      userId,
      seconds,
      paymentReferenceId,
    )

    const newBalance =
      updatedCredits.monthlyCredits + updatedCredits.bonusCredits

    await this.repository.createTransaction({
      userId,
      type: CREDIT_TRANSACTION_TYPES.PURCHASE,
      amount: bundle.minutes,
      balanceAfter: Math.floor(newBalance / 60),
      description: `Achat de ${bundle.minutes} minutes (${bundle.name})`,
      metadata: {
        bundleId: bundle.id,
        bundleName: bundle.name,
        price: bundle.price,
        paymentReferenceId,
      },
    })

    return this.getUserCreditsBalance(userId)
  }

  async deductCreditsInSeconds(
    userId: string,
    seconds: number,
    description: string,
  ): Promise<void> {
    if (seconds <= 0) return

    try {
      const updatedCredits = await this.repository.consumeCredits(
        userId,
        seconds,
      )
      const newBalance =
        updatedCredits.monthlyCredits + updatedCredits.bonusCredits
      const remainingMinutes = Math.floor(newBalance / 60)

      await this.repository.createTransaction({
        userId,
        type: CREDIT_TRANSACTION_TYPES.USAGE,
        amount: -Math.ceil(seconds / 60),
        balanceAfter: remainingMinutes,
        description,
      })

      await this.sendCreditAlertIfNeeded(
        userId,
        newBalance,
        updatedCredits.usedThisMonth,
      )
    } catch (error) {
      if (error instanceof Error && error.message === 'Insufficient credits') {
        throw new ApiError(
          'INSUFFICIENT_CREDITS',
          HTTP_STATUS.PAYMENT_REQUIRED,
          'Crédits insuffisants',
        )
      }
      throw error
    }
  }

  async deductCredits(
    userId: string,
    minutes: number,
    description: string,
  ): Promise<UserCreditsBalance> {
    if (minutes <= 0) {
      throw new ApiError(
        'INVALID_AMOUNT',
        HTTP_STATUS.BAD_REQUEST,
        'Le nombre de minutes doit être positif',
      )
    }

    const seconds = minutes * 60

    try {
      const updatedCredits = await this.repository.consumeCredits(
        userId,
        seconds,
      )

      const newBalance =
        updatedCredits.monthlyCredits + updatedCredits.bonusCredits

      await this.repository.createTransaction({
        userId,
        type: CREDIT_TRANSACTION_TYPES.USAGE,
        amount: -minutes,
        balanceAfter: Math.floor(newBalance / 60),
        description,
      })

      return this.getUserCreditsBalance(userId)
    } catch (error) {
      if (error instanceof Error && error.message === 'Insufficient credits') {
        const currentCredits = await this.repository.getUserCredits(userId)
        const totalAvailable =
          ((currentCredits?.monthlyCredits ?? 0) +
            (currentCredits?.bonusCredits ?? 0)) /
          60

        throw new ApiError(
          'INSUFFICIENT_CREDITS',
          HTTP_STATUS.PAYMENT_REQUIRED,
          `Crédits insuffisants. Disponible: ${totalAvailable.toFixed(1)} min, requis: ${minutes} min`,
        )
      }
      throw error
    }
  }

  async refillMonthlyCredits(
    userId: string,
    minutes: number,
    invoiceId?: string,
  ): Promise<UserCreditsBalance> {
    const seconds = minutes * 60

    await this.repository.refillMonthlyCredits(userId, seconds, invoiceId)

    const updatedCredits = await this.repository.getUserCredits(userId)

    if (!updatedCredits) {
      throw new ApiError(
        'CREDITS_NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Crédits utilisateur introuvables',
      )
    }

    const newBalance =
      updatedCredits.monthlyCredits + updatedCredits.bonusCredits

    await this.repository.createTransaction({
      userId,
      type: 'monthly_refill',
      amount: minutes,
      balanceAfter: Math.floor(newBalance / 60),
      description: `Recharge mensuelle d'abonnement (${minutes} minutes)`,
      metadata: {
        invoiceId,
      },
    })

    return this.getUserCreditsBalance(userId)
  }

  async grantSubscriptionCredits(
    userId: string,
    minutes: number,
  ): Promise<UserCreditsBalance> {
    return this.refillMonthlyCredits(userId, minutes)
  }

  async handlePlanChange(
    userId: string,
    oldPlanMinutes: number,
    newPlanMinutes: number,
    stripeCustomerId: string,
  ): Promise<void> {
    const currentCredits = await this.repository.getUserCredits(userId)

    if (!currentCredits) {
      throw new ApiError(
        'CREDITS_NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Crédits utilisateur introuvables',
      )
    }

    const creditsRemaining = currentCredits.monthlyCredits / 60
    const creditsTotal = oldPlanMinutes

    if (creditsTotal === 0) {
      await this.refillMonthlyCredits(userId, newPlanMinutes)
      return
    }

    const unusedValue = (creditsRemaining / creditsTotal) * oldPlanMinutes * 10

    const creditAmount = Math.round(unusedValue * 100)

    if (creditAmount > 0) {
      const { stripe } = await import('@/server/lib/stripe')

      await stripe.customers.createBalanceTransaction(stripeCustomerId, {
        amount: -creditAmount,
        currency: 'eur',
        description: `Crédit pour ${creditsRemaining.toFixed(1)} crédits non utilisés de l'ancien plan`,
      })

      await this.repository.createTransaction({
        userId,
        type: 'proration_adjustment',
        amount: 0,
        balanceAfter: newPlanMinutes,
        description: `Ajustement de proration : ${(creditAmount / 100).toFixed(2)}€ crédité`,
        metadata: {
          oldPlanMinutes,
          newPlanMinutes,
          creditsRemaining,
          creditAmount: creditAmount / 100,
        },
      })
    }

    await this.refillMonthlyCredits(userId, newPlanMinutes)
  }

  async getTransactionHistory(
    userId: string,
    params: CreditHistoryParams = {},
  ): Promise<CreditHistoryResponse> {
    const { transactions, total } = await this.repository.getTransactionHistory(
      userId,
      params,
    )

    const page = params.page ?? 1
    const limit = params.limit ?? 10
    const totalPages = Math.ceil(total / limit)

    return {
      transactions,
      total,
      page,
      limit,
      totalPages,
    }
  }

  getBundles() {
    return CREDIT_BUNDLES_ARRAY
  }

  async batchRefillMonthlyCredits(
    userIds: string[],
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0
    let failed = 0
    const errors: string[] = []

    for (const userId of userIds) {
      try {
        const subscription = await db.subscription.findFirst({
          where: {
            userId,
            status: { in: ['active', 'trialing'] },
          },
          include: {
            plan: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        if (subscription) {
          await this.refillMonthlyCredits(
            userId,
            subscription.plan.transcriptionMinutes,
          )
          success++
        } else {
          failed++
        }
      } catch (error) {
        failed++
        errors.push(
          `User ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    }

    return { success, failed, errors }
  }

  private async sendCreditAlertIfNeeded(
    userId: string,
    remainingSeconds: number,
    usedThisMonthSeconds: number,
  ): Promise<void> {
    const user = await this.repository.findUserById(userId)
    if (!user) return

    if (remainingSeconds <= 0) {
      await sendNoCreditsEmail(user.email, user.name)
      return
    }

    const totalSeconds = remainingSeconds + usedThisMonthSeconds
    const usagePercent =
      totalSeconds > 0 ? (usedThisMonthSeconds / totalSeconds) * 100 : 0

    if (usagePercent >= CREDIT_THRESHOLDS.WARNING_PERCENT) {
      await sendLowCreditsEmail(
        user.email,
        user.name,
        Math.floor(remainingSeconds / 60),
      )
    }
  }
}
