import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  config: null as any,
  limit: vi.fn(),
  findUnique: vi.fn(),
  verifyPassword: vi.fn(),
  logRateLimitExceeded: vi.fn(),
  findSuspendedAtByEmail: vi.fn(),
}))

vi.mock('next-auth', () => ({
  default: (config: unknown) => {
    mocks.config = config
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }
  },
}))
vi.mock('next-auth/providers/credentials', () => ({
  default: (options: unknown) => options,
}))
vi.mock('next-auth/providers/google', () => ({ default: () => ({}) }))
vi.mock('@auth/prisma-adapter', () => ({ PrismaAdapter: () => ({}) }))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/server/domains/dev-mode', () => ({ DEV_MODE_COOKIE_NAME: 'dev' }))
vi.mock('@/server/lib/database', () => ({
  db: { user: { findUnique: mocks.findUnique } },
}))
vi.mock('@/server/domains/auth/auth.repository', () => ({
  AuthRepository: class {
    findSuspendedAtByEmail = mocks.findSuspendedAtByEmail
    findEmailVerifiedById = vi.fn()
  },
}))
vi.mock('@/server/shared/utils/password.utils', () => ({
  verifyPassword: mocks.verifyPassword,
}))
vi.mock('@/server/shared/utils/audit.logger', () => ({
  auditLogger: { logRateLimitExceeded: mocks.logRateLimitExceeded },
}))
vi.mock('@upstash/redis', () => ({ Redis: class {} }))
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow = vi.fn()
    limit = mocks.limit
  },
}))

import '../auth'

import { getSignInRateLimitKey } from '@/server/shared/utils/rate-limit.utils'

const EMAIL = 'user@test.com'
const PASSWORD = 'Sup3r-secret!'
const IP = '203.0.113.7'

const dbUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user_1',
  email: EMAIL,
  name: 'User',
  image: null,
  role: 'user',
  emailVerified: null,
  password: '$2b$12$storedhashstoredhashstoredhashstoredhashstoredhashst',
  suspendedAt: null,
  ...overrides,
})

const request = (ip: string | null = IP) =>
  new Request('http://localhost/api/auth/callback/credentials', {
    method: 'POST',
    headers: ip ? { 'x-forwarded-for': ip } : {},
  })

const authorize = (
  credentials: Record<string, unknown> = { email: EMAIL, password: PASSWORD },
  req: Request = request(),
) => mocks.config.providers[1].authorize(credentials, req)

