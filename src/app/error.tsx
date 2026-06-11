'use client'

import * as Sentry from '@sentry/nextjs'
import { motion } from 'framer-motion'
import { Home, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

import { AudioWavesBackground } from '@/components/landing/AudioWavesBackground'
import { GridBackground } from '@/components/landing/GridBackground'
import { Button } from '@/components/ui/button'

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: Props) {
  useEffect(() => {
    console.error(error)
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen bg-background text-foreground relative flex items-center justify-center px-4 overflow-hidden">
      <GridBackground />
      <AudioWavesBackground />

      <div className="max-w-2xl mx-auto w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-6"
        >
          <h1 className="text-8xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            500
          </h1>

          <div className="space-y-3">
            <h2 className="text-3xl font-bold">Une erreur est survenue</h2>
            <p className="text-muted-foreground text-lg">
              Quelque chose s&apos;est mal passé de notre côté. Nos équipes ont
              été notifiées.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button size="lg" onClick={reset} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </Button>

            <Button size="lg" variant="outline" asChild>
              <Link href="/" className="gap-2">
                <Home className="w-4 h-4" />
                Accueil
              </Link>
            </Button>
          </div>

          {error.digest && (
            <p className="text-xs text-muted-foreground">
              Code : {error.digest}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  )
}
