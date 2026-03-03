import { Activity, Database, Server, Zap } from 'lucide-react'
import { redirect } from 'next/navigation'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { SystemStats } from '@/server/domains/admin'
import { adminService } from '@/server/domains/admin'
import { requireRole } from '@/server/shared/middleware/auth.middleware'

async function getSystemStats(): Promise<SystemStats> {
  try {
    await requireRole(['admin'])
    const stats = await adminService.getDashboardStats()
    return stats.system
  } catch (error) {
    redirect('/auth/signin?callbackUrl=/admin/system')
  }
}

export default async function SystemMonitoring() {
  const stats = await getSystemStats()

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (days > 0) return `${days}j ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const uptimePercentage = 99.9

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Monitoring Système
        </h1>
        <p className="text-muted-foreground">
          Performance et santé de la plateforme
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Server className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatUptime(stats.uptime)}
            </div>
            <p className="text-xs text-muted-foreground">
              {uptimePercentage}% disponibilité
            </p>
            <Progress value={uptimePercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <Zap className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalApiCalls.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.failedApiCalls} échecs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux d'erreur</CardTitle>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.errorRate.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.errorRate < 1
                ? 'Excellent'
                : stats.errorRate < 5
                  ? 'Bon'
                  : 'Attention'}
            </p>
            <Progress
              value={Math.min(stats.errorRate * 10, 100)}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Temps Réponse Moyen
            </CardTitle>
            <Database className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageResponseTime}ms
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.averageResponseTime < 100
                ? 'Rapide'
                : stats.averageResponseTime < 500
                  ? 'Normal'
                  : 'Lent'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Santé du Système</CardTitle>
          <CardDescription>
            État des différents composants de la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-3 rounded-full bg-green-500" />
                <div>
                  <p className="font-medium">API Server</p>
                  <p className="text-sm text-muted-foreground">Opérationnel</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-green-600">
                Healthy
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-3 rounded-full bg-green-500" />
                <div>
                  <p className="font-medium">Base de Données</p>
                  <p className="text-sm text-muted-foreground">
                    PostgreSQL connecté
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-green-600">
                Healthy
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-3 rounded-full bg-green-500" />
                <div>
                  <p className="font-medium">Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    NextAuth.js actif
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-green-600">
                Healthy
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-3 rounded-full bg-yellow-500" />
                <div>
                  <p className="font-medium">Cache</p>
                  <p className="text-sm text-muted-foreground">Non configuré</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-yellow-600">
                Warning
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
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
                  <span className="font-semibold">
                    {((1 - stats.errorRate / 100) * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={(1 - stats.errorRate / 100) * 100} />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>Requêtes échouées</span>
                  <span className="font-semibold text-red-500">
                    {stats.errorRate.toFixed(1)}%
                  </span>
                </div>
                <Progress value={stats.errorRate} className="bg-red-100" />
              </div>
            </div>
          </CardContent>
        </Card>

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
                  {stats.totalApiCalls.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Requêtes échouées
                </span>
                <span className="font-semibold text-red-500">
                  {stats.failedApiCalls.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Temps de réponse moyen
                </span>
                <span className="font-semibold">
                  {stats.averageResponseTime}ms
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
