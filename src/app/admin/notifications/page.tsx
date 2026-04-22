'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'

import { NotificationsTable } from '@/components/admin/notifications/NotificationsTable'
import { NotificationStats } from '@/components/admin/notifications/NotificationStats'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { useAdminNotifications } from '@/hooks/admin/useAdminNotifications'

export default function AdminNotificationsPage() {
  const {
    notifications,
    total,
    loading,
    error,
    alertOpen,
    setAlertOpen,
    handleDelete,
    confirmDelete,
  } = useAdminNotifications()

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
