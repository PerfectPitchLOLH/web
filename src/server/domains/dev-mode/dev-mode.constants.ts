import { PLAN_FEATURES } from '@/server/domains/subscription/subscription.constants'

import type { DevModePreset } from './dev-mode.types'

export const DEV_MODE_COOKIE_NAME = 'dev_mode_config' as const

export const DEV_MODE_MAX_DURATION_MS = 24 * 60 * 60 * 1000

export const DEV_MODE_PRESETS: DevModePreset[] = [
  {
    id: 'free-user',
    name: 'Utilisateur gratuit',
    description: 'Utilisateur sans abonnement actif',
    config: {
      subscription: {
        tier: 'junior',
        status: 'canceled',
        billingInterval: 'month',
        features: {
          transcriptionMinutes: 0,
          fallingNotes: false,
          historyDays: 7,
          sheetEditor: false,
          polyphony: false,
        },
      },
      credits: {
        available: 0,
      },
    },
  },
  {
    id: 'junior-active',
    name: 'Junior actif',
    description: 'Abonnement Junior actif (mensuel)',
    config: {
      subscription: {
        tier: 'junior',
        status: 'active',
        billingInterval: 'month',
        features: PLAN_FEATURES.junior,
      },
      credits: {
        available: 50,
      },
    },
  },
  {
    id: 'basic-active',
    name: 'Basic actif',
    description: 'Abonnement Basic actif (mensuel)',
    config: {
      subscription: {
        tier: 'basic',
        status: 'active',
        billingInterval: 'month',
        features: PLAN_FEATURES.basic,
      },
      credits: {
        available: 100,
      },
    },
  },
  {
    id: 'pro-active',
    name: 'Pro actif',
    description: 'Abonnement Pro actif (annuel)',
    config: {
      subscription: {
        tier: 'pro',
        status: 'active',
        billingInterval: 'year',
        features: PLAN_FEATURES.pro,
      },
      credits: {
        available: 500,
      },
    },
  },
  {
    id: 'pro-trial',
    name: 'Pro en essai',
    description: "Abonnement Pro en période d'essai",
    config: {
      subscription: {
        tier: 'pro',
        status: 'trialing',
        billingInterval: 'month',
        features: PLAN_FEATURES.pro,
      },
      credits: {
        available: 100,
      },
    },
  },
  {
    id: 'basic-expired',
    name: 'Basic expiré',
    description: 'Abonnement Basic expiré (past_due)',
    config: {
      subscription: {
        tier: 'basic',
        status: 'past_due',
        billingInterval: 'month',
        features: PLAN_FEATURES.basic,
      },
      credits: {
        available: 0,
      },
    },
  },
  {
    id: 'pro-low-credits',
    name: 'Pro - crédits faibles',
    description: 'Abonnement Pro avec peu de crédits restants',
    config: {
      subscription: {
        tier: 'pro',
        status: 'active',
        billingInterval: 'year',
        features: PLAN_FEATURES.pro,
      },
      credits: {
        available: 5,
      },
    },
  },
]

export const DEFAULT_DEV_MODE_CONFIG: DevModePreset['config'] = {
  subscription: {
    tier: 'junior',
    status: 'active',
    billingInterval: 'month',
    features: PLAN_FEATURES.junior,
  },
  credits: {
    available: 50,
  },
}
