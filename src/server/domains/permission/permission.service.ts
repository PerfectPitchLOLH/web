import { db } from '@/server/lib/database'

import type { SubscriptionPlanTier } from '../subscription/subscription.types'
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  PLAN_PERMISSIONS,
} from './permission.constants'
import type {
  FeatureKey,
  PermissionCheckResult,
  PermissionContext,
} from './permission.types'

export class PermissionService {
  async getUserPermissionContext(userId: string): Promise<PermissionContext> {
    const subscription = await db.subscription.findFirst({
      where: {
        userId,
        status: { in: [...ACTIVE_SUBSCRIPTION_STATUSES] },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!subscription) {
      return {
        userId,
        planTier: 'free',
        subscriptionStatus: null,
        isTrialing: false,
        isCanceled: false,
      }
    }

    return {
      userId,
      planTier: subscription.plan.name.toLowerCase() as SubscriptionPlanTier,
      subscriptionStatus: subscription.status,
      isTrialing: subscription.status === 'trialing',
      isCanceled: subscription.cancelAtPeriodEnd,
    }
  }

  checkFeatureAccess(
    context: PermissionContext,
    feature: FeatureKey,
    currentUsage?: number,
  ): PermissionCheckResult {
    const planPermissions = PLAN_PERMISSIONS[context.planTier]
    const featureConfig = planPermissions.features[feature]

    if (!featureConfig.enabled) {
      const upgradeTarget = this.findMinimumPlanForFeature(feature)
      return {
        hasAccess: false,
        reason: `Fonctionnalité "${feature}" non disponible sur le plan ${planPermissions.displayName}`,
        upgradeRequired: upgradeTarget,
      }
    }

    if (featureConfig.limit && currentUsage !== undefined) {
      if (currentUsage >= featureConfig.limit) {
        return {
          hasAccess: false,
          reason: `Limite atteinte : ${currentUsage}/${featureConfig.limit} ${featureConfig.unit}`,
          currentLimit: featureConfig.limit,
          usedLimit: currentUsage,
        }
      }
    }

    return {
      hasAccess: true,
      currentLimit: featureConfig.limit,
      usedLimit: currentUsage,
    }
  }

  private findMinimumPlanForFeature(
    feature: FeatureKey,
  ): SubscriptionPlanTier | undefined {
    const plans = Object.entries(PLAN_PERMISSIONS)
      .filter(([key]) => key !== 'free')
      .map(([, plan]) => plan)
      .sort((a, b) => a.priority - b.priority)

    const targetPlan = plans.find((plan) => plan.features[feature].enabled)
    return targetPlan?.tier as SubscriptionPlanTier | undefined
  }

  async checkFeatureAccessForUser(
    userId: string,
    feature: FeatureKey,
    currentUsage?: number,
  ): Promise<PermissionCheckResult> {
    const context = await this.getUserPermissionContext(userId)
    return this.checkFeatureAccess(context, feature, currentUsage)
  }

  async getAvailableFeatures(
    userId: string,
  ): Promise<Record<FeatureKey, boolean>> {
    const context = await this.getUserPermissionContext(userId)
    const planPermissions = PLAN_PERMISSIONS[context.planTier]

    return Object.fromEntries(
      Object.entries(planPermissions.features).map(([key, config]) => [
        key,
        config.enabled,
      ]),
    ) as Record<FeatureKey, boolean>
  }

  async requireActiveSubscription(userId: string): Promise<boolean> {
    const context = await this.getUserPermissionContext(userId)
    return (
      context.subscriptionStatus !== null &&
      ACTIVE_SUBSCRIPTION_STATUSES.includes(context.subscriptionStatus as any)
    )
  }
}
