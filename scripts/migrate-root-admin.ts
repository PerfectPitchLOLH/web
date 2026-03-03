import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { Pool } from 'pg'

config()

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set')
  console.error('   Créez un fichier .env avec DATABASE_URL')
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

async function migrateRootAdmin() {
  console.log('=== Migration Root Admin ===\n')

  try {
    const existingRootAdmin = await prisma.user.findFirst({
      where: { isRootAdmin: true },
    })

    if (existingRootAdmin) {
      console.log('✅ Un Root Admin existe déjà:')
      console.log(`   - ID: ${existingRootAdmin.id}`)
      console.log(`   - Email: ${existingRootAdmin.email}`)
      console.log(`   - Nom: ${existingRootAdmin.name}`)
      console.log('\n⚠️  Aucune migration nécessaire.')
      return
    }

    const firstAdmin = await prisma.user.findFirst({
      where: { role: 'admin' },
      orderBy: { createdAt: 'asc' },
    })

    if (!firstAdmin) {
      console.log('⚠️  Aucun administrateur trouvé dans la base de données.')
      console.log(
        '   Utilisez le script create-admin.ts pour créer un Root Admin.',
      )
      return
    }

    console.log('📋 Premier administrateur trouvé:')
    console.log(`   - ID: ${firstAdmin.id}`)
    console.log(`   - Email: ${firstAdmin.email}`)
    console.log(`   - Nom: ${firstAdmin.name}`)
    console.log(
      `   - Créé le: ${firstAdmin.createdAt.toLocaleDateString('fr-FR')}`,
    )

    await prisma.user.update({
      where: { id: firstAdmin.id },
      data: { isRootAdmin: true },
    })

    console.log('\n✅ Migration réussie!')
    console.log(
      `   ${firstAdmin.email} est maintenant défini comme Root Admin.`,
    )

    const allAdmins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: {
        id: true,
        email: true,
        name: true,
        isRootAdmin: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    console.log('\n📊 Liste des administrateurs:')
    allAdmins.forEach((admin) => {
      const badge = admin.isRootAdmin ? '👑 Root Admin' : '🔐 Admin invité'
      console.log(`   - ${admin.email} (${admin.name}) - ${badge}`)
    })
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

migrateRootAdmin()
