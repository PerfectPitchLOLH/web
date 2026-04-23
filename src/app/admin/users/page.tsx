'use client'

import { Pagination } from '@/components/admin/shared/Pagination'
import {
  ActionDialogs,
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
import { useAdminUsersPage } from '@/hooks/admin/useAdminUsersPage'

export default function UsersManagement() {
  const {
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
  } = useAdminUsersPage()

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
