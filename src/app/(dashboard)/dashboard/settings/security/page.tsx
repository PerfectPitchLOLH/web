import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { SecuritySettings } from '@/components/dashboard/settings/security/SecuritySettings'
import { SecuritySettingsSkeleton } from '@/components/dashboard/settings/skeletons/SecuritySettingsSkeleton'
import { settingsController } from '@/server/domains/settings'
import { auth } from '@/server/lib/auth'

async function SecuritySettingsLoader() {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')

  const response = await settingsController.getSettings()
  const data = await response.json()

  if (!data.success) redirect('/dashboard')

  return <SecuritySettings settings={data.data} />
}

export default function SecurityPage() {
  return (
    <Suspense fallback={<SecuritySettingsSkeleton />}>
      <SecuritySettingsLoader />
    </Suspense>
  )
}
