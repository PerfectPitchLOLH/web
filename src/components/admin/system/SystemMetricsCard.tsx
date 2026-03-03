import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type SystemMetricsCardProps = {
  totalApiCalls: number
  failedApiCalls: number
  averageResponseTime: number
}

export function SystemMetricsCard({
  totalApiCalls,
  failedApiCalls,
  averageResponseTime,
}: SystemMetricsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Statistiques</CardTitle>
        <CardDescription>Métriques système</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              Total requêtes
            </span>
            <span className="font-semibold">
              {totalApiCalls.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              Requêtes échouées
            </span>
            <span className="font-semibold text-red-500">
              {failedApiCalls.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              Temps de réponse moyen
            </span>
            <span className="font-semibold">{averageResponseTime}ms</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
