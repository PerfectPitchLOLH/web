import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
  logApiUnauthorizedAccess: vi.fn(),
}))

vi.mock('@/server/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/server/lib/database', () => ({
  db: { user: { findUnique: mocks.findUnique } },
}))
vi.mock('@/server/shared/utils', () => ({
  auditLogger: { logApiUnauthorizedAccess: mocks.logApiUnauthorizedAccess },
}))

import {
  ERROR_CODES,
  HTTP_STATUS,
} from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import {
  requireAdminAuth,
  requireAuth,
  requireEmailVerified,
  requireRole,
  validateApiAuth,
} from '../auth.middleware'

const userSession = {
  user: {
    id: 'user_1',
    email: 'user@test.com',
    role: 'user',
    emailVerified: new Date(),
  },
}

const impersonationSession = {
  user: {
    id: 'target_1',
    email: 'target@test.com',
    role: 'user',
    emailVerified: new Date(),
  },
  impersonation: {
    isActive: true,
    adminId: 'admin_1',
    adminEmail: 'admin@test.com',
    sessionId: 'imp_1',
  },
}

const suspended = { suspendedAt: new Date() }
const active = { suspendedAt: null }

const expectSuspended = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => null,
    (e) => e,
  )
  expect(error).toBeInstanceOf(ApiError)
  expect(error.code).toBe(ERROR_CODES.ACCOUNT_SUSPENDED)
  expect(error.statusCode).toBe(HTTP_STATUS.FORBIDDEN)
}

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findUnique.mockResolvedValue(active)
  })

  it('should reject without a session and skip the database', async () => {
    mocks.auth.mockResolvedValue(null)

    await expect(requireAuth()).rejects.toMatchObject({
      code: ERROR_CODES.UNAUTHORIZED,
      statusCode: HTTP_STATUS.UNAUTHORIZED,
    })
    expect(mocks.findUnique).not.toHaveBeenCalled()
  })

  it('should return the session of an active account with a minimal read', async () => {
    mocks.auth.mockResolvedValue(userSession)

    await expect(requireAuth()).resolves.toBe(userSession)
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      select: { suspendedAt: true },
    })
  })

  it('should reject a suspended account with 403 ACCOUNT_SUSPENDED', async () => {
    mocks.auth.mockResolvedValue(userSession)
    mocks.findUnique.mockResolvedValue(suspended)

    await expectSuspended(requireAuth())
  })

  it('should not block an admin impersonating a suspended user', async () => {
    mocks.auth.mockResolvedValue(impersonationSession)
    mocks.findUnique.mockImplementation(async ({ where }) =>
      where.id === 'target_1' ? suspended : active,
    )

    await expect(requireAuth()).resolves.toBe(impersonationSession)
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { id: 'admin_1' },
      select: { suspendedAt: true },
    })
  })

  it('should block a suspended admin even while impersonating', async () => {
    mocks.auth.mockResolvedValue(impersonationSession)
    mocks.findUnique.mockImplementation(async ({ where }) =>
      where.id === 'admin_1' ? suspended : active,
    )

    await expectSuspended(requireAuth())
  })

  it('should propagate to requireEmailVerified and requireRole', async () => {
    mocks.auth.mockResolvedValue(userSession)
    mocks.findUnique.mockResolvedValue(suspended)

    await expectSuspended(requireEmailVerified())
    await expectSuspended(requireRole(['user']))
  })
})

describe('requireAdminAuth', () => {
  const adminRow = {
    id: 'admin_1',
    email: 'admin@test.com',
    name: 'Admin',
    role: 'admin',
    emailVerified: new Date(),
    suspendedAt: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: { id: 'admin_1', email: 'admin@test.com', role: 'admin' },
    })
  })

  it('should return the admin and read suspendedAt in the same query', async () => {
    mocks.findUnique.mockResolvedValue(adminRow)

    const session = await requireAdminAuth()

    expect(session.user.id).toBe('admin_1')
    expect(mocks.findUnique).toHaveBeenCalledTimes(1)
    expect(mocks.findUnique.mock.calls[0][0].select.suspendedAt).toBe(true)
  })

  it('should reject a suspended admin with ACCOUNT_SUSPENDED', async () => {
    mocks.findUnique.mockResolvedValue({ ...adminRow, suspendedAt: new Date() })

    await expectSuspended(requireAdminAuth())
  })

  it('should keep rejecting non-admins with FORBIDDEN', async () => {
    mocks.findUnique.mockResolvedValue({ ...adminRow, role: 'user' })

    await expect(requireAdminAuth()).rejects.toMatchObject({
      code: ERROR_CODES.FORBIDDEN,
    })
  })

  it('should check the real admin behind an impersonation', async () => {
    mocks.auth.mockResolvedValue(impersonationSession)
    mocks.findUnique.mockResolvedValue({ ...adminRow, suspendedAt: new Date() })

    await expectSuspended(requireAdminAuth())
    expect(mocks.findUnique.mock.calls[0][0].where).toEqual({ id: 'admin_1' })
  })
})

describe('validateApiAuth', () => {
  const request = () => new NextRequest('http://localhost/api/partitions')

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findUnique.mockResolvedValue(active)
  })

  it('should accept an active account', async () => {
    mocks.auth.mockResolvedValue(userSession)

    await expect(validateApiAuth(request())).resolves.toEqual({
      ok: true,
      session: userSession,
    })
  })

  it('should answer 403 ACCOUNT_SUSPENDED for a suspended account', async () => {
    mocks.auth.mockResolvedValue(userSession)
    mocks.findUnique.mockResolvedValue(suspended)

    const result = await validateApiAuth(request())

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.response.status).toBe(HTTP_STATUS.FORBIDDEN)
    const body = await result.response.json()
    expect(body.error.code).toBe(ERROR_CODES.ACCOUNT_SUSPENDED)
    expect(mocks.logApiUnauthorizedAccess).not.toHaveBeenCalled()
  })

  it('should keep answering 401 without a session', async () => {
    mocks.auth.mockResolvedValue(null)

    const result = await validateApiAuth(request())

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    expect(mocks.logApiUnauthorizedAccess).toHaveBeenCalled()
  })
})
