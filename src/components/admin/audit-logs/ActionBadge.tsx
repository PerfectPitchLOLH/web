import { Badge } from '@/components/ui/badge'

type ActionBadgeProps = {
  action: string
}

function getActionBadgeVariant(action: string) {
  if (action.includes('updated') || action.includes('changed')) return 'default'
  if (action.includes('deleted') || action.includes('suspended'))
    return 'destructive'
  return 'secondary'
}

export function ActionBadge({ action }: ActionBadgeProps) {
  return <Badge variant={getActionBadgeVariant(action)}>{action}</Badge>
}
