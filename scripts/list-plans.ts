import 'dotenv/config'
import { db } from '../src/server/lib/database'

async function listPlans() {
  const allPlans = await db.subscriptionPlan.findMany({
    orderBy: { transcriptionMinutes: 'asc' },
  })

  const plans = allPlans.filter((p) => p.stripePriceId !== null)

  console.log('=== SUBSCRIPTION PLANS ===\n')
  plans.forEach((p) => {
    console.log(
      `${p.name.padEnd(20)} | ${String(p.transcriptionMinutes).padStart(3)} min | ${p.stripePriceId}`,
    )
  })

  await db.$disconnect()
}

listPlans().catch(console.error)
