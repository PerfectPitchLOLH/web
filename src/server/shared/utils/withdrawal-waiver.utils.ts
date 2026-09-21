import { CGV_VERSION } from '@/lib/legal-identity'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'

import { ApiError } from './api.utils'

export function buildWithdrawalWaiverMetadata(
  accepted: unknown,
  now: Date = new Date(),
): Record<string, string> {
  if (accepted !== true) {
    throw new ApiError('WITHDRAWAL_WAIVER_REQUIRED', HTTP_STATUS.BAD_REQUEST)
  }

  return {
    withdrawal_waiver_accepted_at: now.toISOString(),
    cgv_version: CGV_VERSION,
  }
}
