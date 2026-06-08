import { z } from 'zod'

import { CONTACT_CATEGORIES } from './contact.constants'

export const submitContactSchema = z.object({
  category: z.enum(CONTACT_CATEGORIES),
  message: z
    .string()
    .trim()
    .min(10, 'Le message doit contenir au moins 10 caractères')
    .max(5000, 'Message trop long'),
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().email('Adresse email invalide').optional(),
})

export type SubmitContactInput = z.infer<typeof submitContactSchema>
