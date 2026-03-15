import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { NotificationSettings } from '@/components/dashboard/settings/notifications/NotificationSettings'
import { NotificationSettingsSkeleton } from '@/components/dashboard/settings/skeletons/NotificationSettingsSkeleton'
import { settingsController } from '@/server/domains/settings'
import { auth } from '@/server/lib/auth'

async function NotificationSettingsLoader() {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')

  const response = await settingsController.getSettings()
  const data = await response.json()

  if (!data.success) redirect('/dashboard')

  return <NotificationSettings settings={data.data} />
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<NotificationSettingsSkeleton />}>
      <NotificationSettingsLoader />
    </Suspense>
  )
}
