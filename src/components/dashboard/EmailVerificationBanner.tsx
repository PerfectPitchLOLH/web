'use client'

import { AlertCircle, Mail } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { memo, useCallback, useMemo, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export const EmailVerificationBanner = memo(function EmailVerificationBanner() {
  const { data: session } = useSession()
  const [isResending, setIsResending] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const shouldShow = useMemo(
    () => session?.user && !session.user.emailVerified,
    [session?.user],
  )

  const handleResendVerification = useCallback(async () => {
    setIsResending(true)
    setMessage(null)

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Email de vérification envoyé avec succès ! Vérifiez votre boîte de réception.',
        })
      } else {
        setMessage({
          type: 'error',
          text: data.error?.message || "Erreur lors de l'envoi de l'email",
        })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Erreur réseau. Veuillez réessayer.',
      })
    } finally {
      setIsResending(false)
    }
  }, [])

  if (!shouldShow) {
    return null
  }

  return (
    <div className="w-full">
      <div className="container mx-auto px-4 py-3">
        <Alert
          variant="default"
          className="border-yellow-200 bg-transparent dark:border-yellow-600"
        >
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-400">
            Email non vérifié
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-3 text-yellow-700 dark:text-yellow-400 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Veuillez vérifier votre email pour accéder à toutes les
              fonctionnalités.
            </span>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {message && (
                <span
                  className={
                    message.type === 'success'
                      ? 'text-sm text-green-600 dark:text-green-400'
                      : 'text-sm text-red-600 dark:text-red-400'
                  }
                >
                  {message.text}
                </span>
              )}
              <Button
                onClick={handleResendVerification}
                disabled={isResending}
                size="sm"
                variant="outline"
                className="border-yellow-300 bg-white hover:bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/40"
              >
                <Mail className="mr-2 h-4 w-4" />
                {isResending ? 'Envoi...' : "Renvoyer l'email"}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
})
