import { NextRequest } from 'next/server'

import { auth } from '@/server/lib/auth'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import {
  checkRateLimit,
  createErrorResponse,
  createSuccessResponse,
  getClientIP,
  getRateLimitIdentifier,
  handleApiError,
  rateLimiters,
} from '@/server/shared/utils'

import { submitContactSchema } from './contact.schemas'
import type { ContactService } from './contact.service'

export class ContactController {
  constructor(private service: ContactService) {}

  async submit(request: NextRequest) {
    try {
      const ip = getClientIP(request)
      const identifier = getRateLimitIdentifier(ip)

      const { success, reset } = await checkRateLimit(
        rateLimiters.contact,
        identifier,
      )

      if (!success) {
        const response = createErrorResponse(
          'TOO_MANY_REQUESTS',
          'Trop de messages envoyés. Réessayez plus tard.',
          { retryAfter: new Date(reset).toISOString() },
          HTTP_STATUS.TOO_MANY_REQUESTS,
        )
        response.headers.set(
          'Retry-After',
          Math.ceil((reset - Date.now()) / 1000).toString(),
        )
        return response
      }

      const session = await auth()
      const body = await request.json()
      const validated = submitContactSchema.parse(body)

      await this.service.submit(validated, session?.user ?? null)

      return createSuccessResponse({
        message: 'Votre message a bien été envoyé',
      })
    } catch (error) {
      return handleApiError(error)
    }
  }
}
