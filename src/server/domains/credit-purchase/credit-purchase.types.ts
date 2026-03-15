import type { CreateDTO, Entity } from '@/server/shared/types'

export type CreditPurchase = {
  id: string
  userId: string
  stripePaymentIntentId: string
  bundleId: string
  bundleName: string
  minutes: number
  amount: number
  currency: string
  status: PaymentStatus
  creditsGranted: boolean
  creditsGrantedAt: Date | null
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled'

export type CreditPurchaseEntity = Entity<CreditPurchase>
export type CreateCreditPurchaseDTO = CreateDTO<CreditPurchase>

export type ProcessPaymentIntentRequest = {
  paymentIntentId: string
  status: PaymentStatus
  metadata?: Record<string, unknown>
}
