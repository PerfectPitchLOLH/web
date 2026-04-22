'use client'

import { useEffect, useState } from 'react'

type CreditBalance = {
  monthlyCredits: number
  bonusCredits: number
  totalCredits: number
  usedThisMonth: number
  remainingCredits: number
  lastMonthlyRefill: string | null
  alerts: {
    lowBalance: boolean
    outOfCredits: boolean
  }
}

type UseCreditsResult = {
  credits: CreditBalance | null
  loading: boolean
  refetch: () => void
}

export function useCredits(): UseCreditsResult {
  const [credits, setCredits] = useState<CreditBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setLoading(true)
    fetch('/api/credits')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCredits(data.data)
      })
      .finally(() => setLoading(false))
  }, [tick])

  useEffect(() => {
    const handler = () => setTick((t) => t + 1)
    window.addEventListener('credits-refresh', handler)
    return () => window.removeEventListener('credits-refresh', handler)
  }, [])

  return { credits, loading, refetch: () => setTick((t) => t + 1) }
}
