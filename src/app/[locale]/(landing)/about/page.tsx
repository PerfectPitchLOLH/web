import type { Metadata } from 'next'

import { ComingSoon } from '@/components/landing/ComingSoon'

export const metadata: Metadata = {
  title: 'À propos — Notavex',
  description: "L'histoire et la mission de Notavex.",
}

export default function AboutPage() {
  return (
    <ComingSoon
      title="À propos"
      tag="Entreprise"
      description="L'histoire, la mission et l'équipe derrière Notavex."
    />
  )
}
