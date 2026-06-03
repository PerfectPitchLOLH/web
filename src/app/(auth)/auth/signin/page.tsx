import { Metadata } from 'next'

import { AuthLayout } from '@/components/auth/AuthLayout'
import { SignInForm } from '@/components/auth/SignInForm'

export const metadata: Metadata = {
  title: 'Sign In | Notavex',
  description: 'Sign in to your Notavex account',
}

export default function SignInPage() {
  return (
    <AuthLayout>
      <SignInForm />
    </AuthLayout>
  )
}
