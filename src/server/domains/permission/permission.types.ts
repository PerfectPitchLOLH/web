import type { SubscriptionPlanTier } from '../subscription/subscription.types'

export type FeatureKey =
  | 'transcription'
  | 'falling_notes'
  | 'history_access'
  | 'sheet_editor'
  | 'polyphony'
  | 'export_pdf'
  | 'export_midi'
  | 'export_musicxml'
  | 'ai_recommendations'
  | 'collaboration'
  | 'api_access'
  | 'priority_support'
  | 'custom_branding'

export type FeatureLimit = {
  enabled: boolean
  limit?: number
  unit?: 'minutes' | 'days' | 'files' | 'users'
}

export type FeatureLimits = Record<FeatureKey, FeatureLimit>

export type PlanPermissions = {
  tier: SubscriptionPlanTier | 'free'
  displayName: string
  features: FeatureLimits
  priority: number
}

export type PermissionCheckResult = {
  hasAccess: boolean
  reason?: string
  upgradeRequired?: SubscriptionPlanTier
  currentLimit?: number
  usedLimit?: number
}

export type PermissionContext = {
  userId: string
  planTier: SubscriptionPlanTier | 'free'
  subscriptionStatus: string | null
  isTrialing: boolean
  isCanceled: boolean
}
