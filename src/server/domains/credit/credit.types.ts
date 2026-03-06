import type { CreateDTO, Entity } from '@/server/shared/types'

export type CreditBundleId = 'small' | 'medium' | 'large'

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
  subscriptionMinutes: number
  purchasedMinutes: number
  usedThisMonth: number
  resetDate: Date
  updatedAt: Date
}

export type UserCreditsBalance = {
  userId: string
  subscriptionMinutes: number
  purchasedMinutes: number
  totalMinutes: number
  usedThisMonth: number
  remainingMinutes: number
  resetDate: Date
  alerts: {
    lowBalance: boolean
    outOfCredits: boolean
  }
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
