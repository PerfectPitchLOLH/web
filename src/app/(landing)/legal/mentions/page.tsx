import type { Metadata } from 'next'

import { LegalPage } from '@/components/legal/LegalPage'
import { MentionsContent } from '@/components/legal/MentionsContent'

export const metadata: Metadata = {
  title: 'Mentions légales — Notavex',
  description: 'Mentions légales et informations légales sur Notavex.',
}

export default function MentionsPage() {
  return (
    <LegalPage title="Mentions légales" lastUpdated="29 avril 2026">
      <MentionsContent />
    </LegalPage>
  )
}
