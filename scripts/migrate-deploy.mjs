import { execSync } from 'child_process'
import pg from 'pg'

const { Client } = pg

async function warmUp(directUrl) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const client = new Client({ connectionString: directUrl, connectionTimeoutMillis: 15000 })
    try {
      await client.connect()
      await client.query('SELECT 1')
      await client.end()
      return
    } catch {
      await client.end().catch(() => {})
      if (attempt < 5) {
        process.stdout.write(`DB not ready (attempt ${attempt}/5), retrying in 3s...\n`)
        await new Promise((r) => setTimeout(r, 3000))
      }
    }
  }
  process.stdout.write('DB warm-up failed after 5 attempts, proceeding anyway\n')
}

async function migrate() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' })
      return
    } catch {
      if (attempt < 3) {
        process.stdout.write(`\nMigration failed (attempt ${attempt}/3), retrying in 10s...\n`)
        await new Promise((r) => setTimeout(r, 10000))
      } else {
        process.exit(1)
      }
    }
  }
}

const directUrl = process.env.DIRECT_URL
if (!directUrl) {
  process.stderr.write('DIRECT_URL env var is required for migrations\n')
  process.exit(1)
}

await warmUp(directUrl)
await migrate()
