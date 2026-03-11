'use client'

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  RotateCcw,
  XCircle,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'

const COOLDOWN_SECONDS = 60

type SendState = 'idle' | 'loading' | 'success' | 'error'

export const EmailVerificationBanner = memo(function EmailVerificationBanner() {
  const { data: session } = useSession()
  const [sendState, setSendState] = useState<SendState>('idle')
  const [showSuccessPill, setShowSuccessPill] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const shouldShow = useMemo(
    () => session?.user && !session.user.emailVerified,
    [session?.user],
  )

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const startCooldown = useCallback(() => {
    setCooldown(COOLDOWN_SECONDS)
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          setSendState('idle')
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  const handleResend = useCallback(async () => {
    setSendState('loading')
    setErrorText('')

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        setSendState('success')
        setShowSuccessPill(true)
        setTimeout(() => setShowSuccessPill(false), 3000)
        startCooldown()
      } else {
        const data = await response.json()
        setErrorText(data.error?.message || "Erreur lors de l'envoi")
        setSendState('error')
      }
    } catch {
      setErrorText('Erreur réseau.')
      setSendState('error')
    }
  }, [startCooldown])

  if (!shouldShow) return null

  return (
    <div className="w-full border-b border-yellow-200/70 bg-yellow-50/60 dark:border-yellow-900/40 dark:bg-yellow-950/20">
      <div className="flex items-center justify-between gap-4 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-yellow-600 dark:text-yellow-500" />
          <p className="truncate text-sm text-yellow-800 dark:text-yellow-300">
            <span className="font-medium">Email non vérifié.</span>{' '}
            <span className="hidden text-yellow-700 sm:inline dark:text-yellow-400">
              Vérifiez votre boîte de réception pour accéder à toutes les
              fonctionnalités.
            </span>
          </p>
        </div>

        <div className="shrink-0">
          {sendState === 'idle' && (
            <Button
              onClick={handleResend}
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 border-yellow-300 bg-white text-xs text-yellow-800 hover:bg-yellow-50 dark:border-yellow-700/60 dark:bg-transparent dark:text-yellow-300 dark:hover:bg-yellow-900/20"
            >
              <Mail className="h-3 w-3" />
              Renvoyer l&apos;email
            </Button>
          )}

          {sendState === 'loading' && (
            <div className="flex h-7 items-center gap-1.5 px-1 text-xs text-yellow-700 dark:text-yellow-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Envoi en cours…
            </div>
          )}

          {sendState === 'success' && (
            <div className="flex items-center gap-3">
              {showSuccessPill && (
                <div className="flex h-7 items-center gap-1.5 rounded-md bg-green-100 px-2.5 text-xs font-medium text-green-700 dark:bg-green-950/50 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Email envoyé !
                </div>
              )}
              <span className="tabular-nums text-xs text-muted-foreground">
                Renvoyer dans {cooldown}s
              </span>
            </div>
          )}

          {sendState === 'error' && (
            <div className="flex items-center gap-2">
              <div className="flex h-7 items-center gap-1.5 rounded-md bg-red-100 px-2.5 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-400">
                <XCircle className="h-3 w-3 shrink-0" />
                <span className="max-w-45 truncate">{errorText}</span>
              </div>
              <Button
                onClick={handleResend}
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                Réessayer
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
