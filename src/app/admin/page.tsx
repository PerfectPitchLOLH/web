import { Shield, TrendingUp, UserCheck, Users } from 'lucide-react'
import { redirect } from 'next/navigation'

import {
  AdminDashboardHeader,
  RoleDistributionCard,
  SystemStatsCard,
} from '@/components/admin/dashboard'
import { StatCard } from '@/components/admin/shared/StatCard'
import type { AdminDashboardStats } from '@/server/domains/admin'
import { adminService } from '@/server/domains/admin'
import { requireRole } from '@/server/shared/middleware/auth.middleware'

async function getDashboardStats(): Promise<AdminDashboardStats> {
  try {
    await requireRole(['admin'])
    return await adminService.getDashboardStats()
  } catch (error) {
    redirect('/auth/signin?callbackUrl=/admin')
  }
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats()

  return (
    <div className="space-y-8">
      <AdminDashboardHeader />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Utilisateurs"
          value={stats.users.totalUsers.toString()}
          description={`+${stats.users.newUsersThisMonth} ce mois`}
          icon={Users}
        />
        <StatCard
          title="Utilisateurs Actifs"
          value={stats.users.activeUsers.toString()}
          description="Email vérifié"
          icon={UserCheck}
        />
        <StatCard
          title="Nouveaux Utilisateurs"
          value={stats.users.newUsersThisWeek.toString()}
          description="Cette semaine"
          icon={TrendingUp}
        />
        <StatCard
          title="Administrateurs"
          value={(stats.users.usersByRole.admin || 0).toString()}
          description="Rôle administrateur"
          icon={Shield}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RoleDistributionCard usersByRole={stats.users.usersByRole} />
        <SystemStatsCard
          uptime={stats.system.uptime}
          totalApiCalls={stats.system.totalApiCalls}
          failedApiCalls={stats.system.failedApiCalls}
          errorRate={stats.system.errorRate}
        />
      </div>
    </div>
  )
}
