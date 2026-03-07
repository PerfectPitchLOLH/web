'use client'

import { useEffect, useState } from 'react'

type SubscriptionInfo = {
  hasActiveSubscription: boolean
  subscription: {
    id: string
    status: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
    plan: {
      name: string
      transcriptionMinutes: number
    }
  } | null
  invoices: Array<{
    id: string
    amount: number
    status: string
    createdAt: string
    hostedInvoiceUrl: string | null
  }>
}

export function useSubscription() {
  const [data, setData] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscription = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/subscriptions')

      if (!response.ok) {
        throw new Error('Failed to fetch subscription')
      }

      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscription()
  }, [])

  const createCheckoutSession = async (priceId: string) => {
    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/dashboard?subscribed=true`,
          cancelUrl: `${window.location.origin}/dashboard/subscription`,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const result = await response.json()

      if (result.success && result.data.url) {
        window.location.href = result.data.url
      } else {
        throw new Error(result.message || 'Failed to create checkout session')
      }
    } catch (err) {
      throw err
    }
  }

  const openPortal = async () => {
    try {
      const response = await fetch('/api/subscriptions/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/dashboard/subscription`,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create portal session')
      }

      const result = await response.json()

      if (result.success && result.data.url) {
        window.location.href = result.data.url
      } else {
        throw new Error(result.message || 'Failed to create portal session')
      }
    } catch (err) {
      throw err
    }
  }

  return {
    subscription: data,
    loading,
    error,
    refresh: fetchSubscription,
    createCheckoutSession,
    openPortal,
  }
}
