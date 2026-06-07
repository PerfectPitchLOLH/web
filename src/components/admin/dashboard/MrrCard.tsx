import { ArrowDown, ArrowUp, DollarSign, TrendingUp } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MrrStats } from '@/server/domains/admin/admin.types'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function MrrCard({ stats }: { stats: MrrStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">MRR</CardTitle>
          <DollarSign className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.mrr)}</div>
          <p className="text-xs text-muted-foreground">
            ARR : {formatCurrency(stats.arr)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenus du mois</CardTitle>
          <TrendingUp className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(stats.revenueThisMonth)}
          </div>
          <p className="text-xs text-muted-foreground">
            Factures payées ce mois
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Nouveaux abonnés
          </CardTitle>
          <ArrowUp className="size-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            +{stats.newSubscribersThisMonth}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.activeSubscriptions} abonnements actifs
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Churn</CardTitle>
          <ArrowDown className="size-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">
            -{stats.churnedThisMonth}
          </div>
          <p className="text-xs text-muted-foreground">Annulations ce mois</p>
        </CardContent>
      </Card>
    </div>
  )
}
