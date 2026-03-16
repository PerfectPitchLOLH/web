'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

import { NotificationComposer } from './NotificationComposer'
import { NotificationPreview } from './NotificationPreview'

export type NotificationFormData = {
  type: string
  title: string
  description: string
  icon: string
  targeting: {
    sendToAll: boolean
    filters: {
      subscriptionStatus?: string
      subscriptionPlanName?: string
      activityDays?: number
      userIds?: string[]
    }
  }
}

export default function NewNotificationPage() {
  const [formData, setFormData] = useState<NotificationFormData>({
    type: 'system',
    title: '',
    description: '',
    icon: 'Bell',
    targeting: {
      sendToAll: false,
      filters: {},
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/notifications">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nouvelle Notification</h1>
          <p className="text-muted-foreground">
            Créez et envoyez une notification aux utilisateurs
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <NotificationComposer data={formData} onChange={setFormData} />
        <NotificationPreview data={formData} />
      </div>
    </div>
  )
}
