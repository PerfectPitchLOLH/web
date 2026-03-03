import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import type { User } from './types'
import { UserTableRow } from './UserTableRow'

type UserTableProps = {
  users: User[]
  onRoleChange: (userId: string, role: string) => Promise<void>
  onSuspend: (user: User) => void
  onDelete: (user: User) => void
  canPerformAction: (user: User) => boolean
  getDisabledReason: (user: User) => string | null
}

export function UserTable({
  users,
  onRoleChange,
  onSuspend,
  onDelete,
  canPerformAction,
  getDisabledReason,
}: UserTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Utilisateur</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Rôle</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Vérifié</TableHead>
          <TableHead>Créé le</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const canAct = canPerformAction(user)
          const disabledReason = getDisabledReason(user)

          return (
            <UserTableRow
              key={user.id}
              user={user}
              canAct={canAct}
              disabledReason={disabledReason}
              onRoleChange={onRoleChange}
              onSuspend={onSuspend}
              onDelete={onDelete}
            />
          )
        })}
      </TableBody>
    </Table>
  )
}
