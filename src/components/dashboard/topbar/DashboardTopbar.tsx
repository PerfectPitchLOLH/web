'use client'

import { usePathname } from 'next/navigation'
import { memo, useMemo } from 'react'

import { UserMenu } from '@/components/dashboard/topbar/userMenu'
import { DevModeToggle } from '@/components/dev-mode'
import { SidebarTrigger } from '@/components/ui/sidebar'

import { NotificationsPopover } from './notificationsPopover'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Accueil',
  '/dashboard/partitions': 'Partitions',
  '/dashboard/audio-to-sheet': 'Audio to Sheet',
  '/dashboard/falling-notes': 'Touches qui tombent',
} as const

export const DashboardTopbar = memo(function DashboardTopbar() {
  const pathname = usePathname()

  const title = useMemo(() => PAGE_TITLES[pathname] || 'Dashboard', [pathname])

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger />
      <div className="flex flex-1 items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="flex items-center gap-2">
          <DevModeToggle />
          <NotificationsPopover />
          <UserMenu />
        </div>
      </div>
    </header>
  )
})
