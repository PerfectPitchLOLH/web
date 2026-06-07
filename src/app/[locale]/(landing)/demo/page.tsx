import type { Metadata } from 'next'

import { ComingSoon } from '@/components/landing/ComingSoon'

export const metadata: Metadata = {
  title: 'Démo — Notavex',
  description:
    'Essayez Notavex en direct — transcription audio en partition, sans inscription.',
}

export default function DemoPage() {
  return (
    <ComingSoon
      title="Démo interactive"
      tag="Produit"
      description="Essayez la transcription en temps réel directement dans votre navigateur. Bientôt disponible."
    />
  )
}
