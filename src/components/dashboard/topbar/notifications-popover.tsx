'use client'

import { Bell } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

const mockNotifications = [
  {
    id: '1',
    title: 'Nouvelle fonctionnalité disponible',
    description: 'Audio to sheet est maintenant disponible !',
    date: '2024-02-25',
    read: false,
  },
  {
    id: '2',
    title: 'Mise à jour du système',
    description: 'Amélioration des performances de séparation',
    date: '2024-02-24',
    read: true,
  },
]

export function NotificationsPopover() {
  const [notifications] = useState(mockNotifications)
  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} nouveau(x)</Badge>
          )}
        </div>
        <Separator className="my-2" />
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aucune notification
            </p>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-lg p-3 ${notification.read ? 'bg-muted/50' : 'bg-muted'}`}
              >
                <h4 className="text-sm font-medium">{notification.title}</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  {notification.description}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {notification.date}
                </p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
