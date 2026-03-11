'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { useState } from 'react'
import { toast } from 'sonner'

import { SettingsRow } from '@/components/dashboard/settings/SettingsRow'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useDeleteAccount,
  useExportData,
  useUpdateAppearance,
  useUpdateProfile,
} from '@/hooks/useSettings'
import type { UserSettings } from '@/server/domains/settings/settings.types'

import { TwoFactorSetup } from '../security/TwoFactorSetup'
import { AvatarPicker } from './AvatarPicker'

type Props = {
  settings: UserSettings
}

function UpdateNameDialog({
  open,
  onOpenChange,
  initialName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialName: string
}) {
  const [name, setName] = useState(initialName)
  const [updateProfile, { loading }] = useUpdateProfile()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateProfile({ name: name.trim() })
      toast.success('Prénom mis à jour')
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Une erreur est survenue',
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mettre à jour le prénom</DialogTitle>
          <DialogDescription>
            Modifiez votre nom d&apos;affichage.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Votre prénom"
            required
            minLength={2}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AvatarPickerDialog({
  open,
  onOpenChange,
  currentAvatar,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentAvatar: string | null
}) {
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(
    currentAvatar,
  )
  const [updateProfile, { loading }] = useUpdateProfile()

  const handleSave = async () => {
    try {
      await updateProfile({ image: selectedAvatar ?? undefined })
      toast.success('Avatar mis à jour')
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Une erreur est survenue',
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choisir un avatar</DialogTitle>
          <DialogDescription>
            Sélectionnez un avatar Dicebear.
          </DialogDescription>
        </DialogHeader>
        <AvatarPicker
          currentAvatar={currentAvatar}
          onSelect={setSelectedAvatar}
        />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ExportDataDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [exportData, { loading }] = useExportData()

  const handleExport = async () => {
    try {
      const data = await exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `notavex-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Exportation téléchargée')
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Une erreur est survenue',
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Télécharger vos données</DialogTitle>
          <DialogDescription>
            Vous recevrez un fichier JSON contenant toutes vos données de
            compte.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button onClick={handleExport} disabled={loading}>
            {loading ? 'Préparation...' : 'Télécharger'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SignOutAllDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    await signOut({ callbackUrl: '/auth/signin' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Déconnecter de tous les appareils</DialogTitle>
          <DialogDescription>
            Vous serez déconnecté de toutes vos sessions actives. Cette action
            est immédiate.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button variant="outline" onClick={handleSignOut} disabled={loading}>
            {loading ? 'Déconnexion...' : 'Se déconnecter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [confirmation, setConfirmation] = useState('')
  const [deleteAccount, { loading }] = useDeleteAccount()

  const isConfirmed = confirmation === 'supprimer'

  const handleDelete = async () => {
    if (!isConfirmed) return
    try {
      await deleteAccount()
      await signOut({ callbackUrl: '/auth/signin' })
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Une erreur est survenue',
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">
            Supprimer le compte
          </DialogTitle>
          <DialogDescription>
            Cette action est irréversible. Toutes vos données seront supprimées
            définitivement. Tapez <strong>supprimer</strong> pour confirmer.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="supprimer"
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || loading}
          >
            {loading ? 'Suppression...' : 'Supprimer définitivement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ProfileSettings({ settings }: Props) {
  const [nameDialogOpen, setNameDialogOpen] = useState(false)
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const [language, setLanguage] = useState(settings.language)
  const [updateAppearance] = useUpdateAppearance()

  const handleLanguageChange = async (value: string) => {
    const previous = language
    setLanguage(value)
    try {
      await updateAppearance({ language: value as 'fr' | 'en' })
      toast.success('Langue mise à jour')
    } catch {
      setLanguage(previous)
      toast.error('Une erreur est survenue')
    }
  }

  const LANGUAGES = [
    { value: 'fr', flag: '🇫🇷', label: 'Français' },
    { value: 'en', flag: '🇬🇧', label: 'English' },
  ] as const

  return (
    <>
      <div>
        <SettingsRow label="Adresse e-mail" value={settings.email} />

        <SettingsRow
          label="Prénom"
          value={settings.name}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNameDialogOpen(true)}
            >
              Mettre à jour
            </Button>
          }
        />

        <SettingsRow
          label="Avatar"
          description="Choisissez un avatar Dicebear"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAvatarDialogOpen(true)}
            >
              Modifier
            </Button>
          }
        />

        <SettingsRow
          label="Forfait actuel"
          value="Free"
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/subscription#plan">
                Gérer l&apos;abonnement
              </Link>
            </Button>
          }
        />

        <SettingsRow
          label="Authentification à deux facteurs"
          value={settings.twoFactorEnabled ? 'Activée' : 'Désactivée'}
          action={<TwoFactorSetup enabled={settings.twoFactorEnabled} />}
        />

        <SettingsRow
          label="Utilisation et plafonds de crédit"
          description="Voir l'utilisation de vos crédits"
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/subscription">Voir les détails</Link>
            </Button>
          }
        />

        <SettingsRow
          label="Langue de l'application"
          action={
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.flag} {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        <SettingsRow
          label="Télécharger vos données"
          description="Demandez une copie de vos données. Vous recevrez un fichier JSON."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportDialogOpen(true)}
            >
              Demander l&apos;exportation
            </Button>
          }
        />

        <SettingsRow
          label="Déconnecter de tous les appareils"
          description="Déconnectez-vous de toutes vos sessions actives."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSignOutDialogOpen(true)}
            >
              Se déconnecter
            </Button>
          }
        />

        <SettingsRow
          label="Supprimer l'intégralité du compte"
          description="Supprimez définitivement votre compte. Cette action est irréversible."
          danger
          action={
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              Supprimer le compte
            </Button>
          }
        />
      </div>

      <UpdateNameDialog
        open={nameDialogOpen}
        onOpenChange={setNameDialogOpen}
        initialName={settings.name}
      />
      <AvatarPickerDialog
        open={avatarDialogOpen}
        onOpenChange={setAvatarDialogOpen}
        currentAvatar={settings.image}
      />
      <ExportDataDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
      />
      <SignOutAllDialog
        open={signOutDialogOpen}
        onOpenChange={setSignOutDialogOpen}
      />
      <DeleteAccountDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  )
}
