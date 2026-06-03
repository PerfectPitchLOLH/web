'use client'

import type { FeatureKey } from '@/server/domains/permission'

import { useHasFeature } from './useHasFeature'
import { useSubscription } from './useSubscription'

export function useFeatureGate(feature: FeatureKey) {
  const { hasAccess, isLoading, upgradeRequired, reason } =
    useHasFeature(feature)
  const { planTier, hasActiveSubscription } = useSubscription()

  return {
    canAccess: hasAccess,
    isLoading,
    reason,
    upgradeRequired,
    currentPlan: planTier,
    hasSubscription: hasActiveSubscription,
  }
}
