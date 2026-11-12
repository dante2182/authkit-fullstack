import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.js'
import { prisma } from '../../config/prisma.js'
import { resetDatabase } from '../../test/db.js'

const credentials = {
  name: 'Test User',
  email: 'user@example.com',
  password: 'SuperSecret123!',
}

function getCookies(response: request.Response): string[] {
  const raw = response.headers['set-cookie'] as string | string[] | undefined
  if (!raw) return []
  return Array.isArray(raw) ? raw : [raw]
}

async function registerAndGetCookie(): Promise<string> {
  const response = await request(app).post('/api/auth/sign-up/email').send(credentials)
  const cookie = getCookies(response).find((entry) =>
    entry.startsWith('better-auth.session_token='),
  )
  if (!cookie) throw new Error('La respuesta no incluye la cookie de sesión')
  return cookie.split(';')[0]!
}

beforeEach(async () => {
  await resetDatabase()
})

describe('GET /api/users/me', () => {
  it('requiere sesión', async () => {
    const response = await request(app).get('/api/users/me')
    expect(response.status).toBe(401)
  })

  it('devuelve el usuario autenticado sin datos de la cuenta', async () => {
    const cookie = await registerAndGetCookie()

    const response = await request(app).get('/api/users/me').set('Cookie', cookie)

    expect(response.status).toBe(200)
    expect(response.body.user.email).toBe(credentials.email)
    expect(response.body.user).not.toHaveProperty('password')
  })
})

describe('PATCH /api/users/me', () => {
  it('actualiza el nombre', async () => {
    const cookie = await registerAndGetCookie()

    const response = await request(app)
      .patch('/api/users/me')
      .set('Cookie', cookie)
      .send({ name: 'Nombre Nuevo' })

    expect(response.status).toBe(200)
    expect(response.body.user.name).toBe('Nombre Nuevo')
  })

  it('rechaza datos inválidos con 422', async () => {
    const cookie = await registerAndGetCookie()

    const response = await request(app)
      .patch('/api/users/me')
      .set('Cookie', cookie)
      .send({ name: '' })

    expect(response.status).toBe(422)
  })
})

describe('DELETE /api/users/me', () => {
  it('borra la cuenta, sus sesiones y expira la cookie', async () => {
    const cookie = await registerAndGetCookie()

    const response = await request(app)
      .delete('/api/users/me')
      .set('Cookie', cookie)
      .send({ password: credentials.password })

    expect(response.status).toBe(204)
    expect(getCookies(response).some((entry) => /Max-Age=0/i.test(entry))).toBe(true)
    expect(await prisma.user.count()).toBe(0)
    expect(await prisma.session.count()).toBe(0)

    const after = await request(app).get('/api/users/me').set('Cookie', cookie)
    expect(after.status).toBe(401)
  })

  it('exige la contraseña actual', async () => {
    const cookie = await registerAndGetCookie()

    const response = await request(app).delete('/api/users/me').set('Cookie', cookie)

    expect(response.status).toBe(422)
    expect(await prisma.user.count()).toBe(1)
  })

  it('rechaza una contraseña incorrecta sin borrar nada', async () => {
    const cookie = await registerAndGetCookie()

    const response = await request(app)
      .delete('/api/users/me')
      .set('Cookie', cookie)
      .send({ password: 'ContraseñaEquivocada123!' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_PASSWORD')
    expect(await prisma.user.count()).toBe(1)
    expect(await prisma.session.count()).toBe(1)
  })

  it('requiere sesión', async () => {
    const response = await request(app).delete('/api/users/me')
    expect(response.status).toBe(401)
  })
})
