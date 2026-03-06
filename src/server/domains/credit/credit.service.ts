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
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      credits = await this.repository.createOrUpdateUserCredits(userId, {
        subscriptionMinutes: 0,
        purchasedMinutes: 0,
        usedThisMonth: 0,
        resetDate: nextMonth,
      })
    }

    const totalMinutes = credits.subscriptionMinutes + credits.purchasedMinutes
    const remainingMinutes = Math.max(0, totalMinutes - credits.usedThisMonth)
    const usagePercent =
      totalMinutes > 0 ? (credits.usedThisMonth / totalMinutes) * 100 : 0

    return {
      userId: credits.userId,
      subscriptionMinutes: credits.subscriptionMinutes,
      purchasedMinutes: credits.purchasedMinutes,
      totalMinutes,
      usedThisMonth: credits.usedThisMonth,
      remainingMinutes,
      resetDate: credits.resetDate,
      alerts: {
        lowBalance: usagePercent >= CREDIT_THRESHOLDS.WARNING_PERCENT,
        outOfCredits: remainingMinutes <= 0,
      },
    }
  }

  async purchaseBundle(
    userId: string,
    bundleId: CreditBundleId,
  ): Promise<UserCreditsBalance> {
    const bundle = CREDIT_BUNDLES_ARRAY.find((b) => b.id === bundleId)

    if (!bundle) {
      throw new ApiError(
        'INVALID_BUNDLE',
        HTTP_STATUS.BAD_REQUEST,
        'Bundle ID invalide',
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

    const updatedCredits = await this.repository.incrementPurchasedMinutes(
      userId,
      bundle.minutes,
    )

    const newBalance =
      updatedCredits.subscriptionMinutes +
      updatedCredits.purchasedMinutes -
      updatedCredits.usedThisMonth

    await this.repository.createTransaction({
      userId,
      type: CREDIT_TRANSACTION_TYPES.PURCHASE,
      amount: bundle.minutes,
      balanceAfter: newBalance,
      description: `Achat de ${bundle.minutes} minutes (${bundle.name})`,
      metadata: {
        bundleId: bundle.id,
        bundleName: bundle.name,
        price: bundle.price,
      },
    })

    return this.getUserCreditsBalance(userId)
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

    const balance = await this.getUserCreditsBalance(userId)

    if (balance.remainingMinutes < minutes) {
      throw new ApiError(
        'INSUFFICIENT_CREDITS',
        HTTP_STATUS.PAYMENT_REQUIRED,
        'Crédits insuffisants',
      )
    }

    const updatedCredits = await this.repository.incrementUsedMinutes(
      userId,
      minutes,
    )

    const newBalance =
      updatedCredits.subscriptionMinutes +
      updatedCredits.purchasedMinutes -
      updatedCredits.usedThisMonth

    await this.repository.createTransaction({
      userId,
      type: CREDIT_TRANSACTION_TYPES.USAGE,
      amount: -minutes,
      balanceAfter: newBalance,
      description,
    })

    return this.getUserCreditsBalance(userId)
  }

  async grantSubscriptionCredits(
    userId: string,
    minutes: number,
  ): Promise<UserCreditsBalance> {
    const currentCredits = await this.repository.getUserCredits(userId)

    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    const updatedCredits = await this.repository.createOrUpdateUserCredits(
      userId,
      {
        subscriptionMinutes: minutes,
        usedThisMonth: 0,
        resetDate: nextMonth,
        purchasedMinutes: currentCredits?.purchasedMinutes ?? 0,
      },
    )

    const newBalance =
      updatedCredits.subscriptionMinutes + updatedCredits.purchasedMinutes

    await this.repository.createTransaction({
      userId,
      type: CREDIT_TRANSACTION_TYPES.SUBSCRIPTION_GRANT,
      amount: minutes,
      balanceAfter: newBalance,
      description: `Crédit mensuel d'abonnement (${minutes} minutes)`,
    })

    return this.getUserCreditsBalance(userId)
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
}
