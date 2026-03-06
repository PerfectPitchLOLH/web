'use client'

import type { Session } from 'next-auth'

import { ImpersonationBanner } from '@/components/admin/impersonation'
import { AppSidebar } from '@/components/dashboard/sidebar/AppSidebar'
import { DashboardTopbar } from '@/components/dashboard/topbar/DashboardTopbar'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { SidebarProvider } from '@/components/ui/sidebar'

interface DashboardShellProps {
  children: React.ReactNode
  session: Session
}

export function DashboardShell({ children, session }: DashboardShellProps) {
  return (
    <SessionProvider session={session}>
      <SidebarProvider>
        <ImpersonationBanner />
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            <DashboardTopbar />
            <main className="flex-1">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </SessionProvider>
  )
}
