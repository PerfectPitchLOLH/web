import type { Prisma } from '@prisma/client'

import { db } from '@/server/lib/database'

import { PAGINATION_DEFAULTS } from './credit.constants'
import type {
  CreateCreditTransactionDTO,
  CreditBalance,
  CreditDebit,
  CreditHistoryParams,
  CreditRefill,
  CreditRefillDTO,
  CreditTransactionEntity,
  UserCredits,
} from './credit.types'

type CreditClient = Pick<
  Prisma.TransactionClient,
  'userCredits' | 'creditTransaction'
>

const MAX_DEBIT_ATTEMPTS = 5

export class InsufficientCreditsError extends Error {
  constructor() {
    super('Insufficient credits')
    this.name = 'InsufficientCreditsError'
  }
}

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

  async consumeCredits(
    userId: string,
    seconds: number,
    client: CreditClient = db,
  ): Promise<UserCredits> {
    const debit = await this.debitCredits(userId, seconds, client)
    return {
      userId,
      monthlyCredits: debit.monthlyCredits,
      bonusCredits: debit.bonusCredits,
      usedThisMonth: debit.usedThisMonth,
      lastMonthlyRefill: debit.lastMonthlyRefill,
      updatedAt: new Date(),
    }
  }

  async debitCredits(
    userId: string,
    seconds: number,
    client: CreditClient = db,
  ): Promise<CreditDebit> {
    for (let attempt = 0; attempt < MAX_DEBIT_ATTEMPTS; attempt++) {
      const credits = await client.userCredits.findUnique({ where: { userId } })
      if (!credits) {
        throw new Error(`User credits not found for userId: ${userId}`)
      }

      if (credits.monthlyCredits + credits.bonusCredits < seconds) {
        throw new InsufficientCreditsError()
      }

      const fromMonthly = Math.min(credits.monthlyCredits, seconds)
      const fromBonus = seconds - fromMonthly

      const updated = await client.userCredits.updateMany({
        where: {
          userId,
          monthlyCredits: credits.monthlyCredits,
          bonusCredits: credits.bonusCredits,
        },
        data: {
          monthlyCredits: { decrement: fromMonthly },
          bonusCredits: { decrement: fromBonus },
          usedThisMonth: { increment: seconds },
        },
      })

      if (updated.count === 1) {
        return {
          fromMonthly,
          fromBonus,
          monthlyCredits: credits.monthlyCredits - fromMonthly,
          bonusCredits: credits.bonusCredits - fromBonus,
          usedThisMonth: credits.usedThisMonth + seconds,
          lastMonthlyRefill: credits.lastMonthlyRefill,
        }
      }
    }

    throw new Error(`Credits update contention for userId: ${userId}`)
  }

  async restoreCredits(
    userId: string,
    amounts: { monthly: number; bonus: number },
    client: CreditClient = db,
  ): Promise<UserCredits> {
    const total = amounts.monthly + amounts.bonus

    const credits = await client.userCredits.update({
      where: { userId },
      data: {
        monthlyCredits: { increment: amounts.monthly },
        bonusCredits: { increment: amounts.bonus },
      },
    })

    await client.userCredits.updateMany({
      where: { userId, usedThisMonth: { gte: total } },
      data: { usedThisMonth: { decrement: total } },
    })

    return credits
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
    client: CreditClient = db,
  ): Promise<CreditTransactionEntity> {
    const transaction = await client.creditTransaction.create({
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

  async findUserById(
    userId: string,
  ): Promise<{ email: string; name: string } | null> {
    return db.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    })
  }
}
