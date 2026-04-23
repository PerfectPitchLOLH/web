import * as LucideIcons from 'lucide-react'
import { Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Notification = {
  id: string
  userId: string
  type: string
  title: string
  description: string
  icon: string
  read: boolean
  createdAt: string
}

type Props = {
  notifications: Notification[]
  loading: boolean
  error: string | null
  onDelete: (id: string) => void
}

function NotificationIcon({ iconName }: { iconName: string }) {
  const Icon = LucideIcons[
    iconName as keyof typeof LucideIcons
  ] as React.ComponentType<{
    className?: string
  }>
  return Icon ? <Icon className="size-5" /> : null
}

const TYPE_LABELS: Record<string, { label: string; variant: any }> = {
  security: { label: 'Sécurité', variant: 'destructive' },
  activity: { label: 'Activité', variant: 'default' },
  update: { label: 'Mise à jour', variant: 'secondary' },
  marketing: { label: 'Marketing', variant: 'outline' },
  system: { label: 'Système', variant: 'default' },
  custom: { label: 'Personnalisé', variant: 'outline' },
}

export function NotificationsTable({
  notifications,
  loading,
  error,
  onDelete,
}: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="size-10 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-sm text-destructive">{error}</div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Aucune notification trouvée
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Titre</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {notifications.map((notification) => (
          <TableRow key={notification.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <NotificationIcon iconName={notification.icon} />
                <Badge variant={TYPE_LABELS[notification.type]?.variant}>
                  {TYPE_LABELS[notification.type]?.label || notification.type}
                </Badge>
              </div>
            </TableCell>
            <TableCell className="font-medium">{notification.title}</TableCell>
            <TableCell className="max-w-md truncate text-muted-foreground">
              {notification.description}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {new Date(notification.createdAt).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(notification.id)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
