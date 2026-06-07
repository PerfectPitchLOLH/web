import type { Metadata } from 'next'

import { ComingSoon } from '@/components/landing/ComingSoon'

export const metadata: Metadata = {
  title: 'Comment ça marche — Notavex',
  description:
    'Découvrez comment Notavex convertit votre audio en partition en 30 secondes.',
}

export default function CommentCaMarchePage() {
  return (
    <ComingSoon
      title="Comment ça marche"
      tag="Produit"
      description="Une explication détaillée du pipeline de transcription Notavex arrive bientôt."
    />
  )
}
