'use client'

import { ShieldCheck, ShieldOff, ShieldX } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useDisable2FA, useSetup2FA, useVerify2FA } from '@/hooks/useSettings'
import type { TwoFactorSetupResult } from '@/server/domains/settings/settings.types'

type Props = {
  enabled: boolean
}

type Step = 'idle' | 'setup' | 'backup-codes' | 'disable'

export function TwoFactorSetup({ enabled: initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [step, setStep] = useState<Step>('idle')
  const [setupData, setSetupData] = useState<TwoFactorSetupResult | null>(null)
  const [token, setToken] = useState('')
  const [disableToken, setDisableToken] = useState('')
  const [setup2FA, { loading: loadingSetup }] = useSetup2FA()
  const [verify2FA, { loading: loadingVerify }] = useVerify2FA()
  const [disable2FA, { loading: loadingDisable }] = useDisable2FA()

  const loading = loadingSetup || loadingVerify || loadingDisable

  const handleSetup = async () => {
    try {
      const data = await setup2FA()
      setSetupData(data as TwoFactorSetupResult)
      setStep('setup')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Une erreur est survenue',
      )
    }
  }

  const handleVerify = async () => {
    if (!token || token.length !== 6) {
      toast.error('Le code doit contenir 6 chiffres')
      return
    }

    try {
      await verify2FA({ token })
      setStep('backup-codes')
      setToken('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Code invalide')
    }
  }

  const handleDisable = async () => {
    if (!disableToken || disableToken.length !== 6) {
      toast.error('Le code doit contenir 6 chiffres')
      return
    }

    try {
      await disable2FA({ token: disableToken })
      setEnabled(false)
      setStep('idle')
      setDisableToken('')
      toast.success('Authentification 2FA désactivée')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Code invalide')
    }
  }

  const handleFinish = () => {
    setEnabled(true)
    setStep('idle')
    setSetupData(null)
    toast.success('Authentification 2FA activée')
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {enabled ? (
            <ShieldCheck className="h-5 w-5 text-green-500" />
          ) : (
            <ShieldOff className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">
              Authentification à deux facteurs
            </p>
            <p className="text-xs text-muted-foreground">
              {enabled
                ? 'Votre compte est protégé par le 2FA'
                : 'Ajoutez une couche de sécurité supplémentaire'}
            </p>
          </div>
        </div>
        {enabled ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep('disable')}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <ShieldX className="h-4 w-4" />
            Désactiver
          </Button>
        ) : (
          <Button size="sm" onClick={handleSetup} disabled={loading}>
            {loading ? 'Chargement...' : 'Activer'}
          </Button>
        )}
      </div>

      <Dialog
        open={step === 'setup'}
        onOpenChange={(open) => !open && setStep('idle')}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurer le 2FA</DialogTitle>
            <DialogDescription>
              Scannez ce QR code avec votre application authenticator (Google
              Authenticator, Authy...)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {setupData?.qrCodeDataUrl && (
              <div className="flex justify-center">
                <Image
                  src={setupData.qrCodeDataUrl}
                  alt="QR Code 2FA"
                  width={180}
                  height={180}
                  className="rounded-lg border bg-white p-2"
                />
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Ou entrez manuellement :
              </p>
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">
                {setupData?.secret}
              </code>
            </div>
            <Separator />
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Code de vérification (6 chiffres)
              </label>
              <Input
                value={token}
                onChange={(e) =>
                  setToken(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="000000"
                maxLength={6}
                className="font-mono text-center text-lg tracking-widest"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleVerify}
              disabled={loading || token.length !== 6}
            >
              {loading ? 'Vérification...' : 'Vérifier et activer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={step === 'backup-codes'}
        onOpenChange={(open) => !open && handleFinish()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Codes de secours</DialogTitle>
            <DialogDescription>
              Conservez ces codes en lieu sûr. Ils permettent d&apos;accéder à
              votre compte si vous perdez votre téléphone.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {setupData?.backupCodes.map((code) => (
              <code
                key={code}
                className="text-sm bg-muted px-3 py-2 rounded font-mono text-center"
              >
                {code}
              </code>
            ))}
          </div>
          <Button className="w-full" onClick={handleFinish}>
            J&apos;ai sauvegardé mes codes
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={step === 'disable'}
        onOpenChange={(open) => {
          if (!open) {
            setStep('idle')
            setDisableToken('')
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Désactiver le 2FA</DialogTitle>
            <DialogDescription>
              Entrez le code de votre application authenticator pour confirmer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={disableToken}
              onChange={(e) =>
                setDisableToken(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
              placeholder="000000"
              maxLength={6}
              className="font-mono text-center text-lg tracking-widest"
            />
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDisable}
              disabled={loading || disableToken.length !== 6}
            >
              {loading ? 'Désactivation...' : 'Confirmer la désactivation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
