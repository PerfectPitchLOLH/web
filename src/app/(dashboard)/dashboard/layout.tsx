import type { Metadata } from 'next'

import { AppSidebar } from '@/components/dashboard/sidebar/AppSidebar'
import { DashboardTopbar } from '@/components/dashboard/topbar/DashboardTopbar'
import { SidebarProvider } from '@/components/ui/sidebar'

export const metadata: Metadata = {
  title: 'Dashboard - Notavex',
  description: 'Votre espace de travail musical',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <DashboardTopbar />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}
