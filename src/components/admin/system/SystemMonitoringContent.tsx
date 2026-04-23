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

const UPTIME_PERCENTAGE = 99.9

async function getSystemStats(): Promise<SystemStats> {
  try {
    await requireRole(['admin'])
    const stats = await adminService.getDashboardStats()
    return stats.system
  } catch {
    redirect('/auth/signin?callbackUrl=/admin/system')
  }
}

export async function SystemMonitoringContent() {
  const stats = await getSystemStats()

  return (
    <div className="space-y-8">
      <SystemHeader />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Uptime"
          value={formatUptime(stats.uptime)}
          description={`${UPTIME_PERCENTAGE}% disponibilité`}
          icon={Server}
          progress={UPTIME_PERCENTAGE}
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
