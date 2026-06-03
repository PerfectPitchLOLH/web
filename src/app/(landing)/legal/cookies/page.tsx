import type { Metadata } from 'next'

import { CookiesContent } from '@/components/legal/CookiesContent'
import { LegalPage } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Politique de cookies — Notavex',
  description: 'Politique de cookies et gestion du consentement sur Notavex.',
}

export default function CookiesPage() {
  return (
    <LegalPage title="Politique de cookies" lastUpdated="29 avril 2026">
      <CookiesContent />
    </LegalPage>
  )
}
