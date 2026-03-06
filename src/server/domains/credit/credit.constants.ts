import type { CreditBundle, CreditTransactionType } from './credit.types'

export const CREDIT_BUNDLES: Record<string, CreditBundle> = {
  SMALL: {
    id: 'small',
    name: 'Petit',
    minutes: 5,
    price: 4.99,
    pricePerMinute: 0.998,
  },
  MEDIUM: {
    id: 'medium',
    name: 'Moyen',
    minutes: 15,
    price: 12.99,
    pricePerMinute: 0.866,
    discountPercent: 13,
  },
  LARGE: {
    id: 'large',
    name: 'Grand',
    minutes: 30,
    price: 22.99,
    pricePerMinute: 0.766,
    discountPercent: 23,
    bestValue: true,
  },
} as const

export const CREDIT_BUNDLES_ARRAY: CreditBundle[] =
  Object.values(CREDIT_BUNDLES)

export const CREDIT_TRANSACTION_TYPES: Record<string, CreditTransactionType> = {
  PURCHASE: 'purchase',
  SUBSCRIPTION_GRANT: 'subscription_grant',
  USAGE: 'usage',
  BONUS: 'bonus',
} as const

export const CREDIT_THRESHOLDS = {
  LOW_BALANCE_PERCENT: 20,
  WARNING_PERCENT: 80,
  CRITICAL_PERCENT: 100,
} as const

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
} as const
