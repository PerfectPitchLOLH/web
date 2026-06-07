import type { Metadata } from 'next'

import { ComingSoon } from '@/components/landing/ComingSoon'

export const metadata: Metadata = {
  title: 'Changelog — Notavex',
  description:
    'Historique des mises à jour et nouvelles fonctionnalités de Notavex.',
}

export default function ChangelogPage() {
  return (
    <ComingSoon
      title="Changelog"
      tag="Ressources"
      description="Toutes les mises à jour, améliorations et corrections de bugs, version par version."
    />
  )
}
