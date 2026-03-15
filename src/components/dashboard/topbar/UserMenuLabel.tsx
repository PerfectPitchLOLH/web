'use client'

import { Badge } from '@/components/ui/badge'
import { useSubscription } from '@/hooks/permissions/useSubscription'

const PLAN_BADGE: Record<string, { label: string; className: string }> = {
  junior: {
    label: 'Junior',
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
  basic: {
    label: 'Basic',
    className: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  },
  pro: {
    label: 'Pro',
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
}

type UserMenuLabelProps = {
  name: string
  email: string
}

export function UserMenuLabel({ name, email }: UserMenuLabelProps) {
  const { planTier, hasActiveSubscription, isTrialing } = useSubscription()

  const badge =
    hasActiveSubscription && planTier && planTier !== 'free'
      ? PLAN_BADGE[planTier]
      : null

  return (
    <div className="flex flex-col space-y-1">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium leading-none">{name}</p>
        {badge && (
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 h-4 ${badge.className}`}
          >
            {isTrialing ? `${badge.label} · Essai` : badge.label}
          </Badge>
        )}
      </div>
      <p className="text-xs leading-none text-muted-foreground">{email}</p>
    </div>
  )
}
