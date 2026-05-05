import { STRIPE_PRICES } from '@/lib/stripe.prices'

export const TIER_ORDER: Record<string, number> = {
  junior: 0,
  basic: 1,
  pro: 2,
}

export type PricingTierData = {
  key: string
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  popular?: boolean
  highlight?: string
  features: {
    transcriptionMinutes: number
    fallingNotes: boolean
    historyDays: number | 'unlimited'
    sheetEditor: boolean
    polyphony: boolean
  }
  monthlyPriceId: string
  yearlyPriceId: string
}

export const PRICING_TIERS: PricingTierData[] = [
  {
    key: 'junior',
    name: 'Junior',
    description: 'Parfait pour débuter avec la transcription musicale',
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
    features: {
      transcriptionMinutes: 10,
      fallingNotes: true,
      historyDays: 30,
      sheetEditor: false,
      polyphony: false,
    },
    monthlyPriceId: STRIPE_PRICES.plans.junior.monthly,
    yearlyPriceId: STRIPE_PRICES.plans.junior.yearly,
  },
  {
    key: 'basic',
    name: 'Basic',
    description: 'Idéal pour les musiciens réguliers',
    monthlyPrice: 14.99,
    yearlyPrice: 149.99,
    popular: true,
    highlight: 'Plus populaire',
    features: {
      transcriptionMinutes: 20,
      fallingNotes: true,
      historyDays: 90,
      sheetEditor: false,
      polyphony: false,
    },
    monthlyPriceId: STRIPE_PRICES.plans.basic.monthly,
    yearlyPriceId: STRIPE_PRICES.plans.basic.yearly,
  },
  {
    key: 'pro',
    name: 'Pro',
    description: 'La puissance complète pour les professionnels',
    monthlyPrice: 29.99,
    yearlyPrice: 299.99,
    highlight: 'Meilleure valeur',
    features: {
      transcriptionMinutes: 50,
      fallingNotes: true,
      historyDays: 'unlimited',
      sheetEditor: true,
      polyphony: true,
    },
    monthlyPriceId: STRIPE_PRICES.plans.pro.monthly,
    yearlyPriceId: STRIPE_PRICES.plans.pro.yearly,
  },
]
