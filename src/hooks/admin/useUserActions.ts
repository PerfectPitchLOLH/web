import { useState } from 'react'

type UseUserActionsOptions = {
  onSuccess?: () => void
}

export function useUserActions(options?: UseUserActionsOptions) {
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(true)
    setActionError(null)

    try {
      const res = await fetch('/api/admin/users/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Failed to update role')
      }

      options?.onSuccess?.()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update role'
      setActionError(message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSuspendUser = async (userId: string) => {
    setActionLoading(true)
    setActionError(null)

    try {
      const res = await fetch('/api/admin/users/suspend', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Failed to suspend user')
      }

      options?.onSuccess?.()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to suspend user'
      setActionError(message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    setActionLoading(true)
    setActionError(null)

    try {
      const res = await fetch('/api/admin/users/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Failed to delete user')
      }

      options?.onSuccess?.()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete user'
      setActionError(message)
    } finally {
      setActionLoading(false)
    }
  }

  return {
    handleRoleChange,
    handleSuspendUser,
    handleDeleteUser,
    actionLoading,
    actionError,
  }
}
