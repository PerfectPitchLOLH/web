import type { Metadata } from 'next'

import { ComingSoon } from '@/components/landing/ComingSoon'

export const metadata: Metadata = {
  title: 'Presse — Notavex',
  description: 'Kit presse, logos et contacts médias Notavex.',
}

export default function PressePage() {
  return (
    <ComingSoon
      title="Presse"
      tag="Entreprise"
      description="Kit média, logos haute résolution et contacts pour la presse."
    />
  )
}
