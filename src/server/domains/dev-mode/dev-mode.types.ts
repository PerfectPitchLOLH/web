import type {
  BillingInterval,
  SubscriptionFeatures,
  SubscriptionPlanTier,
  SubscriptionStatus,
} from '@/server/domains/subscription/subscription.types'

export type DevModeConfig = {
  isActive: boolean
  subscription: {
    tier: SubscriptionPlanTier
    status: SubscriptionStatus
    billingInterval: BillingInterval
    features: SubscriptionFeatures
  }
  credits: {
    available: number
  }
}

export type DevModePreset = {
  id: string
  name: string
  description: string
  config: Omit<DevModeConfig, 'isActive'>
}

export type ActivateDevModeDTO = {
  tier: SubscriptionPlanTier
  status?: SubscriptionStatus
  billingInterval?: BillingInterval
  features?: Partial<SubscriptionFeatures>
  credits?: number
}

export type UpdateDevModeDTO = Partial<ActivateDevModeDTO>
