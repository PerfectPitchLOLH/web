import { z } from 'zod'

export const userRoleSchema = z.enum(['admin', 'user', 'guest'])

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long'),
  role: userRoleSchema.optional().default('user'),
})

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .optional(),
  role: userRoleSchema.optional(),
})

export const userIdSchema = z.string().cuid('Invalid user ID format')

export const getUsersQuerySchema = z.object({
  role: userRoleSchema.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>
