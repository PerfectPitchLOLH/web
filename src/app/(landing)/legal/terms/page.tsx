import type { Metadata } from 'next'

import { LegalPage } from '@/components/legal/LegalPage'
import { TermsContent } from '@/components/legal/TermsContent'

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation — Notavex",
  description: "Conditions Générales d'Utilisation du service Notavex.",
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Conditions Générales d'Utilisation"
      lastUpdated="29 avril 2026"
    >
      <TermsContent />
    </LegalPage>
  )
}
