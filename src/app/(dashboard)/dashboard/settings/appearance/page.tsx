import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { AppearanceSettings } from '@/components/dashboard/settings/appearance/AppearanceSettings'
import { AppearanceSettingsSkeleton } from '@/components/dashboard/settings/skeletons/AppearanceSettingsSkeleton'
import { settingsController } from '@/server/domains/settings'
import { auth } from '@/server/lib/auth'

async function AppearanceSettingsLoader() {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')

  const response = await settingsController.getSettings()
  const data = await response.json()

  if (!data.success) redirect('/dashboard')

  return <AppearanceSettings settings={data.data} />
}

export default function AppearancePage() {
  return (
    <Suspense fallback={<AppearanceSettingsSkeleton />}>
      <AppearanceSettingsLoader />
    </Suspense>
  )
}
