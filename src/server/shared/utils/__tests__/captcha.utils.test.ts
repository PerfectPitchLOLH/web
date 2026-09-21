import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { verifyCaptchaToken } from '../captcha.utils'

const fetchMock = vi.fn()

describe('verifyCaptchaToken', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    fetchMock.mockReset()
  })

  describe('without TURNSTILE_SECRET_KEY', () => {
    beforeEach(() => {
      vi.stubEnv('TURNSTILE_SECRET_KEY', '')
    })

    it('should refuse and log an error in production', async () => {
      vi.stubEnv('NODE_ENV', 'production')

      await expect(verifyCaptchaToken('token', '1.2.3.4')).resolves.toBe(false)
      await expect(verifyCaptchaToken(undefined, null)).resolves.toBe(false)
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('TURNSTILE_SECRET_KEY'),
      )
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should accept in development', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      await expect(verifyCaptchaToken(undefined, null)).resolves.toBe(true)
      expect(console.error).not.toHaveBeenCalled()
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should accept in test', async () => {
      vi.stubEnv('NODE_ENV', 'test')

      await expect(verifyCaptchaToken(undefined, null)).resolves.toBe(true)
    })
  })

  describe('with TURNSTILE_SECRET_KEY', () => {
    beforeEach(() => {
      vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret')
      vi.stubEnv('NODE_ENV', 'production')
    })

    it('should refuse a missing token without calling Cloudflare', async () => {
      await expect(verifyCaptchaToken(undefined, '1.2.3.4')).resolves.toBe(
        false,
      )
      await expect(verifyCaptchaToken('', '1.2.3.4')).resolves.toBe(false)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should accept a token validated by Cloudflare', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await expect(verifyCaptchaToken('token', '1.2.3.4')).resolves.toBe(true)

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      )
      expect((init.body as URLSearchParams).get('secret')).toBe('secret')
      expect((init.body as URLSearchParams).get('response')).toBe('token')
      expect((init.body as URLSearchParams).get('remoteip')).toBe('1.2.3.4')
    })

    it('should refuse a token rejected by Cloudflare', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ success: false }),
      })

      await expect(verifyCaptchaToken('bad', null)).resolves.toBe(false)
    })

    it('should refuse when Cloudflare answers with an error status', async () => {
      fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) })

      await expect(verifyCaptchaToken('token', null)).resolves.toBe(false)
    })
  })
})
