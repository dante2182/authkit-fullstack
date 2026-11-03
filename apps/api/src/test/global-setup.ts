import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'
import { isLocalHost, TEST_DATABASE_URL } from './env.js'

const API_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

// Crea la base de test si no existe. Se conecta a la base de mantenimiento `postgres`
// con las mismas credenciales, así que el rol necesita permiso CREATEDB.
async function ensureDatabaseExists(): Promise<void> {
  const url = new URL(TEST_DATABASE_URL)
  const databaseName = decodeURIComponent(url.pathname.slice(1))
  const maintenanceUrl = new URL(TEST_DATABASE_URL)
  maintenanceUrl.pathname = '/postgres'

  const client = new Client({
    connectionString: maintenanceUrl.toString(),
    ...(isLocalHost(TEST_DATABASE_URL) ? {} : { ssl: { rejectUnauthorized: false } }),
  })

  await client.connect()

  try {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      databaseName,
    ])

    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`)
    }
  } finally {
    await client.end()
  }
}

// Aplica las migraciones a la base de test con migrate deploy (nunca migrate dev).
function migrateTestDatabase(): void {
  // execSync usa el shell del sistema: necesario para resolver pnpm.cmd en Windows.
  execSync('pnpm exec prisma migrate deploy', {
    cwd: API_ROOT,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  })
}

export default async function globalSetup(): Promise<void> {
  await ensureDatabaseExists()
  migrateTestDatabase()
}
