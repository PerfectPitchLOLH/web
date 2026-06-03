import type { Metadata } from 'next'

import { LegalPage } from '@/components/legal/LegalPage'
import { PrivacyContent } from '@/components/legal/PrivacyContent'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Notavex',
  description:
    'Politique de confidentialité et traitement des données personnelles par Notavex.',
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Politique de confidentialité" lastUpdated="29 avril 2026">
      <PrivacyContent />
    </LegalPage>
  )
}
