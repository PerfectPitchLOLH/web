import { Badge } from '@/components/ui/badge'
import { TableCell, TableRow } from '@/components/ui/table'

import type { User } from './types'
import { UserActionsDropdown } from './UserActionsDropdown'
import { UserRoleBadge } from './UserRoleBadge'
import { UserStatusBadge } from './UserStatusBadge'

type UserTableRowProps = {
  user: User
  canAct: boolean
  disabledReason: string | null
  onRoleChange: (userId: string, role: string) => Promise<void>
  onSuspend: (user: User) => void
  onDelete: (user: User) => void
}

export function UserTableRow({
  user,
  canAct,
  disabledReason,
  onRoleChange,
  onSuspend,
  onDelete,
}: UserTableRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">{user.name}</TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>
        <UserRoleBadge role={user.role} isRootAdmin={user.isRootAdmin} />
      </TableCell>
      <TableCell>
        <UserStatusBadge status={user.status} />
      </TableCell>
      <TableCell>
        {user.emailVerified ? (
          <Badge variant="outline" className="bg-green-500/10">
            Oui
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-yellow-500/10">
            Non
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {new Date(user.createdAt).toLocaleDateString('fr-FR')}
      </TableCell>
      <TableCell>
        <UserActionsDropdown
          user={user}
          canAct={canAct}
          disabledReason={disabledReason}
          onRoleChange={(role) => onRoleChange(user.id, role)}
          onSuspend={() => onSuspend(user)}
          onDelete={() => onDelete(user)}
        />
      </TableCell>
    </TableRow>
  )
}
