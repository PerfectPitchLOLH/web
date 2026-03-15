import 'dotenv/config'
import { creditService } from '../src/server/domains/credit'

async function testPurchaseBundle() {
  const userId = 'cmmae0nh60000gpy5uay9jn2w'
  const timestamp = Date.now()

  console.log('=== TESTING BONUS CREDIT PURCHASES WITH UNIQUE IDs ===\n')

  console.log('--- BEFORE PURCHASES ---')
  let balance = await creditService.getUserCreditsBalance(userId)
  console.log(`Monthly credits: ${balance.monthlyCredits / 60} min`)
  console.log(`Bonus credits: ${balance.bonusCredits / 60} min`)
  console.log(`Total credits: ${balance.totalCredits / 60} min`)
  const initialBonus = balance.bonusCredits / 60

  console.log('\n--- PURCHASING SMALL BUNDLE (5 min) ---')
  balance = await creditService.purchaseBundle(
    userId,
    'small',
    `test_small_${timestamp}`,
  )
  console.log(`✅ Small bundle purchased`)
  console.log(`Bonus credits: ${balance.bonusCredits / 60} min`)

  console.log('\n--- PURCHASING MEDIUM BUNDLE (15 min) ---')
  balance = await creditService.purchaseBundle(
    userId,
    'medium',
    `test_medium_${timestamp}`,
  )
  console.log(`✅ Medium bundle purchased`)
  console.log(`Bonus credits: ${balance.bonusCredits / 60} min`)

  console.log('\n--- PURCHASING BIG BUNDLE (30 min) ---')
  balance = await creditService.purchaseBundle(
    userId,
    'big',
    `test_big_${timestamp}`,
  )
  console.log(`✅ Big bundle purchased`)
  console.log(`Bonus credits: ${balance.bonusCredits / 60} min`)

  console.log('\n=== VALIDATION ===')
  const expectedBonus = initialBonus + 5 + 15 + 30
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

  console.log(`\n💡 Payment reference IDs used (unique for this test run):`)
  console.log(`   - test_small_${timestamp}`)
  console.log(`   - test_medium_${timestamp}`)
  console.log(`   - test_big_${timestamp}`)
}

testPurchaseBundle().catch(console.error)
