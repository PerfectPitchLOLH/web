'use client'

import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { memo, useMemo } from 'react'

import { UserMenu } from '@/components/dashboard/topbar/userMenu'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'

import { NotificationsPopover } from './notificationsPopover'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/partitions': 'Partitions',
  '/dashboard/audio-to-sheet': 'Audio to Sheet',
  '/dashboard/falling-notes': 'Touches qui tombent',
} as const

export const DashboardTopbar = memo(function DashboardTopbar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()

  const title = useMemo(() => PAGE_TITLES[pathname] || 'Dashboard', [pathname])

  const getGreeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bonjour'
    if (hour < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }, [])

  const greeting = useMemo(() => {
    if (pathname !== '/dashboard') return null
    const name = session?.user?.name
    return name ? `${getGreeting}, ${name}.` : `${getGreeting}.`
  }, [pathname, session?.user?.name, getGreeting])

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger />
      <div className="flex flex-1 items-center justify-between gap-4">
        <div className="flex-1">
          {pathname === '/dashboard' ? (
            status === 'loading' ? (
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{greeting}</p>
            )
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
})
