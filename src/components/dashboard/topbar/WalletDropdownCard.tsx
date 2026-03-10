'use client'

import { Sparkles, Wallet } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { useCredits } from '@/hooks/useCredits'
import { cn } from '@/lib/utils'

function WalletDropdownCardSkeleton() {
  return (
    <div className="rounded-lg bg-muted p-3 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="size-4 rounded bg-muted-foreground/20" />
        <div className="h-4 w-16 rounded bg-muted-foreground/20" />
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-3 w-full rounded bg-muted-foreground/20" />
        <div className="h-3 w-full rounded bg-muted-foreground/20" />
      </div>
      <div className="h-7 w-full rounded bg-muted-foreground/20" />
    </div>
  )
}

export function WalletDropdownCard() {
  const { credits, loading } = useCredits()

  if (loading) return <WalletDropdownCardSkeleton />

  const totalMinutes = credits ? Math.floor(credits.totalCredits / 60) : 0
  const remainingMinutes = credits
    ? Math.floor(credits.remainingCredits / 60)
    : 0
  const usagePercent =
    totalMinutes > 0
      ? Math.min(100, ((totalMinutes - remainingMinutes) / totalMinutes) * 100)
      : 0

  const progressColor =
    remainingMinutes / Math.max(totalMinutes, 1) > 0.5
      ? 'bg-green-500'
      : remainingMinutes / Math.max(totalMinutes, 1) > 0.2
        ? 'bg-orange-500'
        : 'bg-red-500'

  return (
    <div className="rounded-lg bg-muted p-3">
      <div className="flex items-center gap-2 mb-2">
        <Wallet className="size-4 text-amber-500" />
        <span className="text-sm font-medium">Solde</span>
        {credits?.alerts.lowBalance && (
          <span className="ml-auto text-xs text-orange-500 font-medium">
            {credits.alerts.outOfCredits ? 'Épuisé' : 'Faible'}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1 mb-2">
        <div className="flex items-center justify-between w-full text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-medium">{totalMinutes} min</span>
        </div>
        <div className="flex items-center justify-between w-full text-sm">
          <span className="text-muted-foreground">Restant</span>
          <span
            className={cn(
              'font-medium',
              credits?.alerts.outOfCredits
                ? 'text-red-500'
                : credits?.alerts.lowBalance
                  ? 'text-orange-500'
                  : '',
            )}
          >
            {remainingMinutes} min
          </span>
        </div>
      </div>

      <div className="relative h-1.5 rounded-full bg-muted-foreground/20 overflow-hidden mb-3">
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
            progressColor,
          )}
          style={{ width: `${100 - usagePercent}%` }}
        />
      </div>

      <Button size="sm" className="w-full" variant="outline" asChild>
        <Link href="/dashboard/subscription#credits">
          <Sparkles className="mr-2 size-4" />
          Acheter des crédits
        </Link>
      </Button>
    </div>
  )
}
