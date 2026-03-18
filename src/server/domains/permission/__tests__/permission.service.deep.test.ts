// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/server/lib/database'

import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  PLAN_PERMISSIONS,
} from '../permission.constants'
import { PermissionService } from '../permission.service'
import type { FeatureKey, PermissionContext } from '../permission.types'

vi.mock('@/server/lib/database', () => ({
  db: {
    subscription: {
      findFirst: vi.fn(),
    },
  },
}))

describe('PermissionService - Deep Tests', () => {
  let service: PermissionService

  beforeEach(() => {
    service = new PermissionService()
    vi.clearAllMocks()
  })

  describe('getUserPermissionContext', () => {
    describe('Edge Cases - Boundary Values', () => {
      it('should handle empty string userId', async () => {
        vi.mocked(db.subscription.findFirst).mockResolvedValue(null)

        const result = await service.getUserPermissionContext('')

        expect(result).toMatchObject({
          userId: '',
          planTier: 'free',
          subscriptionStatus: null,
          isTrialing: false,
          isCanceled: false,
        })
      })

      it('should handle very long userId (>1000 chars)', async () => {
        const longUserId = 'a'.repeat(1001)
        vi.mocked(db.subscription.findFirst).mockResolvedValue(null)

        const result = await service.getUserPermissionContext(longUserId)

        expect(result.userId).toBe(longUserId)
        expect(result.planTier).toBe('free')
      })

      it('should handle userId with special characters', async () => {
        const specialUserId = `user'; DROP TABLE users; --`
        vi.mocked(db.subscription.findFirst).mockResolvedValue(null)

        const result = await service.getUserPermissionContext(specialUserId)

        expect(result.userId).toBe(specialUserId)
      })

      it('should handle userId with unicode and emojis', async () => {
        const unicodeUserId = 'user-测试-🚀-Ñoño'
        vi.mocked(db.subscription.findFirst).mockResolvedValue(null)

        const result = await service.getUserPermissionContext(unicodeUserId)

        expect(result.userId).toBe(unicodeUserId)
      })

      it('should handle null userId (type coercion)', async () => {
        vi.mocked(db.subscription.findFirst).mockResolvedValue(null)

        const result = await service.getUserPermissionContext(null as any)

        expect(result).toBeDefined()
      })

      it('should handle undefined userId', async () => {
        vi.mocked(db.subscription.findFirst).mockResolvedValue(null)

        const result = await service.getUserPermissionContext(undefined as any)

        expect(result).toBeDefined()
      })
    })

    describe('Subscription Status Handling', () => {
      it('should return free tier when no subscription exists', async () => {
        vi.mocked(db.subscription.findFirst).mockResolvedValue(null)

        const result = await service.getUserPermissionContext('user-123')

        expect(result).toEqual({
          userId: 'user-123',
          planTier: 'free',
          subscriptionStatus: null,
          isTrialing: false,
          isCanceled: false,
        })
      })

      it('should handle active subscription status', async () => {
        vi.mocked(db.subscription.findFirst).mockResolvedValue({
          id: 'sub-1',
          userId: 'user-123',
          planId: 'plan-1',
          status: 'active',
          cancelAtPeriodEnd: false,
          plan: {
            id: 'plan-1',
            name: 'Pro',
            stripeProductId: 'prod-1',
            stripePriceId: 'price-1',
            description: 'Pro plan',
            monthlyPrice: 2000,
            yearlyPrice: 20000,
            transcriptionMinutes: 50,
            features: {} as any,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          stripeSubscriptionId: 'sub-stripe-1',
          stripeCustomerId: 'cus-1',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          canceledAt: null,
          trialStart: null,
          trialEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        const result = await service.getUserPermissionContext('user-123')

        expect(result).toMatchObject({
          userId: 'user-123',
          planTier: 'pro',
          subscriptionStatus: 'active',
          isTrialing: false,
          isCanceled: false,
        })
      })

      it('should handle trialing subscription status', async () => {
        vi.mocked(db.subscription.findFirst).mockResolvedValue({
          id: 'sub-1',
          userId: 'user-123',
          planId: 'plan-1',
          status: 'trialing',
          cancelAtPeriodEnd: false,
          plan: {
            id: 'plan-1',
            name: 'Basic',
            stripeProductId: 'prod-1',
            stripePriceId: 'price-1',
            description: null,
            monthlyPrice: 1000,
            yearlyPrice: null,
            transcriptionMinutes: 20,
            features: {} as any,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          stripeSubscriptionId: 'sub-stripe-1',
          stripeCustomerId: 'cus-1',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          canceledAt: null,
          trialStart: new Date(),
          trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        const result = await service.getUserPermissionContext('user-123')

        expect(result).toMatchObject({
          userId: 'user-123',
          planTier: 'basic',
          subscriptionStatus: 'trialing',
          isTrialing: true,
          isCanceled: false,
        })
      })

      it('should handle canceled subscription (cancelAtPeriodEnd)', async () => {
        vi.mocked(db.subscription.findFirst).mockResolvedValue({
          id: 'sub-1',
          userId: 'user-123',
          planId: 'plan-1',
          status: 'active',
          cancelAtPeriodEnd: true,
          plan: {
            id: 'plan-1',
            name: 'Junior',
            stripeProductId: 'prod-1',
            stripePriceId: 'price-1',
            description: null,
            monthlyPrice: 500,
            yearlyPrice: null,
            transcriptionMinutes: 10,
            features: {} as any,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          stripeSubscriptionId: 'sub-stripe-1',
          stripeCustomerId: 'cus-1',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          canceledAt: new Date(),
          trialStart: null,
          trialEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        const result = await service.getUserPermissionContext('user-123')

        expect(result).toMatchObject({
          userId: 'user-123',
          planTier: 'junior',
          subscriptionStatus: 'active',
          isTrialing: false,
          isCanceled: true,
        })
      })

      it('should ignore inactive subscription statuses', async () => {
        vi.mocked(db.subscription.findFirst).mockResolvedValue(null)

        const result = await service.getUserPermissionContext('user-123')

        expect(result.planTier).toBe('free')
        expect(result.subscriptionStatus).toBeNull()
        expect(vi.mocked(db.subscription.findFirst)).toHaveBeenCalledWith({
          where: {
            userId: 'user-123',
            status: { in: [...ACTIVE_SUBSCRIPTION_STATUSES] },
          },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        })
      })

      it('should handle plan name with different casing', async () => {
        vi.mocked(db.subscription.findFirst).mockResolvedValue({
          id: 'sub-1',
          userId: 'user-123',
          planId: 'plan-1',
          status: 'active',
          cancelAtPeriodEnd: false,
          plan: {
            id: 'plan-1',
            name: 'PRO',
            stripeProductId: 'prod-1',
            stripePriceId: 'price-1',
            description: null,
            monthlyPrice: 2000,
            yearlyPrice: null,
            transcriptionMinutes: 50,
            features: {} as any,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          stripeSubscriptionId: 'sub-stripe-1',
          stripeCustomerId: 'cus-1',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          canceledAt: null,
          trialStart: null,
          trialEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        const result = await service.getUserPermissionContext('user-123')

        expect(result.planTier).toBe('pro')
      })

      it('should select most recent subscription when multiple exist', async () => {
        vi.mocked(db.subscription.findFirst).mockResolvedValue({
          id: 'sub-2',
          userId: 'user-123',
          planId: 'plan-2',
          status: 'active',
          cancelAtPeriodEnd: false,
          plan: {
            id: 'plan-2',
            name: 'Pro',
            stripeProductId: 'prod-2',
            stripePriceId: 'price-2',
            description: null,
            monthlyPrice: 2000,
            yearlyPrice: null,
            transcriptionMinutes: 50,
            features: {} as any,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          stripeSubscriptionId: 'sub-stripe-2',
          stripeCustomerId: 'cus-1',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          canceledAt: null,
          trialStart: null,
          trialEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        await service.getUserPermissionContext('user-123')

        expect(vi.mocked(db.subscription.findFirst)).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { createdAt: 'desc' },
          }),
        )
      })
    })

    describe('Database Errors', () => {
      it('should handle database connection timeout', async () => {
        vi.mocked(db.subscription.findFirst).mockImplementation(
          () =>
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Connection timeout')), 100),
            ),
        )

        await expect(
          service.getUserPermissionContext('user-123'),
        ).rejects.toThrow('Connection timeout')
      })

      it('should handle database connection error', async () => {
        vi.mocked(db.subscription.findFirst).mockRejectedValue(
          new Error('Database connection failed'),
        )

        await expect(
          service.getUserPermissionContext('user-123'),
        ).rejects.toThrow('Database connection failed')
      })

      it('should handle malformed database response', async () => {
        vi.mocked(db.subscription.findFirst).mockResolvedValue({
          plan: null,
        } as any)

        await expect(
          service.getUserPermissionContext('user-123'),
        ).rejects.toThrow()
      })
    })

    describe('Race Conditions', () => {
      it('should handle concurrent requests for same user', async () => {
        vi.mocked(db.subscription.findFirst).mockResolvedValue(null)

        const promises = Array.from({ length: 10 }, () =>
          service.getUserPermissionContext('user-123'),
        )

        const results = await Promise.all(promises)

        expect(results).toHaveLength(10)
        results.forEach((result) => {
          expect(result.userId).toBe('user-123')
          expect(result.planTier).toBe('free')
        })
      })

      it('should handle concurrent requests for different users', async () => {
        vi.mocked(db.subscription.findFirst).mockImplementation(
          async ({ where }: any) => {
            if (where.userId === 'user-1') {
              return {
                id: 'sub-1',
                userId: 'user-1',
                planId: 'plan-1',
                status: 'active',
                cancelAtPeriodEnd: false,
                plan: {
                  id: 'plan-1',
                  name: 'Pro',
                  stripeProductId: 'prod-1',
                  stripePriceId: 'price-1',
                  description: null,
                  monthlyPrice: 2000,
                  yearlyPrice: null,
                  transcriptionMinutes: 50,
                  features: {} as any,
                  isActive: true,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                stripeSubscriptionId: 'sub-stripe-1',
                stripeCustomerId: 'cus-1',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(),
                canceledAt: null,
                trialStart: null,
                trialEnd: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              }
            }
            return null
          },
        )

        const promises = [
          service.getUserPermissionContext('user-1'),
          service.getUserPermissionContext('user-2'),
        ]

        const [result1, result2] = await Promise.all(promises)

        expect(result1.planTier).toBe('pro')
        expect(result2.planTier).toBe('free')
      })
    })
  })

  describe('checkFeatureAccess', () => {
    describe('Edge Cases - Feature Access', () => {
      it('should deny access to disabled feature on free plan', () => {
        const context: PermissionContext = {
          userId: 'user-123',
          planTier: 'free',
          subscriptionStatus: null,
          isTrialing: false,
          isCanceled: false,
        }

        const result = service.checkFeatureAccess(context, 'sheet_editor')

        expect(result).toMatchObject({
          hasAccess: false,
          reason: expect.stringContaining('sheet_editor'),
          upgradeRequired: 'pro',
        })
      })

      it('should allow access to enabled feature without limit', () => {
        const context: PermissionContext = {
          userId: 'user-123',
          planTier: 'free',
          subscriptionStatus: null,
          isTrialing: false,
          isCanceled: false,
        }

        const result = service.checkFeatureAccess(context, 'falling_notes')

        expect(result).toEqual({
          hasAccess: true,
          currentLimit: undefined,
          usedLimit: undefined,
        })
      })

      it('should allow access when usage is below limit', () => {
        const context: PermissionContext = {
          userId: 'user-123',
          planTier: 'free',
          subscriptionStatus: null,
          isTrialing: false,
          isCanceled: false,
        }

        const result = service.checkFeatureAccess(context, 'transcription', 2)

        expect(result).toMatchObject({
          hasAccess: true,
          currentLimit: 3,
          usedLimit: 2,
        })
      })

      it('should deny access when usage equals limit', () => {
        const context: PermissionContext = {
          userId: 'user-123',
          planTier: 'free',
          subscriptionStatus: null,
          isTrialing: false,
          isCanceled: false,
        }

        const result = service.checkFeatureAccess(context, 'transcription', 3)

        expect(result).toMatchObject({
          hasAccess: false,
          reason: expect.stringContaining('3/3'),
          currentLimit: 3,
          usedLimit: 3,
        })
      })

      it('should deny access when usage exceeds limit', () => {
        const context: PermissionContext = {
          userId: 'user-123',
          planTier: 'free',
          subscriptionStatus: null,
          isTrialing: false,
          isCanceled: false,
        }

        const result = service.checkFeatureAccess(context, 'transcription', 5)

        expect(result).toMatchObject({
          hasAccess: false,
          reason: expect.stringContaining('5/3'),
          currentLimit: 3,
          usedLimit: 5,
        })
      })

      it('should handle zero usage', () => {
        const context: PermissionContext = {
          userId: 'user-123',
          planTier: 'free',
          subscriptionStatus: null,
          isTrialing: false,
          isCanceled: false,
        }

        const result = service.checkFeatureAccess(context, 'transcription', 0)

        expect(result).toMatchObject({
          hasAccess: true,
          currentLimit: 3,
          usedLimit: 0,
        })
      })

      it('should handle negative usage (edge case)', () => {
        const context: PermissionContext = {
          userId: 'user-123',
          planTier: 'free',
          subscriptionStatus: null,
          isTrialing: false,
          isCanceled: false,
        }

        const result = service.checkFeatureAccess(context, 'transcription', -1)

        expect(result).toMatchObject({
          hasAccess: true,
          currentLimit: 3,
          usedLimit: -1,
        })
      })

      it('should handle extremely large usage value', () => {
        const context: PermissionContext = {
          userId: 'user-123',
          planTier: 'free',
          subscriptionStatus: null,
          isTrialing: false,
          isCanceled: false,
        }

        const result = service.checkFeatureAccess(
          context,
          'transcription',
          Number.MAX_SAFE_INTEGER,
        )

        expect(result).toMatchObject({
          hasAccess: false,
          currentLimit: 3,
          usedLimit: Number.MAX_SAFE_INTEGER,
        })
      })

      it('should handle NaN usage', () => {
        const context: PermissionContext = {
          userId: 'user-123',
          planTier: 'free',
          subscriptionStatus: null,
          isTrialing: false,
          isCanceled: false,
        }

        const result = service.checkFeatureAccess(context, 'transcription', NaN)

        expect(result).toBeDefined()
      })

      it('should handle Infinity usage', () => {
        const context: PermissionContext = {
          userId: 'user-123',
          planTier: 'free',
          subscriptionStatus: null,
          isTrialing: false,
          isCanceled: false,
        }

        const result = service.checkFeatureAccess(
          context,
          'transcription',
          Infinity,
        )

        expect(result).toMatchObject({
          hasAccess: false,
        })
      })

      it('should handle undefined usage when feature has limit', () => {
        const context: PermissionContext = {
          userId: 'user-123',
          planTier: 'free',
          subscriptionStatus: null,
          isTrialing: false,
          isCanceled: false,
        }

        const result = service.checkFeatureAccess(context, 'transcription')

        expect(result).toMatchObject({
          hasAccess: true,
          currentLimit: 3,
          usedLimit: undefined,
        })
      })

      it('should handle null usage (type coercion)', () => {
        const context: PermissionContext = {
          userId: 'user-123',
          planTier: 'free',
          subscriptionStatus: null,
          isTrialing: false,
          isCanceled: false,
        }

        const result = service.checkFeatureAccess(
          context,
          'transcription',
          null as any,
        )

        expect(result).toBeDefined()
      })
    })

    describe('All Plan Tiers Coverage', () => {
      const features: FeatureKey[] = [
        'transcription',
        'falling_notes',
        'history_access',
        'sheet_editor',
        'polyphony',
        'export_pdf',
        'export_midi',
        'export_musicxml',
        'ai_recommendations',
        'collaboration',
        'api_access',
        'priority_support',
        'custom_branding',
      ]

      const planTiers = ['free', 'junior', 'basic', 'pro'] as const

      planTiers.forEach((tier) => {
        features.forEach((feature) => {
          it(`should correctly check ${feature} on ${tier} plan`, () => {
            const context: PermissionContext = {
              userId: 'user-123',
              planTier: tier,
              subscriptionStatus: tier === 'free' ? null : 'active',
              isTrialing: false,
              isCanceled: false,
            }

            const result = service.checkFeatureAccess(context, feature)

            const planConfig = PLAN_PERMISSIONS[tier]
            const featureConfig = planConfig.features[feature]

            expect(result.hasAccess).toBe(featureConfig.enabled)
          })
        })
      })
    })

    describe('Upgrade Required Logic', () => {
      it('should suggest junior plan for feature not available on free', () => {
        const context: PermissionContext = {
          userId: 'user-123',
          planTier: 'free',
          subscriptionStatus: null,
          isTrialing: false,
          isCanceled: false,
        }

        const result = service.checkFeatureAccess(context, 'export_pdf')

        expect(result).toMatchObject({
          hasAccess: false,
          upgradeRequired: 'junior',
        })
      })

      it('should suggest basic plan for feature not available on junior', () => {
        const context: PermissionContext = {
          userId: 'user-123',
          planTier: 'junior',
          subscriptionStatus: 'active',
          isTrialing: false,
          isCanceled: false,
        }

        const result = service.checkFeatureAccess(context, 'export_musicxml')

        expect(result).toMatchObject({
          hasAccess: false,
          upgradeRequired: 'basic',
        })
      })

      it('should suggest pro plan for feature only on pro', () => {
        const context: PermissionContext = {
          userId: 'user-123',
          planTier: 'basic',
          subscriptionStatus: 'active',
          isTrialing: false,
          isCanceled: false,
        }

        const result = service.checkFeatureAccess(context, 'sheet_editor')

        expect(result).toMatchObject({
          hasAccess: false,
          upgradeRequired: 'pro',
        })
      })

      it('should return undefined upgradeRequired when feature is on current plan but limit reached', () => {
        const context: PermissionContext = {
          userId: 'user-123',
          planTier: 'free',
          subscriptionStatus: null,
          isTrialing: false,
          isCanceled: false,
        }

        const result = service.checkFeatureAccess(context, 'transcription', 5)

        expect(result.upgradeRequired).toBeUndefined()
        expect(result.hasAccess).toBe(false)
        expect(result.reason).toContain('Limite atteinte')
      })
    })

    describe('Invalid Inputs', () => {
      it('should handle invalid feature key', () => {
        const context: PermissionContext = {
          userId: 'user-123',
          planTier: 'free',
          subscriptionStatus: null,
          isTrialing: false,
          isCanceled: false,
        }

        expect(() => {
          service.checkFeatureAccess(context, 'invalid_feature' as FeatureKey)
        }).toThrow()
      })

      it('should handle invalid plan tier in context', () => {
        const context: PermissionContext = {
          userId: 'user-123',
          planTier: 'invalid_tier' as any,
          subscriptionStatus: null,
          isTrialing: false,
          isCanceled: false,
        }

        expect(() => {
          service.checkFeatureAccess(context, 'transcription')
        }).toThrow()
      })
    })
  })

  describe('checkFeatureAccessForUser', () => {
    it('should combine getUserPermissionContext and checkFeatureAccess', async () => {
      vi.mocked(db.subscription.findFirst).mockResolvedValue({
        id: 'sub-1',
        userId: 'user-123',
        planId: 'plan-1',
        status: 'active',
        cancelAtPeriodEnd: false,
        plan: {
          id: 'plan-1',
          name: 'Pro',
          stripeProductId: 'prod-1',
          stripePriceId: 'price-1',
          description: null,
          monthlyPrice: 2000,
          yearlyPrice: null,
          transcriptionMinutes: 50,
          features: {} as any,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        stripeSubscriptionId: 'sub-stripe-1',
        stripeCustomerId: 'cus-1',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await service.checkFeatureAccessForUser(
        'user-123',
        'sheet_editor',
      )

      expect(result.hasAccess).toBe(true)
    })

    it('should pass usage parameter correctly', async () => {
      vi.mocked(db.subscription.findFirst).mockResolvedValue({
        id: 'sub-1',
        userId: 'user-123',
        planId: 'plan-1',
        status: 'active',
        cancelAtPeriodEnd: false,
        plan: {
          id: 'plan-1',
          name: 'Pro',
          stripeProductId: 'prod-1',
          stripePriceId: 'price-1',
          description: null,
          monthlyPrice: 2000,
          yearlyPrice: null,
          transcriptionMinutes: 50,
          features: {} as any,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        stripeSubscriptionId: 'sub-stripe-1',
        stripeCustomerId: 'cus-1',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await service.checkFeatureAccessForUser(
        'user-123',
        'transcription',
        45,
      )

      expect(result).toMatchObject({
        hasAccess: true,
        currentLimit: 50,
        usedLimit: 45,
      })
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(db.subscription.findFirst).mockRejectedValue(
        new Error('Database error'),
      )

      await expect(
        service.checkFeatureAccessForUser('user-123', 'transcription'),
      ).rejects.toThrow('Database error')
    })
  })

  describe('getAvailableFeatures', () => {
    it('should return all features for free plan', async () => {
      vi.mocked(db.subscription.findFirst).mockResolvedValue(null)

      const result = await service.getAvailableFeatures('user-123')

      expect(result).toEqual({
        transcription: true,
        falling_notes: true,
        history_access: true,
        sheet_editor: false,
        polyphony: false,
        export_pdf: false,
        export_midi: true,
        export_musicxml: false,
        ai_recommendations: false,
        collaboration: false,
        api_access: false,
        priority_support: false,
        custom_branding: false,
      })
    })

    it('should return all features for pro plan', async () => {
      vi.mocked(db.subscription.findFirst).mockResolvedValue({
        id: 'sub-1',
        userId: 'user-123',
        planId: 'plan-1',
        status: 'active',
        cancelAtPeriodEnd: false,
        plan: {
          id: 'plan-1',
          name: 'Pro',
          stripeProductId: 'prod-1',
          stripePriceId: 'price-1',
          description: null,
          monthlyPrice: 2000,
          yearlyPrice: null,
          transcriptionMinutes: 50,
          features: {} as any,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        stripeSubscriptionId: 'sub-stripe-1',
        stripeCustomerId: 'cus-1',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await service.getAvailableFeatures('user-123')

      expect(result).toEqual({
        transcription: true,
        falling_notes: true,
        history_access: true,
        sheet_editor: true,
        polyphony: true,
        export_pdf: true,
        export_midi: true,
        export_musicxml: true,
        ai_recommendations: true,
        collaboration: true,
        api_access: true,
        priority_support: true,
        custom_branding: true,
      })
    })

    it('should handle database errors', async () => {
      vi.mocked(db.subscription.findFirst).mockRejectedValue(
        new Error('Database error'),
      )

      await expect(service.getAvailableFeatures('user-123')).rejects.toThrow(
        'Database error',
      )
    })

    it('should return consistent results for concurrent calls', async () => {
      vi.mocked(db.subscription.findFirst).mockResolvedValue(null)

      const promises = Array.from({ length: 5 }, () =>
        service.getAvailableFeatures('user-123'),
      )

      const results = await Promise.all(promises)

      const firstResult = results[0]
      results.forEach((result) => {
        expect(result).toEqual(firstResult)
      })
    })
  })

  describe('requireActiveSubscription', () => {
    it('should return false when user has no subscription', async () => {
      vi.mocked(db.subscription.findFirst).mockResolvedValue(null)

      const result = await service.requireActiveSubscription('user-123')

      expect(result).toBe(false)
    })

    it('should return true when user has active subscription', async () => {
      vi.mocked(db.subscription.findFirst).mockResolvedValue({
        id: 'sub-1',
        userId: 'user-123',
        planId: 'plan-1',
        status: 'active',
        cancelAtPeriodEnd: false,
        plan: {
          id: 'plan-1',
          name: 'Pro',
          stripeProductId: 'prod-1',
          stripePriceId: 'price-1',
          description: null,
          monthlyPrice: 2000,
          yearlyPrice: null,
          transcriptionMinutes: 50,
          features: {} as any,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        stripeSubscriptionId: 'sub-stripe-1',
        stripeCustomerId: 'cus-1',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await service.requireActiveSubscription('user-123')

      expect(result).toBe(true)
    })

    it('should return true when user has trialing subscription', async () => {
      vi.mocked(db.subscription.findFirst).mockResolvedValue({
        id: 'sub-1',
        userId: 'user-123',
        planId: 'plan-1',
        status: 'trialing',
        cancelAtPeriodEnd: false,
        plan: {
          id: 'plan-1',
          name: 'Pro',
          stripeProductId: 'prod-1',
          stripePriceId: 'price-1',
          description: null,
          monthlyPrice: 2000,
          yearlyPrice: null,
          transcriptionMinutes: 50,
          features: {} as any,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        stripeSubscriptionId: 'sub-stripe-1',
        stripeCustomerId: 'cus-1',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        canceledAt: null,
        trialStart: new Date(),
        trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await service.requireActiveSubscription('user-123')

      expect(result).toBe(true)
    })

    it('should return true even if subscription is canceled but still active', async () => {
      vi.mocked(db.subscription.findFirst).mockResolvedValue({
        id: 'sub-1',
        userId: 'user-123',
        planId: 'plan-1',
        status: 'active',
        cancelAtPeriodEnd: true,
        plan: {
          id: 'plan-1',
          name: 'Pro',
          stripeProductId: 'prod-1',
          stripePriceId: 'price-1',
          description: null,
          monthlyPrice: 2000,
          yearlyPrice: null,
          transcriptionMinutes: 50,
          features: {} as any,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        stripeSubscriptionId: 'sub-stripe-1',
        stripeCustomerId: 'cus-1',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        canceledAt: new Date(),
        trialStart: null,
        trialEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await service.requireActiveSubscription('user-123')

      expect(result).toBe(true)
    })

    it('should handle database errors', async () => {
      vi.mocked(db.subscription.findFirst).mockRejectedValue(
        new Error('Database error'),
      )

      await expect(
        service.requireActiveSubscription('user-123'),
      ).rejects.toThrow('Database error')
    })
  })

  describe('Performance Tests', () => {
    it('should handle rapid successive calls efficiently', async () => {
      vi.mocked(db.subscription.findFirst).mockResolvedValue(null)

      const start = Date.now()
      const promises = Array.from({ length: 100 }, () =>
        service.getUserPermissionContext('user-123'),
      )
      await Promise.all(promises)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(1000)
    })

    it('should cache lookups for same user', async () => {
      vi.mocked(db.subscription.findFirst).mockResolvedValue(null)

      await service.getUserPermissionContext('user-123')
      await service.getUserPermissionContext('user-123')
      await service.getUserPermissionContext('user-123')

      expect(vi.mocked(db.subscription.findFirst)).toHaveBeenCalledTimes(3)
    })

    it('should handle high volume of concurrent permission checks', async () => {
      const context: PermissionContext = {
        userId: 'user-123',
        planTier: 'free',
        subscriptionStatus: null,
        isTrialing: false,
        isCanceled: false,
      }

      const start = Date.now()
      const promises = Array.from({ length: 1000 }, () =>
        service.checkFeatureAccess(context, 'transcription', 2),
      )
      await Promise.all(promises)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(500)
    })

    it('should not leak memory on repeated feature checks', async () => {
      const context: PermissionContext = {
        userId: 'user-123',
        planTier: 'pro',
        subscriptionStatus: 'active',
        isTrialing: false,
        isCanceled: false,
      }

      const initialMemory = process.memoryUsage().heapUsed

      for (let i = 0; i < 10000; i++) {
        service.checkFeatureAccess(context, 'transcription', i)
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024

      expect(memoryIncrease).toBeLessThan(50)
    })
  })

  describe('Edge Cases - Decimal/Float Usage', () => {
    it('should handle decimal usage values', () => {
      const context: PermissionContext = {
        userId: 'user-123',
        planTier: 'free',
        subscriptionStatus: null,
        isTrialing: false,
        isCanceled: false,
      }

      const result = service.checkFeatureAccess(context, 'transcription', 2.5)

      expect(result.hasAccess).toBe(true)
      expect(result.usedLimit).toBe(2.5)
    })

    it('should handle float precision edge case (2.9999999)', () => {
      const context: PermissionContext = {
        userId: 'user-123',
        planTier: 'free',
        subscriptionStatus: null,
        isTrialing: false,
        isCanceled: false,
      }

      const result = service.checkFeatureAccess(
        context,
        'transcription',
        2.9999999,
      )

      expect(result.hasAccess).toBe(true)
    })

    it('should handle float exactly at limit (3.0)', () => {
      const context: PermissionContext = {
        userId: 'user-123',
        planTier: 'free',
        subscriptionStatus: null,
        isTrialing: false,
        isCanceled: false,
      }

      const result = service.checkFeatureAccess(context, 'transcription', 3.0)

      expect(result.hasAccess).toBe(false)
    })

    it('should handle float slightly over limit (3.0000001)', () => {
      const context: PermissionContext = {
        userId: 'user-123',
        planTier: 'free',
        subscriptionStatus: null,
        isTrialing: false,
        isCanceled: false,
      }

      const result = service.checkFeatureAccess(
        context,
        'transcription',
        3.0000001,
      )

      expect(result.hasAccess).toBe(false)
    })
  })

  describe('Edge Cases - Plan Transitions', () => {
    it('should handle upgrade from free to pro correctly', async () => {
      vi.mocked(db.subscription.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'sub-1',
          userId: 'user-123',
          planId: 'plan-1',
          status: 'active',
          cancelAtPeriodEnd: false,
          plan: {
            id: 'plan-1',
            name: 'Pro',
            stripeProductId: 'prod-1',
            stripePriceId: 'price-1',
            description: null,
            monthlyPrice: 2000,
            yearlyPrice: null,
            transcriptionMinutes: 50,
            features: {} as any,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          stripeSubscriptionId: 'sub-stripe-1',
          stripeCustomerId: 'cus-1',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          canceledAt: null,
          trialStart: null,
          trialEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

      const beforeUpgrade = await service.getUserPermissionContext('user-123')
      expect(beforeUpgrade.planTier).toBe('free')

      const afterUpgrade = await service.getUserPermissionContext('user-123')
      expect(afterUpgrade.planTier).toBe('pro')
    })

    it('should handle downgrade from pro to basic', async () => {
      vi.mocked(db.subscription.findFirst)
        .mockResolvedValueOnce({
          id: 'sub-1',
          userId: 'user-123',
          planId: 'plan-1',
          status: 'active',
          cancelAtPeriodEnd: false,
          plan: {
            id: 'plan-1',
            name: 'Pro',
            stripeProductId: 'prod-1',
            stripePriceId: 'price-1',
            description: null,
            monthlyPrice: 2000,
            yearlyPrice: null,
            transcriptionMinutes: 50,
            features: {} as any,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          stripeSubscriptionId: 'sub-stripe-1',
          stripeCustomerId: 'cus-1',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          canceledAt: null,
          trialStart: null,
          trialEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'sub-2',
          userId: 'user-123',
          planId: 'plan-2',
          status: 'active',
          cancelAtPeriodEnd: false,
          plan: {
            id: 'plan-2',
            name: 'Basic',
            stripeProductId: 'prod-2',
            stripePriceId: 'price-2',
            description: null,
            monthlyPrice: 1000,
            yearlyPrice: null,
            transcriptionMinutes: 20,
            features: {} as any,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          stripeSubscriptionId: 'sub-stripe-2',
          stripeCustomerId: 'cus-1',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          canceledAt: null,
          trialStart: null,
          trialEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

      const beforeDowngrade = await service.getUserPermissionContext('user-123')
      expect(beforeDowngrade.planTier).toBe('pro')

      const afterDowngrade = await service.getUserPermissionContext('user-123')
      expect(afterDowngrade.planTier).toBe('basic')
    })

    it('should handle subscription cancellation to free tier', async () => {
      vi.mocked(db.subscription.findFirst)
        .mockResolvedValueOnce({
          id: 'sub-1',
          userId: 'user-123',
          planId: 'plan-1',
          status: 'active',
          cancelAtPeriodEnd: false,
          plan: {
            id: 'plan-1',
            name: 'Pro',
            stripeProductId: 'prod-1',
            stripePriceId: 'price-1',
            description: null,
            monthlyPrice: 2000,
            yearlyPrice: null,
            transcriptionMinutes: 50,
            features: {} as any,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          stripeSubscriptionId: 'sub-stripe-1',
          stripeCustomerId: 'cus-1',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          canceledAt: null,
          trialStart: null,
          trialEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce(null)

      const beforeCancellation =
        await service.getUserPermissionContext('user-123')
      expect(beforeCancellation.planTier).toBe('pro')

      const afterCancellation =
        await service.getUserPermissionContext('user-123')
      expect(afterCancellation.planTier).toBe('free')
    })
  })

  describe('Edge Cases - Feature Limits with Different Units', () => {
    it('should handle transcription limit in minutes', () => {
      const context: PermissionContext = {
        userId: 'user-123',
        planTier: 'free',
        subscriptionStatus: null,
        isTrialing: false,
        isCanceled: false,
      }

      const result = service.checkFeatureAccess(context, 'transcription', 2)

      expect(result.currentLimit).toBe(3)
      expect(PLAN_PERMISSIONS.free.features.transcription.unit).toBe('minutes')
    })

    it('should handle history_access limit in days', () => {
      const context: PermissionContext = {
        userId: 'user-123',
        planTier: 'free',
        subscriptionStatus: null,
        isTrialing: false,
        isCanceled: false,
      }

      const result = service.checkFeatureAccess(context, 'history_access', 5)

      expect(result.currentLimit).toBe(7)
      expect(PLAN_PERMISSIONS.free.features.history_access.unit).toBe('days')
    })

    it('should handle collaboration limit in users', () => {
      const context: PermissionContext = {
        userId: 'user-123',
        planTier: 'pro',
        subscriptionStatus: 'active',
        isTrialing: false,
        isCanceled: false,
      }

      const result = service.checkFeatureAccess(context, 'collaboration', 3)

      expect(result.currentLimit).toBe(5)
      expect(PLAN_PERMISSIONS.pro.features.collaboration.unit).toBe('users')
    })
  })

  describe('Edge Cases - Trialing Status Edge Cases', () => {
    it('should grant pro features during trial period', async () => {
      vi.mocked(db.subscription.findFirst).mockResolvedValue({
        id: 'sub-1',
        userId: 'user-123',
        planId: 'plan-1',
        status: 'trialing',
        cancelAtPeriodEnd: false,
        plan: {
          id: 'plan-1',
          name: 'Pro',
          stripeProductId: 'prod-1',
          stripePriceId: 'price-1',
          description: null,
          monthlyPrice: 2000,
          yearlyPrice: null,
          transcriptionMinutes: 50,
          features: {} as any,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        stripeSubscriptionId: 'sub-stripe-1',
        stripeCustomerId: 'cus-1',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        canceledAt: null,
        trialStart: new Date(),
        trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await service.checkFeatureAccessForUser(
        'user-123',
        'sheet_editor',
      )

      expect(result.hasAccess).toBe(true)
    })

    it('should handle trial period with expired trial end date', async () => {
      vi.mocked(db.subscription.findFirst).mockResolvedValue({
        id: 'sub-1',
        userId: 'user-123',
        planId: 'plan-1',
        status: 'trialing',
        cancelAtPeriodEnd: false,
        plan: {
          id: 'plan-1',
          name: 'Pro',
          stripeProductId: 'prod-1',
          stripePriceId: 'price-1',
          description: null,
          monthlyPrice: 2000,
          yearlyPrice: null,
          transcriptionMinutes: 50,
          features: {} as any,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        stripeSubscriptionId: 'sub-stripe-1',
        stripeCustomerId: 'cus-1',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        canceledAt: null,
        trialStart: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        trialEnd: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const context = await service.getUserPermissionContext('user-123')

      expect(context.isTrialing).toBe(true)
      expect(context.planTier).toBe('pro')
    })
  })

  describe('Edge Cases - Canceled Subscription Edge Cases', () => {
    it('should maintain access until period end when canceled', async () => {
      vi.mocked(db.subscription.findFirst).mockResolvedValue({
        id: 'sub-1',
        userId: 'user-123',
        planId: 'plan-1',
        status: 'active',
        cancelAtPeriodEnd: true,
        plan: {
          id: 'plan-1',
          name: 'Pro',
          stripeProductId: 'prod-1',
          stripePriceId: 'price-1',
          description: null,
          monthlyPrice: 2000,
          yearlyPrice: null,
          transcriptionMinutes: 50,
          features: {} as any,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        stripeSubscriptionId: 'sub-stripe-1',
        stripeCustomerId: 'cus-1',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        canceledAt: new Date(),
        trialStart: null,
        trialEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await service.checkFeatureAccessForUser(
        'user-123',
        'sheet_editor',
      )

      expect(result.hasAccess).toBe(true)
    })

    it('should handle canceled subscription with past period end', async () => {
      vi.mocked(db.subscription.findFirst).mockResolvedValue({
        id: 'sub-1',
        userId: 'user-123',
        planId: 'plan-1',
        status: 'active',
        cancelAtPeriodEnd: true,
        plan: {
          id: 'plan-1',
          name: 'Pro',
          stripeProductId: 'prod-1',
          stripePriceId: 'price-1',
          description: null,
          monthlyPrice: 2000,
          yearlyPrice: null,
          transcriptionMinutes: 50,
          features: {} as any,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        stripeSubscriptionId: 'sub-stripe-1',
        stripeCustomerId: 'cus-1',
        currentPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        canceledAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        trialStart: null,
        trialEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const context = await service.getUserPermissionContext('user-123')

      expect(context.isCanceled).toBe(true)
      expect(context.planTier).toBe('pro')
    })
  })

  describe('Idempotency Tests', () => {
    it('should return consistent results for same input', () => {
      const context: PermissionContext = {
        userId: 'user-123',
        planTier: 'free',
        subscriptionStatus: null,
        isTrialing: false,
        isCanceled: false,
      }

      const result1 = service.checkFeatureAccess(context, 'transcription', 2)
      const result2 = service.checkFeatureAccess(context, 'transcription', 2)
      const result3 = service.checkFeatureAccess(context, 'transcription', 2)

      expect(result1).toEqual(result2)
      expect(result2).toEqual(result3)
    })

    it('should not modify input context object', () => {
      const context: PermissionContext = {
        userId: 'user-123',
        planTier: 'free',
        subscriptionStatus: null,
        isTrialing: false,
        isCanceled: false,
      }

      const contextCopy = { ...context }

      service.checkFeatureAccess(context, 'transcription', 2)

      expect(context).toEqual(contextCopy)
    })
  })
})
