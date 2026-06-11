import type { Metadata } from 'next'

import { ComingSoon } from '@/components/landing/ComingSoon'

export const metadata: Metadata = {
  title: 'Carrières — Notavex',
  description:
    "Rejoignez l'équipe Notavex et construisez l'avenir de la transcription musicale.",
}

export default function CarrieresPage() {
  return (
    <ComingSoon
      title="Carrières"
      tag="Entreprise"
      description="Nous construisons l'infrastructure musicale de demain. Les offres arrivent bientôt."
    />
  )
}
