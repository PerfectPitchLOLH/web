import type { Metadata } from 'next'

import { ComingSoon } from '@/components/landing/ComingSoon'

export const metadata: Metadata = {
  title: 'Documentation — Notavex',
  description: "Documentation complète de l'API et des intégrations Notavex.",
}

export default function DocsPage() {
  return (
    <ComingSoon
      title="Documentation"
      tag="Ressources"
      description="Référence API, guides d'intégration et exemples de code. Bientôt disponible."
    />
  )
}
