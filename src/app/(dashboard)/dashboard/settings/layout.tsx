import type { Metadata } from 'next'

import { SettingsTabs } from '@/components/dashboard/settings/SettingsTabs'

export const metadata: Metadata = {
  title: 'Paramètres - Notavex',
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">
      <div className="max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Paramètres</h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos préférences et la sécurité de votre compte
          </p>
        </div>
        <SettingsTabs />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}
