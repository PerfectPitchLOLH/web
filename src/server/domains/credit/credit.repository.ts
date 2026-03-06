import { db } from '@/server/lib/database'

import { PAGINATION_DEFAULTS } from './credit.constants'
import type {
  CreateCreditTransactionDTO,
  CreditHistoryParams,
  CreditTransactionEntity,
  UserCredits,
} from './credit.types'

export class CreditRepository {
  async getUserCredits(userId: string): Promise<UserCredits | null> {
    const credits = await db.userCredits.findUnique({
      where: { userId },
    })

    return credits
  }

  async createOrUpdateUserCredits(
    userId: string,
    data: Partial<Omit<UserCredits, 'userId' | 'updatedAt'>>,
  ): Promise<UserCredits> {
    const credits = await db.userCredits.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        subscriptionMinutes: data.subscriptionMinutes ?? 0,
        purchasedMinutes: data.purchasedMinutes ?? 0,
        usedThisMonth: data.usedThisMonth ?? 0,
        resetDate: data.resetDate ?? new Date(),
      },
    })

    return credits
  }

  async createTransaction(
    data: CreateCreditTransactionDTO,
  ): Promise<CreditTransactionEntity> {
    const transaction = await db.creditTransaction.create({
      data: {
        userId: data.userId,
        type: data.type,
        amount: data.amount,
        balanceAfter: data.balanceAfter,
        description: data.description,
        metadata: data.metadata ? (data.metadata as any) : undefined,
      },
    })

    return transaction as CreditTransactionEntity
  }

  async getTransactionHistory(
    userId: string,
    params: CreditHistoryParams = {},
  ): Promise<{ transactions: CreditTransactionEntity[]; total: number }> {
    const page = params.page ?? PAGINATION_DEFAULTS.PAGE
    const limit = Math.min(
      params.limit ?? PAGINATION_DEFAULTS.LIMIT,
      PAGINATION_DEFAULTS.MAX_LIMIT,
    )
    const skip = (page - 1) * limit

    const where = {
      userId,
      ...(params.type && { type: params.type }),
    }

    const [transactions, total] = await Promise.all([
      db.creditTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.creditTransaction.count({ where }),
    ])

    return {
      transactions: transactions as CreditTransactionEntity[],
      total,
    }
  }

  async updateUserCredits(
    userId: string,
    updates: Partial<Omit<UserCredits, 'userId' | 'updatedAt'>>,
  ): Promise<UserCredits> {
    const credits = await db.userCredits.update({
      where: { userId },
      data: updates,
    })

    return credits
  }

  async incrementPurchasedMinutes(
    userId: string,
    minutes: number,
  ): Promise<UserCredits> {
    const credits = await db.userCredits.update({
      where: { userId },
      data: {
        purchasedMinutes: {
          increment: minutes,
        },
      },
    })

    return credits
  }

  async incrementUsedMinutes(
    userId: string,
    minutes: number,
  ): Promise<UserCredits> {
    const credits = await db.userCredits.update({
      where: { userId },
      data: {
        usedThisMonth: {
          increment: minutes,
        },
      },
    })

    return credits
  }
}
