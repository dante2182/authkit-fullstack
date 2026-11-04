import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma.js'
import { resetDatabase } from '../../test/db.js'
import { deleteExpiredSessions, startSessionCleanup } from './session-cleanup.js'

async function createUser(): Promise<string> {
  const user = await prisma.user.create({
    data: {
      id: 'user-1',
      name: 'Test User',
      email: 'user@example.com',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  return user.id
}

function sessionData(id: string, userId: string, expiresAt: Date) {
  return {
    id,
    token: `token-${id}`,
    userId,
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

beforeEach(async () => {
  await resetDatabase()
})

describe('deleteExpiredSessions', () => {
  it('elimina solo las sesiones expiradas', async () => {
    const userId = await createUser()

    await prisma.session.createMany({
      data: [
        sessionData('expired-1', userId, new Date(Date.now() - 60_000)),
        sessionData('expired-2', userId, new Date(Date.now() - 120_000)),
        sessionData('valid-1', userId, new Date(Date.now() + 60_000)),
      ],
    })

    const deleted = await deleteExpiredSessions()

    expect(deleted).toBe(2)
    const remaining = await prisma.session.findMany({ select: { id: true } })
    expect(remaining).toEqual([{ id: 'valid-1' }])
  })

  it('devuelve 0 cuando no hay nada que borrar', async () => {
    await createUser()
    await expect(deleteExpiredSessions()).resolves.toBe(0)
  })
})

describe('startSessionCleanup', () => {
  it('no arranca la tarea periódica en el entorno de test', () => {
    expect(startSessionCleanup()).toBeNull()
  })
})
