import 'dotenv/config'
import { hashPassword } from '../src/server/shared/utils/password.utils'
import { db } from '../src/server/lib/database'

async function createAdmin() {
  const email = process.argv[2]
  const password = process.argv[3]
  const name = process.argv[4] ?? 'Admin'

  if (!email || !password) {
    console.error(
      'Usage: npx tsx scripts/create-admin.ts <email> <password> [name]',
    )
    process.exit(1)
  }

  try {
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      console.error(`❌ User "${email}" already exists`)
      process.exit(1)
    }

    const hashedPassword = await hashPassword(password)

    const user = await db.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'admin',
        isRootAdmin: true,
        emailVerified: new Date(),
      },
    })

    console.log('\n✅ Admin created successfully!')
    console.log(`  ID: ${user.id}`)
    console.log(`  Email: ${user.email}`)
    console.log(`  Name: ${user.name}`)
    console.log(`  Role: ${user.role}`)
    console.log(`  Root Admin: ${user.isRootAdmin}`)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

createAdmin().catch(console.error)
