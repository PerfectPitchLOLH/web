import { beforeEach, describe, expect, it, vi } from 'vitest'

import { stripe } from '@/server/lib/stripe'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils'

import type { SettingsRepository } from '../settings.repository'
import { SettingsService } from '../settings.service'

vi.mock('@/server/lib/stripe', () => ({
  stripe: {
    subscriptions: { list: vi.fn(), cancel: vi.fn() },
    customers: { del: vi.fn() },
  },
}))

vi.mock('@/server/shared/utils/password.utils', () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
  isStrongPassword: vi.fn(),
}))

const USER_ID = 'user123'
const CUSTOMER_ID = 'cus_123'

function stripeList(...statuses: Array<[string, string]>) {
  const items = statuses.map(([id, status]) => ({ id, status }))
  return {
    async *[Symbol.asyncIterator]() {
      yield* items
    },
  } as any
}

function stripeError(code: string) {
  return Object.assign(new Error(`Stripe: ${code}`), { code })
}

describe('SettingsService.deleteAccount - Stripe billing', () => {
  let service: SettingsService
  let repository: {
    findById: ReturnType<typeof vi.fn>
    findStripeCustomerIds: ReturnType<typeof vi.fn>
    deleteUser: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})

    repository = {
      findById: vi.fn().mockResolvedValue({ id: USER_ID }),
      findStripeCustomerIds: vi.fn().mockResolvedValue([CUSTOMER_ID]),
      deleteUser: vi.fn().mockResolvedValue(undefined),
    }
    service = new SettingsService(repository as unknown as SettingsRepository)

    vi.mocked(stripe.subscriptions.list).mockReturnValue(stripeList())
    vi.mocked(stripe.subscriptions.cancel).mockResolvedValue({} as any)
    vi.mocked(stripe.customers.del).mockResolvedValue({} as any)
  })

  describe('with a Stripe subscription', () => {
    it('should cancel every non-terminal subscription, delete the customer, then delete the user', async () => {
      vi.mocked(stripe.subscriptions.list).mockReturnValue(
        stripeList(
          ['sub_active', 'active'],
          ['sub_trialing', 'trialing'],
          ['sub_past_due', 'past_due'],
          ['sub_unpaid', 'unpaid'],
          ['sub_paused', 'paused'],
          ['sub_incomplete', 'incomplete'],
          ['sub_canceled', 'canceled'],
          ['sub_expired', 'incomplete_expired'],
        ),
      )

      await service.deleteAccount(USER_ID)

      expect(stripe.subscriptions.list).toHaveBeenCalledWith({
        customer: CUSTOMER_ID,
        status: 'all',
        limit: 100,
      })
      expect(
        vi.mocked(stripe.subscriptions.cancel).mock.calls.map(([id]) => id),
      ).toEqual([
        'sub_active',
        'sub_trialing',
        'sub_past_due',
        'sub_unpaid',
        'sub_paused',
        'sub_incomplete',
      ])
      expect(stripe.customers.del).toHaveBeenCalledWith(CUSTOMER_ID)
      expect(repository.deleteUser).toHaveBeenCalledWith(USER_ID)

      const lastCancel = Math.max(
        ...vi.mocked(stripe.subscriptions.cancel).mock.invocationCallOrder,
      )
      const customerDeletion = vi.mocked(stripe.customers.del).mock
        .invocationCallOrder[0]
      const userDeletion = repository.deleteUser.mock.invocationCallOrder[0]
      expect(lastCancel).toBeLessThan(customerDeletion)
      expect(customerDeletion).toBeLessThan(userDeletion)
    })

    it('should process every Stripe customer linked to the user', async () => {
      repository.findStripeCustomerIds.mockResolvedValue(['cus_a', 'cus_b'])
      vi.mocked(stripe.subscriptions.list).mockReturnValue(
        stripeList(['sub_1', 'active']),
      )

      await service.deleteAccount(USER_ID)

      expect(stripe.subscriptions.list).toHaveBeenCalledTimes(2)
      expect(stripe.customers.del).toHaveBeenCalledWith('cus_a')
      expect(stripe.customers.del).toHaveBeenCalledWith('cus_b')
      expect(repository.deleteUser).toHaveBeenCalledWith(USER_ID)
    })
  })

  describe('without a Stripe customer (free account)', () => {
    it('should delete the user without any Stripe call', async () => {
      repository.findStripeCustomerIds.mockResolvedValue([])

      await service.deleteAccount(USER_ID)

      expect(stripe.subscriptions.list).not.toHaveBeenCalled()
      expect(stripe.subscriptions.cancel).not.toHaveBeenCalled()
      expect(stripe.customers.del).not.toHaveBeenCalled()
      expect(repository.deleteUser).toHaveBeenCalledWith(USER_ID)
    })

    it('should reject an unknown user before touching Stripe', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(service.deleteAccount(USER_ID)).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })

      expect(repository.findStripeCustomerIds).not.toHaveBeenCalled()
      expect(stripe.subscriptions.list).not.toHaveBeenCalled()
      expect(repository.deleteUser).not.toHaveBeenCalled()
    })
  })

  describe('Stripe failure', () => {
    async function expectRefused() {
      const error = await service.deleteAccount(USER_ID).catch((e) => e)

      expect(error).toBeInstanceOf(ApiError)
      expect(error.code).toBe('STRIPE_UPDATE_FAILED')
      expect(error.statusCode).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE)
      expect(error.message).toContain("Votre compte n'a pas été supprimé")
      expect(repository.deleteUser).not.toHaveBeenCalled()
    }

    it('should refuse the deletion when a subscription cannot be canceled', async () => {
      vi.mocked(stripe.subscriptions.list).mockReturnValue(
        stripeList(['sub_active', 'active']),
      )
      vi.mocked(stripe.subscriptions.cancel).mockRejectedValue(
        stripeError('api_connection_error'),
      )

      await expectRefused()
      expect(stripe.customers.del).not.toHaveBeenCalled()
    })

    it('should stop at the first failing subscription', async () => {
      vi.mocked(stripe.subscriptions.list).mockReturnValue(
        stripeList(['sub_1', 'active'], ['sub_2', 'active']),
      )
      vi.mocked(stripe.subscriptions.cancel).mockRejectedValueOnce(
        stripeError('rate_limit'),
      )

      await expectRefused()
      expect(stripe.subscriptions.cancel).toHaveBeenCalledTimes(1)
    })

    it('should refuse the deletion when the subscriptions cannot be listed', async () => {
      vi.mocked(stripe.subscriptions.list).mockImplementation(() => {
        throw stripeError('api_connection_error')
      })

      await expectRefused()
      expect(stripe.subscriptions.cancel).not.toHaveBeenCalled()
    })

    it('should refuse the deletion when the customer cannot be deleted', async () => {
      vi.mocked(stripe.customers.del).mockRejectedValue(
        stripeError('api_error'),
      )

      await expectRefused()
    })

    it('should allow a retry once Stripe recovers', async () => {
      vi.mocked(stripe.subscriptions.list).mockReturnValue(
        stripeList(['sub_active', 'active']),
      )
      vi.mocked(stripe.subscriptions.cancel).mockRejectedValueOnce(
        stripeError('api_connection_error'),
      )

      await expectRefused()

      await service.deleteAccount(USER_ID)

      expect(repository.deleteUser).toHaveBeenCalledWith(USER_ID)
    })
  })

  describe('already canceled or missing Stripe resources', () => {
    it('should treat resource_missing on cancel as a success', async () => {
      vi.mocked(stripe.subscriptions.list).mockReturnValue(
        stripeList(['sub_gone', 'active'], ['sub_active', 'active']),
      )
      vi.mocked(stripe.subscriptions.cancel).mockRejectedValueOnce(
        stripeError('resource_missing'),
      )

      await service.deleteAccount(USER_ID)

      expect(stripe.subscriptions.cancel).toHaveBeenCalledTimes(2)
      expect(stripe.customers.del).toHaveBeenCalledWith(CUSTOMER_ID)
      expect(repository.deleteUser).toHaveBeenCalledWith(USER_ID)
    })

    it('should skip subscriptions that are already canceled', async () => {
      vi.mocked(stripe.subscriptions.list).mockReturnValue(
        stripeList(
          ['sub_old', 'canceled'],
          ['sub_expired', 'incomplete_expired'],
        ),
      )

      await service.deleteAccount(USER_ID)

      expect(stripe.subscriptions.cancel).not.toHaveBeenCalled()
      expect(repository.deleteUser).toHaveBeenCalledWith(USER_ID)
    })

    it('should treat a customer already missing on Stripe as a success', async () => {
      vi.mocked(stripe.subscriptions.list).mockImplementation(() => {
        throw stripeError('resource_missing')
      })
      vi.mocked(stripe.customers.del).mockRejectedValue(
        stripeError('resource_missing'),
      )

      await service.deleteAccount(USER_ID)

      expect(repository.deleteUser).toHaveBeenCalledWith(USER_ID)
    })
  })
})
