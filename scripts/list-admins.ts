import 'dotenv/config'
import { db } from '../src/server/lib/database'

async function listAdmins() {
  try {
    const admins = await db.user.findMany({
      where: {
        OR: [{ role: 'admin' }, { isRootAdmin: true }],
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isRootAdmin: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    if (admins.length === 0) {
      console.log('❌ No admin users found in the database')
    } else {
      console.log(`\n✅ Found ${admins.length} admin user(s):\n`)
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.email}`)
        console.log(`   ID: ${admin.id}`)
        console.log(`   Name: ${admin.name}`)
        console.log(`   Role: ${admin.role}`)
        console.log(`   Root Admin: ${admin.isRootAdmin}`)
        console.log(`   Created: ${admin.createdAt.toISOString()}`)
        console.log('')
      })
    }
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

listAdmins().catch(console.error)
