import type { Metadata } from 'next'

import { ComingSoon } from '@/components/landing/ComingSoon'

export const metadata: Metadata = {
  title: 'Contact — Notavex',
  description: "Contactez l'équipe Notavex.",
}

export default function ContactPage() {
  return (
    <ComingSoon
      title="Contact"
      tag="Entreprise"
      description="Une question, un partenariat, un bug ? Écrivez-nous — on répond vite."
    />
  )
}
