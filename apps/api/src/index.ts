import { app } from './app.js'
import { env } from './config/env.js'
import { prisma } from './config/prisma.js'
import { startSessionCleanup } from './modules/auth/session-cleanup.js'

// Tiempo máximo para cerrar HTTP y Prisma antes de forzar la salida.
const SHUTDOWN_TIMEOUT_MS = 10_000

const server = app.listen(env.PORT, () => {
  console.log(`API escuchando en http://localhost:${env.PORT}`)
})

// Limpieza periódica de sesiones expiradas (null en tests).
const cleanupTimer = startSessionCleanup()

let shuttingDown = false

// Apagado limpio: deja de aceptar peticiones, cierra HTTP y luego Postgres.
function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) return
  shuttingDown = true

  console.log(`[server] ${signal} recibido: cerrando...`)
  if (cleanupTimer) clearInterval(cleanupTimer)

  const forceExit = setTimeout(() => {
    console.error('[server] Cierre forzado: se agotó el tiempo de apagado')
    process.exit(1)
  }, SHUTDOWN_TIMEOUT_MS)
  forceExit.unref()

  server.close((error) => {
    void (async () => {
      if (error) console.error('[server] Error al cerrar HTTP:', error)

      await prisma.$disconnect().catch((disconnectError: unknown) => {
        console.error('[server] Error al desconectar Prisma:', disconnectError)
      })

      clearTimeout(forceExit)
      process.exit(error ? 1 : 0)
    })()
  })

  // Las conexiones keep-alive inactivas no deben retrasar el cierre.
  server.closeIdleConnections()
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => shutdown(signal))
}
