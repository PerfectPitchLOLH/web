import { createHash } from 'crypto'
import { execSync } from 'child_process'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import pg from 'pg'

const { Client } = pg

async function warmUp(directUrl) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const client = new Client({
      connectionString: directUrl,
      connectionTimeoutMillis: 15000,
    })
    try {
      await client.connect()
      await client.query('SELECT 1')
      await client.end()
      return
    } catch {
      await client.end().catch(() => {})
      if (attempt < 5) {
        process.stdout.write(
          `DB not ready (attempt ${attempt}/5), retrying in 3s...\n`,
        )
        await new Promise((r) => setTimeout(r, 3000))
      }
    }
  }
  process.stdout.write(
    'DB warm-up failed after 5 attempts, proceeding anyway\n',
  )
}

async function resolveFailedMigrations(directUrl) {
  const client = new Client({
    connectionString: directUrl,
    connectionTimeoutMillis: 15000,
  })
  try {
    await client.connect()
    const { rows } = await client.query(
      `UPDATE "_prisma_migrations"
       SET rolled_back_at = NOW()
       WHERE finished_at IS NULL AND rolled_back_at IS NULL
       RETURNING migration_name`,
    )
    for (const row of rows) {
      process.stdout.write(`Resolved failed migration: ${row.migration_name}\n`)
    }
    await client.end()
  } catch (err) {
    process.stderr.write(
      `Warning: could not resolve failed migrations: ${err.message}\n`,
    )
    await client.end().catch(() => {})
  }
}

async function syncChecksums(directUrl) {
  const client = new Client({
    connectionString: directUrl,
    connectionTimeoutMillis: 15000,
  })
  try {
    await client.connect()
    const migrationsDir = join(
      new URL('.', import.meta.url).pathname,
      '../prisma/migrations',
    )
    const folders = readdirSync(migrationsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)

    for (const folder of folders) {
      const filePath = join(migrationsDir, folder, 'migration.sql')
      let content
      try {
        content = readFileSync(filePath, 'utf8')
      } catch {
        continue
      }
      const checksum = createHash('sha256').update(content).digest('hex')
      await client.query(
        `UPDATE "_prisma_migrations"
         SET checksum = $1
         WHERE migration_name = $2 AND checksum != $1 AND finished_at IS NOT NULL`,
        [checksum, folder],
      )
    }
    await client.end()
  } catch (err) {
    process.stderr.write(`Warning: could not sync checksums: ${err.message}\n`)
    await client.end().catch(() => {})
  }
}

async function migrate() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' })
      return
    } catch {
      if (attempt < 3) {
        process.stdout.write(
          `\nMigration failed (attempt ${attempt}/3), retrying in 10s...\n`,
        )
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
await resolveFailedMigrations(directUrl)
await syncChecksums(directUrl)
await migrate()
