import { Activity, Database, Server, Zap } from 'lucide-react'
import { redirect } from 'next/navigation'

import { StatCard } from '@/components/admin/shared/StatCard'
import {
  ApiPerformanceCard,
  SystemHeader,
  SystemHealthCard,
  SystemMetricsCard,
} from '@/components/admin/system'
import {
  formatUptime,
  getErrorRateStatus,
  getResponseTimeStatus,
} from '@/lib/admin/systemUtils'
import type { SystemStats } from '@/server/domains/admin'
import { adminService } from '@/server/domains/admin'
import { requireRole } from '@/server/shared/middleware/auth.middleware'

async function getSystemStats(): Promise<SystemStats> {
  try {
    await requireRole(['admin'])
    const stats = await adminService.getDashboardStats()
    return stats.system
  } catch {
    redirect('/auth/signin?callbackUrl=/admin/system')
  }
}

export default async function SystemMonitoring() {
  const stats = await getSystemStats()
  const uptimePercentage = 99.9

  return (
    <div className="space-y-8">
      <SystemHeader />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Uptime"
          value={formatUptime(stats.uptime)}
          description={`${uptimePercentage}% disponibilité`}
          icon={Server}
          progress={uptimePercentage}
        />
        <StatCard
          title="API Calls"
          value={stats.totalApiCalls.toLocaleString()}
          description={`${stats.failedApiCalls} échecs`}
          icon={Zap}
        />
        <StatCard
          title="Taux d'erreur"
          value={`${stats.errorRate.toFixed(2)}%`}
          description={getErrorRateStatus(stats.errorRate)}
          icon={Activity}
          progress={Math.min(stats.errorRate * 10, 100)}
        />
        <StatCard
          title="Temps Réponse Moyen"
          value={`${stats.averageResponseTime}ms`}
          description={getResponseTimeStatus(stats.averageResponseTime)}
          icon={Database}
        />
      </div>

      <SystemHealthCard />

      <div className="grid gap-4 md:grid-cols-2">
        <ApiPerformanceCard errorRate={stats.errorRate} />
        <SystemMetricsCard
          totalApiCalls={stats.totalApiCalls}
          failedApiCalls={stats.failedApiCalls}
          averageResponseTime={stats.averageResponseTime}
        />
      </div>
    </div>
  )
}
