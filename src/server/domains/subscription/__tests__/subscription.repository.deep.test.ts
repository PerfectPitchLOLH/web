// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/server/lib/database'

import { SubscriptionRepository } from '../subscription.repository'
import type {
  CreateCustomerDTO,
  CreateInvoiceDTO,
  CreateSubscriptionDTO,
  SubscriptionStatus,
  UpdateSubscriptionDTO,
  WebhookEvent,
} from '../subscription.types'

vi.mock('@/server/lib/database', () => ({
  db: {
    subscription: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    subscriptionPlan: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    invoice: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    webhookEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

describe('SubscriptionRepository - Deep Tests', () => {
  let repository: SubscriptionRepository

  beforeEach(() => {
    repository = new SubscriptionRepository()
    vi.clearAllMocks()
  })

  describe('findSubscriptionByUserId', () => {
    it('should find active subscription by user ID', async () => {
      const mockSubscription = {
        id: 'sub_123',
        userId: 'user_123',
        status: 'active',
        createdAt: new Date(),
      }

      vi.mocked(db.subscription.findFirst).mockResolvedValue(mockSubscription)

      const result = await repository.findSubscriptionByUserId('user_123')

      expect(db.subscription.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user_123',
          status: {
            in: ['active', 'trialing'],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      expect(result).toEqual(mockSubscription)
    })

    it('should return null if no subscription found', async () => {
      vi.mocked(db.subscription.findFirst).mockResolvedValue(null)

      const result =
        await repository.findSubscriptionByUserId('user_nonexistent')

      expect(result).toBeNull()
    })

    it('should handle empty string userId', async () => {
      vi.mocked(db.subscription.findFirst).mockResolvedValue(null)

      const result = await repository.findSubscriptionByUserId('')

      expect(result).toBeNull()
      expect(db.subscription.findFirst).toHaveBeenCalledWith({
        where: {
          userId: '',
          status: { in: ['active', 'trialing'] },
        },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should handle very long userId (boundary test)', async () => {
      const longUserId = 'a'.repeat(1000)
      vi.mocked(db.subscription.findFirst).mockResolvedValue(null)

      await repository.findSubscriptionByUserId(longUserId)

      expect(db.subscription.findFirst).toHaveBeenCalledWith({
        where: {
          userId: longUserId,
          status: { in: ['active', 'trialing'] },
        },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should handle userId with special characters', async () => {
      const specialUserId = 'user\'123"<>;&|`$'
      vi.mocked(db.subscription.findFirst).mockResolvedValue(null)

      await repository.findSubscriptionByUserId(specialUserId)

      expect(db.subscription.findFirst).toHaveBeenCalledWith({
        where: {
          userId: specialUserId,
          status: { in: ['active', 'trialing'] },
        },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should handle userId with Unicode characters', async () => {
      const unicodeUserId = 'user_こんにちは_🎉'
      vi.mocked(db.subscription.findFirst).mockResolvedValue(null)

      await repository.findSubscriptionByUserId(unicodeUserId)

      expect(db.subscription.findFirst).toHaveBeenCalled()
    })

    it('should handle database connection error', async () => {
      vi.mocked(db.subscription.findFirst).mockRejectedValue(
        new Error('Database connection lost'),
      )

      await expect(
        repository.findSubscriptionByUserId('user_123'),
      ).rejects.toThrow('Database connection lost')
    })

    it('should handle database timeout', async () => {
      vi.mocked(db.subscription.findFirst).mockRejectedValue(
        new Error('Query timeout'),
      )

      await expect(
        repository.findSubscriptionByUserId('user_123'),
      ).rejects.toThrow('Query timeout')
    })

    it('should handle database deadlock', async () => {
      vi.mocked(db.subscription.findFirst).mockRejectedValue(
        new Error('Deadlock detected'),
      )

      await expect(
        repository.findSubscriptionByUserId('user_123'),
      ).rejects.toThrow('Deadlock detected')
    })

    it('should return most recent subscription when multiple exist', async () => {
      const mockSubscription = {
        id: 'sub_newest',
        userId: 'user_123',
        status: 'active',
        createdAt: new Date('2025-01-15'),
      }

      vi.mocked(db.subscription.findFirst).mockResolvedValue(mockSubscription)

      const result = await repository.findSubscriptionByUserId('user_123')

      expect(result?.id).toBe('sub_newest')
      expect(db.subscription.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      )
    })
  })

  describe('findActiveSubscriptionsByUserId', () => {
    it('should find all active subscriptions', async () => {
      const mockSubscriptions = [
        { id: 'sub_1', userId: 'user_123', status: 'active' },
        { id: 'sub_2', userId: 'user_123', status: 'trialing' },
      ]

      vi.mocked(db.subscription.findMany).mockResolvedValue(mockSubscriptions)

      const result =
        await repository.findActiveSubscriptionsByUserId('user_123')

      expect(result).toHaveLength(2)
      expect(db.subscription.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user_123',
          status: { in: ['active', 'trialing'] },
        },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should return empty array if no subscriptions', async () => {
      vi.mocked(db.subscription.findMany).mockResolvedValue([])

      const result =
        await repository.findActiveSubscriptionsByUserId('user_no_subs')

      expect(result).toEqual([])
    })

    it('should handle database connection error', async () => {
      vi.mocked(db.subscription.findMany).mockRejectedValue(
        new Error('Connection error'),
      )

      await expect(
        repository.findActiveSubscriptionsByUserId('user_123'),
      ).rejects.toThrow('Connection error')
    })
  })

  describe('findSubscriptionWithPlan', () => {
    it('should find subscription with plan details', async () => {
      const mockSubscriptionWithPlan = {
        id: 'sub_123',
        userId: 'user_123',
        status: 'active',
        plan: {
          id: 'plan_pro',
          name: 'Pro',
          monthlyPrice: 29.99,
        },
      }

      vi.mocked(db.subscription.findFirst).mockResolvedValue(
        mockSubscriptionWithPlan,
      )

      const result = await repository.findSubscriptionWithPlan('user_123')

      expect(result).toEqual(mockSubscriptionWithPlan)
      expect(db.subscription.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user_123',
          status: { in: ['active', 'trialing'] },
        },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should return null if no subscription with plan', async () => {
      vi.mocked(db.subscription.findFirst).mockResolvedValue(null)

      const result = await repository.findSubscriptionWithPlan('user_no_sub')

      expect(result).toBeNull()
    })

    it('should handle database error during include join', async () => {
      vi.mocked(db.subscription.findFirst).mockRejectedValue(
        new Error('Join operation failed'),
      )

      await expect(
        repository.findSubscriptionWithPlan('user_123'),
      ).rejects.toThrow('Join operation failed')
    })
  })

  describe('findSubscriptionByStripeId', () => {
    it('should find subscription by Stripe subscription ID', async () => {
      const mockSubscription = {
        id: 'sub_123',
        stripeSubscriptionId: 'sub_stripe_123',
        status: 'active',
      }

      vi.mocked(db.subscription.findUnique).mockResolvedValue(mockSubscription)

      const result =
        await repository.findSubscriptionByStripeId('sub_stripe_123')

      expect(result).toEqual(mockSubscription)
      expect(db.subscription.findUnique).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_stripe_123' },
      })
    })

    it('should return null for non-existent Stripe ID', async () => {
      vi.mocked(db.subscription.findUnique).mockResolvedValue(null)

      const result = await repository.findSubscriptionByStripeId('sub_fake')

      expect(result).toBeNull()
    })

    it('should handle empty Stripe ID', async () => {
      vi.mocked(db.subscription.findUnique).mockResolvedValue(null)

      const result = await repository.findSubscriptionByStripeId('')

      expect(result).toBeNull()
    })

    it('should handle malformed Stripe ID', async () => {
      const malformedId = 'not_a_stripe_id_###'
      vi.mocked(db.subscription.findUnique).mockResolvedValue(null)

      await repository.findSubscriptionByStripeId(malformedId)

      expect(db.subscription.findUnique).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: malformedId },
      })
    })
  })

  describe('createSubscription', () => {
    it('should create subscription successfully', async () => {
      const createData: CreateSubscriptionDTO = {
        userId: 'user_123',
        planId: 'plan_pro',
        stripeSubscriptionId: 'sub_stripe_123',
        stripeCustomerId: 'cus_stripe_123',
        status: 'active' as SubscriptionStatus,
        currentPeriodStart: new Date('2025-01-01'),
        currentPeriodEnd: new Date('2025-02-01'),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
      }

      const mockCreatedSubscription = { id: 'sub_new', ...createData }

      vi.mocked(db.subscription.create).mockResolvedValue(
        mockCreatedSubscription,
      )

      const result = await repository.createSubscription(createData)

      expect(result).toEqual(mockCreatedSubscription)
      expect(db.subscription.create).toHaveBeenCalledWith({
        data: {
          userId: createData.userId,
          planId: createData.planId,
          stripeSubscriptionId: createData.stripeSubscriptionId,
          stripeCustomerId: createData.stripeCustomerId,
          status: createData.status,
          currentPeriodStart: createData.currentPeriodStart,
          currentPeriodEnd: createData.currentPeriodEnd,
          cancelAtPeriodEnd: false,
          canceledAt: null,
          trialStart: null,
          trialEnd: null,
        },
      })
    })

    it('should handle missing optional fields', async () => {
      const minimalData: CreateSubscriptionDTO = {
        userId: 'user_123',
        planId: 'plan_basic',
        stripeSubscriptionId: 'sub_stripe_456',
        stripeCustomerId: 'cus_stripe_456',
        status: 'trialing' as SubscriptionStatus,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: undefined as any,
        canceledAt: undefined as any,
        trialStart: undefined as any,
        trialEnd: undefined as any,
      }

      const mockCreated = { id: 'sub_minimal', ...minimalData }
      vi.mocked(db.subscription.create).mockResolvedValue(mockCreated)

      const result = await repository.createSubscription(minimalData)

      expect(result).toBeDefined()
      expect(db.subscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cancelAtPeriodEnd: false,
          canceledAt: null,
          trialStart: null,
          trialEnd: null,
        }),
      })
    })

    it('should handle unique constraint violation (duplicate stripeSubscriptionId)', async () => {
      const createData: CreateSubscriptionDTO = {
        userId: 'user_123',
        planId: 'plan_pro',
        stripeSubscriptionId: 'sub_duplicate',
        stripeCustomerId: 'cus_123',
        status: 'active' as SubscriptionStatus,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
      }

      vi.mocked(db.subscription.create).mockRejectedValue({
        code: 'P2002',
        message: 'Unique constraint violation',
      })

      await expect(repository.createSubscription(createData)).rejects.toEqual({
        code: 'P2002',
        message: 'Unique constraint violation',
      })
    })

    it('should handle foreign key constraint violation (invalid planId)', async () => {
      const createData: CreateSubscriptionDTO = {
        userId: 'user_123',
        planId: 'plan_nonexistent',
        stripeSubscriptionId: 'sub_stripe_789',
        stripeCustomerId: 'cus_789',
        status: 'active' as SubscriptionStatus,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
      }

      vi.mocked(db.subscription.create).mockRejectedValue({
        code: 'P2003',
        message: 'Foreign key constraint violation',
      })

      await expect(repository.createSubscription(createData)).rejects.toEqual({
        code: 'P2003',
        message: 'Foreign key constraint violation',
      })
    })

    it('should handle database transaction rollback', async () => {
      const createData: CreateSubscriptionDTO = {
        userId: 'user_123',
        planId: 'plan_pro',
        stripeSubscriptionId: 'sub_stripe_rollback',
        stripeCustomerId: 'cus_rollback',
        status: 'active' as SubscriptionStatus,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
      }

      vi.mocked(db.subscription.create).mockRejectedValue(
        new Error('Transaction rolled back'),
      )

      await expect(repository.createSubscription(createData)).rejects.toThrow(
        'Transaction rolled back',
      )
    })

    it('should handle invalid date values', async () => {
      const createData: CreateSubscriptionDTO = {
        userId: 'user_123',
        planId: 'plan_pro',
        stripeSubscriptionId: 'sub_stripe_invalid_date',
        stripeCustomerId: 'cus_123',
        status: 'active' as SubscriptionStatus,
        currentPeriodStart: new Date('invalid'),
        currentPeriodEnd: new Date('invalid'),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
      }

      const mockCreated = { id: 'sub_invalid_date', ...createData }
      vi.mocked(db.subscription.create).mockResolvedValue(mockCreated)

      await repository.createSubscription(createData)

      expect(db.subscription.create).toHaveBeenCalled()
    })

    it('should handle NULL values in optional fields', async () => {
      const createData: CreateSubscriptionDTO = {
        userId: 'user_123',
        planId: 'plan_pro',
        stripeSubscriptionId: 'sub_stripe_null',
        stripeCustomerId: 'cus_null',
        status: 'active' as SubscriptionStatus,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
      }

      const mockCreated = { id: 'sub_null', ...createData }
      vi.mocked(db.subscription.create).mockResolvedValue(mockCreated)

      const result = await repository.createSubscription(createData)

      expect(result.canceledAt).toBeNull()
      expect(result.trialStart).toBeNull()
      expect(result.trialEnd).toBeNull()
    })
  })

  describe('updateSubscription', () => {
    it('should update subscription successfully', async () => {
      const updateData: UpdateSubscriptionDTO = {
        status: 'canceled' as SubscriptionStatus,
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
      }

      const mockUpdated = {
        id: 'sub_123',
        stripeSubscriptionId: 'sub_stripe_123',
        ...updateData,
      }

      vi.mocked(db.subscription.update).mockResolvedValue(mockUpdated)

      const result = await repository.updateSubscription(
        'sub_stripe_123',
        updateData,
      )

      expect(result).toEqual(mockUpdated)
      expect(db.subscription.update).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_stripe_123' },
        data: updateData,
      })
    })

    it('should update with partial data', async () => {
      const partialUpdate: UpdateSubscriptionDTO = {
        cancelAtPeriodEnd: true,
      }

      const mockUpdated = { id: 'sub_123', ...partialUpdate }
      vi.mocked(db.subscription.update).mockResolvedValue(mockUpdated)

      await repository.updateSubscription('sub_stripe_123', partialUpdate)

      expect(db.subscription.update).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_stripe_123' },
        data: partialUpdate,
      })
    })

    it('should handle record not found', async () => {
      vi.mocked(db.subscription.update).mockRejectedValue({
        code: 'P2025',
        message: 'Record not found',
      })

      await expect(
        repository.updateSubscription('sub_nonexistent', {
          status: 'canceled',
        }),
      ).rejects.toEqual({
        code: 'P2025',
        message: 'Record not found',
      })
    })

    it('should handle concurrent update conflict', async () => {
      vi.mocked(db.subscription.update).mockRejectedValue(
        new Error('Concurrent update conflict'),
      )

      await expect(
        repository.updateSubscription('sub_stripe_123', { status: 'canceled' }),
      ).rejects.toThrow('Concurrent update conflict')
    })

    it('should update with empty object (no changes)', async () => {
      const emptyUpdate: UpdateSubscriptionDTO = {}
      const mockUpdated = { id: 'sub_123', stripeSubscriptionId: 'sub_stripe' }
      vi.mocked(db.subscription.update).mockResolvedValue(mockUpdated)

      await repository.updateSubscription('sub_stripe', emptyUpdate)

      expect(db.subscription.update).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_stripe' },
        data: {},
      })
    })
  })

  describe('findAllPlans', () => {
    it('should find all active plans ordered by price', async () => {
      const mockPlans = [
        { id: 'plan_junior', monthlyPrice: 9.99, isActive: true },
        { id: 'plan_basic', monthlyPrice: 14.99, isActive: true },
        { id: 'plan_pro', monthlyPrice: 29.99, isActive: true },
      ]

      vi.mocked(db.subscriptionPlan.findMany).mockResolvedValue(mockPlans)

      const result = await repository.findAllPlans()

      expect(result).toHaveLength(3)
      expect(db.subscriptionPlan.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { monthlyPrice: 'asc' },
      })
    })

    it('should return empty array if no active plans', async () => {
      vi.mocked(db.subscriptionPlan.findMany).mockResolvedValue([])

      const result = await repository.findAllPlans()

      expect(result).toEqual([])
    })

    it('should handle database error', async () => {
      vi.mocked(db.subscriptionPlan.findMany).mockRejectedValue(
        new Error('Database error'),
      )

      await expect(repository.findAllPlans()).rejects.toThrow('Database error')
    })
  })

  describe('findPlanById', () => {
    it('should find plan by ID', async () => {
      const mockPlan = { id: 'plan_pro', name: 'Pro', monthlyPrice: 29.99 }

      vi.mocked(db.subscriptionPlan.findUnique).mockResolvedValue(mockPlan)

      const result = await repository.findPlanById('plan_pro')

      expect(result).toEqual(mockPlan)
      expect(db.subscriptionPlan.findUnique).toHaveBeenCalledWith({
        where: { id: 'plan_pro' },
      })
    })

    it('should return null if plan not found', async () => {
      vi.mocked(db.subscriptionPlan.findUnique).mockResolvedValue(null)

      const result = await repository.findPlanById('plan_nonexistent')

      expect(result).toBeNull()
    })

    it('should handle empty plan ID', async () => {
      vi.mocked(db.subscriptionPlan.findUnique).mockResolvedValue(null)

      const result = await repository.findPlanById('')

      expect(result).toBeNull()
    })
  })

  describe('findPlanByStripeProductId', () => {
    it('should find plan by Stripe product ID', async () => {
      const mockPlan = {
        id: 'plan_pro',
        stripeProductId: 'prod_stripe_123',
        name: 'Pro',
      }

      vi.mocked(db.subscriptionPlan.findUnique).mockResolvedValue(mockPlan)

      const result =
        await repository.findPlanByStripeProductId('prod_stripe_123')

      expect(result).toEqual(mockPlan)
      expect(db.subscriptionPlan.findUnique).toHaveBeenCalledWith({
        where: { stripeProductId: 'prod_stripe_123' },
      })
    })

    it('should return null for non-existent Stripe product ID', async () => {
      vi.mocked(db.subscriptionPlan.findUnique).mockResolvedValue(null)

      const result = await repository.findPlanByStripeProductId('prod_fake')

      expect(result).toBeNull()
    })
  })

  describe('findPlanByStripePriceId', () => {
    it('should find plan by Stripe price ID', async () => {
      const mockPlan = {
        id: 'plan_pro',
        stripePriceId: 'price_stripe_123',
        name: 'Pro',
      }

      vi.mocked(db.subscriptionPlan.findFirst).mockResolvedValue(mockPlan)

      const result =
        await repository.findPlanByStripePriceId('price_stripe_123')

      expect(result).toEqual(mockPlan)
    })

    it('should return null for non-existent Stripe price ID', async () => {
      vi.mocked(db.subscriptionPlan.findFirst).mockResolvedValue(null)

      const result = await repository.findPlanByStripePriceId('price_fake')

      expect(result).toBeNull()
    })

    it('should handle malformed Stripe price ID', async () => {
      const malformedId = 'not_a_stripe_price_###'
      vi.mocked(db.subscriptionPlan.findFirst).mockResolvedValue(null)

      await repository.findPlanByStripePriceId(malformedId)

      expect(db.subscriptionPlan.findFirst).toHaveBeenCalled()
    })
  })

  describe('createOrUpdateCustomer', () => {
    it('should create new customer', async () => {
      const customerData: CreateCustomerDTO = {
        userId: 'user_123',
        stripeCustomerId: 'cus_stripe_123',
        email: 'test@example.com',
        name: 'Test User',
        defaultPaymentMethod: 'pm_123',
      }

      const mockCustomer = { ...customerData, createdAt: new Date() }

      vi.mocked(db.customer.upsert).mockResolvedValue(mockCustomer)

      const result = await repository.createOrUpdateCustomer(customerData)

      expect(result).toEqual(mockCustomer)
      expect(db.customer.upsert).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        update: {
          email: customerData.email,
          name: customerData.name,
          defaultPaymentMethod: customerData.defaultPaymentMethod,
        },
        create: {
          userId: customerData.userId,
          stripeCustomerId: customerData.stripeCustomerId,
          email: customerData.email,
          name: customerData.name,
          defaultPaymentMethod: customerData.defaultPaymentMethod,
        },
      })
    })

    it('should update existing customer', async () => {
      const customerData: CreateCustomerDTO = {
        userId: 'user_existing',
        stripeCustomerId: 'cus_existing',
        email: 'updated@example.com',
        name: 'Updated Name',
        defaultPaymentMethod: null,
      }

      const mockUpdatedCustomer = { ...customerData, updatedAt: new Date() }

      vi.mocked(db.customer.upsert).mockResolvedValue(mockUpdatedCustomer)

      const result = await repository.createOrUpdateCustomer(customerData)

      expect(result.email).toBe('updated@example.com')
    })

    it('should handle null name and defaultPaymentMethod', async () => {
      const customerData: CreateCustomerDTO = {
        userId: 'user_minimal',
        stripeCustomerId: 'cus_minimal',
        email: 'minimal@example.com',
        name: null,
        defaultPaymentMethod: null,
      }

      const mockCustomer = { ...customerData }
      vi.mocked(db.customer.upsert).mockResolvedValue(mockCustomer)

      const result = await repository.createOrUpdateCustomer(customerData)

      expect(result.name).toBeNull()
      expect(result.defaultPaymentMethod).toBeNull()
    })

    it('should handle invalid email format', async () => {
      const customerData: CreateCustomerDTO = {
        userId: 'user_123',
        stripeCustomerId: 'cus_123',
        email: 'not-an-email',
        name: null,
        defaultPaymentMethod: null,
      }

      const mockCustomer = { ...customerData }
      vi.mocked(db.customer.upsert).mockResolvedValue(mockCustomer)

      await repository.createOrUpdateCustomer(customerData)

      expect(db.customer.upsert).toHaveBeenCalled()
    })

    it('should handle email with special characters', async () => {
      const customerData: CreateCustomerDTO = {
        userId: 'user_special',
        stripeCustomerId: 'cus_special',
        email: 'test+tag@sub.example.co.uk',
        name: null,
        defaultPaymentMethod: null,
      }

      const mockCustomer = { ...customerData }
      vi.mocked(db.customer.upsert).mockResolvedValue(mockCustomer)

      const result = await repository.createOrUpdateCustomer(customerData)

      expect(result.email).toBe('test+tag@sub.example.co.uk')
    })

    it('should handle very long email (boundary test)', async () => {
      const longLocalPart = 'a'.repeat(64)
      const longDomain = 'b'.repeat(63) + '.com'
      const longEmail = `${longLocalPart}@${longDomain}`

      const customerData: CreateCustomerDTO = {
        userId: 'user_long_email',
        stripeCustomerId: 'cus_long',
        email: longEmail,
        name: null,
        defaultPaymentMethod: null,
      }

      const mockCustomer = { ...customerData }
      vi.mocked(db.customer.upsert).mockResolvedValue(mockCustomer)

      await repository.createOrUpdateCustomer(customerData)

      expect(db.customer.upsert).toHaveBeenCalled()
    })

    it('should handle database constraint error', async () => {
      const customerData: CreateCustomerDTO = {
        userId: 'user_constraint',
        stripeCustomerId: 'cus_constraint',
        email: 'constraint@example.com',
        name: null,
        defaultPaymentMethod: null,
      }

      vi.mocked(db.customer.upsert).mockRejectedValue({
        code: 'P2002',
        message: 'Unique constraint violation',
      })

      await expect(
        repository.createOrUpdateCustomer(customerData),
      ).rejects.toEqual({
        code: 'P2002',
        message: 'Unique constraint violation',
      })
    })
  })

  describe('findCustomerByUserId', () => {
    it('should find customer by user ID', async () => {
      const mockCustomer = {
        userId: 'user_123',
        stripeCustomerId: 'cus_stripe_123',
        email: 'test@example.com',
      }

      vi.mocked(db.customer.findUnique).mockResolvedValue(mockCustomer)

      const result = await repository.findCustomerByUserId('user_123')

      expect(result).toEqual(mockCustomer)
      expect(db.customer.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
      })
    })

    it('should return null if customer not found', async () => {
      vi.mocked(db.customer.findUnique).mockResolvedValue(null)

      const result = await repository.findCustomerByUserId('user_nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('findCustomerByStripeId', () => {
    it('should find customer by Stripe customer ID', async () => {
      const mockCustomer = {
        userId: 'user_123',
        stripeCustomerId: 'cus_stripe_123',
        email: 'test@example.com',
      }

      vi.mocked(db.customer.findUnique).mockResolvedValue(mockCustomer)

      const result = await repository.findCustomerByStripeId('cus_stripe_123')

      expect(result).toEqual(mockCustomer)
      expect(db.customer.findUnique).toHaveBeenCalledWith({
        where: { stripeCustomerId: 'cus_stripe_123' },
      })
    })

    it('should return null for non-existent Stripe customer ID', async () => {
      vi.mocked(db.customer.findUnique).mockResolvedValue(null)

      const result = await repository.findCustomerByStripeId('cus_fake')

      expect(result).toBeNull()
    })
  })

  describe('createInvoice', () => {
    it('should create invoice successfully', async () => {
      const invoiceData: CreateInvoiceDTO = {
        userId: 'user_123',
        stripeInvoiceId: 'in_stripe_123',
        amount: 29.99,
        currency: 'eur',
        status: 'paid',
        hostedInvoiceUrl: 'https://invoice.stripe.com/in_123',
        invoicePdf: 'https://invoice.stripe.com/in_123/pdf',
        description: 'Subscription payment',
        paidAt: new Date(),
      }

      const mockInvoice = { id: 'invoice_123', ...invoiceData }

      vi.mocked(db.invoice.create).mockResolvedValue(mockInvoice)

      const result = await repository.createInvoice(invoiceData)

      expect(result).toEqual(mockInvoice)
      expect(db.invoice.create).toHaveBeenCalledWith({
        data: {
          userId: invoiceData.userId,
          stripeInvoiceId: invoiceData.stripeInvoiceId,
          amount: invoiceData.amount,
          currency: invoiceData.currency,
          status: invoiceData.status,
          hostedInvoiceUrl: invoiceData.hostedInvoiceUrl,
          invoicePdf: invoiceData.invoicePdf,
          description: invoiceData.description,
          paidAt: invoiceData.paidAt,
        },
      })
    })

    it('should handle missing optional fields with defaults', async () => {
      const minimalInvoiceData: CreateInvoiceDTO = {
        userId: 'user_123',
        stripeInvoiceId: 'in_minimal',
        amount: 19.99,
        currency: undefined as any,
        status: 'pending',
        hostedInvoiceUrl: undefined as any,
        invoicePdf: undefined as any,
        description: undefined as any,
        paidAt: undefined as any,
      }

      const mockInvoice = { id: 'invoice_minimal', ...minimalInvoiceData }
      vi.mocked(db.invoice.create).mockResolvedValue(mockInvoice)

      await repository.createInvoice(minimalInvoiceData)

      expect(db.invoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          currency: 'eur',
          hostedInvoiceUrl: null,
          invoicePdf: null,
          description: null,
          paidAt: null,
        }),
      })
    })

    it('should handle duplicate invoice creation', async () => {
      const invoiceData: CreateInvoiceDTO = {
        userId: 'user_123',
        stripeInvoiceId: 'in_duplicate',
        amount: 29.99,
        currency: 'eur',
        status: 'paid',
        hostedInvoiceUrl: null,
        invoicePdf: null,
        description: null,
        paidAt: new Date(),
      }

      vi.mocked(db.invoice.create).mockRejectedValue({
        code: 'P2002',
        message: 'Unique constraint violation on stripeInvoiceId',
      })

      await expect(repository.createInvoice(invoiceData)).rejects.toEqual({
        code: 'P2002',
        message: 'Unique constraint violation on stripeInvoiceId',
      })
    })

    it('should handle negative amount', async () => {
      const invoiceData: CreateInvoiceDTO = {
        userId: 'user_123',
        stripeInvoiceId: 'in_negative',
        amount: -29.99,
        currency: 'eur',
        status: 'paid',
        hostedInvoiceUrl: null,
        invoicePdf: null,
        description: 'Refund',
        paidAt: new Date(),
      }

      const mockInvoice = { id: 'invoice_negative', ...invoiceData }
      vi.mocked(db.invoice.create).mockResolvedValue(mockInvoice)

      const result = await repository.createInvoice(invoiceData)

      expect(result.amount).toBe(-29.99)
    })

    it('should handle zero amount', async () => {
      const invoiceData: CreateInvoiceDTO = {
        userId: 'user_123',
        stripeInvoiceId: 'in_zero',
        amount: 0,
        currency: 'eur',
        status: 'paid',
        hostedInvoiceUrl: null,
        invoicePdf: null,
        description: 'Free trial',
        paidAt: new Date(),
      }

      const mockInvoice = { id: 'invoice_zero', ...invoiceData }
      vi.mocked(db.invoice.create).mockResolvedValue(mockInvoice)

      const result = await repository.createInvoice(invoiceData)

      expect(result.amount).toBe(0)
    })

    it('should handle very large amount (boundary test)', async () => {
      const invoiceData: CreateInvoiceDTO = {
        userId: 'user_123',
        stripeInvoiceId: 'in_large',
        amount: 999999.99,
        currency: 'eur',
        status: 'paid',
        hostedInvoiceUrl: null,
        invoicePdf: null,
        description: null,
        paidAt: new Date(),
      }

      const mockInvoice = { id: 'invoice_large', ...invoiceData }
      vi.mocked(db.invoice.create).mockResolvedValue(mockInvoice)

      const result = await repository.createInvoice(invoiceData)

      expect(result.amount).toBe(999999.99)
    })

    it('should handle different currencies', async () => {
      const currencies = ['usd', 'gbp', 'jpy', 'cad', 'aud']

      for (const currency of currencies) {
        const invoiceData: CreateInvoiceDTO = {
          userId: 'user_123',
          stripeInvoiceId: `in_${currency}`,
          amount: 29.99,
          currency,
          status: 'paid',
          hostedInvoiceUrl: null,
          invoicePdf: null,
          description: null,
          paidAt: new Date(),
        }

        const mockInvoice = { id: `invoice_${currency}`, ...invoiceData }
        vi.mocked(db.invoice.create).mockResolvedValue(mockInvoice)

        const result = await repository.createInvoice(invoiceData)

        expect(result.currency).toBe(currency)
      }
    })
  })

  describe('findInvoicesByUserId', () => {
    it('should find all invoices for a user ordered by creation date', async () => {
      const mockInvoices = [
        {
          id: 'inv_1',
          userId: 'user_123',
          createdAt: new Date('2025-01-15'),
        },
        {
          id: 'inv_2',
          userId: 'user_123',
          createdAt: new Date('2025-01-01'),
        },
      ]

      vi.mocked(db.invoice.findMany).mockResolvedValue(mockInvoices)

      const result = await repository.findInvoicesByUserId('user_123')

      expect(result).toHaveLength(2)
      expect(db.invoice.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should return empty array if no invoices', async () => {
      vi.mocked(db.invoice.findMany).mockResolvedValue([])

      const result = await repository.findInvoicesByUserId('user_no_invoices')

      expect(result).toEqual([])
    })
  })

  describe('updateInvoice', () => {
    it('should update invoice successfully', async () => {
      const updateData: Partial<CreateInvoiceDTO> = {
        status: 'paid',
        paidAt: new Date(),
      }

      const mockUpdated = {
        id: 'inv_123',
        stripeInvoiceId: 'in_stripe_123',
        ...updateData,
      }

      vi.mocked(db.invoice.update).mockResolvedValue(mockUpdated)

      const result = await repository.updateInvoice('in_stripe_123', updateData)

      expect(result).toEqual(mockUpdated)
      expect(db.invoice.update).toHaveBeenCalledWith({
        where: { stripeInvoiceId: 'in_stripe_123' },
        data: updateData,
      })
    })

    it('should handle record not found', async () => {
      vi.mocked(db.invoice.update).mockRejectedValue({
        code: 'P2025',
        message: 'Record not found',
      })

      await expect(
        repository.updateInvoice('in_nonexistent', { status: 'paid' }),
      ).rejects.toEqual({
        code: 'P2025',
        message: 'Record not found',
      })
    })
  })

  describe('updateSubscriptionStatus', () => {
    it('should update subscription status', async () => {
      const mockUpdated = {
        id: 'sub_123',
        stripeSubscriptionId: 'sub_stripe_123',
        status: 'canceled',
        canceledAt: new Date(),
      }

      vi.mocked(db.subscription.update).mockResolvedValue(mockUpdated)

      const result = await repository.updateSubscriptionStatus(
        'sub_stripe_123',
        'canceled',
        { canceledAt: new Date() },
      )

      expect(result?.status).toBe('canceled')
      expect(db.subscription.update).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_stripe_123' },
        data: {
          status: 'canceled',
          canceledAt: expect.any(Date),
        },
      })
    })

    it('should update status without additional data', async () => {
      const mockUpdated = {
        id: 'sub_123',
        stripeSubscriptionId: 'sub_stripe_123',
        status: 'past_due',
      }

      vi.mocked(db.subscription.update).mockResolvedValue(mockUpdated)

      await repository.updateSubscriptionStatus('sub_stripe_123', 'past_due')

      expect(db.subscription.update).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_stripe_123' },
        data: {
          status: 'past_due',
        },
      })
    })

    it('should handle all status values', async () => {
      const statuses: SubscriptionStatus[] = [
        'active',
        'canceled',
        'incomplete',
        'incomplete_expired',
        'past_due',
        'trialing',
        'unpaid',
      ]

      for (const status of statuses) {
        const mockUpdated = {
          id: 'sub_123',
          stripeSubscriptionId: 'sub_stripe',
          status,
        }

        vi.mocked(db.subscription.update).mockResolvedValue(mockUpdated)

        const result = await repository.updateSubscriptionStatus(
          'sub_stripe',
          status,
        )

        expect(result?.status).toBe(status)
      }
    })
  })

  describe('Webhook Event Operations', () => {
    describe('findWebhookEventByStripeId', () => {
      it('should find webhook event by Stripe event ID', async () => {
        const mockEvent = {
          id: 'event_123',
          stripeEventId: 'evt_stripe_123',
          eventType: 'customer.subscription.created',
          processed: false,
        }

        vi.mocked(db.webhookEvent.findUnique).mockResolvedValue(mockEvent)

        const result =
          await repository.findWebhookEventByStripeId('evt_stripe_123')

        expect(result).toEqual(mockEvent)
        expect(db.webhookEvent.findUnique).toHaveBeenCalledWith({
          where: { stripeEventId: 'evt_stripe_123' },
        })
      })

      it('should return null for non-existent event', async () => {
        vi.mocked(db.webhookEvent.findUnique).mockResolvedValue(null)

        const result = await repository.findWebhookEventByStripeId('evt_fake')

        expect(result).toBeNull()
      })
    })

    describe('createWebhookEvent', () => {
      it('should create webhook event successfully', async () => {
        const eventData: WebhookEvent = {
          stripeEventId: 'evt_stripe_new',
          eventType: 'invoice.payment_succeeded',
          payload: { amount: 29.99, currency: 'eur' },
          processed: false,
          processedAt: null,
          error: null,
          retryCount: 0,
        }

        const mockCreated = { id: 'event_new', ...eventData }

        vi.mocked(db.webhookEvent.create).mockResolvedValue(mockCreated)

        const result = await repository.createWebhookEvent(eventData)

        expect(result).toEqual(mockCreated)
        expect(db.webhookEvent.create).toHaveBeenCalledWith({
          data: { ...eventData, payload: eventData.payload },
        })
      })

      it('should handle empty payload', async () => {
        const eventData: WebhookEvent = {
          stripeEventId: 'evt_empty_payload',
          eventType: 'customer.created',
          payload: {},
          processed: false,
          processedAt: null,
          error: null,
          retryCount: 0,
        }

        const mockCreated = { id: 'event_empty', ...eventData }
        vi.mocked(db.webhookEvent.create).mockResolvedValue(mockCreated)

        const result = await repository.createWebhookEvent(eventData)

        expect(result.payload).toEqual({})
      })

      it('should handle nested payload', async () => {
        const eventData: WebhookEvent = {
          stripeEventId: 'evt_nested',
          eventType: 'customer.subscription.updated',
          payload: {
            subscription: {
              id: 'sub_123',
              items: [{ price: { id: 'price_123' } }],
            },
          },
          processed: false,
          processedAt: null,
          error: null,
          retryCount: 0,
        }

        const mockCreated = { id: 'event_nested', ...eventData }
        vi.mocked(db.webhookEvent.create).mockResolvedValue(mockCreated)

        const result = await repository.createWebhookEvent(eventData)

        expect(result.payload).toHaveProperty('subscription')
      })

      it('should handle duplicate event creation', async () => {
        const eventData: WebhookEvent = {
          stripeEventId: 'evt_duplicate',
          eventType: 'invoice.paid',
          payload: {},
          processed: false,
          processedAt: null,
          error: null,
          retryCount: 0,
        }

        vi.mocked(db.webhookEvent.create).mockRejectedValue({
          code: 'P2002',
          message: 'Unique constraint violation',
        })

        await expect(repository.createWebhookEvent(eventData)).rejects.toEqual({
          code: 'P2002',
          message: 'Unique constraint violation',
        })
      })
    })

    describe('markWebhookEventProcessed', () => {
      it('should mark event as processed without error', async () => {
        vi.mocked(db.webhookEvent.update).mockResolvedValue({
          id: 'event_123',
          processed: true,
          processedAt: new Date(),
        } as any)

        await repository.markWebhookEventProcessed('evt_stripe_123')

        expect(db.webhookEvent.update).toHaveBeenCalledWith({
          where: { stripeEventId: 'evt_stripe_123' },
          data: {
            processed: true,
            processedAt: expect.any(Date),
            error: undefined,
            retryCount: undefined,
          },
        })
      })

      it('should mark event as processed with error', async () => {
        vi.mocked(db.webhookEvent.update).mockResolvedValue({
          id: 'event_123',
          processed: true,
          processedAt: new Date(),
          error: 'Failed to process',
          retryCount: 1,
        } as any)

        await repository.markWebhookEventProcessed(
          'evt_stripe_123',
          'Failed to process',
        )

        expect(db.webhookEvent.update).toHaveBeenCalledWith({
          where: { stripeEventId: 'evt_stripe_123' },
          data: {
            processed: true,
            processedAt: expect.any(Date),
            error: 'Failed to process',
            retryCount: { increment: 1 },
          },
        })
      })

      it('should handle very long error messages', async () => {
        const longError = 'Error: ' + 'x'.repeat(5000)

        vi.mocked(db.webhookEvent.update).mockResolvedValue({
          id: 'event_123',
          processed: true,
          error: longError,
        } as any)

        await repository.markWebhookEventProcessed('evt_stripe_123', longError)

        expect(db.webhookEvent.update).toHaveBeenCalled()
      })
    })

    describe('deleteOldWebhookEvents', () => {
      it('should delete old processed webhook events', async () => {
        vi.mocked(db.webhookEvent.deleteMany).mockResolvedValue({ count: 42 })

        const result = await repository.deleteOldWebhookEvents(48)

        expect(result).toBe(42)
        expect(db.webhookEvent.deleteMany).toHaveBeenCalledWith({
          where: {
            createdAt: { lt: expect.any(Date) },
            processed: true,
          },
        })
      })

      it('should handle zero deleted events', async () => {
        vi.mocked(db.webhookEvent.deleteMany).mockResolvedValue({ count: 0 })

        const result = await repository.deleteOldWebhookEvents(24)

        expect(result).toBe(0)
      })

      it('should handle very old cutoff (boundary test)', async () => {
        vi.mocked(db.webhookEvent.deleteMany).mockResolvedValue({ count: 1000 })

        const result = await repository.deleteOldWebhookEvents(8760)

        expect(result).toBe(1000)
      })

      it('should handle negative hours (edge case)', async () => {
        vi.mocked(db.webhookEvent.deleteMany).mockResolvedValue({ count: 0 })

        const result = await repository.deleteOldWebhookEvents(-1)

        expect(db.webhookEvent.deleteMany).toHaveBeenCalled()
      })

      it('should handle database error during deletion', async () => {
        vi.mocked(db.webhookEvent.deleteMany).mockRejectedValue(
          new Error('Delete operation failed'),
        )

        await expect(repository.deleteOldWebhookEvents(48)).rejects.toThrow(
          'Delete operation failed',
        )
      })
    })
  })

  describe('Race Conditions & Concurrency', () => {
    it('should handle concurrent subscription creations for same user', async () => {
      const createData: CreateSubscriptionDTO = {
        userId: 'user_concurrent',
        planId: 'plan_pro',
        stripeSubscriptionId: 'sub_concurrent_1',
        stripeCustomerId: 'cus_concurrent',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
      }

      vi.mocked(db.subscription.create).mockRejectedValueOnce({
        code: 'P2002',
        message: 'Unique constraint violation',
      })

      await expect(repository.createSubscription(createData)).rejects.toEqual({
        code: 'P2002',
        message: 'Unique constraint violation',
      })
    })

    it('should handle concurrent customer updates', async () => {
      const customerData: CreateCustomerDTO = {
        userId: 'user_concurrent_update',
        stripeCustomerId: 'cus_concurrent',
        email: 'concurrent@example.com',
        name: 'Concurrent Test',
        defaultPaymentMethod: null,
      }

      vi.mocked(db.customer.upsert).mockRejectedValueOnce(
        new Error('Concurrent update conflict'),
      )

      await expect(
        repository.createOrUpdateCustomer(customerData),
      ).rejects.toThrow('Concurrent update conflict')
    })

    it('should handle concurrent invoice creations', async () => {
      const invoiceData: CreateInvoiceDTO = {
        userId: 'user_123',
        stripeInvoiceId: 'in_concurrent',
        amount: 29.99,
        currency: 'eur',
        status: 'paid',
        hostedInvoiceUrl: null,
        invoicePdf: null,
        description: null,
        paidAt: new Date(),
      }

      vi.mocked(db.invoice.create).mockRejectedValue({
        code: 'P2002',
        message: 'Invoice already exists',
      })

      await expect(repository.createInvoice(invoiceData)).rejects.toEqual({
        code: 'P2002',
        message: 'Invoice already exists',
      })
    })
  })

  describe('Edge Cases & Boundary Tests', () => {
    it('should handle NULL in all optional fields', async () => {
      const createData: CreateSubscriptionDTO = {
        userId: 'user_all_null',
        planId: 'plan_basic',
        stripeSubscriptionId: 'sub_all_null',
        stripeCustomerId: 'cus_all_null',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
      }

      const mockCreated = { id: 'sub_all_null', ...createData }
      vi.mocked(db.subscription.create).mockResolvedValue(mockCreated)

      const result = await repository.createSubscription(createData)

      expect(result.canceledAt).toBeNull()
      expect(result.trialStart).toBeNull()
      expect(result.trialEnd).toBeNull()
    })

    it('should handle timestamps at epoch boundary', async () => {
      const epochDate = new Date(0)

      const createData: CreateSubscriptionDTO = {
        userId: 'user_epoch',
        planId: 'plan_basic',
        stripeSubscriptionId: 'sub_epoch',
        stripeCustomerId: 'cus_epoch',
        status: 'active',
        currentPeriodStart: epochDate,
        currentPeriodEnd: epochDate,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
      }

      const mockCreated = { id: 'sub_epoch', ...createData }
      vi.mocked(db.subscription.create).mockResolvedValue(mockCreated)

      const result = await repository.createSubscription(createData)

      expect(result.currentPeriodStart).toEqual(epochDate)
    })

    it('should handle far future timestamps', async () => {
      const futureDate = new Date('2099-12-31T23:59:59Z')

      const createData: CreateSubscriptionDTO = {
        userId: 'user_future',
        planId: 'plan_basic',
        stripeSubscriptionId: 'sub_future',
        stripeCustomerId: 'cus_future',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: futureDate,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
      }

      const mockCreated = { id: 'sub_future', ...createData }
      vi.mocked(db.subscription.create).mockResolvedValue(mockCreated)

      const result = await repository.createSubscription(createData)

      expect(result.currentPeriodEnd).toEqual(futureDate)
    })
  })

  describe('Database Error Scenarios', () => {
    it('should propagate constraint violation errors', async () => {
      vi.mocked(db.subscription.create).mockRejectedValue({
        code: 'P2003',
        message: 'Foreign key constraint failed on planId',
      })

      const createData: CreateSubscriptionDTO = {
        userId: 'user_123',
        planId: 'plan_nonexistent',
        stripeSubscriptionId: 'sub_fk_error',
        stripeCustomerId: 'cus_123',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
      }

      await expect(repository.createSubscription(createData)).rejects.toEqual({
        code: 'P2003',
        message: 'Foreign key constraint failed on planId',
      })
    })

    it('should handle database timeout errors', async () => {
      vi.mocked(db.subscription.findFirst).mockRejectedValue(
        new Error('Query execution timeout'),
      )

      await expect(
        repository.findSubscriptionByUserId('user_timeout'),
      ).rejects.toThrow('Query execution timeout')
    })

    it('should handle database connection pool exhaustion', async () => {
      vi.mocked(db.subscription.findMany).mockRejectedValue(
        new Error('Connection pool exhausted'),
      )

      await expect(
        repository.findActiveSubscriptionsByUserId('user_pool'),
      ).rejects.toThrow('Connection pool exhausted')
    })

    it('should handle database read replica lag', async () => {
      vi.mocked(db.subscription.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'sub_lagged',
          userId: 'user_lag',
          status: 'active',
        } as any)

      const result1 = await repository.findSubscriptionByUserId('user_lag')
      expect(result1).toBeNull()

      const result2 = await repository.findSubscriptionByUserId('user_lag')
      expect(result2).not.toBeNull()
    })
  })
})
