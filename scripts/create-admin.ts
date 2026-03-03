import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { Pool } from 'pg'
import * as readline from 'readline'

import { hashPassword } from '../src/server/shared/utils/password.utils'

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

async function createAdmin() {
  console.log("=== Création d'un utilisateur administrateur ===\n")

  try {
    const email = await question("Email de l'admin: ")
    const name = await question('Nom complet: ')
    const password = await question('Mot de passe (min 8 caractères): ')

    if (!email || !name || !password) {
      console.error('❌ Tous les champs sont requis')
      process.exit(1)
    }

    if (password.length < 8) {
      console.error('❌ Le mot de passe doit contenir au moins 8 caractères')
      process.exit(1)
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    const existingRootAdmin = await prisma.user.findFirst({
      where: { isRootAdmin: true },
    })

    if (existingUser) {
      console.log('\n⚠️  Un utilisateur avec cet email existe déjà.')
      const update = await question('Mettre à jour son rôle en admin? (y/N): ')

      if (update.toLowerCase() === 'y') {
        let isRootAdmin = existingUser.isRootAdmin

        if (!existingRootAdmin && existingUser.role !== 'admin') {
          const makeRoot = await question(
            "Aucun root admin n'existe. Définir comme root admin? (Y/n): ",
          )
          isRootAdmin = makeRoot.toLowerCase() !== 'n'
        }

        await prisma.user.update({
          where: { email },
          data: {
            role: 'admin',
            isRootAdmin,
          },
        })
        console.log(
          `✅ Utilisateur mis à jour avec le rôle admin${isRootAdmin ? ' (Root Admin)' : ''}`,
        )
      } else {
        console.log('❌ Opération annulée')
      }
    } else {
      const hashedPassword = await hashPassword(password)

      const isRootAdmin = !existingRootAdmin

      if (isRootAdmin) {
        console.log(
          '\n🔐 Cet admin sera le Root Admin (premier administrateur)',
        )
      } else {
        console.log(
          '\n👤 Cet admin sera un Admin invité (le Root Admin existe déjà)',
        )
      }

      const admin = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: 'admin',
          isRootAdmin,
          emailVerified: new Date(),
        },
      })

      console.log('\n✅ Administrateur créé avec succès!')
      console.log('\nInformations:')
      console.log(`- ID: ${admin.id}`)
      console.log(`- Email: ${admin.email}`)
      console.log(`- Nom: ${admin.name}`)
      console.log(`- Rôle: ${admin.role}`)
      console.log(`- Root Admin: ${admin.isRootAdmin ? 'Oui' : 'Non'}`)
      console.log(`- Email vérifié: ${admin.emailVerified}`)
    }
  } catch (error) {
    console.error('❌ Erreur lors de la création:', error)
    process.exit(1)
  } finally {
    rl.close()
    await prisma.$disconnect()
  }
}

createAdmin()
