'use client'

import { usePathname } from 'next/navigation'

import { UserMenu } from '@/components/dashboard/topbar/user-menu'
import { SidebarTrigger } from '@/components/ui/sidebar'

import { NotificationsPopover } from './notifications-popover'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Heureux de te revoir.',
  '/dashboard/partitions': 'Partitions',
  '/dashboard/audio-to-sheet': 'Audio to Sheet',
  '/dashboard/falling-notes': 'Touches qui tombent',
}

export function DashboardTopbar() {
  const pathname = usePathname()
  const title = pageTitles[pathname] || 'Dashboard'

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger />
      <div className="flex flex-1 items-center justify-between gap-4">
        <div className="flex-1">
          {pathname === '/dashboard' ? (
            <p className="text-sm text-muted-foreground">{title}</p>
          ) : (
            <h1 className="text-xl font-semibold">{title}</h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          <NotificationsPopover />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
