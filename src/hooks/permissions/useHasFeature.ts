'use client'

import { useEffect, useState } from 'react'

import type {
  FeatureKey,
  PermissionCheckResult,
} from '@/server/domains/permission'

export function useHasFeature(feature: FeatureKey, currentUsage?: number) {
  const [result, setResult] = useState<PermissionCheckResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams({ feature })
    if (currentUsage !== undefined) {
      params.append('usage', currentUsage.toString())
    }

    fetch(`/api/permissions/check?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setResult(data.data)
        }
      })
      .catch((error) => {
        console.error('Error checking feature access:', error)
        setResult({
          hasAccess: false,
          reason: 'Erreur lors de la vérification',
        })
      })
      .finally(() => setIsLoading(false))
  }, [feature, currentUsage])

  return {
    hasAccess: result?.hasAccess ?? false,
    isLoading,
    reason: result?.reason,
    upgradeRequired: result?.upgradeRequired,
    currentLimit: result?.currentLimit,
    usedLimit: result?.usedLimit,
  }
}
