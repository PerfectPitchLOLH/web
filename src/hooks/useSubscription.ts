'use client'

import { useEffect, useState } from 'react'

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'paused'
  | 'trialing'
  | 'unpaid'

export type SubscriptionInvoice = {
  id: string
  amount: number
  currency: string
  status: string
  createdAt: string
  paidAt: string | null
  hostedInvoiceUrl: string | null
  invoicePdf: string | null
  description: string | null
}

export type SubscriptionInfo = {
  hasActiveSubscription: boolean
  subscription: {
    id: string
    status: SubscriptionStatus
    currentPeriodStart: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
    canceledAt: string | null
    trialEnd: string | null
    plan: {
      id: string
      name: string
      stripePriceId: string
      monthlyPrice: number
      yearlyPrice: number | null
      transcriptionMinutes: number
    }
  } | null
  invoices: SubscriptionInvoice[]
}

export function useSubscription() {
  const [data, setData] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscription = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/subscriptions')

      if (!response.ok) throw new Error('Failed to fetch subscription')

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
    const response = await fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId,
        successUrl: `${window.location.origin}/dashboard?subscribed=true`,
        cancelUrl: `${window.location.origin}/dashboard/subscription`,
      }),
    })

    if (!response.ok) throw new Error('Failed to create checkout session')

    const result = await response.json()

    if (result.success && result.data.url) {
      window.location.href = result.data.url
    } else {
      throw new Error(result.message || 'Failed to create checkout session')
    }
  }

  const openPortal = async () => {
    const response = await fetch('/api/subscriptions/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        returnUrl: `${window.location.origin}/dashboard/subscription`,
      }),
    })

    if (!response.ok) throw new Error('Failed to create portal session')

    const result = await response.json()

    if (result.success && result.data.url) {
      window.location.href = result.data.url
    } else {
      throw new Error(result.message || 'Failed to create portal session')
    }
  }

  const cancelSubscription = async () => {
    const response = await fetch('/api/subscriptions/cancel', {
      method: 'PATCH',
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.message || 'Failed to cancel subscription')
    }

    await fetchSubscription()
  }

  const reactivateSubscription = async () => {
    const response = await fetch('/api/subscriptions/reactivate', {
      method: 'PATCH',
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.message || 'Failed to reactivate subscription')
    }

    await fetchSubscription()
  }

  const upgradeSubscription = async (priceId: string) => {
    const response = await fetch('/api/subscriptions/upgrade', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId }),
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.message || 'Failed to upgrade subscription')
    }

    await fetchSubscription()
  }

  return {
    subscription: data,
    loading,
    error,
    refresh: fetchSubscription,
    createCheckoutSession,
    openPortal,
    cancelSubscription,
    reactivateSubscription,
    upgradeSubscription,
  }
}
