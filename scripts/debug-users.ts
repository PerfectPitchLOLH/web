import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { Pool } from 'pg'

config()

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set')
  process.exit(1)
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function debugUsers() {
  console.log('=== Debug Users ===\n')

  try {
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log(`Total users in database: ${allUsers.length}\n`)

    allUsers.forEach((user, index) => {
      console.log(`User ${index + 1}:`)
      console.log(`  ID: ${user.id}`)
      console.log(`  Email: ${user.email}`)
      console.log(`  Name: ${user.name}`)
      console.log(`  Role: ${user.role}`)
      console.log(
        `  Email Verified: ${user.emailVerified ? user.emailVerified.toISOString() : 'No'}`,
      )
      console.log(`  Created: ${user.createdAt.toISOString()}`)
      console.log('')
    })

    const adminUsers = allUsers.filter((u) => u.role === 'admin')
    const regularUsers = allUsers.filter((u) => u.role === 'user')

    console.log(`\nSummary:`)
    console.log(`  Admin users: ${adminUsers.length}`)
    console.log(`  Regular users: ${regularUsers.length}`)
    console.log(`  Total: ${allUsers.length}`)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

debugUsers()
