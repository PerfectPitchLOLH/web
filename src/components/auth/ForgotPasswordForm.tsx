'use client'

import { Turnstile } from '@marsidev/react-turnstile'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, CheckCircle, Loader2, Mail } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { FormError } from '@/components/auth/FormError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, captchaToken }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.message ?? 'Une erreur est survenue')
        return
      }

      setSubmitted(true)
    } catch {
      setError('Une erreur est survenue, veuillez réessayer')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AnimatePresence mode="wait">
      {!submitted ? (
        <motion.div
          key="form"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md space-y-6"
        >
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">Mot de passe oublié</h1>
            <p className="text-muted-foreground">
              Entrez votre email pour recevoir un lien de réinitialisation
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Votre adresse email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />

            {TURNSTILE_SITE_KEY && (
              <Turnstile
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={setCaptchaToken}
                onExpire={() => setCaptchaToken('')}
                options={{ theme: 'auto' }}
              />
            )}

            <FormError error={error} />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading || (!!TURNSTILE_SITE_KEY && !captchaToken)}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              {isLoading ? 'Envoi en cours...' : 'Envoyer le lien'}
            </Button>
          </form>

          <div className="text-center">
            <Link
              href="/auth/signin"
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à la connexion
            </Link>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md space-y-6 text-center"
        >
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Email envoyé</h1>
            <p className="text-muted-foreground">
              Si un compte existe pour{' '}
              <span className="font-medium text-foreground">{email}</span>, vous
              recevrez un lien de réinitialisation dans quelques minutes.
            </p>
          </div>
          <Link
            href="/auth/signin"
            className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la connexion
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
