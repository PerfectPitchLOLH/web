import { describe, expect, it } from 'vitest'

import { CGV_VERSION } from '@/lib/legal-identity'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'

import { ApiError } from '../api.utils'
import { buildWithdrawalWaiverMetadata } from '../withdrawal-waiver.utils'

describe('buildWithdrawalWaiverMetadata', () => {
  it.each([undefined, null, false, 'true', 1, {}])(
    'rejette la valeur %j',
    (value) => {
      expect(() => buildWithdrawalWaiverMetadata(value)).toThrow(ApiError)
      expect(() => buildWithdrawalWaiverMetadata(value)).toThrowError(
        expect.objectContaining({
          code: 'WITHDRAWAL_WAIVER_REQUIRED',
          statusCode: HTTP_STATUS.BAD_REQUEST,
        }),
      )
    },
  )

  it('retourne l’horodatage du consentement et la version des CGV', () => {
    const metadata = buildWithdrawalWaiverMetadata(
      true,
      new Date('2026-09-21T10:00:00.000Z'),
    )

    expect(metadata).toEqual({
      withdrawal_waiver_accepted_at: '2026-09-21T10:00:00.000Z',
      cgv_version: CGV_VERSION,
    })
  })

  it('utilise l’heure courante par défaut', () => {
    const before = Date.now()
    const metadata = buildWithdrawalWaiverMetadata(true)
    const acceptedAt = new Date(metadata.withdrawal_waiver_accepted_at)

    expect(acceptedAt.getTime()).toBeGreaterThanOrEqual(before)
    expect(acceptedAt.getTime()).toBeLessThanOrEqual(Date.now())
  })
})
