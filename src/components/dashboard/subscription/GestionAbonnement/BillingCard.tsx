import { AlertTriangle, Calendar, CreditCard, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { SubscriptionInfo } from '@/hooks/useSubscription'

import { formatDate } from '../utils'

export function BillingCard({
  subscription,
  onManage,
  loadingPortal,
}: {
  subscription: NonNullable<SubscriptionInfo['subscription']>
  onManage: () => void
  loadingPortal: boolean
}) {
  const { cancelAtPeriodEnd, currentPeriodEnd, status } = subscription
  const isCanceling = cancelAtPeriodEnd
  const isActive = status === 'active' || status === 'trialing'

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Calendar className="size-4" />
        Facturation
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {isCanceling ? "Fin de l'accès" : 'Prochain renouvellement'}
          </p>
          <p className="text-lg font-semibold">
            {formatDate(currentPeriodEnd)}
          </p>
        </div>

        {isCanceling && (
          <div className="flex items-start gap-2 rounded-lg bg-orange-500/10 border border-orange-500/20 p-3 text-sm text-orange-600 dark:text-orange-400">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span>Votre abonnement ne sera pas renouvelé.</span>
          </div>
        )}
      </div>

      {isActive && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onManage}
          disabled={loadingPortal}
        >
          {loadingPortal ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <CreditCard className="mr-2 size-4" />
          )}
          Gérer le paiement
        </Button>
      )}
    </div>
  )
}
