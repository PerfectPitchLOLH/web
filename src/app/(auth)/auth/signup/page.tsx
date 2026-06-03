import { Metadata } from 'next'

import { AuthLayout } from '@/components/auth/AuthLayout'
import { SignUpForm } from '@/components/auth/SignUpForm'

export const metadata: Metadata = {
  title: 'Sign Up | Notavex',
  description: 'Create your Notavex account',
}

export default function SignUpPage() {
  return (
    <AuthLayout>
      <SignUpForm />
    </AuthLayout>
  )
}
