import { Shield, TrendingUp, UserCheck, Users } from 'lucide-react'
import { redirect } from 'next/navigation'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Tableau de Bord Admin
        </h1>
        <p className="text-muted-foreground">
          Vue d'ensemble des statistiques de la plateforme
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Utilisateurs
            </CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.users.newUsersThisMonth} ce mois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Utilisateurs Actifs
            </CardTitle>
            <UserCheck className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Email vérifié</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Nouveaux Utilisateurs
            </CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.users.newUsersThisWeek}
            </div>
            <p className="text-xs text-muted-foreground">Cette semaine</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Administrateurs
            </CardTitle>
            <Shield className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.users.usersByRole.admin || 0}
            </div>
            <p className="text-xs text-muted-foreground">Rôle administrateur</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Répartition par Rôle</CardTitle>
            <CardDescription>
              Distribution des utilisateurs par rôle
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.users.usersByRole).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`size-3 rounded-full ${
                        role === 'admin'
                          ? 'bg-red-500'
                          : role === 'user'
                            ? 'bg-blue-500'
                            : 'bg-gray-500'
                      }`}
                    />
                    <span className="capitalize">{role}</span>
                  </div>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
                  {Math.floor(stats.system.uptime / 3600)}h{' '}
                  {Math.floor((stats.system.uptime % 3600) / 60)}m
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Total API Calls</span>
                <span className="font-semibold">
                  {stats.system.totalApiCalls}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Failed Calls</span>
                <span className="font-semibold text-red-500">
                  {stats.system.failedApiCalls}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Error Rate</span>
                <span className="font-semibold">
                  {stats.system.errorRate.toFixed(2)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
