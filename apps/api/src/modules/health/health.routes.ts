import { Router } from 'express'
import { prisma } from '../../config/prisma.js'

// Una sonda no puede colgarse esperando a Postgres.
const DB_TIMEOUT_MS = 2_000

async function checkDatabase(): Promise<void> {
  let timer: NodeJS.Timeout | undefined

  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('DB timeout')), DB_TIMEOUT_MS)
        timer.unref()
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export const healthRouter: Router = Router()

healthRouter.get('/', async (_req, res) => {
  const startedAt = Date.now()

  try {
    await checkDatabase()
    res.json({
      status: 'ok',
      database: 'up',
      latencyMs: Date.now() - startedAt,
      uptimeSeconds: Math.round(process.uptime()),
    })
  } catch {
    res.status(503).json({
      status: 'unavailable',
      database: 'down',
      latencyMs: Date.now() - startedAt,
      uptimeSeconds: Math.round(process.uptime()),
    })
  }
})
