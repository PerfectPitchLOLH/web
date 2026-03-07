import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-02-25.clover',
  typescript: true,
})

export const STRIPE_CONFIG = {
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  priceIds: {
    juniorMonthly: process.env.STRIPE_JUNIOR_MONTHLY_PRICE_ID ?? '',
    juniorYearly: process.env.STRIPE_JUNIOR_YEARLY_PRICE_ID ?? '',
    advancedMonthly: process.env.STRIPE_ADVANCED_MONTHLY_PRICE_ID ?? '',
    advancedYearly: process.env.STRIPE_ADVANCED_YEARLY_PRICE_ID ?? '',
    proMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? '',
    proYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID ?? '',
  },
} as const
