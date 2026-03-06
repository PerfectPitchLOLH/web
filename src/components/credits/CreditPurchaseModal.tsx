'use client'

import { Check, Loader2, Sparkles, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type CreditBundle = {
  id: string
  name: string
  minutes: number
  price: number
  pricePerMinute: number
  discountPercent?: number
  bestValue?: boolean
}

type PurchaseState = 'idle' | 'loading' | 'success' | 'error'

interface CreditPurchaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bundle: CreditBundle | null
  onPurchaseComplete?: () => void
}

export function CreditPurchaseModal({
  open,
  onOpenChange,
  bundle,
  onPurchaseComplete,
}: CreditPurchaseModalProps) {
  const [state, setState] = useState<PurchaseState>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')

  const handlePurchase = async () => {
    if (!bundle) return

    setState('loading')
    setErrorMessage('')

    try {
      const response = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId: bundle.id }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "Échec de l'achat")
      }

      setState('success')

      setTimeout(() => {
        onPurchaseComplete?.()
        handleClose()
      }, 2000)
    } catch (error) {
      setState('error')
      setErrorMessage(
        error instanceof Error ? error.message : 'Une erreur est survenue',
      )
    }
  }

  const handleClose = () => {
    setState('idle')
    setErrorMessage('')
    onOpenChange(false)
  }

  const handleRetry = () => {
    setState('idle')
    setErrorMessage('')
  }

  if (!bundle) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-amber-500" />
            Acheter des minutes
          </DialogTitle>
          <DialogDescription>
            Confirmez votre achat de crédits supplémentaires
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div
            className={cn(
              'rounded-xl border border-border/50 p-6',
              'bg-gradient-to-br from-card via-card to-card/50',
              'backdrop-blur-sm',
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">{bundle.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {bundle.minutes} minutes de transcription
                </p>
              </div>
              {bundle.bestValue && (
                <div className="rounded-full bg-primary/10 px-3 py-1">
                  <span className="text-xs font-medium text-primary">
                    Meilleure offre
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="size-4 text-green-500" />
                <span>Ajouté instantanément à votre solde</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="size-4 text-green-500" />
                <span>N'expire jamais</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="size-4 text-green-500" />
                <span>{bundle.pricePerMinute.toFixed(3)}€ / minute</span>
              </div>
            </div>

            <div className="flex items-baseline justify-between pt-4 border-t border-border/50">
              <span className="text-sm text-muted-foreground">Total</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {bundle.price.toFixed(2)}€
                </span>
              </div>
            </div>
          </div>

          {state === 'idle' && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleClose}
              >
                Annuler
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                onClick={handlePurchase}
              >
                Confirmer l'achat
              </Button>
            </div>
          )}

          {state === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="size-8 animate-spin text-amber-500" />
              <p className="text-sm text-muted-foreground">
                Traitement de votre achat...
              </p>
            </div>
          )}

          {state === 'success' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="rounded-full bg-green-500/10 p-3">
                <Check className="size-8 text-green-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Achat réussi !</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {bundle.minutes} minutes ajoutées à votre solde
                </p>
              </div>
            </div>
          )}

          {state === 'error' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="rounded-full bg-red-500/10 p-3">
                  <X className="size-8 text-red-500" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-red-500">Échec de l'achat</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {errorMessage}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                >
                  Fermer
                </Button>
                <Button className="flex-1" onClick={handleRetry}>
                  Réessayer
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
