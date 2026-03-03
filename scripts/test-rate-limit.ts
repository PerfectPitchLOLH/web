const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function testRateLimit() {
  console.log('🧪 Test du Rate Limiting sur les routes admin\n')
  console.log(`URL de test: ${API_URL}/api/admin/stats\n`)

  console.log(
    'Envoi de 105 requêtes pour dépasser la limite de 100/minute...\n',
  )

  let successCount = 0
  let rateLimitedCount = 0
  let errorCount = 0

  for (let i = 1; i <= 105; i++) {
    try {
      const response = await fetch(`${API_URL}/api/admin/stats`)

      if (response.status === 200) {
        successCount++
        if (i % 10 === 0) {
          console.log(`✅ Requête ${i}: Success (200)`)
        }
      } else if (response.status === 429) {
        rateLimitedCount++
        const data = await response.json()
        const headers = response.headers

        console.log(`\n⛔ Requête ${i}: Rate Limited (429)`)
        console.log(`   Message: ${data.message}`)
        console.log(`   Limit: ${headers.get('X-RateLimit-Limit')}`)
        console.log(`   Remaining: ${headers.get('X-RateLimit-Remaining')}`)
        console.log(`   Retry-After: ${headers.get('Retry-After')} secondes\n`)

        if (rateLimitedCount === 1) {
          console.log('✅ Rate limiting fonctionne correctement!\n')
        }
      } else {
        errorCount++
        console.log(`❌ Requête ${i}: Erreur ${response.status}`)
      }
    } catch (error) {
      errorCount++
      console.log(`❌ Requête ${i}: Erreur réseau`)
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  console.log('\n📊 Résultats du test:')
  console.log(`   Succès: ${successCount}`)
  console.log(`   Rate Limited: ${rateLimitedCount}`)
  console.log(`   Erreurs: ${errorCount}`)

  if (rateLimitedCount > 0) {
    console.log('\n✅ Le rate limiting fonctionne correctement!')
    console.log(
      `   ${successCount} requêtes acceptées avant d'atteindre la limite`,
    )
  } else {
    console.log('\n⚠️  Le rate limiting ne semble pas actif')
    console.log('   Vérifiez que:')
    console.log('   - UPSTASH_REDIS_REST_URL est configuré dans .env')
    console.log('   - UPSTASH_REDIS_REST_TOKEN est configuré dans .env')
    console.log('   - Le serveur de développement est démarré')
  }
}

testRateLimit().catch(console.error)
