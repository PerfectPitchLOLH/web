'use client'

import { useEffect, useState } from 'react'

import type { SubscriptionPlanDTO } from '@/server/domains/subscription/subscription.types'

export function usePlans() {
  const [plans, setPlans] = useState<SubscriptionPlanDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/subscriptions/plans')
      .then((r) => r.json())
      .then((result) => {
        if (result.success) setPlans(result.data)
        else setError(result.message)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return { plans, loading, error }
}
