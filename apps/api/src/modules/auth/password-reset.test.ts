import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../../app.js'
import { emailService } from '../../shared/email/email.service.js'
import { resetDatabase } from '../../test/db.js'

vi.mock('../../shared/email/email.service.js', () => ({
  emailService: { send: vi.fn().mockResolvedValue(undefined) },
}))

const send = vi.mocked(emailService.send)

const credentials = {
  name: 'Test User',
  email: 'user@example.com',
  password: 'SuperSecret123!',
}

const newPassword = 'NewPassword456!'

function lastEmail() {
  const call = send.mock.calls.at(-1)
  if (!call) throw new Error('No se envió ningún correo')
  return call[0]
}

function lastEmailUrl(): string {
  const url = lastEmail().text.match(/https?:\/\/\S+/)?.[0]
  if (!url) throw new Error('El correo no contiene una URL')
  return url
}

async function registerAndGetCookie(): Promise<string> {
  const response = await request(app).post('/api/auth/sign-up/email').send(credentials)
  const raw = response.headers['set-cookie'] as string | string[] | undefined
  const cookies = !raw ? [] : Array.isArray(raw) ? raw : [raw]
  const cookie = cookies.find((entry) => entry.startsWith('better-auth.session_token='))
  if (!cookie) throw new Error('La respuesta no incluye la cookie de sesión')

  send.mockClear()
  return cookie.split(';')[0]!
}

async function requestResetToken(): Promise<string> {
  const response = await request(app)
    .post('/api/auth/request-password-reset')
    .send({ email: credentials.email })

  expect(response.status).toBe(200)

  const token = new URL(lastEmailUrl()).pathname.split('/').pop()
  if (!token) throw new Error('El enlace de reset no incluye token')

  return token
}

beforeEach(async () => {
  await resetDatabase()
  send.mockClear()
})

describe('POST /api/auth/request-password-reset', () => {
  it('envía un correo con enlace de reset', async () => {
    await request(app).post('/api/auth/sign-up/email').send(credentials)
    send.mockClear()

    const response = await request(app)
      .post('/api/auth/request-password-reset')
      .send({ email: credentials.email })

    expect(response.status).toBe(200)
    expect(send).toHaveBeenCalledTimes(1)
    expect(lastEmail()).toMatchObject({ to: credentials.email })
    expect(lastEmailUrl()).toContain('/api/auth/reset-password/')
  })

  it('el enlace del correo redirige al frontend con el token', async () => {
    await request(app).post('/api/auth/sign-up/email').send(credentials)
    send.mockClear()

    await request(app)
      .post('/api/auth/request-password-reset')
      .send({ email: credentials.email, redirectTo: 'https://evil.example/phishing' })

    const emailUrl = lastEmailUrl()
    const response = await request(app).get(new URL(emailUrl).pathname + new URL(emailUrl).search)

    expect(response.status).toBe(302)
    expect(response.headers.location).toContain('http://localhost:5173/reset-password?token=')
    expect(response.headers.location).not.toContain('evil.example')
  })

  it('responde genérico y no envía nada si el email no existe', async () => {
    const response = await request(app)
      .post('/api/auth/request-password-reset')
      .send({ email: 'nadie@example.com' })

    expect(response.status).toBe(200)
    expect(response.body.status).toBe(true)
    expect(send).not.toHaveBeenCalled()
  })

  it('rechaza un email inválido con 400', async () => {
    const response = await request(app)
      .post('/api/auth/request-password-reset')
      .send({ email: 'no-es-un-email' })

    expect(response.status).toBe(400)
  })

  it('responde 200 aunque el envío del correo falle', async () => {
    await request(app).post('/api/auth/sign-up/email').send(credentials)
    send.mockClear()
    send.mockRejectedValueOnce(new Error('Resend caído'))

    const response = await request(app)
      .post('/api/auth/request-password-reset')
      .send({ email: credentials.email })

    expect(response.status).toBe(200)
  })
})

describe('POST /api/auth/reset-password', () => {
  it('cambia la contraseña, revoca las sesiones y deja usar la nueva', async () => {
    const cookie = await registerAndGetCookie()
    const token = await requestResetToken()

    const reset = await request(app).post('/api/auth/reset-password').send({ token, newPassword })
    expect(reset.status).toBe(200)

    const oldSession = await request(app).get('/api/users/me').set('Cookie', cookie)
    expect(oldSession.status).toBe(401)

    const oldLogin = await request(app)
      .post('/api/auth/sign-in/email')
      .send({ email: credentials.email, password: credentials.password })
    expect(oldLogin.status).toBe(401)

    const newLogin = await request(app)
      .post('/api/auth/sign-in/email')
      .send({ email: credentials.email, password: newPassword })
    expect(newLogin.status).toBe(200)
  })

  it('rechaza un token inválido', async () => {
    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'token-invalido', newPassword })

    expect(response.status).toBe(400)
  })

  it('rechaza una contraseña demasiado corta con 400', async () => {
    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'token-cualquiera', newPassword: '123' })

    expect(response.status).toBe(400)
  })
})
