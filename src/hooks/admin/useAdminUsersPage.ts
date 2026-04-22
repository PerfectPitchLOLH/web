'use client'

import { useState } from 'react'

import type { ActionDialog, User } from '@/components/admin/users'
import { useUserActions, useUserManagement } from '@/hooks/admin'
import { useCurrentUser } from '@/hooks/admin/useCurrentUser'
import { useUserPermissions } from '@/hooks/admin/useUserPermissions'

export function useAdminUsersPage() {
  const { currentUser } = useCurrentUser()

  const {
    users,
    loading,
    error,
    search,
    roleFilter,
    page,
    setSearch,
    setRoleFilter,
    setPage,
    refetchUsers,
    handleSearch,
  } = useUserManagement()

  const { handleRoleChange, handleSuspendUser, handleDeleteUser, actionError } =
    useUserActions({ onSuccess: refetchUsers })

  const { canPerformAction, getDisabledReason } =
    useUserPermissions(currentUser)

  const [actionDialog, setActionDialog] = useState<ActionDialog>({
    type: null,
    user: null,
  })

  const displayError = error || actionError

  function handleOpenSuspendDialog(user: User) {
    setActionDialog({ type: 'suspend', user })
  }

  function handleOpenDeleteDialog(user: User) {
    setActionDialog({ type: 'delete', user })
  }

  function handleCloseDialog() {
    setActionDialog({ type: null, user: null })
  }

  async function handleConfirmSuspend() {
    if (!actionDialog.user) return
    await handleSuspendUser(actionDialog.user.id)
    handleCloseDialog()
  }

  async function handleConfirmDelete() {
    if (!actionDialog.user) return
    await handleDeleteUser(actionDialog.user.id)
    handleCloseDialog()
  }

  return {
    currentUser,
    users,
    loading,
    displayError,
    search,
    roleFilter,
    page,
    setSearch,
    setRoleFilter,
    setPage,
    handleSearch,
    handleRoleChange,
    canPerformAction,
    getDisabledReason,
    actionDialog,
    handleOpenSuspendDialog,
    handleOpenDeleteDialog,
    handleCloseDialog,
    handleConfirmSuspend,
    handleConfirmDelete,
  }
}
