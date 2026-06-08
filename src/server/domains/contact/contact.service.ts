import { sendContactEmail } from '@/server/lib/email'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import { CONTACT_CATEGORY_LABELS } from './contact.constants'
import type { SubmitContactInput } from './contact.schemas'
import type { ContactSender } from './contact.types'

export class ContactService {
  resolveSender(
    input: SubmitContactInput,
    sessionUser: ContactSender | null,
  ): { senderName: string; senderEmail: string } {
    if (sessionUser?.email) {
      return {
        senderName: sessionUser.name ?? sessionUser.email,
        senderEmail: sessionUser.email,
      }
    }

    if (!input.name || !input.email) {
      throw new ApiError(
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST,
        "Le nom et l'email sont requis",
      )
    }

    return { senderName: input.name, senderEmail: input.email }
  }

  async submit(
    input: SubmitContactInput,
    sessionUser: ContactSender | null,
  ): Promise<void> {
    const { senderName, senderEmail } = this.resolveSender(input, sessionUser)

    try {
      await sendContactEmail({
        categoryLabel: CONTACT_CATEGORY_LABELS[input.category],
        message: input.message,
        senderName,
        senderEmail,
      })
    } catch {
      throw new ApiError('EMAIL_SEND_FAILED', HTTP_STATUS.SERVICE_UNAVAILABLE)
    }
  }
}
