export type AuthProvider = 'credentials' | 'google'

export type SignUpData = {
  email: string
  password: string
  name: string
}

export type SignInData = {
  email: string
  password: string
}

export type ResetPasswordData = {
  token: string
  newPassword: string
}

export type VerifyEmailData = {
  token: string
}

export type AuthUser = {
  id: string
  email: string
  name: string
  role: string
  emailVerified: Date | null
  image: string | null
}
