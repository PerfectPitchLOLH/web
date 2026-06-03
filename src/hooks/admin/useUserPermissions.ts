import type { User as PrismaUser } from '@prisma/client'

import type { CurrentUser } from './useCurrentUser'

type User = PrismaUser & {
  isRootAdmin: boolean
}

export function useUserPermissions(currentUser: CurrentUser | null) {
  const canPerformAction = (targetUser: User): boolean => {
    if (!currentUser) return false
    if (targetUser.id === currentUser.id) return false
    if (targetUser.isRootAdmin) return false
    if (targetUser.role === 'admin' && !currentUser.isRootAdmin) return false
    return true
  }

  const canChangeRole = (targetUser: User): boolean => {
    if (!currentUser) return false
    if (targetUser.id === currentUser.id) return false
    if (targetUser.isRootAdmin && !currentUser.isRootAdmin) return false
    if (targetUser.role === 'admin' && !currentUser.isRootAdmin) return false
    return true
  }

  const getDisabledReason = (targetUser: User): string | null => {
    if (!currentUser) return null
    if (targetUser.id === currentUser.id) {
      return 'Vous ne pouvez pas modifier votre propre compte'
    }
    if (targetUser.isRootAdmin && !currentUser.isRootAdmin) {
      return 'Seul le Root Admin peut modifier le Root Admin'
    }
    if (targetUser.role === 'admin' && !currentUser.isRootAdmin) {
      return 'Seul le Root Admin peut modifier les administrateurs'
    }
    return null
  }

  return {
    canPerformAction,
    canChangeRole,
    getDisabledReason,
  }
}
