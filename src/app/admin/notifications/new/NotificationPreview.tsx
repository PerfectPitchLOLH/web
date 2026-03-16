import * as LucideIcons from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import type { NotificationFormData } from './page'

type Props = {
  data: NotificationFormData
}

function NotificationIcon({ iconName }: { iconName: string }) {
  const Icon = LucideIcons[
    iconName as keyof typeof LucideIcons
  ] as React.ComponentType<{
    className?: string
  }>
  return Icon ? (
    <Icon className="size-5" />
  ) : (
    <LucideIcons.Bell className="size-5" />
  )
}

export function NotificationPreview({ data }: Props) {
  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle>Prévisualisation</CardTitle>
        <CardDescription>Aperçu de ce que verra l'utilisateur</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-4 flex items-center justify-between border-b pb-2">
            <h3 className="font-semibold">Notifications</h3>
            <span className="text-xs text-muted-foreground">Maintenant</span>
          </div>

          <div className="rounded-lg bg-muted p-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <NotificationIcon iconName={data.icon} />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium">
                  {data.title || 'Titre de la notification'}
                </h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.description || 'Description de la notification'}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  À l'instant
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
