'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const TAB_ITEMS = [
  { label: 'Profil', href: '/dashboard/settings' },
  { label: 'Sécurité', href: '/dashboard/settings/security' },
  { label: 'Notifications', href: '/dashboard/settings/notifications' },
  { label: 'Apparence', href: '/dashboard/settings/appearance' },
]

export function SettingsTabs() {
  const pathname = usePathname()

  return (
    <div className="border-b flex">
      {TAB_ITEMS.map((tab) => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              isActive
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
