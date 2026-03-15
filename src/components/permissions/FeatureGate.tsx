'use client'

import { ReactNode } from 'react'

import { useFeatureGate } from '@/hooks/permissions/useFeatureGate'
import type { FeatureKey } from '@/server/domains/permission'

import { UpgradePrompt } from './UpgradePrompt'

type FeatureGateProps = {
  feature: FeatureKey
  children: ReactNode
  fallback?: ReactNode
  showUpgradePrompt?: boolean
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
}: FeatureGateProps) {
  const { canAccess, isLoading, upgradeRequired, reason } =
    useFeatureGate(feature)

  if (isLoading) {
    return fallback || null
  }

  if (!canAccess) {
    if (showUpgradePrompt && upgradeRequired) {
      return <UpgradePrompt targetPlan={upgradeRequired} reason={reason} />
    }
    return fallback || null
  }

  return <>{children}</>
}
