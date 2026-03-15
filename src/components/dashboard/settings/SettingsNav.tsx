'use client'

import { Bell, Lock, Palette, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const navItems = [
  {
    title: 'Profil',
    href: '/dashboard/settings',
    icon: User,
  },
  {
    title: 'Sécurité',
    href: '/dashboard/settings/security',
    icon: Lock,
  },
  {
    title: 'Notifications',
    href: '/dashboard/settings/notifications',
    icon: Bell,
  },
  {
    title: 'Apparence',
    href: '/dashboard/settings/appearance',
    icon: Palette,
  },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 w-full">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-secondary text-secondary-foreground font-medium'
                : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.title}
          </Link>
        )
      })}
    </nav>
  )
}
