import { env } from '../../config/env.js'
import { prisma } from '../../config/prisma.js'

const MINUTE_MS = 60_000

// better-auth no purga sesiones expiradas: sin esto la tabla `session` crece sin límite.
export async function deleteExpiredSessions(): Promise<number> {
  const { count } = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  return count
}

async function runCleanup(): Promise<void> {
  try {
    const deleted = await deleteExpiredSessions()
    console.log(`[session-cleanup] ${deleted} sesión(es) expirada(s) eliminada(s)`)
  } catch (error) {
    // Un fallo de limpieza no debe tumbar el proceso.
    console.error('[session-cleanup] Error al eliminar sesiones expiradas:', error)
  }
}

// Limpia al arrancar y luego cada SESSION_CLEANUP_INTERVAL_MINUTES con setInterval:
// una única tarea diaria no necesita cron ni concurrencia.
export function startSessionCleanup(): NodeJS.Timeout | null {
  if (env.NODE_ENV === 'test') return null

  void runCleanup()

  const intervalMs = env.SESSION_CLEANUP_INTERVAL_MINUTES * MINUTE_MS
  const timer = setInterval(() => void runCleanup(), intervalMs)
  // No mantiene vivo el proceso por sí solo; el servidor HTTP ya lo hace.
  timer.unref()
  return timer
}
