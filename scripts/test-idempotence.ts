import 'dotenv/config'
import { creditService } from '../src/server/domains/credit'
import { db } from '../src/server/lib/database'

async function testIdempotence() {
  const userId = 'cmmae0nh60000gpy5uay9jn2w'
  const invoiceId = 'test_idempotence_invoice'

  console.log('=== TESTING IDEMPOTENCE ===\n')

  console.log('--- INITIAL STATE ---')
  const before = await db.userCredits.findUnique({ where: { userId } })
  console.log(`Monthly: ${before!.monthlyCredits / 60} min`)
  console.log(`Bonus: ${before!.bonusCredits / 60} min`)

  console.log('\n--- FIRST REFILL (should succeed) ---')
  await creditService.refillMonthlyCredits(userId, 20, invoiceId)
  const after1 = await db.userCredits.findUnique({ where: { userId } })
  console.log(`Monthly: ${after1!.monthlyCredits / 60} min`)
  console.log(`Bonus: ${after1!.bonusCredits / 60} min`)

  console.log('\n--- SECOND REFILL (same invoice, should be skipped) ---')
  await creditService.refillMonthlyCredits(userId, 20, invoiceId)
  const after2 = await db.userCredits.findUnique({ where: { userId } })
  console.log(`Monthly: ${after2!.monthlyCredits / 60} min`)
  console.log(`Bonus: ${after2!.bonusCredits / 60} min`)

  console.log('\n--- THIRD REFILL (same invoice again, should be skipped) ---')
  await creditService.refillMonthlyCredits(userId, 20, invoiceId)
  const after3 = await db.userCredits.findUnique({ where: { userId } })
  console.log(`Monthly: ${after3!.monthlyCredits / 60} min`)
  console.log(`Bonus: ${after3!.bonusCredits / 60} min`)

  console.log('\n=== VALIDATION ===')

  if (
    after1!.monthlyCredits === after2!.monthlyCredits &&
    after2!.monthlyCredits === after3!.monthlyCredits
  ) {
    console.log(
      '✅ Idempotence works: Credits NOT added multiple times for same invoice',
    )
  } else {
    console.log('❌ Idempotence FAILED: Credits added multiple times!')
  }

  const refills = await db.creditRefill.findMany({
    where: { stripeInvoiceId: invoiceId },
  })
  console.log(`✅ Refill records for invoice: ${refills.length} (should be 1)`)

  if (refills.length === 1) {
    console.log('✅ Only one refill record created (idempotent)')
  } else {
    console.log(`❌ Multiple refill records: ${refills.length}`)
  }

  console.log('\n--- TEST BONUS IDEMPOTENCE ---')
  const bonusBefore = after3!.bonusCredits
  const bonusInvoice = 'test_bonus_idempotence'

  await creditService.purchaseBundle(userId, 'small', bonusInvoice)
  const afterBonus1 = await db.userCredits.findUnique({ where: { userId } })
  console.log(`Bonus after 1st purchase: ${afterBonus1!.bonusCredits / 60} min`)

  await creditService.purchaseBundle(userId, 'small', bonusInvoice)
  const afterBonus2 = await db.userCredits.findUnique({ where: { userId } })
  console.log(
    `Bonus after 2nd purchase (same invoice): ${afterBonus2!.bonusCredits / 60} min`,
  )

  if (afterBonus1!.bonusCredits === afterBonus2!.bonusCredits) {
    console.log('✅ Bonus purchase idempotence works')
  } else {
    console.log('❌ Bonus purchase idempotence FAILED')
  }

  await db.$disconnect()
}

testIdempotence().catch(console.error)
