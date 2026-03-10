import 'dotenv/config'
import { creditService } from '../src/server/domains/credit'

async function consumeCredits() {
  const userId = process.argv[2]
  const minutes = parseInt(process.argv[3], 10)

  if (!userId || !minutes) {
    console.error(
      'Usage: npx tsx scripts/consume-credits.ts <userId> <minutes>',
    )
    process.exit(1)
  }

  try {
    console.log(`Consuming ${minutes} minutes for user ${userId}...`)
    const result = await creditService.deductCredits(
      userId,
      minutes,
      'Test consumption',
    )
    console.log('Success!')
    console.log(`Monthly credits: ${result.monthlyCredits / 60} min`)
    console.log(`Bonus credits: ${result.bonusCredits / 60} min`)
    console.log(`Used this month: ${result.usedThisMonth / 60} min`)
    console.log(`Remaining: ${result.remainingCredits / 60} min`)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

consumeCredits()
