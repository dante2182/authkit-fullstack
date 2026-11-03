import { app } from './app.js'
import { env } from './config/env.js'
import { prisma } from './config/prisma.js'
import { startSessionCleanup } from './modules/auth/session-cleanup.js'

const server = app.listen(env.PORT, () => {
  console.log(`API escuchando en http://localhost:${env.PORT}`)
})

// Limpieza periódica de sesiones expiradas (null en tests).
const cleanupTimer = startSessionCleanup()

// Apagado limpio: cierra HTTP y luego la conexión a Postgres.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    if (cleanupTimer) clearInterval(cleanupTimer)
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0))
    })
  })
}
