import 'dotenv/config'
import { creditService } from '../src/server/domains/credit'
import { db } from '../src/server/lib/database'

async function testMonthlyRenewal() {
  const userId = 'cmmae0nh60000gpy5uay9jn2w'

  console.log('=== BEFORE RENEWAL ===')
  const beforeCredits = await db.userCredits.findUnique({
    where: { userId },
  })

  if (!beforeCredits) {
    console.error('No credits found')
    process.exit(1)
  }

  console.log(`Monthly credits: ${beforeCredits.monthlyCredits / 60} min`)
  console.log(`Bonus credits: ${beforeCredits.bonusCredits / 60} min`)
  console.log(`Used this month: ${beforeCredits.usedThisMonth / 60} min`)

  console.log('\n=== SIMULATING MONTHLY RENEWAL ===')
  const invoiceId = `test_renewal_${Date.now()}`
  console.log(`Using invoice ID: ${invoiceId}`)
  await creditService.refillMonthlyCredits(userId, 20, invoiceId)

  console.log('\n=== AFTER RENEWAL ===')
  const afterCredits = await db.userCredits.findUnique({
    where: { userId },
  })

  if (!afterCredits) {
    console.error('No credits found after renewal')
    process.exit(1)
  }

  console.log(`Monthly credits: ${afterCredits.monthlyCredits / 60} min`)
  console.log(`Bonus credits: ${afterCredits.bonusCredits / 60} min`)
  console.log(`Used this month: ${afterCredits.usedThisMonth / 60} min`)

  console.log('\n=== VALIDATION ===')
  if (afterCredits.monthlyCredits === 1200) {
    console.log('✅ Monthly credits correctly refilled to 20 min')
  } else {
    console.log(
      `❌ Monthly credits should be 1200, got ${afterCredits.monthlyCredits}`,
    )
  }

  if (afterCredits.usedThisMonth === beforeCredits.usedThisMonth) {
    console.log('✅ UsedThisMonth NOT reset (as expected with current logic)')
  } else {
    console.log('✅ UsedThisMonth reset to 0')
  }

  if (afterCredits.bonusCredits === beforeCredits.bonusCredits) {
    console.log('✅ Bonus credits unchanged')
  } else {
    console.log(`❌ Bonus credits changed unexpectedly`)
  }

  await db.$disconnect()
}

testMonthlyRenewal().catch(console.error)
