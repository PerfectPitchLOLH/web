'use client'

import { Zap } from 'lucide-react'
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
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useCredits } from '@/hooks/useCredits'
import {
  useDeleteAccount,
  useExportData,
  useUpdateAppearance,
  useUpdateProfile,
} from '@/hooks/useSettings'
import { cn } from '@/lib/utils'
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

function CreditsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { credits, loading } = useCredits()

  if (!credits && !loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Utilisation des crédits</DialogTitle>
            <DialogDescription>
              Consultez votre utilisation mensuelle de crédits
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Impossible de charger les informations de crédit
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const monthlyUsed = credits
    ? Math.min(credits.usedThisMonth, credits.monthlyCredits)
    : 0
  const bonusUsed = credits
    ? Math.max(0, credits.usedThisMonth - credits.monthlyCredits)
    : 0

  const monthlyRemaining = credits
    ? Math.max(0, credits.monthlyCredits - monthlyUsed)
    : 0
  const bonusRemaining = credits
    ? Math.max(0, credits.bonusCredits - bonusUsed)
    : 0

  const monthlyPercent =
    credits && credits.monthlyCredits > 0
      ? Math.round((monthlyUsed / credits.monthlyCredits) * 100)
      : 0
  const bonusPercent =
    credits && credits.bonusCredits > 0
      ? Math.round((bonusUsed / credits.bonusCredits) * 100)
      : 0

  const totalRemaining = monthlyRemaining + bonusRemaining

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Utilisation des crédits</DialogTitle>
          <DialogDescription>
            Consultez votre utilisation mensuelle de crédits
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-12 w-40" />
              <Skeleton className="h-2 w-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-full" />
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-6 space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Total disponible
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">
                  {Math.round(totalRemaining / 60)}
                </span>
                <span className="text-lg text-muted-foreground">minutes</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round(credits!.usedThisMonth / 60)} min utilisées ce mois
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="size-4 text-primary" />
                    <span className="text-sm font-medium">
                      Crédits mensuels
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {monthlyPercent}% utilisé
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">
                      {Math.round(monthlyRemaining / 60)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {Math.round(credits!.monthlyCredits / 60)} min
                    </span>
                  </div>

                  <Progress
                    value={monthlyPercent}
                    className={cn(
                      'h-2',
                      monthlyPercent > 80 && '[&>div]:bg-orange-500',
                      monthlyPercent >= 100 && '[&>div]:bg-red-500',
                    )}
                  />

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{Math.round(monthlyUsed / 60)} min utilisées</span>
                    <span>
                      {Math.round(monthlyRemaining / 60)} min restantes
                    </span>
                  </div>
                </div>
              </div>

              {credits!.bonusCredits > 0 && (
                <div className="rounded-lg border bg-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="size-4 text-amber-500" />
                      <span className="text-sm font-medium">Crédits bonus</span>
                    </div>
                    {bonusUsed > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {bonusPercent}% utilisé
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">
                        {Math.round(bonusRemaining / 60)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        / {Math.round(credits!.bonusCredits / 60)} min
                      </span>
                    </div>

                    {bonusUsed > 0 && (
                      <>
                        <Progress
                          value={bonusPercent}
                          className={cn(
                            'h-2 [&>div]:bg-amber-500',
                            bonusPercent > 80 && '[&>div]:bg-orange-500',
                            bonusPercent >= 100 && '[&>div]:bg-red-500',
                          )}
                        />

                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {Math.round(bonusUsed / 60)} min utilisées
                          </span>
                          <span>
                            {Math.round(bonusRemaining / 60)} min restantes
                          </span>
                        </div>
                      </>
                    )}

                    {bonusUsed === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Seront utilisés après épuisement des crédits mensuels
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {credits!.lastMonthlyRefill && (
              <div className="text-xs text-muted-foreground text-center pt-2">
                Dernière recharge le{' '}
                {new Date(credits!.lastMonthlyRefill).toLocaleDateString(
                  'fr-FR',
                  {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  },
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
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
  const [creditsDialogOpen, setCreditsDialogOpen] = useState(false)

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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreditsDialogOpen(true)}
            >
              Voir les détails
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
      <CreditsDialog
        open={creditsDialogOpen}
        onOpenChange={setCreditsDialogOpen}
      />
    </>
  )
}
