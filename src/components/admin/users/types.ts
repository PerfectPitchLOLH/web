import type { User as PrismaUser } from '@prisma/client'

export type User = PrismaUser & {
  isRootAdmin: boolean
}

export type ActionDialog = {
  type: 'suspend' | 'delete' | null
  user: User | null
}
