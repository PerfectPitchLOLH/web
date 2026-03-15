import { db } from '@/server/lib/database'

import type {
  CreditPurchaseEntity,
  PaymentStatus,
} from './credit-purchase.types'

export class CreditPurchaseRepository {
  async findByPaymentIntentId(
    paymentIntentId: string,
  ): Promise<CreditPurchaseEntity | null> {
    const purchase = await db.creditPurchase.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    })

    return purchase as CreditPurchaseEntity | null
  }

  async create(data: {
    userId: string
    stripePaymentIntentId: string
    bundleId: string
    bundleName: string
    minutes: number
    amount: number
    currency: string
    status: PaymentStatus
    invoicePdf?: string | null
    metadata?: Record<string, unknown>
  }): Promise<CreditPurchaseEntity> {
    const purchase = await db.creditPurchase.create({
      data: {
        userId: data.userId,
        stripePaymentIntentId: data.stripePaymentIntentId,
        bundleId: data.bundleId,
        bundleName: data.bundleName,
        minutes: data.minutes,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        creditsGranted: false,
        creditsGrantedAt: null,
        invoicePdf: data.invoicePdf ?? null,
        metadata: data.metadata ? (data.metadata as any) : undefined,
      },
    })

    return purchase as CreditPurchaseEntity
  }

  async updateStatus(
    paymentIntentId: string,
    status: PaymentStatus,
  ): Promise<CreditPurchaseEntity | null> {
    const purchase = await db.creditPurchase.update({
      where: { stripePaymentIntentId: paymentIntentId },
      data: { status },
    })

    return purchase as CreditPurchaseEntity | null
  }

  async markCreditsGranted(
    paymentIntentId: string,
  ): Promise<CreditPurchaseEntity> {
    const purchase = await db.creditPurchase.update({
      where: { stripePaymentIntentId: paymentIntentId },
      data: {
        creditsGranted: true,
        creditsGrantedAt: new Date(),
      },
    })

    return purchase as CreditPurchaseEntity
  }

  async isCreditsAlreadyGranted(paymentIntentId: string): Promise<boolean> {
    const purchase = await db.creditPurchase.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
      select: { creditsGranted: true },
    })

    return purchase?.creditsGranted ?? false
  }

  async findRecentPurchasesByUserId(
    userId: string,
    withinMinutes: number = 60,
  ): Promise<CreditPurchaseEntity[]> {
    const since = new Date(Date.now() - withinMinutes * 60 * 1000)

    const purchases = await db.creditPurchase.findMany({
      where: {
        userId,
        createdAt: {
          gte: since,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return purchases as CreditPurchaseEntity[]
  }

  async findSucceededByUserId(userId: string): Promise<CreditPurchaseEntity[]> {
    const purchases = await db.creditPurchase.findMany({
      where: {
        userId,
        status: 'succeeded',
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return purchases as CreditPurchaseEntity[]
  }
}
