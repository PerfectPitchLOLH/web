import 'dotenv/config'
import Stripe from 'stripe'

import { db } from '../src/server/lib/database'
import { STRIPE_PRICES } from '../src/lib/stripe.prices'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
  typescript: true,
})

const PLAN_CONFIGS = [
  {
    key: 'junior',
    name: 'Junior',
    description: 'Plan Junior avec 10 minutes de transcription par mois',
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
    transcriptionMinutes: 10,
    monthlyPriceId: STRIPE_PRICES.plans.junior.monthly,
    yearlyPriceId: STRIPE_PRICES.plans.junior.yearly,
  },
  {
    key: 'basic',
    name: 'Basic',
    description: 'Plan Basic avec 20 minutes de transcription par mois',
    monthlyPrice: 14.99,
    yearlyPrice: 149.99,
    transcriptionMinutes: 20,
    monthlyPriceId: STRIPE_PRICES.plans.basic.monthly,
    yearlyPriceId: STRIPE_PRICES.plans.basic.yearly,
  },
  {
    key: 'pro',
    name: 'Pro',
    description: 'Plan Pro avec 50 minutes de transcription par mois',
    monthlyPrice: 29.99,
    yearlyPrice: 299.99,
    transcriptionMinutes: 50,
    monthlyPriceId: STRIPE_PRICES.plans.pro.monthly,
    yearlyPriceId: STRIPE_PRICES.plans.pro.yearly,
  },
]

async function seedPlans() {
  console.log('Seeding subscription plans...\n')

  for (const config of PLAN_CONFIGS) {
    const stripePrice = await stripe.prices.retrieve(config.monthlyPriceId)
    const productId = stripePrice.product as string

    const plan = await db.subscriptionPlan.upsert({
      where: { stripeProductId: productId },
      update: {
        name: config.name,
        description: config.description,
        monthlyPrice: config.monthlyPrice,
        yearlyPrice: config.yearlyPrice,
        transcriptionMinutes: config.transcriptionMinutes,
        stripePriceId: config.monthlyPriceId,
        stripeYearlyPriceId: config.yearlyPriceId,
        isActive: true,
      },
      create: {
        stripeProductId: productId,
        stripePriceId: config.monthlyPriceId,
        stripeYearlyPriceId: config.yearlyPriceId,
        name: config.name,
        description: config.description,
        monthlyPrice: config.monthlyPrice,
        yearlyPrice: config.yearlyPrice,
        transcriptionMinutes: config.transcriptionMinutes,
        isActive: true,
      },
    })

    console.log(`✓ ${plan.name} (${productId})`)
  }

  console.log('\nDone.')
  await db.$disconnect()
}

seedPlans().catch(console.error)
