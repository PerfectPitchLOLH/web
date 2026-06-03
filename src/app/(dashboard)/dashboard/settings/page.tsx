import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { ProfileSettings } from '@/components/dashboard/settings/profile/ProfileSettings'
import { ProfileSettingsSkeleton } from '@/components/dashboard/settings/skeletons/ProfileSettingsSkeleton'
import { settingsController } from '@/server/domains/settings'
import { auth } from '@/server/lib/auth'

async function ProfileSettingsLoader() {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')

  const response = await settingsController.getSettings()
  const data = await response.json()

  if (!data.success) redirect('/dashboard')

  return <ProfileSettings settings={data.data} />
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<ProfileSettingsSkeleton />}>
      <ProfileSettingsLoader />
    </Suspense>
  )
}
