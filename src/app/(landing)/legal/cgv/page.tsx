import type { Metadata } from 'next'

import { CgvContent } from '@/components/legal/CgvContent'
import { LegalPage } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Conditions Générales de Vente — Notavex',
  description: 'Conditions Générales de Vente du service Notavex.',
}

export default function CgvPage() {
  return (
    <LegalPage
      title="Conditions Générales de Vente"
      lastUpdated="29 avril 2026"
    >
      <CgvContent />
    </LegalPage>
  )
}
