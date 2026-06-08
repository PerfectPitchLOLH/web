import type {
  BillingInterval,
  SubscriptionFeatures,
  SubscriptionPlanTier,
  SubscriptionStatus,
} from './subscription.types'

export const SUBSCRIPTION_STATUS: Record<string, SubscriptionStatus> = {
  ACTIVE: 'active',
  CANCELED: 'canceled',
  INCOMPLETE: 'incomplete',
  INCOMPLETE_EXPIRED: 'incomplete_expired',
  PAST_DUE: 'past_due',
  TRIALING: 'trialing',
  UNPAID: 'unpaid',
} as const

export const BILLING_INTERVALS: Record<string, BillingInterval> = {
  MONTHLY: 'month',
  YEARLY: 'year',
} as const

export const PLAN_TIERS: Record<string, SubscriptionPlanTier> = {
  JUNIOR: 'junior',
  BASIC: 'basic',
  PRO: 'pro',
} as const

export const PLAN_FEATURES: Record<SubscriptionPlanTier, SubscriptionFeatures> =
  {
    junior: {
      transcriptionMinutes: 10,
      fallingNotes: true,
      historyDays: 30,
      sheetEditor: false,
      polyphony: false,
    },
    basic: {
      transcriptionMinutes: 20,
      fallingNotes: true,
      historyDays: 90,
      sheetEditor: false,
      polyphony: false,
    },
    pro: {
      transcriptionMinutes: 50,
      fallingNotes: true,
      historyDays: 'unlimited',
      sheetEditor: true,
      polyphony: true,
    },
  } as const

export const PLAN_PRICING = {
  junior: {
    monthly: 9.99,
    yearly: 99.99,
  },
  basic: {
    monthly: 14.99,
    yearly: 149.99,
  },
  pro: {
    monthly: 29.99,
    yearly: 299.99,
  },
} as const

export const STRIPE_WEBHOOK_EVENTS = {
  CUSTOMER_SUBSCRIPTION_CREATED: 'customer.subscription.created',
  CUSTOMER_SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  CUSTOMER_SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
  INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  CUSTOMER_DELETED: 'customer.deleted',
  CUSTOMER_SUBSCRIPTION_TRIAL_WILL_END: 'customer.subscription.trial_will_end',
} as const

export const SUBSCRIPTION_DEFAULTS = {
  TRIAL_DAYS: 7,
  CURRENCY: 'eur',
} as const

export const DUNNING = {
  PAYMENT_FAILURE_THRESHOLD: 3,
} as const
