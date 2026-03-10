'use client'

import { Calendar, TrendingUp, Wallet } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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

export function CreditBalanceCard() {
  const [credits, setCredits] = useState<CreditBalance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/credits')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCredits(data.data)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-card/50 p-6 backdrop-blur-sm shadow-lg shadow-black/5 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded mb-4" />
        <div className="h-16 w-full bg-muted rounded mb-4" />
        <div className="h-4 w-32 bg-muted rounded" />
      </div>
    )
  }

  if (!credits) return null

  const monthlyMinutes = Math.floor(credits.monthlyCredits / 60)
  const bonusMinutes = Math.floor(credits.bonusCredits / 60)
  const totalMinutes = Math.floor(credits.totalCredits / 60)
  const remainingMinutes = Math.floor(credits.remainingCredits / 60)
  const usedMinutes = Math.floor(credits.usedThisMonth / 60)

  const usagePercent = totalMinutes > 0 ? (usedMinutes / totalMinutes) * 100 : 0
  const remainingPercent = 100 - usagePercent

  const getProgressColor = () => {
    if (remainingPercent > 50) return 'bg-green-500'
    if (remainingPercent > 20) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Non défini'
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const getNextRefillDate = () => {
    if (!credits.lastMonthlyRefill) {
      return 'Prochain renouvellement'
    }
    const lastRefill = new Date(credits.lastMonthlyRefill)
    const nextRefill = new Date(lastRefill)
    nextRefill.setMonth(nextRefill.getMonth() + 1)
    return nextRefill
  }

  return (
    <div
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
              {remainingMinutes} / {totalMinutes} minutes restantes
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative h-3 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
              getProgressColor(),
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

      <div className="flex items-center justify-between mb-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="size-4" />
          <span>
            Prochain renouvellement :{' '}
            {formatDate(getNextRefillDate().toString())}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" asChild>
          <Link href="/dashboard/subscription">Voir les offres</Link>
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
