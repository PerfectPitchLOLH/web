import {
  Activity,
  BarChart3,
  FileText,
  Home,
  Shield,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { auth } from '@/server/lib/auth'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/admin')
  }

  if (session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r bg-card">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center border-b px-6">
            <Shield className="mr-2 size-6" />
            <h1 className="text-xl font-bold">Admin Panel</h1>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            <Link href="/dashboard">
              <Button variant="ghost" className="w-full justify-start">
                <Home className="mr-2 size-4" />
                Retour au Dashboard
              </Button>
            </Link>

            <div className="my-4 border-t" />

            <Link href="/admin">
              <Button variant="ghost" className="w-full justify-start">
                <BarChart3 className="mr-2 size-4" />
                Analytics
              </Button>
            </Link>

            <Link href="/admin/users">
              <Button variant="ghost" className="w-full justify-start">
                <Users className="mr-2 size-4" />
                Gestion Utilisateurs
              </Button>
            </Link>

            <Link href="/admin/audit-logs">
              <Button variant="ghost" className="w-full justify-start">
                <FileText className="mr-2 size-4" />
                Logs d'Audit
              </Button>
            </Link>

            <Link href="/admin/system">
              <Button variant="ghost" className="w-full justify-start">
                <Activity className="mr-2 size-4" />
                Monitoring Système
              </Button>
            </Link>
          </nav>

          <div className="border-t p-4">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium">Connecté en tant que</p>
              <p className="text-xs text-muted-foreground">
                {session.user.name || session.user.email}
              </p>
              <p className="mt-1 text-xs font-semibold text-primary">
                {session.user.role.toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-8">{children}</div>
      </main>
    </div>
  )
}
