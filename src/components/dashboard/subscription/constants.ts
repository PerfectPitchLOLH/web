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
    monthlyPriceId:
      process.env.NEXT_PUBLIC_STRIPE_JUNIOR_MONTHLY_PRICE_ID ?? '',
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_JUNIOR_YEARLY_PRICE_ID ?? '',
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
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_BASIC_MONTHLY_PRICE_ID ?? '',
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_BASIC_YEARLY_PRICE_ID ?? '',
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
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ?? '',
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID ?? '',
  },
]
