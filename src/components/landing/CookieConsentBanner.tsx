'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { useCookieConsent } from '@/hooks/useCookieConsent'

export function CookieConsentBanner() {
  const { hasChosen, isLoading, acceptAll, rejectAll } = useCookieConsent()

  if (isLoading || hasChosen) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground max-w-xl">
          Nous utilisons des cookies pour améliorer votre expérience. Les
          cookies analytiques nous aident à comprendre comment vous utilisez
          Notavex.{' '}
          <Link href="/legal/cookies" className="text-primary hover:underline">
            En savoir plus
          </Link>
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={rejectAll}>
            Tout refuser
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/legal/cookies#gestion">Personnaliser</Link>
          </Button>
          <Button variant="default" size="sm" onClick={acceptAll}>
            Tout accepter
          </Button>
        </div>
      </div>
    </div>
  )
}
