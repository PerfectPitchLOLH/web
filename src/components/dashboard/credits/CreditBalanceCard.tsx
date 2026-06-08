'use client'

import { Calendar, TrendingUp, Wallet } from 'lucide-react'
import Link from 'next/link'

import { CreditBalanceCardSkeleton } from '@/components/dashboard/credits/CreditBalanceCardSkeleton'
import { Button } from '@/components/ui/button'
import { useCredits } from '@/hooks/useCredits'
import {
  computeUsagePercent,
  formatLocalDate,
  getCreditProgressColor,
  getNextRefillDate,
  secondsToMinutes,
} from '@/lib/credits'
import { cn, formatCredits } from '@/lib/utils'

export function CreditBalanceCard() {
  const { credits, loading } = useCredits()

  if (loading) return <CreditBalanceCardSkeleton />
  if (!credits) return null

  const monthlyMinutes = secondsToMinutes(credits.monthlyCredits)
  const bonusMinutes = secondsToMinutes(credits.bonusCredits)
  const totalMinutes = secondsToMinutes(credits.totalCredits)

  const usagePercent = computeUsagePercent(
    credits.usedThisMonth,
    credits.totalCredits,
  )
  const remainingPercent = 100 - usagePercent
  const progressColor = getCreditProgressColor(
    credits.remainingCredits,
    credits.totalCredits,
  )

  const nextRefill = getNextRefillDate(credits.lastMonthlyRefill)

  return (
    <div
      data-onboarding-step="credits"
      className={cn(
        'group relative rounded-2xl border border-border/50',
        'bg-gradient-to-br from-card via-card to-card/50',
        'p-6 backdrop-blur-sm',
        'shadow-lg shadow-black/5',
        'hover:shadow-xl hover:scale-[1.02]',
        'transition-all duration-300',
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg p-2.5 bg-amber-500/10">
            <Wallet className="size-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Minutes de transcription</h3>
            <p className="text-sm text-muted-foreground">
              {formatCredits(credits.remainingCredits)} / {totalMinutes} min
              restantes
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative h-3 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
              progressColor,
            )}
            style={{ width: `${remainingPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{usagePercent.toFixed(0)}% utilisé</span>
          <span>{remainingPercent.toFixed(0)}% restant</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="size-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">Mensuels</span>
          </div>
          <p className="font-semibold">{monthlyMinutes} min</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Renouvelés chaque mois
          </p>
        </div>

        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="size-3.5 text-green-500" />
            <span className="text-xs text-muted-foreground">Bonus</span>
          </div>
          <p className="font-semibold">{bonusMinutes} min</p>
          <p className="text-xs text-muted-foreground mt-0.5">Persistants</p>
        </div>
      </div>

      {nextRefill && (
        <div className="flex items-center justify-between mb-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="size-4" />
            <span>Prochain renouvellement : {formatLocalDate(nextRefill)}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" asChild>
          <Link href="/dashboard/subscription#plan">Voir les offres</Link>
        </Button>
      </div>

      <div
        className={cn(
          'absolute inset-0 -z-10 rounded-2xl',
          'bg-gradient-to-br from-amber-500/10 via-transparent to-transparent',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'blur-xl',
        )}
      />
    </div>
  )
}
