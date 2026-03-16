import 'dotenv/config'
import { hashPassword } from '../src/server/shared/utils/password.utils'
import { db } from '../src/server/lib/database'

async function resetAdminPassword() {
  const args = process.argv.slice(2)
  const email = args[0]
  const newPassword = args[1]

  if (!email || !newPassword) {
    console.error(
      'Usage: npx tsx scripts/reset-admin-password.ts <email> <newPassword>',
    )
    console.error(
      'Example: npx tsx scripts/reset-admin-password.ts admin@example.com NewPass123!',
    )
    process.exit(1)
  }

  try {
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isRootAdmin: true,
      },
    })

    if (!user) {
      console.error(`❌ User with email "${email}" not found`)
      process.exit(1)
    }

    console.log('\nUser found:')
    console.log(`  ID: ${user.id}`)
    console.log(`  Email: ${user.email}`)
    console.log(`  Name: ${user.name}`)
    console.log(`  Role: ${user.role}`)
    console.log(`  Root Admin: ${user.isRootAdmin}`)

    const hashedPassword = await hashPassword(newPassword)

    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    console.log('\n✅ Password successfully reset!')
    console.log(`\nYou can now sign in with:`)
    console.log(`  Email: ${user.email}`)
    console.log(`  Password: ${newPassword}`)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

resetAdminPassword().catch(console.error)
