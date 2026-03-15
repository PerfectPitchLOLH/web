import 'dotenv/config'
import { db } from '../src/server/lib/database'

async function checkSubscription() {
  const userId = 'cmmae0nh60000gpy5uay9jn2w'

  const subscription = await db.subscription.findFirst({
    where: {
      userId,
      status: { in: ['active', 'trialing'] },
    },
    include: {
      plan: true,
    },
  })

  console.log('=== SUBSCRIPTION CHECK ===\n')
  console.log('User ID:', userId)
  console.log('Has active subscription:', subscription ? 'Yes' : 'No')

  if (subscription) {
    console.log('Plan:', subscription.plan.name)
    console.log('Status:', subscription.status)
    console.log(
      'Transcription minutes:',
      subscription.plan.transcriptionMinutes,
    )
  } else {
    console.log(
      '\n⚠️  No active subscription found. The user needs an active subscription to purchase credits.',
    )
  }

  await db.$disconnect()
}

checkSubscription().catch(console.error)
