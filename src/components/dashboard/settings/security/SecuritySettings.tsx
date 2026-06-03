'use client'

import { useState } from 'react'

import { SettingsRow } from '@/components/dashboard/settings/SettingsRow'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { UserSettings } from '@/server/domains/settings/settings.types'

import { PasswordChangeForm } from './PasswordChangeForm'
import { TwoFactorSetup } from './TwoFactorSetup'

type Props = {
  settings: UserSettings
}

function PasswordChangeDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le mot de passe</DialogTitle>
        </DialogHeader>
        <PasswordChangeForm />
      </DialogContent>
    </Dialog>
  )
}

export function SecuritySettings({ settings }: Props) {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)

  return (
    <>
      <div>
        {settings.hasPassword ? (
          <SettingsRow
            label="Mot de passe"
            value="••••••••"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPasswordDialogOpen(true)}
              >
                Modifier
              </Button>
            }
          />
        ) : (
          <SettingsRow
            label="Mot de passe"
            description="Vous utilisez la connexion Google OAuth."
          />
        )}

        <SettingsRow
          label="Authentification à deux facteurs"
          value={settings.twoFactorEnabled ? 'Activée' : 'Désactivée'}
          action={<TwoFactorSetup enabled={settings.twoFactorEnabled} />}
        />
      </div>

      <PasswordChangeDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
      />
    </>
  )
}
