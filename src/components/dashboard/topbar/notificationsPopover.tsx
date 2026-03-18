'use client'

import * as LucideIcons from 'lucide-react'
import { Bell } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

type Notification = {
  id: string
  type: string
  title: string
  description: string
  icon: string
  read: boolean
  createdAt: string
}

type NotificationListResponse = {
  notifications: Notification[]
  total: number
  unreadCount: number
}

function NotificationIcon({ iconName }: { iconName: string }) {
  const Icon = LucideIcons[
    iconName as keyof typeof LucideIcons
  ] as React.ComponentType<{
    className?: string
  }>
  return Icon ? <Icon className="size-5" /> : <Bell className="size-5" />
}

function NotificationSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg p-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-1 h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

export function NotificationsPopover() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    fetchUnreadCount()

    const eventSource = new EventSource('/api/notifications/stream')

    eventSource.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'new-notification') {
          fetchUnreadCount()
          if (open) {
            fetchNotifications()
          }
        } else if (data.type === 'unread-count') {
          setUnreadCount(data.count)
        }
      } catch {
        // Ignore parse errors
      }
    })

    eventSource.addEventListener('error', () => {
      eventSource.close()
    })

    return () => {
      eventSource.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchNotifications() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/notifications')
      if (!response.ok) {
        throw new Error('Échec du chargement des notifications')
      }
      const data = await response.json()
      if (data.success && data.data) {
        const result = data.data as NotificationListResponse
        setNotifications(result.notifications)
        setUnreadCount(result.unreadCount)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  async function fetchUnreadCount() {
    try {
      const response = await fetch('/api/notifications/unread-count')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setUnreadCount(data.data.count)
        }
      }
    } catch {
      // Silently fail for count
    }
  }

  async function handleMarkAllAsRead() {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      })
      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch {
      // Silently fail
    }
  }

  async function handleMarkAsRead(id: string) {
    try {
      const response = await fetch(
        `/api/notifications/${id}?action=mark-read`,
        {
          method: 'PATCH',
        },
      )
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch {
      // Silently fail
    }
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
        const notification = notifications.find((n) => n.id === id)
        if (notification && !notification.read) {
          setUnreadCount((prev) => Math.max(0, prev - 1))
        }
      }
    } catch {
      // Silently fail
    }
  }

  function handleOpenChange(value: boolean) {
    setOpen(value)
    if (value && notifications.length === 0) {
      fetchNotifications()
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "À l'instant"
    if (diffInSeconds < 3600)
      return `Il y a ${Math.floor(diffInSeconds / 60)} min`
    if (diffInSeconds < 86400)
      return `Il y a ${Math.floor(diffInSeconds / 3600)} h`
    if (diffInSeconds < 604800)
      return `Il y a ${Math.floor(diffInSeconds / 86400)} j`

    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="size-5" />
        <span className="sr-only">Notifications</span>
      </Button>
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
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
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{unreadCount} nouveau(x)</Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleMarkAllAsRead}
              >
                Tout lire
              </Button>
            </div>
          )}
        </div>
        <Separator className="my-2" />
        <div className="max-h-[400px] space-y-2 overflow-y-auto">
          {loading ? (
            <NotificationSkeleton />
          ) : error ? (
            <p className="py-4 text-center text-sm text-destructive">{error}</p>
          ) : notifications.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aucune notification
            </p>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`group relative rounded-lg p-3 ${notification.read ? 'bg-muted/50' : 'bg-muted'}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <NotificationIcon iconName={notification.icon} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-medium">
                        {notification.title}
                      </h4>
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="Supprimer"
                      >
                        <LucideIcons.X className="size-4 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {notification.description}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(notification.createdAt)}
                      </p>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-2 text-xs"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          Marquer comme lu
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
