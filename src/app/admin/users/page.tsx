'use client'

import { useState } from 'react'

import { Pagination } from '@/components/admin/shared/Pagination'
import {
  type ActionDialog,
  ActionDialogs,
  type User,
  UserFilters,
  UserManagementHeader,
  UserTable,
  UserTableSkeleton,
} from '@/components/admin/users'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { InlineAlert } from '@/components/ui/inline-alert'
import {
  useCurrentUser,
  useUserActions,
  useUserManagement,
  useUserPermissions,
} from '@/hooks/admin'

export default function UsersManagement() {
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

  const handleOpenSuspendDialog = (user: User) => {
    setActionDialog({ type: 'suspend', user })
  }

  const handleOpenDeleteDialog = (user: User) => {
    setActionDialog({ type: 'delete', user })
  }

  const handleCloseDialog = () => {
    setActionDialog({ type: null, user: null })
  }

  const handleConfirmSuspend = async () => {
    if (!actionDialog.user) return
    await handleSuspendUser(actionDialog.user.id)
    handleCloseDialog()
  }

  const handleConfirmDelete = async () => {
    if (!actionDialog.user) return
    await handleDeleteUser(actionDialog.user.id)
    handleCloseDialog()
  }

  const displayError = error || actionError

  return (
    <div className="space-y-8">
      <UserManagementHeader />

      {displayError && <InlineAlert message={displayError} />}

      <UserFilters
        search={search}
        roleFilter={roleFilter}
        onSearchChange={setSearch}
        onRoleFilterChange={setRoleFilter}
        onSearch={handleSearch}
      />

      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs</CardTitle>
          <CardDescription>
            {users?.total || 0} utilisateur(s) trouvé(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <UserTableSkeleton />
          ) : (
            <>
              <UserTable
                users={users?.users || []}
                onRoleChange={handleRoleChange}
                onSuspend={handleOpenSuspendDialog}
                onDelete={handleOpenDeleteDialog}
                canPerformAction={canPerformAction}
                getDisabledReason={getDisabledReason}
              />

              {users && users.totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={users.totalPages}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ActionDialogs
        actionDialog={actionDialog}
        onClose={handleCloseDialog}
        onConfirmSuspend={handleConfirmSuspend}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  )
}
