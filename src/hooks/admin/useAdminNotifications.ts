'use client'

import { useEffect, useState } from 'react'

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

export function useAdminNotifications() {
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
      if (!response.ok) throw new Error('Échec du chargement des notifications')
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
        { method: 'DELETE' },
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

  return {
    notifications,
    total,
    loading,
    error,
    alertOpen,
    setAlertOpen,
    handleDelete,
    confirmDelete,
  }
}
