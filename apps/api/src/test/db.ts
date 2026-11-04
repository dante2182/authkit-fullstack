import { prisma } from '../config/prisma.js'

// Limpia todas las tablas entre tests sin recrear el esquema.
export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "user", "session", "account", "verification" RESTART IDENTITY CASCADE',
  )
}
