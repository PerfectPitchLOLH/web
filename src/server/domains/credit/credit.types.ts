import type { CreditType as PrismaCreditType } from '@prisma/client'

import type { CreateDTO, Entity } from '@/server/shared/types'

export type CreditType = PrismaCreditType

export type CreditBundleId = 'small' | 'medium' | 'large' | 'big'

export type CreditBundle = {
  id: CreditBundleId
  name: string
  minutes: number
  price: number
  pricePerMinute: number
  discountPercent?: number
  bestValue?: boolean
}

export type CreditTransactionType =
  | 'purchase'
  | 'subscription_grant'
  | 'usage'
  | 'bonus'
  | 'monthly_refill'
  | 'proration_adjustment'

export type CreditTransaction = {
  id: string
  userId: string
  type: CreditTransactionType
  amount: number
  balanceAfter: number
  description: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

export type UserCredits = {
  userId: string
  monthlyCredits: number
  bonusCredits: number
  usedThisMonth: number
  lastMonthlyRefill: Date | null
  updatedAt: Date
}

export type UserCreditsBalance = {
  userId: string
  monthlyCredits: number
  bonusCredits: number
  totalCredits: number
  usedThisMonth: number
  remainingCredits: number
  lastMonthlyRefill: Date | null
  alerts: {
    lowBalance: boolean
    outOfCredits: boolean
  }
}

export type CreditBalance = {
  monthlyCredits: number
  bonusCredits: number
  totalCredits: number
}

export type CreditRefill = {
  id: string
  userCreditsId: string
  stripeInvoiceId: string
  amount: number
  type: CreditType
  reason: string | null
  createdAt: Date
}

export type CreditRefillDTO = {
  userCreditsId: string
  stripeInvoiceId: string
  amount: number
  type: CreditType
  reason?: string
}

export type CreditTransactionEntity = Entity<CreditTransaction>
export type CreateCreditTransactionDTO = CreateDTO<CreditTransaction>

export type PurchaseBundleRequest = {
  bundleId: CreditBundleId
}

export type CreditHistoryParams = {
  page?: number
  limit?: number
  type?: CreditTransactionType
}

export type CreditHistoryResponse = {
  transactions: CreditTransactionEntity[]
  total: number
  page: number
  limit: number
  totalPages: number
}
