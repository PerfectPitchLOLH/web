import { Badge } from '@/components/ui/badge'

type UserStatusBadgeProps = {
  status: string
}

export function UserStatusBadge({ status }: UserStatusBadgeProps) {
  switch (status) {
    case 'active':
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-500">
          Actif
        </Badge>
      )
    case 'suspended':
      return (
        <Badge variant="outline" className="bg-orange-500/10 text-orange-500">
          Suspendu
        </Badge>
      )
    case 'deleted':
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-500">
          Supprimé
        </Badge>
      )
    default:
      return null
  }
}