describe('credentials authorize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.limit.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 900_000,
    })
    mocks.findUnique.mockResolvedValue(dbUser())
    mocks.verifyPassword.mockResolvedValue(true)
  })

  it('should return the user on valid credentials', async () => {
    await expect(authorize()).resolves.toEqual({
      id: 'user_1',
      email: EMAIL,
      name: 'User',
      image: null,
      role: 'user',
      emailVerified: null,
    })
  })

  it('should rate limit on a key derived from the normalized email and the IP', async () => {
    await authorize({ email: EMAIL, password: PASSWORD }, request(IP))

    expect(mocks.limit).toHaveBeenCalledTimes(1)
    expect(mocks.limit).toHaveBeenCalledWith(getSignInRateLimitKey(EMAIL, IP))
  })

  it('should use a distinct key per IP and share it across email casing', async () => {
    await authorize(
      { email: EMAIL, password: PASSWORD },
      request('198.51.100.1'),
    )
    await authorize(
      { email: EMAIL, password: PASSWORD },
      request('198.51.100.2'),
    )
    await authorize({ email: 'USER@test.com', password: PASSWORD }, request(IP))
    await authorize({ email: EMAIL, password: PASSWORD }, request(IP))

    const keys = mocks.limit.mock.calls.map(([key]) => key)
    expect(keys[0]).not.toBe(keys[1])
    expect(keys[2]).toBe(keys[3])
  })

  it('should refuse over the limit before any password verification', async () => {
    mocks.limit.mockResolvedValue({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 900_000,
    })

    await expect(authorize()).resolves.toBeNull()

    expect(mocks.findUnique).not.toHaveBeenCalled()
    expect(mocks.verifyPassword).not.toHaveBeenCalled()
    expect(mocks.logRateLimitExceeded).toHaveBeenCalledWith(
      getSignInRateLimitKey(EMAIL, IP),
      'signin',
      IP,
    )
  })

  it('should refuse a correct password when over the limit', async () => {
    mocks.limit.mockResolvedValue({
      success: false,
      limit: 5,
      remaining: 0,
      reset: 0,
    })

    await expect(authorize()).resolves.toBeNull()
  })

  it('should return null on a wrong password', async () => {
    mocks.verifyPassword.mockResolvedValue(false)

    await expect(authorize()).resolves.toBeNull()
  })

  it('should still consume the limiter and hash-compare for an unknown email', async () => {
    mocks.findUnique.mockResolvedValue(null)
    mocks.verifyPassword.mockResolvedValue(false)

    await expect(authorize()).resolves.toBeNull()

    expect(mocks.limit).toHaveBeenCalledTimes(1)
    expect(mocks.verifyPassword).toHaveBeenCalledWith(
      PASSWORD,
      expect.stringMatching(/^\$2b\$12\$/),
    )
  })

  it('should return null for an account without password (OAuth only)', async () => {
    mocks.findUnique.mockResolvedValue(dbUser({ password: null }))

    await expect(authorize()).resolves.toBeNull()
    expect(mocks.verifyPassword).toHaveBeenCalledTimes(1)
  })

  it('should refuse a suspended account even with the correct password', async () => {
    mocks.findUnique.mockResolvedValue(dbUser({ suspendedAt: new Date() }))

    await expect(authorize()).resolves.toBeNull()
    expect(mocks.verifyPassword).toHaveBeenCalledTimes(1)
  })

  it('should return null without hitting limiter or database on malformed input', async () => {
    await expect(
      authorize({ email: "x' OR '1'='1", password: PASSWORD }),
    ).resolves.toBeNull()
    await expect(authorize({ email: EMAIL })).resolves.toBeNull()

    expect(mocks.limit).not.toHaveBeenCalled()
    expect(mocks.findUnique).not.toHaveBeenCalled()
  })

  it('should key on an unknown IP when the request carries no forwarding header', async () => {
    await authorize({ email: EMAIL, password: PASSWORD }, request(null))

    expect(mocks.limit).toHaveBeenCalledWith(getSignInRateLimitKey(EMAIL, null))
  })
})

describe('signIn callback', () => {
  const signIn = (params: Record<string, unknown>) =>
    mocks.config.callbacks.signIn(params)

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findSuspendedAtByEmail.mockResolvedValue({ suspendedAt: null })
  })

  it('should not re-check credentials logins already vetted by authorize', async () => {
    await expect(
      signIn({ user: { email: EMAIL }, account: { provider: 'credentials' } }),
    ).resolves.toBe(true)
    expect(mocks.findSuspendedAtByEmail).not.toHaveBeenCalled()
  })

  it('should refuse a suspended account signing in with Google', async () => {
    mocks.findSuspendedAtByEmail.mockResolvedValue({ suspendedAt: new Date() })

    await expect(
      signIn({ user: { email: EMAIL }, account: { provider: 'google' } }),
    ).resolves.toBe(false)
    expect(mocks.findSuspendedAtByEmail).toHaveBeenCalledWith(EMAIL)
  })

  it('should accept an active or brand new Google account', async () => {
    await expect(
      signIn({ user: { email: EMAIL }, account: { provider: 'google' } }),
    ).resolves.toBe(true)

    mocks.findSuspendedAtByEmail.mockResolvedValue(null)
    await expect(
      signIn({ user: { email: EMAIL }, account: { provider: 'google' } }),
    ).resolves.toBe(true)
  })
})
