import {
  Eye,
  MoreVertical,
  Shield,
  Trash2,
  User as UserIcon,
  UserCheck as UserCheckIcon,
  UserX,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import type { User } from './types'

type UserActionsDropdownProps = {
  user: User
  canAct: boolean
  disabledReason: string | null
  onRoleChange: (role: string) => Promise<void>
  onSuspend: () => void
  onDelete: () => void
}

export function UserActionsDropdown({
  user,
  canAct,
  disabledReason,
  onRoleChange,
  onSuspend,
  onDelete,
}: UserActionsDropdownProps) {
  if (!canAct) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Button variant="ghost" size="icon" disabled>
                <MoreVertical className="size-4" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{disabledReason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <a href={`/api/impersonation/start-redirect?targetUserId=${user.id}`}>
            <Eye className="mr-2 size-4" />
            Voir comme cet utilisateur
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Shield className="mr-2 size-4" />
            Changer le rôle
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onClick={() => onRoleChange('admin')}
              disabled={user.role === 'admin'}
            >
              <Shield className="mr-2 size-4" />
              Admin
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onRoleChange('user')}
              disabled={user.role === 'user'}
            >
              <UserIcon className="mr-2 size-4" />
              User
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onSuspend}>
          {user.status === 'suspended' ? (
            <>
              <UserCheckIcon className="mr-2 size-4" />
              Réactiver
            </>
          ) : (
            <>
              <UserX className="mr-2 size-4" />
              Suspendre
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onDelete} className="text-red-600">
          <Trash2 className="mr-2 size-4" />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
