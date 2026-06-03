import { z } from 'zod'

export const updateUserRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['admin', 'user']),
})

export const suspendUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
})

export const deleteUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
})

export const userManagementFiltersSchema = z.object({
  role: z
    .enum(['admin', 'user'])
    .nullable()
    .transform((val) => val || undefined)
    .optional(),
  search: z
    .string()
    .nullable()
    .transform((val) => val || undefined)
    .optional(),
  emailVerified: z
    .string()
    .nullable()
    .transform((val) =>
      val === 'true' ? true : val === 'false' ? false : undefined,
    )
    .optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
})

export const auditLogFiltersSchema = z.object({
  userId: z
    .string()
    .nullable()
    .transform((val) => val || undefined)
    .optional(),
  action: z
    .string()
    .nullable()
    .transform((val) => val || undefined)
    .optional(),
  startDate: z
    .string()
    .nullable()
    .transform((val) => (val ? new Date(val) : undefined))
    .optional(),
  endDate: z
    .string()
    .nullable()
    .transform((val) => (val ? new Date(val) : undefined))
    .optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
})
