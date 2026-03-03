import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { Pool } from 'pg'

import { AdminRepository } from '../src/server/domains/admin/admin.repository'
import { AdminService } from '../src/server/domains/admin/admin.service'

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

async function testAdminAPI() {
  console.log('=== Test Admin API ===\n')

  try {
    const repository = new AdminRepository()
    const service = new AdminService(repository)

    console.log('Testing getUsers with filters:')
    console.log('  Filters: { page: 1, limit: 10 }\n')

    const result = await service.getUsers({
      page: 1,
      limit: 10,
    })

    console.log('Result:')
    console.log(`  Total users: ${result.total}`)
    console.log(`  Page: ${result.page}`)
    console.log(`  Limit: ${result.limit}`)
    console.log(`  Total pages: ${result.totalPages}`)
    console.log(`  Users returned: ${result.users.length}\n`)

    if (result.users.length > 0) {
      console.log('Users:')
      result.users.forEach((user, index) => {
        console.log(`\n  User ${index + 1}:`)
        console.log(`    ID: ${user.id}`)
        console.log(`    Email: ${user.email}`)
        console.log(`    Name: ${user.name}`)
        console.log(`    Role: ${user.role}`)
        console.log(`    Email Verified: ${user.emailVerified || 'No'}`)
      })
    } else {
      console.log('⚠️  No users returned!')
    }

    console.log('\n\n=== Testing with different filters ===\n')

    const testCases = [
      { role: 'admin' },
      { role: 'user' },
      { search: 'lucas' },
      { emailVerified: true },
      { emailVerified: false },
    ]

    for (const filters of testCases) {
      console.log(`Filters: ${JSON.stringify(filters)}`)
      const testResult = await service.getUsers({
        ...filters,
        page: 1,
        limit: 10,
      })
      console.log(`  Results: ${testResult.total} users\n`)
    }
  } catch (error) {
    console.error('❌ Error:', error)
    if (error instanceof Error) {
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testAdminAPI()
