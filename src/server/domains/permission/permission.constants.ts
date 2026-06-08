import type { FeatureLimits, PlanPermissions } from './permission.types'

function deepFreeze<T>(obj: T): T {
  Object.freeze(obj)
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const value = (obj as any)[prop]
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value)
    }
  })
  return obj
}

const FREE_FEATURES: FeatureLimits = {
  transcription: { enabled: true, limit: 3, unit: 'minutes' },
  falling_notes: { enabled: true },
  history_access: { enabled: true, limit: 7, unit: 'days' },
  sheet_editor: { enabled: false },
  polyphony: { enabled: false },
  export_pdf: { enabled: false },
  export_midi: { enabled: false },
  export_musicxml: { enabled: false },
  ai_recommendations: { enabled: false },
  collaboration: { enabled: false },
  api_access: { enabled: false },
  priority_support: { enabled: false },
  custom_branding: { enabled: false },
}

const JUNIOR_FEATURES: FeatureLimits = {
  transcription: { enabled: true, limit: 10, unit: 'minutes' },
  falling_notes: { enabled: true },
  history_access: { enabled: true, limit: 30, unit: 'days' },
  sheet_editor: { enabled: false },
  polyphony: { enabled: false },
  export_pdf: { enabled: false },
  export_midi: { enabled: false },
  export_musicxml: { enabled: false },
  ai_recommendations: { enabled: false },
  collaboration: { enabled: false },
  api_access: { enabled: false },
  priority_support: { enabled: false },
  custom_branding: { enabled: false },
}

const BASIC_FEATURES: FeatureLimits = {
  transcription: { enabled: true, limit: 20, unit: 'minutes' },
  falling_notes: { enabled: true },
  history_access: { enabled: true, limit: 90, unit: 'days' },
  sheet_editor: { enabled: false },
  polyphony: { enabled: false },
  export_pdf: { enabled: false },
  export_midi: { enabled: false },
  export_musicxml: { enabled: false },
  ai_recommendations: { enabled: true },
  collaboration: { enabled: false },
  api_access: { enabled: false },
  priority_support: { enabled: false },
  custom_branding: { enabled: false },
}

const PRO_FEATURES: FeatureLimits = {
  transcription: { enabled: true, limit: 50, unit: 'minutes' },
  falling_notes: { enabled: true },
  history_access: { enabled: true },
  sheet_editor: { enabled: false },
  polyphony: { enabled: true },
  export_pdf: { enabled: false },
  export_midi: { enabled: false },
  export_musicxml: { enabled: false },
  ai_recommendations: { enabled: true },
  collaboration: { enabled: false },
  api_access: { enabled: false },
  priority_support: { enabled: true },
  custom_branding: { enabled: true },
}

export const PLAN_PERMISSIONS: Record<
  'free' | 'junior' | 'basic' | 'pro',
  PlanPermissions
> = deepFreeze({
  free: {
    tier: 'free',
    displayName: 'Gratuit',
    features: FREE_FEATURES,
    priority: 0,
  },
  junior: {
    tier: 'junior',
    displayName: 'Junior',
    features: JUNIOR_FEATURES,
    priority: 1,
  },
  basic: {
    tier: 'basic',
    displayName: 'Basic',
    features: BASIC_FEATURES,
    priority: 2,
  },
  pro: {
    tier: 'pro',
    displayName: 'Pro',
    features: PRO_FEATURES,
    priority: 3,
  },
})

export const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing'] as const

export const FEATURE_DISPLAY_NAMES: Record<
  import('./permission.types').FeatureKey,
  string
> = {
  transcription: 'Transcription audio',
  falling_notes: 'Notes tombantes',
  history_access: 'Accès historique',
  sheet_editor: 'Éditeur de partitions',
  polyphony: 'Support polyphonique',
  export_pdf: 'Export PDF',
  export_midi: 'Export MIDI',
  export_musicxml: 'Export MusicXML',
  ai_recommendations: 'Recommandations IA',
  collaboration: 'Collaboration',
  api_access: 'Accès API',
  priority_support: 'Support prioritaire',
  custom_branding: 'Branding personnalisé',
}
