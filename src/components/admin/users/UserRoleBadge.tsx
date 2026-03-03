import { Crown, Shield, User as UserIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'

type UserRoleBadgeProps = {
  role: string
  isRootAdmin: boolean
}

function getRoleBadgeVariant(role: string) {
  switch (role) {
    case 'admin':
      return 'destructive'
    case 'user':
      return 'default'
    default:
      return 'outline'
  }
}

export function UserRoleBadge({ role, isRootAdmin }: UserRoleBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant={getRoleBadgeVariant(role)}>
        {role === 'admin' && <Shield className="mr-1 size-3" />}
        {role === 'user' && <UserIcon className="mr-1 size-3" />}
        {role}
      </Badge>
      {isRootAdmin && (
        <Badge
          variant="outline"
          className="border-yellow-500 bg-yellow-500/10 text-yellow-500"
        >
          <Crown className="mr-1 size-3" />
          Root Admin
        </Badge>
      )}
    </div>
  )
}
