'use client'

import { useEffect, useState } from 'react'

import type { PermissionContext } from '@/server/domains/permission'

export function useSubscription() {
  const [context, setContext] = useState<PermissionContext | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetch('/api/permissions/context')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setContext(data.data)
        } else {
          setError(new Error(data.error?.message || 'Failed to fetch context'))
        }
      })
      .catch(setError)
      .finally(() => setIsLoading(false))
  }, [])

  return {
    subscription: context,
    isLoading,
    error,
    hasActiveSubscription:
      context?.subscriptionStatus === 'active' ||
      context?.subscriptionStatus === 'trialing',
    planTier: context?.planTier,
    isTrialing: context?.isTrialing,
    isCanceled: context?.isCanceled,
  }
}
