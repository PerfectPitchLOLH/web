import { ApiError } from '@/server/shared/utils/api.utils'

import type { AdminRepository } from './admin.repository'
import type {
  AdminAction,
  AdminDashboardStats,
  AuditLogFilters,
  AuditLogResult,
  DeleteUserDTO,
  SuspendUserDTO,
  UpdateUserRoleDTO,
  UserManagementFilters,
  UserManagementResult,
} from './admin.types'

export class AdminService {
  constructor(private repository: AdminRepository) {}

  async getDashboardStats(): Promise<AdminDashboardStats> {
    const [users, system] = await Promise.all([
      this.repository.getUserStats(),
      this.repository.getSystemStats(),
    ])

    return {
      users,
      system,
    }
  }

  async getUsers(
    filters: UserManagementFilters,
  ): Promise<UserManagementResult> {
    return this.repository.getUsersWithFilters(filters)
  }

  async updateUserRole(
    data: UpdateUserRoleDTO,
    adminUserId: string,
    adminUserName: string,
    ipAddress: string | null,
    userAgent: string | null,
  ): Promise<void> {
    if (typeof data.role !== 'string' || Array.isArray(data.role)) {
      throw new ApiError('VALIDATION_ERROR', 400, 'Invalid role type')
    }

    const validRoles = ['user', 'admin']
    if (!validRoles.includes(data.role)) {
      throw new ApiError('VALIDATION_ERROR', 400, 'Invalid role value')
    }

    const [user, admin] = await Promise.all([
      this.repository.getUserById(data.userId),
      this.repository.getUserById(adminUserId),
    ])

    if (!user) {
      throw new ApiError('NOT_FOUND', 404, 'User not found')
    }

    if (!admin) {
      throw new ApiError('NOT_FOUND', 404, 'Admin not found')
    }

    if (user.id === adminUserId) {
      throw new ApiError('FORBIDDEN', 403, 'Cannot change your own role')
    }

    if (user.isRootAdmin && !admin.isRootAdmin) {
      throw new ApiError(
        'FORBIDDEN',
        403,
        'Only root admin can change root admin role',
      )
    }

    if (user.role === 'admin' && !admin.isRootAdmin) {
      throw new ApiError(
        'FORBIDDEN',
        403,
        'Only root admin can change admin roles',
      )
    }

    await this.repository.updateUserRole(data.userId, data.role)

    await this.logAdminAction(
      adminUserId,
      adminUserName,
      'user_role_updated',
      `user:${data.userId}`,
      `Role changed from ${user.role} to ${data.role}`,
      ipAddress,
      userAgent,
    )
  }

  async suspendUser(
    data: SuspendUserDTO,
    adminUserId: string,
    adminUserName: string,
    ipAddress: string | null,
    userAgent: string | null,
  ): Promise<void> {
    const [user, admin] = await Promise.all([
      this.repository.getUserById(data.userId),
      this.repository.getUserById(adminUserId),
    ])

    if (!user) {
      throw new ApiError('NOT_FOUND', 404, 'User not found')
    }

    if (!admin) {
      throw new ApiError('NOT_FOUND', 404, 'Admin not found')
    }

    if (user.id === adminUserId) {
      throw new ApiError('FORBIDDEN', 403, 'Cannot suspend your own account')
    }

    if (user.isRootAdmin) {
      throw new ApiError('FORBIDDEN', 403, 'Cannot suspend root admin')
    }

    if (user.role === 'admin' && !admin.isRootAdmin) {
      throw new ApiError(
        'FORBIDDEN',
        403,
        'Only root admin can suspend admin accounts',
      )
    }

    if (user.status === 'suspended') {
      await this.repository.unsuspendUser(data.userId)

      await this.logAdminAction(
        adminUserId,
        adminUserName,
        'user_activated',
        `user:${data.userId}`,
        `User ${user.email} was reactivated`,
        ipAddress,
        userAgent,
      )
    } else {
      await this.repository.suspendUser(data.userId)

      await this.logAdminAction(
        adminUserId,
        adminUserName,
        'user_suspended',
        `user:${data.userId}`,
        `User ${user.email} was suspended`,
        ipAddress,
        userAgent,
      )
    }
  }

  async deleteUser(
    data: DeleteUserDTO,
    adminUserId: string,
    adminUserName: string,
    ipAddress: string | null,
    userAgent: string | null,
  ): Promise<void> {
    const [user, admin] = await Promise.all([
      this.repository.getUserById(data.userId),
      this.repository.getUserById(adminUserId),
    ])

    if (!user) {
      throw new ApiError('NOT_FOUND', 404, 'User not found')
    }

    if (!admin) {
      throw new ApiError('NOT_FOUND', 404, 'Admin not found')
    }

    if (user.id === adminUserId) {
      throw new ApiError('FORBIDDEN', 403, 'Cannot delete your own account')
    }

    if (user.isRootAdmin) {
      throw new ApiError('FORBIDDEN', 403, 'Cannot delete root admin')
    }

    if (user.role === 'admin' && !admin.isRootAdmin) {
      throw new ApiError(
        'FORBIDDEN',
        403,
        'Only root admin can delete admin accounts',
      )
    }

    await this.repository.deleteUser(data.userId)

    await this.logAdminAction(
      adminUserId,
      adminUserName,
      'user_deleted',
      `user:${data.userId}`,
      `User ${user.email} was deleted`,
      ipAddress,
      userAgent,
    )
  }

  async getAuditLogs(filters: AuditLogFilters): Promise<AuditLogResult> {
    return this.repository.getAuditLogs(filters)
  }

  async logAdminAction(
    userId: string,
    userName: string,
    action: AdminAction,
    resource: string,
    details: string | null,
    ipAddress: string | null,
    userAgent: string | null,
  ): Promise<void> {
    await this.repository.createAuditLog(
      userId,
      userName,
      action,
      resource,
      details,
      ipAddress,
      userAgent,
    )
  }
}
