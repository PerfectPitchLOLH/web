'use client'

import { AlertTriangle, CreditCard, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'

export function PaymentFailedBanner() {
  const [isPastDue, setIsPastDue] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    fetch('/api/subscriptions')
      .then((r) => r.json())
      .then((result) => {
        if (
          result.success &&
          result.data?.subscription?.status === 'past_due'
        ) {
          setIsPastDue(true)
        }
      })
      .catch(() => {})
  }, [])

  const handleUpdatePayment = async () => {
    setIsRedirecting(true)
    try {
      const res = await fetch('/api/subscriptions/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/dashboard/subscription`,
        }),
      })
      const result = await res.json()
      if (result.success && result.data?.url) {
        window.location.href = result.data.url
      }
    } catch {
      setIsRedirecting(false)
    }
  }

  if (!isPastDue) return null

  return (
    <div className="w-full border-b border-red-200/70 bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/20">
      <div className="flex items-center justify-between gap-4 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-500" />
          <p className="truncate text-sm text-red-800 dark:text-red-300">
            <span className="font-medium">Paiement échoué.</span>{' '}
            <span className="hidden text-red-700 sm:inline dark:text-red-400">
              Mettez à jour votre moyen de paiement pour continuer à utiliser
              Notavex.
            </span>
          </p>
        </div>

        <div className="shrink-0">
          <Button
            onClick={handleUpdatePayment}
            size="sm"
            variant="outline"
            disabled={isRedirecting}
            className="h-7 gap-1.5 border-red-300 bg-white text-xs text-red-800 hover:bg-red-50 dark:border-red-700/60 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-900/20"
          >
            {isRedirecting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CreditCard className="h-3 w-3" />
            )}
            Mettre à jour
          </Button>
        </div>
      </div>
    </div>
  )
}
