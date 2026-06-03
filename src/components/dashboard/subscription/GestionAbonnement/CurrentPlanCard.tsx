import { Clock, Sparkles } from 'lucide-react'

import type { SubscriptionInfo } from '@/hooks/useSubscription'

import { formatAmount, getBillingInterval } from '../utils'

export function CurrentPlanCard({
  subscription,
}: {
  subscription: NonNullable<SubscriptionInfo['subscription']>
}) {
  const interval = getBillingInterval(
    subscription.currentPeriodStart,
    subscription.currentPeriodEnd,
  )
  const price =
    interval === 'yearly'
      ? subscription.plan.yearlyPrice
      : subscription.plan.monthlyPrice
  const tierIcons: Record<string, string> = {
    junior: '🎵',
    basic: '🎸',
    pro: '🎹',
  }
  const tierName =
    Object.keys(tierIcons).find((k) =>
      subscription.plan.name.toLowerCase().includes(k),
    ) ?? ''

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Sparkles className="size-4" />
        Plan actuel
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{tierIcons[tierName] ?? '⭐'}</span>
          <div>
            <p className="text-xl font-bold">{subscription.plan.name}</p>
            <p className="text-sm text-muted-foreground capitalize">
              Facturation {interval === 'yearly' ? 'annuelle' : 'mensuelle'}
            </p>
          </div>
        </div>

        <div className="flex items-baseline gap-1 pt-1">
          <span className="text-3xl font-bold">
            {price != null ? formatAmount(price) : '—'}
          </span>
          <span className="text-muted-foreground text-sm">
            /{interval === 'yearly' ? 'an' : 'mois'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
        <Clock className="size-4 shrink-0" />
        <span>
          {subscription.plan.transcriptionMinutes} min de transcription / mois
        </span>
      </div>
    </div>
  )
}
