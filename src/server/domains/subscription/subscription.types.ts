import type { CreateDTO, Entity, UpdateDTO } from '@/server/shared/types'

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'paused'
  | 'trialing'
  | 'unpaid'

export type SubscriptionPlanTier = 'junior' | 'basic' | 'pro'

export type BillingInterval = 'month' | 'year'

export type SubscriptionPlan = {
  id: string
  stripeProductId: string
  stripePriceId: string
  stripeYearlyPriceId: string | null
  name: string
  description: string | null
  monthlyPrice: number
  yearlyPrice: number | null
  transcriptionMinutes: number
  features: SubscriptionFeatures
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type SubscriptionFeatures = {
  transcriptionMinutes: number
  fallingNotes: boolean
  historyDays: number | 'unlimited'
  sheetEditor: boolean
  polyphony: boolean
}

export type Subscription = {
  id: string
  userId: string
  planId: string
  stripeSubscriptionId: string
  stripeCustomerId: string
  status: SubscriptionStatus
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  canceledAt: Date | null
  trialStart: Date | null
  trialEnd: Date | null
  createdAt: Date
  updatedAt: Date
}

export type Customer = {
  userId: string
  stripeCustomerId: string
  email: string
  name: string | null
  defaultPaymentMethod: string | null
  createdAt: Date
  updatedAt: Date
}

export type Invoice = {
  id: string
  userId: string
  stripeInvoiceId: string
  amount: number
  currency: string
  status: string
  hostedInvoiceUrl: string | null
  invoicePdf: string | null
  description: string | null
  createdAt: Date
  paidAt: Date | null
}

export type SubscriptionEntity = Entity<Subscription>
export type SubscriptionPlanEntity = Entity<SubscriptionPlan>
export type CustomerEntity = Entity<Customer>
export type InvoiceEntity = Entity<Invoice>

export type CreateSubscriptionDTO = CreateDTO<Subscription>
export type UpdateSubscriptionDTO = UpdateDTO<Subscription>
export type CreateCustomerDTO = CreateDTO<Customer>
export type CreateInvoiceDTO = CreateDTO<Invoice>

export type SubscriptionWithPlan = Subscription & {
  plan: SubscriptionPlan
}

export type CreateCheckoutSessionRequest = {
  priceId: string
  successUrl?: string
  cancelUrl?: string
}

export type CreateCheckoutSessionResponse = {
  sessionId: string
  url: string
}

export type CreatePortalSessionRequest = {
  returnUrl?: string
}

export type CreatePortalSessionResponse = {
  url: string
}

export type SubscriptionPlanDTO = {
  id: string
  name: string
  description: string | null
  monthlyPrice: number
  yearlyPrice: number | null
  monthlyPriceId: string
  yearlyPriceId: string | null
  transcriptionMinutes: number
}

export type UserSubscriptionInfo = {
  hasActiveSubscription: boolean
  subscription: SubscriptionWithPlan | null
  invoices: InvoiceEntity[]
}

export type WebhookEvent = {
  stripeEventId: string
  eventType: string
  payload: Record<string, unknown>
  processed: boolean
  processedAt: Date | null
  error: string | null
  retryCount: number
}

export type WebhookEventEntity = Entity<WebhookEvent>
