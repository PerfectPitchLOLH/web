'use client'

import { Badge } from '@/components/ui/badge'
import { useSubscription } from '@/hooks/permissions/useSubscription'

export function PlanBadge() {
  const { planTier, isTrialing, isLoading } = useSubscription()

  if (isLoading) {
    return null
  }

  const tierLabels = {
    free: 'Gratuit',
    junior: 'Junior',
    basic: 'Basic',
    pro: 'Pro',
  }

  const tier = planTier || 'free'
  const label = tierLabels[tier]

  return (
    <Badge variant={tier === 'pro' ? 'default' : 'secondary'}>
      {label} {isTrialing && '(Essai)'}
    </Badge>
  )
}
