'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { SettingsRow } from '@/components/dashboard/settings/SettingsRow'
import { Switch } from '@/components/ui/switch'
import { useUpdateNotifications } from '@/hooks/useSettings'
import type {
  NotificationPreferences,
  UserSettings,
} from '@/server/domains/settings/settings.types'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/server/domains/settings/settings.types'

type Props = {
  settings: UserSettings
}

const NOTIFICATION_ITEMS: {
  key: keyof NotificationPreferences
  title: string
  description: string
}[] = [
  {
    key: 'security',
    title: 'Alertes de sécurité',
    description:
      'Connexions suspectes, modifications de mot de passe, activité inhabituelle',
  },
  {
    key: 'activity',
    title: 'Activité du compte',
    description:
      'Transcriptions terminées, crédits utilisés, nouvelles partitions',
  },
  {
    key: 'updates',
    title: 'Mises à jour produit',
    description: 'Nouvelles fonctionnalités, améliorations et corrections',
  },
  {
    key: 'marketing',
    title: 'Emails marketing',
    description: 'Offres spéciales, promotions et actualités Notavex',
  },
]

export function NotificationSettings({ settings }: Props) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(
    settings.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES,
  )
  const [saving, setSaving] = useState<keyof NotificationPreferences | null>(
    null,
  )
  const [updateNotifications] = useUpdateNotifications()

  const handleToggle = async (key: keyof NotificationPreferences) => {
    const previous = prefs
    const newPrefs = { ...prefs, [key]: !prefs[key] }
    setPrefs(newPrefs)
    setSaving(key)

    try {
      await updateNotifications({ [key]: !previous[key] })
      toast.success('Préférences mises à jour')
    } catch {
      setPrefs(previous)
      toast.error('Une erreur est survenue')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div>
      {NOTIFICATION_ITEMS.map((item) => (
        <SettingsRow
          key={item.key}
          label={item.title}
          description={item.description}
          action={
            <Switch
              checked={prefs[item.key]}
              onCheckedChange={() => handleToggle(item.key)}
              disabled={saving === item.key}
            />
          }
        />
      ))}
    </div>
  )
}
