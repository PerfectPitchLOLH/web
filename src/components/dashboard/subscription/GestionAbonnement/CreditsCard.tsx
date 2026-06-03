import { Zap } from 'lucide-react'

import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useCredits } from '@/hooks/useCredits'
import { computeUsagePercent } from '@/lib/credits'
import { cn } from '@/lib/utils'

export function CreditsCard() {
  const { credits, loading } = useCredits()

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-2 w-full" />
      </div>
    )
  }

  if (!credits) return null

  const remaining = credits.remainingCredits
  const usagePercent = Math.round(
    computeUsagePercent(credits.totalCredits - remaining, credits.totalCredits),
  )

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Zap className="size-4" />
        Crédits ce mois
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">
            {remaining < 60
              ? Math.floor(remaining)
              : Math.floor(remaining / 60)}
          </span>
          <span className="text-muted-foreground text-sm">
            {remaining < 60 ? 's' : 'min'} /{' '}
            {Math.round(credits.monthlyCredits / 60)} min
          </span>
        </div>

        <Progress
          value={usagePercent}
          className={cn(
            'h-2',
            usagePercent > 80 && '[&>div]:bg-orange-500',
            usagePercent >= 100 && '[&>div]:bg-red-500',
          )}
        />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{usagePercent}% utilisé</span>
          {credits.bonusCredits > 0 && (
            <span>+ {Math.round(credits.bonusCredits / 60)} min bonus</span>
          )}
        </div>
      </div>
    </div>
  )
}
