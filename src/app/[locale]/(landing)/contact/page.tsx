import type { Metadata } from 'next'

import { ContactPage } from '@/components/contact/ContactPage'

export const metadata: Metadata = {
  title: 'Contact — Notavex',
  description: "Contactez l'équipe Notavex.",
}

export default function Page() {
  return <ContactPage />
}
