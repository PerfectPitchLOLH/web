'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'

import { SettingsRow } from '@/components/dashboard/settings/SettingsRow'
import { useUpdateAppearance } from '@/hooks/useSettings'
import { cn } from '@/lib/utils'
import type { UserSettings } from '@/server/domains/settings/settings.types'

type Props = {
  settings: UserSettings
}

const THEMES = [
  { value: 'light', label: 'Clair', icon: Sun },
  { value: 'dark', label: 'Sombre', icon: Moon },
  { value: 'system', label: 'Système', icon: Monitor },
] as const

export function AppearanceSettings({ settings: _settings }: Props) {
  const { setTheme, theme: currentTheme } = useTheme()
  const [updateAppearance, { loading: saving }] = useUpdateAppearance()

  const handleThemeChange = async (value: string) => {
    setTheme(value)
    try {
      await updateAppearance({ theme: value as 'light' | 'dark' | 'system' })
      toast.success('Thème mis à jour')
    } catch {
      toast.error('Une erreur est survenue')
    }
  }

  return (
    <div>
      <SettingsRow
        label="Thème"
        description="Choisissez l'apparence de l'interface"
        action={
          <div className="flex gap-2">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleThemeChange(value)}
                disabled={saving}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs transition-all hover:border-primary',
                  currentTheme === value
                    ? 'border-primary bg-primary/5 font-medium'
                    : 'border-border text-muted-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        }
      />
    </div>
  )
}
