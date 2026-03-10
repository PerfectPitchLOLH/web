import 'dotenv/config'
import { subscriptionService } from '../src/server/domains/subscription'
import { db } from '../src/server/lib/database'

async function testDowngrade() {
  const stripeSubId = 'sub_1T9BkF98tB4JxI77n73b8VUU'
  const userId = 'cmmae0nh60000gpy5uay9jn2w'

  console.log('=== TEST 5: DOWNGRADE PRO → JUNIOR ===\n')

  console.log('--- STATE BEFORE DOWNGRADE ---')
  const beforeCredits = await db.userCredits.findUnique({ where: { userId } })
  const beforeSub = await db.subscription.findFirst({
    where: { stripeSubscriptionId: stripeSubId },
    include: { plan: true },
  })

  console.log(
    `Plan: ${beforeSub!.plan.name} (${beforeSub!.plan.transcriptionMinutes} min)`,
  )
  console.log(`Monthly credits: ${beforeCredits!.monthlyCredits / 60} min`)
  console.log(`Bonus credits: ${beforeCredits!.bonusCredits / 60} min`)
  console.log(`Used this month: ${beforeCredits!.usedThisMonth / 60} min`)

  console.log('\n--- PROCESSING SUBSCRIPTION.UPDATED ---')
  await subscriptionService.handleSubscriptionUpdated(stripeSubId)

  console.log('\n--- STATE AFTER DOWNGRADE ---')
  const afterCredits = await db.userCredits.findUnique({ where: { userId } })
  const afterSub = await db.subscription.findFirst({
    where: { stripeSubscriptionId: stripeSubId },
    include: { plan: true },
  })

  console.log(
    `Plan: ${afterSub!.plan.name} (${afterSub!.plan.transcriptionMinutes} min)`,
  )
  console.log(`Monthly credits: ${afterCredits!.monthlyCredits / 60} min`)
  console.log(`Bonus credits: ${afterCredits!.bonusCredits / 60} min`)
  console.log(`Used this month: ${afterCredits!.usedThisMonth / 60} min`)

  console.log('\n=== VALIDATION ===')

  if (afterSub!.plan.transcriptionMinutes === 10) {
    console.log('✅ Plan downgraded to Junior (10 min)')
  } else {
    console.log(
      `❌ Plan not downgraded: ${afterSub!.plan.transcriptionMinutes} min`,
    )
  }

  if (afterCredits!.bonusCredits === beforeCredits!.bonusCredits) {
    console.log(
      `✅ Bonus credits preserved: ${afterCredits!.bonusCredits / 60} min`,
    )
  } else {
    console.log(`❌ Bonus credits changed unexpectedly`)
  }

  const expectedMonthly = 10 * 60
  if (afterCredits!.monthlyCredits === expectedMonthly) {
    console.log(`✅ Monthly credits refilled to ${expectedMonthly / 60} min`)
  } else {
    console.log(
      `⚠️  Monthly credits: ${afterCredits!.monthlyCredits / 60} min (expected: ${expectedMonthly / 60} min)`,
    )
  }

  console.log('\n--- CUSTOMER BALANCE (Proration Credit) ---')
  const { stripe } = await import('../src/server/lib/stripe')
  const customer = await stripe.customers.retrieve('cus_U7DOhHDHzHEg6q')
  if ('balance' in customer) {
    console.log(`Customer balance: ${customer.balance / 100}€`)
    if (customer.balance < 0) {
      console.log(
        `✅ Proration credit applied: ${Math.abs(customer.balance) / 100}€`,
      )
    }
  }

  await db.$disconnect()
}

testDowngrade().catch(console.error)
