'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'

import { NotificationsTable } from './NotificationsTable'
import { NotificationStats } from './NotificationStats'

type Notification = {
  id: string
  userId: string
  type: string
  title: string
  description: string
  icon: string
  read: boolean
  createdAt: string
  updatedAt: string
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [alertOpen, setAlertOpen] = useState(false)
  const [notificationToDelete, setNotificationToDelete] = useState<
    string | null
  >(null)

  useEffect(() => {
    fetchNotifications()
  }, [])

  async function fetchNotifications() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/notifications?limit=50')
      if (!response.ok) {
        throw new Error('Échec du chargement des notifications')
      }
      const data = await response.json()
      if (data.success && data.data) {
        setNotifications(data.data.notifications)
        setTotal(data.data.total)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  function handleDelete(id: string) {
    setNotificationToDelete(id)
    setAlertOpen(true)
  }

  async function confirmDelete() {
    if (!notificationToDelete) return

    try {
      const response = await fetch(
        `/api/admin/notifications/${notificationToDelete}`,
        {
          method: 'DELETE',
        },
      )

      if (response.ok) {
        setNotifications((prev) =>
          prev.filter((n) => n.id !== notificationToDelete),
        )
        setTotal((prev) => prev - 1)
      } else {
        alert('Échec de la suppression')
      }
    } catch {
      alert('Erreur lors de la suppression')
    } finally {
      setAlertOpen(false)
      setNotificationToDelete(null)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Notifications</h1>
          <p className="text-muted-foreground">
            Envoyez des notifications aux utilisateurs
          </p>
        </div>
        <Link href="/admin/notifications/new">
          <Button>
            <Plus className="mr-2 size-4" />
            Nouvelle Notification
          </Button>
        </Link>
      </div>

      <NotificationStats />

      <Card>
        <CardHeader>
          <CardTitle>Notifications Envoyées</CardTitle>
          <CardDescription>{total} notification(s) au total</CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationsTable
            notifications={notifications}
            loading={loading}
            error={error}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        onConfirm={confirmDelete}
        title="Supprimer la notification"
        description="Êtes-vous sûr de vouloir supprimer cette notification ? Cette action est irréversible."
      />
    </div>
  )
}
