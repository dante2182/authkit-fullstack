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

function sessionCookie(response: request.Response): string {
  const cookie = getCookies(response).find((entry) =>
    entry.startsWith('better-auth.session_token='),
  )
  if (!cookie) throw new Error('La respuesta no incluye la cookie de sesión')
  return cookie.split(';')[0]!
}

beforeEach(async () => {
  await resetDatabase()
})

describe('POST /api/auth/sign-up/email', () => {
  it('devuelve una cookie httpOnly y el usuario creado', async () => {
    const response = await request(app).post('/api/auth/sign-up/email').send(credentials)

    expect(response.status).toBe(200)
    const cookies = getCookies(response)
    expect(cookies.some((cookie) => cookie.startsWith('better-auth.session_token='))).toBe(true)
    expect(cookies.some((cookie) => /HttpOnly/i.test(cookie))).toBe(true)
    expect(response.body.user.email).toBe(credentials.email)
  })

  it('rechaza datos inválidos con 400', async () => {
    const response = await request(app)
      .post('/api/auth/sign-up/email')
      .send({ ...credentials, email: 'no-es-un-email', password: '123' })

    expect(response.status).toBe(400)
    expect(response.body.code).toBe('VALIDATION_ERROR')
  })

  it('rechaza un email duplicado sin crear otro usuario ni otra sesión', async () => {
    const first = await request(app).post('/api/auth/sign-up/email').send(credentials)
    expect(first.status).toBe(200)

    const second = await request(app).post('/api/auth/sign-up/email').send(credentials)

    expect(second.status).toBe(422)
    expect(second.headers['set-cookie']).toBeUndefined()
    expect(await prisma.user.count({ where: { email: credentials.email } })).toBe(1)
    expect(await prisma.session.count()).toBe(1)
  })
})

describe('acceso a rutas protegidas', () => {
  it('solo funciona con la cookie emitida en el registro', async () => {
    const register = await request(app).post('/api/auth/sign-up/email').send(credentials)
    const cookie = sessionCookie(register)

    const withoutCookie = await request(app).get('/api/users/me')
    expect(withoutCookie.status).toBe(401)

    const withCookie = await request(app).get('/api/users/me').set('Cookie', cookie)
    expect(withCookie.status).toBe(200)
    expect(withCookie.body.user.email).toBe(credentials.email)
  })

  it('rechaza una cookie falsificada', async () => {
    const response = await request(app)
      .get('/api/users/me')
      .set('Cookie', 'better-auth.session_token=forged.signature')

    expect(response.status).toBe(401)
  })

  it('rechaza una sesión expirada', async () => {
    const register = await request(app).post('/api/auth/sign-up/email').send(credentials)
    const cookie = sessionCookie(register)

    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 60_000) } })

    const response = await request(app).get('/api/users/me').set('Cookie', cookie)
    expect(response.status).toBe(401)
  })
})

describe('POST /api/auth/sign-in/email', () => {
  it('inicia sesión y emite cookie', async () => {
    await request(app).post('/api/auth/sign-up/email').send(credentials)

    const response = await request(app)
      .post('/api/auth/sign-in/email')
      .send({ email: credentials.email, password: credentials.password })

    expect(response.status).toBe(200)
    expect(sessionCookie(response)).toContain('better-auth.session_token=')
    expect(response.body.user.email).toBe(credentials.email)
  })

  it('rechaza una contraseña incorrecta', async () => {
    await request(app).post('/api/auth/sign-up/email').send(credentials)

    const response = await request(app)
      .post('/api/auth/sign-in/email')
      .send({ email: credentials.email, password: 'WrongPassword123!' })

    expect(response.status).toBe(401)
    expect(response.body.code).toBe('INVALID_EMAIL_OR_PASSWORD')
  })

  it('rechaza datos inválidos con 400', async () => {
    const response = await request(app)
      .post('/api/auth/sign-in/email')
      .send({ email: 'no-es-un-email' })

    expect(response.status).toBe(400)
  })
})

describe('POST /api/auth/sign-out', () => {
  it('expira la cookie y la sesión deja de servir', async () => {
    const register = await request(app).post('/api/auth/sign-up/email').send(credentials)
    const cookie = sessionCookie(register)

    const logout = await request(app).post('/api/auth/sign-out').set('Cookie', cookie)

    expect(logout.status).toBe(200)
    expect(getCookies(logout).some((entry) => /Max-Age=0/i.test(entry))).toBe(true)
    expect(await prisma.session.count()).toBe(0)

    const after = await request(app).get('/api/users/me').set('Cookie', cookie)
    expect(after.status).toBe(401)
  })

  it('funciona sin cookie (sesión ya expirada) y expira la cookie igualmente', async () => {
    const logout = await request(app).post('/api/auth/sign-out')

    expect(logout.status).toBe(200)
    expect(getCookies(logout).some((entry) => /Max-Age=0/i.test(entry))).toBe(true)
  })
})
