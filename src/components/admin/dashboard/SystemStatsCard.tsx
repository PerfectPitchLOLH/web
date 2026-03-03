import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type SystemStatsCardProps = {
  uptime: number
  totalApiCalls: number
  failedApiCalls: number
  errorRate: number
}

export function SystemStatsCard({
  uptime,
  totalApiCalls,
  failedApiCalls,
  errorRate,
}: SystemStatsCardProps) {
  const hours = Math.floor(uptime / 3600)
  const minutes = Math.floor((uptime % 3600) / 60)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Système</CardTitle>
        <CardDescription>Performance et disponibilité</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Uptime</span>
            <span className="font-semibold">
              {hours}h {minutes}m
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Total API Calls</span>
            <span className="font-semibold">{totalApiCalls}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Failed Calls</span>
            <span className="font-semibold text-red-500">{failedApiCalls}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Error Rate</span>
            <span className="font-semibold">{errorRate.toFixed(2)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
