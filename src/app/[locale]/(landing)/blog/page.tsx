import type { Metadata } from 'next'

import { ComingSoon } from '@/components/landing/ComingSoon'

export const metadata: Metadata = {
  title: 'Blog — Notavex',
  description:
    "Actualités, tutoriels et articles sur la transcription musicale par l'équipe Notavex.",
}

export default function BlogPage() {
  return (
    <ComingSoon
      title="Blog"
      tag="Ressources"
      description="Articles sur la transcription musicale, les coulisses de l'IA et les mises à jour produit."
    />
  )
}
