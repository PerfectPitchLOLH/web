import { Loader2, RefreshCw } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { SubscriptionInfo } from '@/hooks/useSubscription'

import { formatDate } from '../utils'

export function DangerZone({
  subscription,
  onCancel,
  onReactivate,
  loading,
}: {
  subscription: NonNullable<SubscriptionInfo['subscription']>
  onCancel: () => Promise<void>
  onReactivate: () => Promise<void>
  loading: boolean
}) {
  const { cancelAtPeriodEnd, currentPeriodEnd, status } = subscription

  if (status === 'canceled') return null

  return (
    <div className="space-y-4">
      <Separator />
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Zone de danger
        </h3>

        {cancelAtPeriodEnd ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
            <div className="space-y-1">
              <p className="font-medium text-sm">Résiliation programmée</p>
              <p className="text-sm text-muted-foreground">
                Votre accès prendra fin le{' '}
                <span className="font-medium text-foreground">
                  {formatDate(currentPeriodEnd)}
                </span>
                . Réactivez pour continuer.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-green-500/50 text-green-600 hover:bg-green-500/10 hover:border-green-500"
                >
                  <RefreshCw className="mr-2 size-4" />
                  Réactiver l'abonnement
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Réactiver l'abonnement</AlertDialogTitle>
                  <AlertDialogDescription>
                    Votre abonnement sera réactivé et se renouvellera
                    automatiquement à la prochaine date de facturation le{' '}
                    <strong>{formatDate(currentPeriodEnd)}</strong>.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onReactivate}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    Réactiver
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-border p-4">
            <div className="space-y-1">
              <p className="font-medium text-sm">Résilier l'abonnement</p>
              <p className="text-sm text-muted-foreground">
                Vous conserverez l'accès jusqu'au{' '}
                <span className="font-medium text-foreground">
                  {formatDate(currentPeriodEnd)}
                </span>
                .
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-red-500/50 text-red-500 hover:bg-red-500/10 hover:border-red-500"
                >
                  Résilier
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Résilier l'abonnement</AlertDialogTitle>
                  <AlertDialogDescription>
                    Votre abonnement sera résilié à la fin de la période en
                    cours le <strong>{formatDate(currentPeriodEnd)}</strong>.
                    Vous conserverez l'accès jusqu'à cette date et pourrez
                    réactiver à tout moment.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onCancel}
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {loading && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    Résilier
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </div>
  )
}
