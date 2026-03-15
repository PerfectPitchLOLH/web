import 'dotenv/config'
import { db } from '../src/server/lib/database'

async function getTestUser() {
  const user = await db.user.findFirst({
    select: {
      id: true,
      email: true,
      name: true,
    },
  })

  if (user) {
    console.log(JSON.stringify(user, null, 2))
  } else {
    console.log('No user found')
  }

  await db.$disconnect()
}

getTestUser().catch(console.error)
