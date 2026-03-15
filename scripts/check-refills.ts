import 'dotenv/config'
import { db } from '../src/server/lib/database'

async function checkRefills() {
  const userId = 'cmmae0nh60000gpy5uay9jn2w'

  const refills = await db.creditRefill.findMany({
    where: {
      userCreditsId: userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  console.log('=== CREDIT REFILL RECORDS ===\n')
  console.log(`Found ${refills.length} refill records:\n`)

  refills.forEach((refill) => {
    console.log(`- ${refill.stripeInvoiceId}`)
    console.log(`  Type: ${refill.type}`)
    console.log(`  Amount: ${refill.amount / 60} minutes`)
    console.log(`  Reason: ${refill.reason}`)
    console.log(`  Date: ${refill.createdAt}\n`)
  })

  if (refills.length > 0) {
    console.log(
      '⚠️  These refill records prevent duplicate credits from being granted.',
    )
    console.log(
      '   To test again, you need to use different payment reference IDs.\n',
    )
  }

  await db.$disconnect()
}

checkRefills().catch(console.error)
