import { AlertTriangle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { SubscriptionStatus } from '@/hooks/useSubscription'

import { formatDate } from '../utils'

export function StatusBadge({
  status,
  cancelAtPeriodEnd,
  periodEnd,
}: {
  status: SubscriptionStatus
  cancelAtPeriodEnd: boolean
  periodEnd: string
}) {
  if (cancelAtPeriodEnd) {
    return (
      <Badge
        variant="outline"
        className="border-orange-500/50 bg-orange-500/10 text-orange-500"
      >
        <AlertTriangle className="mr-1.5 size-3" />
        Résiliation le {formatDate(periodEnd)}
      </Badge>
    )
  }

  const config: Record<
    SubscriptionStatus,
    { label: string; className: string }
  > = {
    active: {
      label: 'Actif',
      className: 'border-green-500/50 bg-green-500/10 text-green-500',
    },
    trialing: {
      label: "Période d'essai",
      className: 'border-blue-500/50 bg-blue-500/10 text-blue-500',
    },
    past_due: {
      label: 'Paiement en retard',
      className: 'border-orange-500/50 bg-orange-500/10 text-orange-500',
    },
    canceled: {
      label: 'Annulé',
      className: 'border-red-500/50 bg-red-500/10 text-red-500',
    },
    unpaid: {
      label: 'Impayé',
      className: 'border-red-500/50 bg-red-500/10 text-red-500',
    },
    incomplete: {
      label: 'Incomplet',
      className: 'border-muted-foreground/50 bg-muted text-muted-foreground',
    },
    incomplete_expired: {
      label: 'Expiré',
      className: 'border-muted-foreground/50 bg-muted text-muted-foreground',
    },
    paused: {
      label: 'En pause',
      className: 'border-muted-foreground/50 bg-muted text-muted-foreground',
    },
  }

  const { label, className } = config[status] ?? config.incomplete

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}
