import 'dotenv/config'
import { db } from '../src/server/lib/database'

async function checkCredits() {
  const credits = await db.userCredits.findMany({
    include: {
      creditRefills: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  })

  console.log('=== USER CREDITS ===')
  credits.forEach((c) => {
    console.log(`\nUser: ${c.userId}`)
    console.log(
      `Monthly Credits: ${c.monthlyCredits / 60} min (${c.monthlyCredits} sec)`,
    )
    console.log(
      `Bonus Credits: ${c.bonusCredits / 60} min (${c.bonusCredits} sec)`,
    )
    console.log(`Used This Month: ${c.usedThisMonth / 60} min`)
    console.log(`Last Refill: ${c.lastMonthlyRefill}`)
    console.log(`\nRefills (latest 5):`)
    c.creditRefills.forEach((r) => {
      console.log(
        `  - ${r.type}: ${r.amount / 60} min | Invoice: ${r.stripeInvoiceId} | ${r.createdAt}`,
      )
    })
  })

  const subscriptions = await db.subscription.findMany({
    include: {
      plan: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
  })

  console.log('\n=== SUBSCRIPTIONS ===')
  subscriptions.forEach((s) => {
    console.log(`\nSub ID: ${s.id}`)
    console.log(`User: ${s.userId}`)
    console.log(`Plan: ${s.plan.name} (${s.plan.transcriptionMinutes} min)`)
    console.log(`Status: ${s.status}`)
    console.log(`Stripe: ${s.stripeSubscriptionId}`)
  })

  await db.$disconnect()
}

checkCredits().catch(console.error)
