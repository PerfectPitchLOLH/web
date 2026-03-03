import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import { Pool } from 'pg'

dotenv.config({ path: '.env' })

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function setRootAdmin() {
  try {
    const rootAdminEmail = 'admin@notavex.com'

    const user = await prisma.user.findUnique({
      where: { email: rootAdminEmail },
    })

    if (!user) {
      console.error(`❌ User ${rootAdminEmail} not found in database`)
      console.log(
        '\nPlease create this user first by signing up at /auth/signup',
      )
      process.exit(1)
    }

    const updatedUser = await prisma.user.update({
      where: { email: rootAdminEmail },
      data: {
        isRootAdmin: true,
        role: 'admin',
      },
    })

    console.log(`✅ Successfully set ${rootAdminEmail} as root admin`)
    console.log(`User ID: ${updatedUser.id}`)
    console.log(`Role: ${updatedUser.role}`)
    console.log(`Is Root Admin: ${updatedUser.isRootAdmin}`)
  } catch (error) {
    console.error('❌ Error setting root admin:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

setRootAdmin()
