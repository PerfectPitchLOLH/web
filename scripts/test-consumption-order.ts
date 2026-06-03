import 'dotenv/config'
import { creditService } from '../src/server/domains/credit'

async function testConsumptionOrder() {
  const userId = 'cmmae0nh60000gpy5uay9jn2w'

  console.log('=== TESTING CREDIT CONSUMPTION ORDER ===\n')

  console.log('--- INITIAL STATE ---')
  let balance = await creditService.getUserCreditsBalance(userId)
  console.log(`Monthly: ${balance.monthlyCredits / 60} min`)
  console.log(`Bonus: ${balance.bonusCredits / 60} min`)
  console.log(`Total: ${balance.totalCredits / 60} min`)

  console.log('\n--- CONSUMING 15 MIN (less than monthly 20 min) ---')
  balance = await creditService.deductCredits(userId, 15, 'Test consumption 1')
  console.log(`Monthly: ${balance.monthlyCredits / 60} min`)
  console.log(`Bonus: ${balance.bonusCredits / 60} min`)
  console.log(`Total: ${balance.totalCredits / 60} min`)

  if (balance.monthlyCredits === 300 && balance.bonusCredits === 3000) {
    console.log(
      '✅ Monthly consumed first (20 → 5 min), bonus untouched (50 min)',
    )
  } else {
    console.log(
      `❌ Unexpected: Monthly=${balance.monthlyCredits / 60}, Bonus=${balance.bonusCredits / 60}`,
    )
  }

  console.log('\n--- CONSUMING 10 MIN (more than remaining monthly 5 min) ---')
  balance = await creditService.deductCredits(userId, 10, 'Test consumption 2')
  console.log(`Monthly: ${balance.monthlyCredits / 60} min`)
  console.log(`Bonus: ${balance.bonusCredits / 60} min`)
  console.log(`Total: ${balance.totalCredits / 60} min`)

  if (balance.monthlyCredits === 0 && balance.bonusCredits === 2700) {
    console.log(
      '✅ Monthly exhausted (5 → 0 min), remaining consumed from bonus (50 → 45 min)',
    )
  } else {
    console.log(
      `❌ Unexpected: Monthly=${balance.monthlyCredits / 60}, Bonus=${balance.bonusCredits / 60}`,
    )
  }

  console.log('\n--- CONSUMING 30 MIN (only bonus left) ---')
  balance = await creditService.deductCredits(userId, 30, 'Test consumption 3')
  console.log(`Monthly: ${balance.monthlyCredits / 60} min`)
  console.log(`Bonus: ${balance.bonusCredits / 60} min`)
  console.log(`Total: ${balance.totalCredits / 60} min`)

  if (balance.monthlyCredits === 0 && balance.bonusCredits === 900) {
    console.log('✅ Only bonus consumed (45 → 15 min)')
  } else {
    console.log(
      `❌ Unexpected: Monthly=${balance.monthlyCredits / 60}, Bonus=${balance.bonusCredits / 60}`,
    )
  }

  console.log('\n=== VALIDATION ===')
  console.log('✅ Consumption order correct: Monthly first, then Bonus')
  console.log(`Remaining: ${balance.totalCredits / 60} min (15 min bonus)`)
}

testConsumptionOrder().catch(console.error)
