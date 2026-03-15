import 'dotenv/config'
import { db } from '@/server/lib/database'
import { notificationService } from '@/server/domains/notification'

async function main() {
  console.log('🧪 Test du système de notifications\n')

  const testUser = await db.user.findFirst()
  if (!testUser) {
    console.error('❌ Aucun utilisateur trouvé dans la base de données')
    return
  }

  console.log(
    `✅ Utilisateur de test trouvé: ${testUser.email} (${testUser.id})\n`,
  )

  console.log('📝 Création de notifications de test...')

  const notifications = [
    {
      userId: testUser.id,
      type: 'security' as const,
      title: 'Connexion depuis un nouvel appareil',
      description: 'Une connexion a été détectée depuis un nouvel appareil',
      icon: 'Shield',
      read: false,
    },
    {
      userId: testUser.id,
      type: 'activity' as const,
      title: 'Achat de crédits',
      description: 'Vous avez acheté 30 minutes de transcription',
      icon: 'Coins',
      read: false,
    },
    {
      userId: testUser.id,
      type: 'update' as const,
      title: 'Nouvelle fonctionnalité',
      description: 'Audio to sheet est maintenant disponible !',
      icon: 'Sparkles',
      read: true,
    },
    {
      userId: testUser.id,
      type: 'marketing' as const,
      title: 'Offre spéciale',
      description: 'Profitez de -20% sur tous nos packages',
      icon: 'Mail',
      read: false,
    },
    {
      userId: testUser.id,
      type: 'system' as const,
      title: 'Maintenance programmée',
      description: 'Une maintenance aura lieu ce weekend',
      icon: 'Bell',
      read: false,
    },
  ]

  for (const notif of notifications) {
    const created = await notificationService.createNotification(notif)
    console.log(`  ✅ Créé: "${created.title}" (${created.type})`)
  }

  console.log('\n📊 Récupération des notifications...')
  const result = await notificationService.getNotifications({
    userId: testUser.id,
  })

  console.log(`  Total: ${result.total}`)
  console.log(`  Non lues: ${result.unreadCount}`)
  console.log(`  Notifications:`)
  result.notifications.forEach((n) => {
    const status = n.read ? '✓' : '○'
    console.log(`    ${status} [${n.type}] ${n.title} (icône: ${n.icon})`)
  })

  console.log('\n✅ Test terminé avec succès!')
  console.log(
    "\n💡 Vous pouvez maintenant tester le frontend en ouvrant l'application",
  )
  console.log('   Les notifications devraient apparaître dans le popover')
}

main()
  .catch((error) => {
    console.error('❌ Erreur:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
