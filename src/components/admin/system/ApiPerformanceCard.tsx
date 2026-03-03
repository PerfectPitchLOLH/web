import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

type ApiPerformanceCardProps = {
  errorRate: number
}

export function ApiPerformanceCard({ errorRate }: ApiPerformanceCardProps) {
  const successRate = (1 - errorRate / 100) * 100

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance API</CardTitle>
        <CardDescription>Statistiques des requêtes API</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>Requêtes réussies</span>
              <span className="font-semibold">{successRate.toFixed(1)}%</span>
            </div>
            <Progress value={successRate} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>Requêtes échouées</span>
              <span className="font-semibold text-red-500">
                {errorRate.toFixed(1)}%
              </span>
            </div>
            <Progress value={errorRate} className="bg-red-100" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
