import 'dotenv/config'
import { creditService } from '../src/server/domains/credit'

async function testPurchaseBundle() {
  const userId = 'cmmae0nh60000gpy5uay9jn2w'

  console.log('=== TESTING BONUS CREDIT PURCHASES ===\n')

  console.log('--- BEFORE PURCHASES ---')
  let balance = await creditService.getUserCreditsBalance(userId)
  console.log(`Monthly credits: ${balance.monthlyCredits / 60} min`)
  console.log(`Bonus credits: ${balance.bonusCredits / 60} min`)
  console.log(`Total credits: ${balance.totalCredits / 60} min`)

  console.log('\n--- PURCHASING SMALL BUNDLE (5 min) ---')
  balance = await creditService.purchaseBundle(
    userId,
    'small',
    'test_invoice_small',
  )
  console.log(`✅ Small bundle purchased`)
  console.log(`Monthly credits: ${balance.monthlyCredits / 60} min`)
  console.log(`Bonus credits: ${balance.bonusCredits / 60} min`)
  console.log(`Total credits: ${balance.totalCredits / 60} min`)

  console.log('\n--- PURCHASING MEDIUM BUNDLE (15 min) ---')
  balance = await creditService.purchaseBundle(
    userId,
    'medium',
    'test_invoice_medium',
  )
  console.log(`✅ Medium bundle purchased`)
  console.log(`Monthly credits: ${balance.monthlyCredits / 60} min`)
  console.log(`Bonus credits: ${balance.bonusCredits / 60} min`)
  console.log(`Total credits: ${balance.totalCredits / 60} min`)

  console.log('\n--- PURCHASING LARGE BUNDLE (30 min) ---')
  balance = await creditService.purchaseBundle(
    userId,
    'big',
    'test_invoice_large',
  )
  console.log(`✅ Large bundle purchased`)
  console.log(`Monthly credits: ${balance.monthlyCredits / 60} min`)
  console.log(`Bonus credits: ${balance.bonusCredits / 60} min`)
  console.log(`Total credits: ${balance.totalCredits / 60} min`)

  console.log('\n=== VALIDATION ===')
  const expectedBonus = 5 + 15 + 30
  const actualBonus = balance.bonusCredits / 60

  if (actualBonus === expectedBonus) {
    console.log(
      `✅ Bonus credits correct: ${actualBonus} min (expected: ${expectedBonus} min)`,
    )
  } else {
    console.log(
      `❌ Bonus credits incorrect: ${actualBonus} min (expected: ${expectedBonus} min)`,
    )
  }

  if (balance.monthlyCredits === 1200) {
    console.log(
      `✅ Monthly credits unchanged: ${balance.monthlyCredits / 60} min`,
    )
  } else {
    console.log(
      `❌ Monthly credits changed: ${balance.monthlyCredits / 60} min (expected: 20 min)`,
    )
  }
}

testPurchaseBundle().catch(console.error)
