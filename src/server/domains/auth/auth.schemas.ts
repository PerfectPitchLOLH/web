import { z } from 'zod'

export const signUpSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/\d/, 'Password must contain number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain special character'),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .trim(),
})

export const signInSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password required'),
})

export const emailSchema = z.object({
  email: z.string().email('Invalid email format'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/\d/, 'Password must contain number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain special character'),
})

export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type EmailInput = z.infer<typeof emailSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
