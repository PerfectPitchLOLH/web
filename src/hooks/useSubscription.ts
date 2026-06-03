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
    console.log("[FRONTEND] Tentative d'upgrade:", {
      priceId,
      timestamp: new Date().toISOString(),
    })

    try {
      const response = await fetch('/api/subscriptions/upgrade', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })

      console.log('[FRONTEND] Réponse reçue:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      })

      if (!response.ok) {
        const result = await response.json()
        console.error('[FRONTEND] Erreur de la réponse:', result)
        throw new Error(result.message || 'Failed to upgrade subscription')
      }

      const result = await response.json()
      console.log("[FRONTEND] Résultat de l'upgrade:", result)

      if (result.data?.checkoutUrl) {
        console.log(
          '[FRONTEND] Redirection vers Stripe Checkout:',
          result.data.checkoutUrl,
        )
        window.location.href = result.data.checkoutUrl
      } else {
        console.error('[FRONTEND] URL de checkout manquante dans la réponse')
        throw new Error('URL de checkout manquante')
      }
    } catch (error) {
      console.error("[FRONTEND] Erreur lors de l'upgrade:", {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
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
