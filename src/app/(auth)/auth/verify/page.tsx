import { Metadata } from 'next'

import { AuthLayout } from '@/components/auth/AuthLayout'
import { EmailVerifyView } from '@/components/auth/EmailVerifyView'

export const metadata: Metadata = {
  title: 'Vérification email | Notavex',
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  return (
    <AuthLayout>
      <EmailVerifyView token={token} />
    </AuthLayout>
  )
}
