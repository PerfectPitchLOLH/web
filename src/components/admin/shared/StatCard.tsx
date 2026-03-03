import type { LucideIcon } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

type StatCardProps = {
  title: string
  value: string
  description: string
  icon: LucideIcon
  progress?: number
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  progress,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {progress !== undefined && (
          <Progress value={progress} className="mt-2" />
        )}
      </CardContent>
    </Card>
  )
}
