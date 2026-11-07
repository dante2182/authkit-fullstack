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

function sessionCookie(response: request.Response): string {
  const raw = response.headers['set-cookie'] as string | string[] | undefined
  const cookies = !raw ? [] : Array.isArray(raw) ? raw : [raw]
  const cookie = cookies.find((entry) => entry.startsWith('better-auth.session_token='))
  if (!cookie) throw new Error('La respuesta no incluye la cookie de sesión')
  return cookie.split(';')[0]!
}

async function register(): Promise<string> {
  const response = await request(app).post('/api/auth/sign-up/email').send(credentials)
  expect(response.status).toBe(200)
  return sessionCookie(response)
}

beforeEach(async () => {
  await resetDatabase()
})

describe('requireVerifiedEmail', () => {
  it('devuelve 401 sin sesión', async () => {
    const response = await request(app).get('/api/test/verified-only')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })

  it('devuelve 403 EMAIL_NOT_VERIFIED con sesión y email sin verificar', async () => {
    const cookie = await register()

    const response = await request(app).get('/api/test/verified-only').set('Cookie', cookie)

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('EMAIL_NOT_VERIFIED')
  })

  it('deja pasar con el email verificado', async () => {
    const cookie = await register()
    await prisma.user.updateMany({ data: { emailVerified: true } })

    const response = await request(app).get('/api/test/verified-only').set('Cookie', cookie)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true })
  })
})
