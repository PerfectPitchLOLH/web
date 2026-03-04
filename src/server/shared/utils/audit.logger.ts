export type AuditEventType =
  | 'AUTH_SIGNUP_SUCCESS'
  | 'AUTH_SIGNUP_FAILURE'
  | 'AUTH_SIGNIN_SUCCESS'
  | 'AUTH_SIGNIN_FAILURE'
  | 'AUTH_SIGNOUT'
  | 'AUTH_PASSWORD_RESET_REQUEST'
  | 'AUTH_PASSWORD_RESET_SUCCESS'
  | 'AUTH_EMAIL_VERIFICATION_SUCCESS'
  | 'AUTH_UNAUTHORIZED_ACCESS'
  | 'AUTH_RATE_LIMIT_EXCEEDED'
  | 'API_UNAUTHORIZED_ACCESS'
  | 'API_FORBIDDEN_ACCESS'
  | 'ADMIN_UNAUTHORIZED_ACCESS'
  | 'IMPERSONATION_START'
  | 'IMPERSONATION_END'
  | 'IMPERSONATION_ACTION'
  | 'IMPERSONATION_UNAUTHORIZED'
  | 'IMPERSONATION_RATE_LIMIT'

export type AuditLogEntry = {
  timestamp: string
  event: AuditEventType
  userId?: string
  email?: string
  ip?: string | null
  userAgent?: string | null
  details?: Record<string, unknown>
  success: boolean
}

class AuditLogger {
  private log(entry: AuditLogEntry): void {
    const logEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    }

    console.log('[AUDIT]', JSON.stringify(logEntry, null, 2))
  }

  logSignupSuccess(email: string, userId: string, ip: string | null): void {
    this.log({
      event: 'AUTH_SIGNUP_SUCCESS',
      userId,
      email,
      ip,
      success: true,
      timestamp: new Date().toISOString(),
    })
  }

  logSignupFailure(email: string, reason: string, ip: string | null): void {
    this.log({
      event: 'AUTH_SIGNUP_FAILURE',
      email,
      ip,
      details: { reason },
      success: false,
      timestamp: new Date().toISOString(),
    })
  }

  logSigninSuccess(
    email: string,
    userId: string,
    ip: string | null,
    userAgent: string | null,
  ): void {
    this.log({
      event: 'AUTH_SIGNIN_SUCCESS',
      userId,
      email,
      ip,
      userAgent,
      success: true,
      timestamp: new Date().toISOString(),
    })
  }

  logSigninFailure(
    email: string,
    reason: string,
    ip: string | null,
    userAgent: string | null,
  ): void {
    this.log({
      event: 'AUTH_SIGNIN_FAILURE',
      email,
      ip,
      userAgent,
      details: { reason },
      success: false,
      timestamp: new Date().toISOString(),
    })
  }

  logSignout(userId: string, email: string, ip: string | null): void {
    this.log({
      event: 'AUTH_SIGNOUT',
      userId,
      email,
      ip,
      success: true,
      timestamp: new Date().toISOString(),
    })
  }

  logPasswordResetRequest(email: string, ip: string | null): void {
    this.log({
      event: 'AUTH_PASSWORD_RESET_REQUEST',
      email,
      ip,
      success: true,
      timestamp: new Date().toISOString(),
    })
  }

  logPasswordResetSuccess(
    userId: string,
    email: string,
    ip: string | null,
  ): void {
    this.log({
      event: 'AUTH_PASSWORD_RESET_SUCCESS',
      userId,
      email,
      ip,
      success: true,
      timestamp: new Date().toISOString(),
    })
  }

  logEmailVerificationSuccess(userId: string, email: string): void {
    this.log({
      event: 'AUTH_EMAIL_VERIFICATION_SUCCESS',
      userId,
      email,
      success: true,
      timestamp: new Date().toISOString(),
    })
  }

  logUnauthorizedAccess(
    path: string,
    ip: string | null,
    reason?: string,
  ): void {
    this.log({
      event: 'AUTH_UNAUTHORIZED_ACCESS',
      ip,
      details: { path, reason },
      success: false,
      timestamp: new Date().toISOString(),
    })
  }

  logRateLimitExceeded(
    identifier: string,
    endpoint: string,
    ip: string | null,
  ): void {
    this.log({
      event: 'AUTH_RATE_LIMIT_EXCEEDED',
      ip,
      details: { identifier, endpoint },
      success: false,
      timestamp: new Date().toISOString(),
    })
  }

  logApiUnauthorizedAccess(
    path: string,
    method: string,
    ip: string | null,
  ): void {
    this.log({
      event: 'API_UNAUTHORIZED_ACCESS',
      ip,
      details: { path, method },
      success: false,
      timestamp: new Date().toISOString(),
    })
  }

  logApiForbiddenAccess(
    path: string,
    method: string,
    userId: string,
    ip: string | null,
  ): void {
    this.log({
      event: 'API_FORBIDDEN_ACCESS',
      userId,
      ip,
      details: { path, method },
      success: false,
      timestamp: new Date().toISOString(),
    })
  }

  logUnauthorizedAdminAccess(
    userId: string,
    userName: string,
    path: string,
    ip: string | null,
  ): void {
    this.log({
      event: 'ADMIN_UNAUTHORIZED_ACCESS',
      userId,
      ip,
      details: { userName, path },
      success: false,
      timestamp: new Date().toISOString(),
    })
  }

  logImpersonationStart(
    adminId: string,
    adminEmail: string,
    targetUserId: string,
    targetEmail: string,
    ip: string | null,
    userAgent: string | null,
  ): void {
    this.log({
      event: 'IMPERSONATION_START',
      userId: adminId,
      email: adminEmail,
      ip,
      userAgent,
      details: { targetUserId, targetEmail },
      success: true,
      timestamp: new Date().toISOString(),
    })
  }

  logImpersonationEnd(
    adminId: string,
    adminEmail: string,
    targetUserId: string,
    targetEmail: string,
    ip: string | null,
  ): void {
    this.log({
      event: 'IMPERSONATION_END',
      userId: adminId,
      email: adminEmail,
      ip,
      details: { targetUserId, targetEmail },
      success: true,
      timestamp: new Date().toISOString(),
    })
  }

  logImpersonationUnauthorized(
    userId: string,
    targetUserId: string,
    reason: string,
    ip: string | null,
  ): void {
    this.log({
      event: 'IMPERSONATION_UNAUTHORIZED',
      userId,
      ip,
      details: { targetUserId, reason },
      success: false,
      timestamp: new Date().toISOString(),
    })
  }

  logImpersonationRateLimit(
    identifier: string,
    endpoint: string,
    ip: string | null,
  ): void {
    this.log({
      event: 'IMPERSONATION_RATE_LIMIT',
      ip,
      details: { identifier, endpoint },
      success: false,
      timestamp: new Date().toISOString(),
    })
  }

  logImpersonationAction(
    adminId: string,
    targetUserId: string,
    action: string,
    method: string,
    path: string,
    statusCode: number | null,
    ip: string | null,
  ): void {
    this.log({
      event: 'IMPERSONATION_ACTION',
      userId: adminId,
      ip,
      details: {
        targetUserId,
        action,
        method,
        path,
        statusCode,
      },
      success: statusCode ? statusCode < 400 : true,
      timestamp: new Date().toISOString(),
    })
  }
}

export const auditLogger = new AuditLogger()
