import type { Metadata } from 'next'

import { ComingSoon } from '@/components/landing/ComingSoon'

export const metadata: Metadata = {
  title: 'Tutoriels — Notavex',
  description: 'Guides pas à pas pour tirer le meilleur de Notavex.',
}

export default function TutorielsPage() {
  return (
    <ComingSoon
      title="Tutoriels"
      tag="Ressources"
      description="Guides vidéo et écrits pour maîtriser la transcription avec Notavex."
    />
  )
}
