// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/server/lib/database'

import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  FEATURE_DISPLAY_NAMES,
  PLAN_PERMISSIONS,
} from '../permission.constants'
import { PermissionService } from '../permission.service'
import type { FeatureKey } from '../permission.types'

vi.mock('@/server/lib/database', () => ({
  db: {
    subscription: {
      findFirst: vi.fn(),
    },
  },
}))

describe('Permission Integration Tests', () => {
  let service: PermissionService

  beforeEach(() => {
    service = new PermissionService()
    vi.clearAllMocks()
  })

  describe('End-to-End User Journey', () => {
    it('should handle complete user lifecycle from free to pro and back', async () => {
      vi.mocked(db.subscription.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
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
        .mockResolvedValueOnce(null)

      const stage1 = await service.getUserPermissionContext('user-123')
      expect(stage1.planTier).toBe('free')
      expect(stage1.isTrialing).toBe(false)

      const stage2 = await service.getUserPermissionContext('user-123')
      expect(stage2.planTier).toBe('pro')
      expect(stage2.isTrialing).toBe(true)

      const stage3 = await service.getUserPermissionContext('user-123')
      expect(stage3.planTier).toBe('pro')
      expect(stage3.isTrialing).toBe(false)

      const stage4 = await service.getUserPermissionContext('user-123')
      expect(stage4.planTier).toBe('pro')
      expect(stage4.isCanceled).toBe(true)

      const stage5 = await service.getUserPermissionContext('user-123')
      expect(stage5.planTier).toBe('free')
      expect(stage5.subscriptionStatus).toBeNull()
    })

    it('should handle feature access checks across plan upgrades', async () => {
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

      const beforeUpgrade = await service.checkFeatureAccessForUser(
        'user-123',
        'sheet_editor',
      )
      expect(beforeUpgrade.hasAccess).toBe(false)

      const afterUpgrade = await service.checkFeatureAccessForUser(
        'user-123',
        'sheet_editor',
      )
      expect(afterUpgrade.hasAccess).toBe(true)
    })
  })

  describe('Feature Matrix Validation', () => {
    it('should validate all features are correctly configured for all plans', () => {
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

      const plans = ['free', 'junior', 'basic', 'pro'] as const

      plans.forEach((plan) => {
        features.forEach((feature) => {
          const config = PLAN_PERMISSIONS[plan].features[feature]

          expect(config).toBeDefined()
          expect(typeof config.enabled).toBe('boolean')

          if (config.limit !== undefined) {
            expect(typeof config.limit).toBe('number')
            expect(config.limit).toBeGreaterThan(0)
          }

          if (config.unit) {
            expect(['minutes', 'days', 'files', 'users']).toContain(config.unit)
          }
        })
      })
    })

    it('should ensure feature progression across tiers (junior >= free, basic >= junior, pro >= basic)', () => {
      const features: FeatureKey[] = Object.keys(
        PLAN_PERMISSIONS.free.features,
      ) as FeatureKey[]

      features.forEach((feature) => {
        const freeEnabled = PLAN_PERMISSIONS.free.features[feature].enabled
        const juniorEnabled = PLAN_PERMISSIONS.junior.features[feature].enabled
        const basicEnabled = PLAN_PERMISSIONS.basic.features[feature].enabled
        const proEnabled = PLAN_PERMISSIONS.pro.features[feature].enabled

        if (freeEnabled) {
          expect(juniorEnabled || basicEnabled || proEnabled).toBe(true)
        }

        if (juniorEnabled) {
          expect(basicEnabled || proEnabled).toBe(true)
        }

        if (basicEnabled) {
          expect(proEnabled).toBe(true)
        }
      })
    })

    it('should validate feature display names exist for all features', () => {
      const features: FeatureKey[] = Object.keys(
        PLAN_PERMISSIONS.free.features,
      ) as FeatureKey[]

      features.forEach((feature) => {
        expect(FEATURE_DISPLAY_NAMES[feature]).toBeDefined()
        expect(typeof FEATURE_DISPLAY_NAMES[feature]).toBe('string')
        expect(FEATURE_DISPLAY_NAMES[feature].length).toBeGreaterThan(0)
      })
    })
  })

  describe('Usage Tracking Integration', () => {
    it('should correctly track usage against limits for transcription', async () => {
      vi.mocked(db.subscription.findFirst).mockResolvedValue(null)

      const usageProgression = [0, 1, 2, 2.5, 2.99, 3, 3.1, 5, 10]

      for (const usage of usageProgression) {
        const result = await service.checkFeatureAccessForUser(
          'user-123',
          'transcription',
          usage,
        )

        if (usage < 3) {
          expect(result.hasAccess).toBe(true)
        } else {
          expect(result.hasAccess).toBe(false)
        }

        expect(result.usedLimit).toBe(usage)
        expect(result.currentLimit).toBe(3)
      }
    })

    it('should correctly track usage against limits for history access', async () => {
      vi.mocked(db.subscription.findFirst).mockResolvedValue(null)

      const usageProgression = [0, 3, 6, 7, 8, 14, 30]

      for (const usage of usageProgression) {
        const result = await service.checkFeatureAccessForUser(
          'user-123',
          'history_access',
          usage,
        )

        if (usage < 7) {
          expect(result.hasAccess).toBe(true)
        } else {
          expect(result.hasAccess).toBe(false)
        }

        expect(result.usedLimit).toBe(usage)
        expect(result.currentLimit).toBe(7)
      }
    })

    it('should handle unlimited features (no limit defined)', async () => {
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

      const largeUsageValues = [100, 1000, 10000, 100000]

      for (const usage of largeUsageValues) {
        const result = await service.checkFeatureAccessForUser(
          'user-123',
          'history_access',
          usage,
        )

        expect(result.hasAccess).toBe(true)
        expect(result.currentLimit).toBeUndefined()
      }
    })
  })

  describe('Subscription Lifecycle Integration', () => {
    it('should handle trial-to-active transition seamlessly', async () => {
      vi.mocked(db.subscription.findFirst)
        .mockResolvedValueOnce({
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
          trialEnd: new Date(Date.now() + 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
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

      const duringTrial = await service.requireActiveSubscription('user-123')
      expect(duringTrial).toBe(true)

      const afterTrialConverted =
        await service.requireActiveSubscription('user-123')
      expect(afterTrialConverted).toBe(true)
    })

    it('should maintain feature access during canceled-but-active period', async () => {
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
        currentPeriodEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        canceledAt: new Date(),
        trialStart: null,
        trialEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const context = await service.getUserPermissionContext('user-123')
      const featureAccess = service.checkFeatureAccess(context, 'sheet_editor')

      expect(context.isCanceled).toBe(true)
      expect(context.planTier).toBe('pro')
      expect(featureAccess.hasAccess).toBe(true)
    })

    it('should handle subscription reactivation correctly', async () => {
      vi.mocked(db.subscription.findFirst)
        .mockResolvedValueOnce({
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
          currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          canceledAt: null,
          trialStart: null,
          trialEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

      const beforeReactivation =
        await service.getUserPermissionContext('user-123')
      expect(beforeReactivation.isCanceled).toBe(true)

      const afterReactivation =
        await service.getUserPermissionContext('user-123')
      expect(afterReactivation.isCanceled).toBe(false)
    })
  })

  describe('Multi-User Scenarios', () => {
    it('should handle permissions for multiple users independently', async () => {
      vi.mocked(db.subscription.findFirst).mockImplementation(
        async ({ where }: any) => {
          if (where.userId === 'user-free') return null

          if (where.userId === 'user-junior') {
            return {
              id: 'sub-1',
              userId: 'user-junior',
              planId: 'plan-1',
              status: 'active',
              cancelAtPeriodEnd: false,
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
              currentPeriodEnd: new Date(),
              canceledAt: null,
              trialStart: null,
              trialEnd: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          }

          if (where.userId === 'user-basic') {
            return {
              id: 'sub-2',
              userId: 'user-basic',
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
              stripeCustomerId: 'cus-2',
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(),
              canceledAt: null,
              trialStart: null,
              trialEnd: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          }

          if (where.userId === 'user-pro') {
            return {
              id: 'sub-3',
              userId: 'user-pro',
              planId: 'plan-3',
              status: 'active',
              cancelAtPeriodEnd: false,
              plan: {
                id: 'plan-3',
                name: 'Pro',
                stripeProductId: 'prod-3',
                stripePriceId: 'price-3',
                description: null,
                monthlyPrice: 2000,
                yearlyPrice: null,
                transcriptionMinutes: 50,
                features: {} as any,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              stripeSubscriptionId: 'sub-stripe-3',
              stripeCustomerId: 'cus-3',
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

      const users = [
        { id: 'user-free', expectedPlan: 'free' },
        { id: 'user-junior', expectedPlan: 'junior' },
        { id: 'user-basic', expectedPlan: 'basic' },
        { id: 'user-pro', expectedPlan: 'pro' },
      ]

      for (const user of users) {
        const context = await service.getUserPermissionContext(user.id)
        expect(context.planTier).toBe(user.expectedPlan)
      }

      const freeUserAccess = await service.checkFeatureAccessForUser(
        'user-free',
        'sheet_editor',
      )
      expect(freeUserAccess.hasAccess).toBe(false)

      const proUserAccess = await service.checkFeatureAccessForUser(
        'user-pro',
        'sheet_editor',
      )
      expect(proUserAccess.hasAccess).toBe(true)
    })

    it('should handle concurrent permission checks for different users', async () => {
      vi.mocked(db.subscription.findFirst).mockImplementation(
        async ({ where }: any) => {
          if (where.userId === 'user-0') return null

          return {
            id: 'sub-1',
            userId: where.userId,
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
        },
      )

      const promises = Array.from({ length: 100 }, (_, i) =>
        service.getUserPermissionContext(`user-${i}`),
      )

      const results = await Promise.all(promises)

      expect(results[0].planTier).toBe('free')

      for (let i = 1; i < 100; i++) {
        expect(results[i].planTier).toBe('pro')
      }
    })
  })

  describe('Error Handling Integration', () => {
    it('should gracefully degrade to free tier on database errors', async () => {
      vi.mocked(db.subscription.findFirst).mockRejectedValue(
        new Error('Database connection failed'),
      )

      await expect(
        service.getUserPermissionContext('user-123'),
      ).rejects.toThrow('Database connection failed')
    })

    it('should handle partial data corruption gracefully', async () => {
      vi.mocked(db.subscription.findFirst).mockResolvedValue({
        id: 'sub-1',
        userId: 'user-123',
        planId: 'plan-1',
        status: 'active',
        cancelAtPeriodEnd: false,
        plan: null,
        stripeSubscriptionId: 'sub-stripe-1',
        stripeCustomerId: 'cus-1',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      await expect(
        service.getUserPermissionContext('user-123'),
      ).rejects.toThrow()
    })
  })

  describe('Plan Upgrade Recommendation Integration', () => {
    it('should recommend correct upgrade path for each feature', () => {
      const context = {
        userId: 'user-123',
        planTier: 'free' as const,
        subscriptionStatus: null,
        isTrialing: false,
        isCanceled: false,
      }

      const exportPdfCheck = service.checkFeatureAccess(context, 'export_pdf')
      expect(exportPdfCheck.upgradeRequired).toBe('junior')

      const exportMusicXmlCheck = service.checkFeatureAccess(
        context,
        'export_musicxml',
      )
      expect(exportMusicXmlCheck.upgradeRequired).toBe('basic')

      const sheetEditorCheck = service.checkFeatureAccess(
        context,
        'sheet_editor',
      )
      expect(sheetEditorCheck.upgradeRequired).toBe('pro')
    })

    it('should not recommend upgrade when feature is available on current plan but limit reached', () => {
      const context = {
        userId: 'user-123',
        planTier: 'free' as const,
        subscriptionStatus: null,
        isTrialing: false,
        isCanceled: false,
      }

      const result = service.checkFeatureAccess(context, 'transcription', 5)

      expect(result.hasAccess).toBe(false)
      expect(result.upgradeRequired).toBeUndefined()
      expect(result.reason).toContain('Limite atteinte')
    })
  })

  describe('Constants Validation', () => {
    it('should have valid ACTIVE_SUBSCRIPTION_STATUSES', () => {
      expect(ACTIVE_SUBSCRIPTION_STATUSES).toContain('active')
      expect(ACTIVE_SUBSCRIPTION_STATUSES).toContain('trialing')
      expect(ACTIVE_SUBSCRIPTION_STATUSES).toHaveLength(2)
    })

    it('should have valid PLAN_PERMISSIONS structure', () => {
      expect(PLAN_PERMISSIONS).toHaveProperty('free')
      expect(PLAN_PERMISSIONS).toHaveProperty('junior')
      expect(PLAN_PERMISSIONS).toHaveProperty('basic')
      expect(PLAN_PERMISSIONS).toHaveProperty('pro')

      Object.values(PLAN_PERMISSIONS).forEach((plan) => {
        expect(plan).toHaveProperty('tier')
        expect(plan).toHaveProperty('displayName')
        expect(plan).toHaveProperty('features')
        expect(plan).toHaveProperty('priority')
        expect(typeof plan.priority).toBe('number')
      })
    })

    it('should have ascending priorities across plans', () => {
      expect(PLAN_PERMISSIONS.free.priority).toBe(0)
      expect(PLAN_PERMISSIONS.junior.priority).toBe(1)
      expect(PLAN_PERMISSIONS.basic.priority).toBe(2)
      expect(PLAN_PERMISSIONS.pro.priority).toBe(3)
    })
  })
})
