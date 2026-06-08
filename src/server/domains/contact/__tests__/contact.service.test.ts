import { beforeEach, describe, expect, it, vi } from 'vitest'

import { sendContactEmail } from '@/server/lib/email'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import { CONTACT_CATEGORY_LABELS } from '../contact.constants'
import type { SubmitContactInput } from '../contact.schemas'
import { ContactService } from '../contact.service'

vi.mock('@/server/lib/email', () => ({
  sendContactEmail: vi.fn(),
}))

describe('ContactService', () => {
  let service: ContactService

  const baseInput: SubmitContactInput = {
    category: 'general',
    message: "Bonjour, j'ai une question sur votre produit.",
  }

  beforeEach(() => {
    service = new ContactService()
    vi.clearAllMocks()
  })

  describe('resolveSender', () => {
    it('uses the session identity and ignores client-submitted name/email when authenticated', () => {
      const result = service.resolveSender(
        { ...baseInput, name: 'Spoofed Name', email: 'spoofed@example.com' },
        { name: 'Alice Martin', email: 'alice@example.com' },
      )

      expect(result).toEqual({
        senderName: 'Alice Martin',
        senderEmail: 'alice@example.com',
      })
    })

    it('falls back to the session email as the display name when the session has no name', () => {
      const result = service.resolveSender(baseInput, {
        name: null,
        email: 'alice@example.com',
      })

      expect(result.senderName).toBe('alice@example.com')
    })

    it('throws VALIDATION_ERROR when anonymous and name or email is missing', () => {
      expect(() => service.resolveSender(baseInput, null)).toThrow(ApiError)
      try {
        service.resolveSender({ ...baseInput, name: 'Bob' }, null)
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).code).toBe('VALIDATION_ERROR')
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.BAD_REQUEST)
      }
    })

    it('uses the client-submitted name/email when anonymous and both are present', () => {
      const result = service.resolveSender(
        { ...baseInput, name: 'Bob Visitor', email: 'bob@example.com' },
        null,
      )

      expect(result).toEqual({
        senderName: 'Bob Visitor',
        senderEmail: 'bob@example.com',
      })
    })
  })

  describe('submit', () => {
    it('sends the contact email with the resolved sender and mapped category label', async () => {
      await service.submit(
        { ...baseInput, category: 'payment_issue' },
        { name: 'Alice Martin', email: 'alice@example.com' },
      )

      expect(sendContactEmail).toHaveBeenCalledWith({
        categoryLabel: CONTACT_CATEGORY_LABELS.payment_issue,
        message: baseInput.message,
        senderName: 'Alice Martin',
        senderEmail: 'alice@example.com',
      })
    })

    it('propagates an EMAIL_SEND_FAILED ApiError when sendContactEmail rejects', async () => {
      vi.mocked(sendContactEmail).mockRejectedValueOnce(new Error('boom'))

      await expect(
        service.submit(baseInput, {
          name: 'Alice Martin',
          email: 'alice@example.com',
        }),
      ).rejects.toMatchObject({
        code: 'EMAIL_SEND_FAILED',
        statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
      })
    })

    it('throws VALIDATION_ERROR before attempting to send when anonymous identity is incomplete', async () => {
      await expect(
        service.submit({ ...baseInput, name: 'Bob' }, null),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })

      expect(sendContactEmail).not.toHaveBeenCalled()
    })
  })
})
