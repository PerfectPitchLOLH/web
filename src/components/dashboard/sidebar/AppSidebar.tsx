'use client'

import { AudioLines, Coins, FileMusic, Home, Piano } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const navigationItems = [
  {
    title: 'Accueil',
    url: '/dashboard',
    icon: Home,
  },
  {
    title: 'Mes partitions',
    url: '/dashboard/partitions',
    icon: FileMusic,
  },
]

const featuresItems = [
  {
    title: 'Audio to sheet',
    url: '/dashboard/audio-to-sheet',
    icon: AudioLines,
  },
  {
    title: 'Touches qui tombent',
    url: '/dashboard/falling-notes',
    icon: Piano,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-2 py-2 cursor-pointer group-data-[collapsible=icon]:justify-center"
            >
              <div className="flex aspect-square size-8 items-center justify-center">
                <Image
                  src={
                    mounted && resolvedTheme === 'dark'
                      ? '/logo_dark.svg'
                      : '/logo_light.svg'
                  }
                  alt="Notavex Logo"
                  width={32}
                  height={32}
                  className="size-8"
                />
              </div>
              <div className="group-data-[collapsible=icon]:hidden">
                <span className="font-semibold">Notavex</span>
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Features</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {featuresItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:block hidden">
          <SidebarGroupContent>
            <SidebarMenu>
              {featuresItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Améliorer">
              <Link href="/dashboard/subscription#plan">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-amber-500 text-white">
                  <Coins className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                  <span className="font-semibold">Améliorer</span>
                  <span className="text-xs text-muted-foreground">
                    Abonnement & Crédits
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
