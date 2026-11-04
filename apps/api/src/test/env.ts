import { config as loadDotenv } from 'dotenv'
import { z } from 'zod'

// Carga .env.test sin pisar variables ya definidas por CI o por el runner.
loadDotenv({ path: '.env.test', quiet: true })

const testEnvSchema = z.object({
  TEST_DATABASE_URL: z.url(),
})

const parsed = testEnvSchema.safeParse(process.env)

if (!parsed.success) {
  throw new Error(
    'Falta TEST_DATABASE_URL. Copia apps/api/.env.test.example a apps/api/.env.test y apunta a una base de datos de test.\n' +
      z.prettifyError(parsed.error),
  )
}

// El test no debe poder tocar la base real: nombre de base con "test" y distinta de DATABASE_URL.
function assertSafeTestDatabase(rawUrl: string): string {
  const url = new URL(rawUrl)
  const databaseName = decodeURIComponent(url.pathname.slice(1))

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Los tests no se ejecutan con NODE_ENV=production')
  }
  if (!databaseName.toLowerCase().includes('test')) {
    throw new Error(
      `TEST_DATABASE_URL apunta a "${databaseName}": el nombre de la base debe contener "test"`,
    )
  }
  if (process.env.DATABASE_URL && process.env.DATABASE_URL === rawUrl) {
    throw new Error('TEST_DATABASE_URL no puede ser igual a DATABASE_URL')
  }

  return rawUrl
}

export const TEST_DATABASE_URL = assertSafeTestDatabase(parsed.data.TEST_DATABASE_URL)

export function isLocalHost(rawUrl: string): boolean {
  const hostname = new URL(rawUrl).hostname
  return hostname === 'localhost' || hostname === '127.0.0.1'
}
