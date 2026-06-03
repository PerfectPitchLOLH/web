import type { SubscriptionPlanTier } from '@/server/domains/subscription/subscription.types'

export type DevModeConfig = {
  isActive: boolean
  subscription: {
    tier: SubscriptionPlanTier
  }
  credits: {
    monthly: number
    bonus: number
  }
}

export type ActivateDevModeDTO = {
  tier: SubscriptionPlanTier
  monthlyCredits: number
  bonusCredits: number
}
