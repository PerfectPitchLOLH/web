import { db } from '@/server/lib/database'

import { PAGINATION_DEFAULTS } from './credit.constants'
import type {
  CreateCreditTransactionDTO,
  CreditBalance,
  CreditHistoryParams,
  CreditRefill,
  CreditRefillDTO,
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

  async getCreditBalance(userId: string): Promise<CreditBalance | null> {
    const credits = await db.userCredits.findUnique({
      where: { userId },
      select: {
        monthlyCredits: true,
        bonusCredits: true,
      },
    })

    if (!credits) return null

    return {
      monthlyCredits: credits.monthlyCredits,
      bonusCredits: credits.bonusCredits,
      totalCredits: credits.monthlyCredits + credits.bonusCredits,
    }
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
        monthlyCredits: data.monthlyCredits ?? 180,
        bonusCredits: data.bonusCredits ?? 0,
        usedThisMonth: data.usedThisMonth ?? 0,
        lastMonthlyRefill: data.lastMonthlyRefill ?? null,
      },
    })

    return credits
  }

  async refillMonthlyCredits(
    userId: string,
    amount: number,
    invoiceId?: string,
  ): Promise<UserCredits> {
    if (invoiceId && (await this.checkRefillExists(invoiceId))) {
      const existingCredits = await this.getUserCredits(userId)
      if (!existingCredits) {
        throw new Error(`User credits not found for userId: ${userId}`)
      }
      return existingCredits
    }

    const credits = await db.userCredits.upsert({
      where: { userId },
      update: {
        monthlyCredits: amount,
        usedThisMonth: 0,
        lastMonthlyRefill: new Date(),
      },
      create: {
        userId,
        monthlyCredits: amount,
        bonusCredits: 0,
        usedThisMonth: 0,
        lastMonthlyRefill: new Date(),
      },
    })

    if (invoiceId) {
      await this.createRefillRecord({
        userCreditsId: userId,
        stripeInvoiceId: invoiceId,
        amount,
        type: 'MONTHLY',
        reason: 'subscription_refill',
      })
    }

    return credits
  }

  async addBonusCredits(
    userId: string,
    amount: number,
    paymentReferenceId?: string,
  ): Promise<UserCredits> {
    if (
      paymentReferenceId &&
      (await this.checkRefillExists(paymentReferenceId))
    ) {
      const existingCredits = await this.getUserCredits(userId)
      if (!existingCredits) {
        throw new Error(`User credits not found for userId: ${userId}`)
      }
      return existingCredits
    }

    const credits = await db.userCredits.upsert({
      where: { userId },
      update: {
        bonusCredits: {
          increment: amount,
        },
      },
      create: {
        userId,
        monthlyCredits: 0,
        bonusCredits: amount,
        usedThisMonth: 0,
        lastMonthlyRefill: null,
      },
    })

    if (paymentReferenceId) {
      await this.createRefillRecord({
        userCreditsId: userId,
        stripeInvoiceId: paymentReferenceId,
        amount,
        type: 'BONUS',
        reason: 'package_purchase',
      })
    }

    return credits
  }

  async consumeCredits(userId: string, seconds: number): Promise<UserCredits> {
    const credits = await this.getUserCredits(userId)
    if (!credits) {
      throw new Error(`User credits not found for userId: ${userId}`)
    }

    const totalAvailable = credits.monthlyCredits + credits.bonusCredits
    if (totalAvailable < seconds) {
      throw new Error('Insufficient credits')
    }

    let remainingToConsume = seconds
    let newMonthlyCredits = credits.monthlyCredits
    let newBonusCredits = credits.bonusCredits

    if (credits.monthlyCredits >= remainingToConsume) {
      newMonthlyCredits = credits.monthlyCredits - remainingToConsume
    } else {
      remainingToConsume -= credits.monthlyCredits
      newMonthlyCredits = 0
      newBonusCredits = credits.bonusCredits - remainingToConsume
    }

    return await db.userCredits.update({
      where: { userId },
      data: {
        monthlyCredits: newMonthlyCredits,
        bonusCredits: newBonusCredits,
        usedThisMonth: {
          increment: seconds,
        },
      },
    })
  }

  async checkRefillExists(invoiceId: string): Promise<boolean> {
    const existing = await db.creditRefill.findUnique({
      where: { stripeInvoiceId: invoiceId },
    })
    return !!existing
  }

  async createRefillRecord(data: CreditRefillDTO): Promise<CreditRefill> {
    return await db.creditRefill.create({
      data: {
        userCreditsId: data.userCreditsId,
        stripeInvoiceId: data.stripeInvoiceId,
        amount: data.amount,
        type: data.type,
        reason: data.reason ?? null,
      },
    })
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

  async incrementBonusCredits(
    userId: string,
    seconds: number,
  ): Promise<UserCredits> {
    const credits = await db.userCredits.update({
      where: { userId },
      data: {
        bonusCredits: {
          increment: seconds,
        },
      },
    })

    return credits
  }

  async incrementUsedMinutes(
    userId: string,
    seconds: number,
  ): Promise<UserCredits> {
    const credits = await db.userCredits.update({
      where: { userId },
      data: {
        usedThisMonth: {
          increment: seconds,
        },
      },
    })

    return credits
  }

  async findUsersNeedingMonthlyRefill(): Promise<UserCredits[]> {
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    const credits = await db.userCredits.findMany({
      where: {
        OR: [
          { lastMonthlyRefill: null },
          {
            lastMonthlyRefill: {
              lte: oneMonthAgo,
            },
          },
        ],
      },
    })

    return credits
  }
}
