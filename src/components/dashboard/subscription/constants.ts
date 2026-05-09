import type { SubscriptionFeatures } from '@/server/domains/subscription/subscription.types'

export const TIER_ORDER: Record<string, number> = {
  junior: 0,
  basic: 1,
  pro: 2,
}

export type TierUIMetadata = {
  popular: boolean
  highlight: string | null
  features: Omit<SubscriptionFeatures, 'transcriptionMinutes'>
}

export const TIER_UI_METADATA: Record<string, TierUIMetadata> = {
  junior: {
    popular: false,
    highlight: null,
    features: {
      fallingNotes: true,
      historyDays: 30,
      sheetEditor: false,
      polyphony: false,
    },
  },
  basic: {
    popular: true,
    highlight: 'Plus populaire',
    features: {
      fallingNotes: true,
      historyDays: 90,
      sheetEditor: false,
      polyphony: false,
    },
  },
  pro: {
    popular: false,
    highlight: 'Meilleure valeur',
    features: {
      fallingNotes: true,
      historyDays: 'unlimited' as const,
      sheetEditor: true,
      polyphony: true,
    },
  },
}
