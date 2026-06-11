'use client'

import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'

type State = 'loading' | 'success' | 'error' | 'missing'

export function EmailVerifyView({ token }: { token?: string }) {
  const { update } = useSession()
  const [state, setState] = useState<State>(token ? 'loading' : 'missing')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!token) return

    async function verify() {
      const response = await fetch(`/api/auth/verify-email?token=${token}`)
      const data = await response.json()

      if (response.ok) {
        await update()
        setState('success')
        // Hard navigation: guarantees a fresh server render with the
        // updated session — router.push/refresh can still serve the
        // dashboard's cached RSC payload with the stale emailVerified.
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 2000)
      } else {
        setErrorMessage(data.error?.message || 'Vérification échouée')
        setState('error')
      }
    }

    verify()
  }, [token, update])

  if (state === 'missing') {
    return (
      <div className="w-full max-w-sm space-y-6 text-center">
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Lien invalide</h1>
          <p className="text-sm text-muted-foreground">
            Ce lien de vérification est invalide ou a expiré.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/dashboard">Retour au dashboard</Link>
        </Button>
      </div>
    )
  }

  if (state === 'loading') {
    return (
      <div className="w-full max-w-sm space-y-6 text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Vérification en cours…</h1>
          <p className="text-sm text-muted-foreground">
            Veuillez patienter quelques instants.
          </p>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="w-full max-w-sm space-y-6 text-center">
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Vérification échouée</h1>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/dashboard">Retour au dashboard</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm space-y-6 text-center">
      <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Email vérifié !</h1>
        <p className="text-sm text-muted-foreground">
          Votre email a été vérifié. Redirection vers le dashboard…
        </p>
      </div>
    </div>
  )
}
