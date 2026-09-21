import { describe, expect, it, vi } from 'vitest'

vi.mock('@upstash/redis', () => ({ Redis: class {} }))
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow = vi.fn()
  },
}))

import { getClientIP, getSignInRateLimitKey } from '../rate-limit.utils'

describe('getSignInRateLimitKey', () => {
  it('should be stable for the same email and IP', () => {
    expect(getSignInRateLimitKey('a@test.com', '1.2.3.4')).toBe(
      getSignInRateLimitKey('a@test.com', '1.2.3.4'),
    )
  })

  it('should normalize the email case and whitespace', () => {
    expect(getSignInRateLimitKey(' A@Test.com ', '1.2.3.4')).toBe(
      getSignInRateLimitKey('a@test.com', '1.2.3.4'),
    )
  })

  it('should differ per IP for the same email', () => {
    expect(getSignInRateLimitKey('a@test.com', '1.2.3.4')).not.toBe(
      getSignInRateLimitKey('a@test.com', '5.6.7.8'),
    )
  })

  it('should differ per email for the same IP', () => {
    expect(getSignInRateLimitKey('a@test.com', '1.2.3.4')).not.toBe(
      getSignInRateLimitKey('b@test.com', '1.2.3.4'),
    )
  })

  it('should share one bucket per email when the IP is unknown', () => {
    expect(getSignInRateLimitKey('a@test.com', null)).toBe(
      getSignInRateLimitKey('a@test.com', ''),
    )
    expect(getSignInRateLimitKey('a@test.com', null)).not.toBe(
      getSignInRateLimitKey('a@test.com', '1.2.3.4'),
    )
  })

  it('should not expose the email in the key', () => {
    expect(getSignInRateLimitKey('a@test.com', '1.2.3.4')).toMatch(
      /^[0-9a-f]{64}$/,
    )
  })
})

describe('getClientIP', () => {
  it('should use the first x-forwarded-for entry', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' },
    })

    expect(getClientIP(request)).toBe('1.2.3.4')
  })

  it('should fall back to x-real-ip then null', () => {
    expect(
      getClientIP(
        new Request('http://localhost', {
          headers: { 'x-real-ip': '9.9.9.9' },
        }),
      ),
    ).toBe('9.9.9.9')
    expect(getClientIP(new Request('http://localhost'))).toBeNull()
  })
})
