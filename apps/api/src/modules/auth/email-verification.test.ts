import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../../app.js'
import { prisma } from '../../config/prisma.js'
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

function lastEmailUrl(): string {
  const call = send.mock.calls.at(-1)
  if (!call) throw new Error('No se envió ningún correo')

  const url = call[0].text.match(/https?:\/\/\S+/)?.[0]
  if (!url) throw new Error('El correo no contiene una URL')

  return url
}

beforeEach(async () => {
  await resetDatabase()
  send.mockClear()
})

describe('registro con verificación de email', () => {
  it('envía el correo de verificación sin bloquear el login', async () => {
    const response = await request(app).post('/api/auth/sign-up/email').send(credentials)

    expect(response.status).toBe(200)
    expect(response.headers['set-cookie']).toBeDefined()
    expect(send).toHaveBeenCalledTimes(1)

    const url = lastEmailUrl()
    expect(url).toContain('/api/auth/verify-email?token=')

    const user = await prisma.user.findUniqueOrThrow({ where: { email: credentials.email } })
    expect(user.emailVerified).toBe(false)
  })

  it('marca el email como verificado al abrir el enlace', async () => {
    await request(app).post('/api/auth/sign-up/email').send(credentials)
    const token = new URL(lastEmailUrl()).searchParams.get('token')
    expect(token).toBeTruthy()

    const response = await request(app)
      .get('/api/auth/verify-email')
      .query({ token, callbackURL: 'http://localhost:5173/verify-email' })

    expect(response.status).toBe(302)
    expect(response.headers.location).toContain('http://localhost:5173/verify-email')

    const user = await prisma.user.findUniqueOrThrow({ where: { email: credentials.email } })
    expect(user.emailVerified).toBe(true)
  })

  it('permite reenviar el correo de verificación', async () => {
    await request(app).post('/api/auth/sign-up/email').send(credentials)
    send.mockClear()

    const response = await request(app)
      .post('/api/auth/send-verification-email')
      .send({ email: credentials.email })

    expect(response.status).toBe(200)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('rechaza verify-email sin token con 400', async () => {
    const response = await request(app).get('/api/auth/verify-email')
    expect(response.status).toBe(400)
  })

  it('redirige con error si el token no es válido', async () => {
    const response = await request(app)
      .get('/api/auth/verify-email')
      .query({ token: 'token-invalido', callbackURL: 'http://localhost:5173/verify-email' })

    expect(response.status).toBe(302)
    expect(response.headers.location).toContain('error=INVALID_TOKEN')
  })

  it('ignora un callbackURL manipulado: redirige siempre a CORS_ORIGIN', async () => {
    await request(app).post('/api/auth/sign-up/email').send(credentials)
    const token = new URL(lastEmailUrl()).searchParams.get('token')

    const response = await request(app)
      .get('/api/auth/verify-email')
      .query({ token, callbackURL: 'https://evil.example/phishing' })

    expect(response.status).toBe(302)
    expect(response.headers.location).toBe('http://localhost:5173/verify-email')
    expect(response.headers.location).not.toContain('evil.example')
  })

  it('el enlace de reenvío apunta al endpoint nativo de verificación', async () => {
    await request(app).post('/api/auth/sign-up/email').send(credentials)
    send.mockClear()

    const response = await request(app)
      .post('/api/auth/send-verification-email')
      .send({ email: credentials.email, callbackURL: 'https://evil.example/phishing' })

    expect(response.status).toBe(200)
    // El callbackURL del correo se ignora al abrir el enlace: app.ts lo reescribe al origen configurado antes de llegar al handler nativo.
    const emailUrl = new URL(lastEmailUrl())
    const token = emailUrl.searchParams.get('token')
    expect(token).toBeTruthy()

    const opened = await request(app)
      .get('/api/auth/verify-email')
      .query({ token, callbackURL: 'https://evil.example/phishing' })

    expect(opened.status).toBe(302)
    expect(opened.headers.location).toBe('http://localhost:5173/verify-email')
  })

  it('no rompe el registro si el envío del correo falla', async () => {
    send.mockRejectedValueOnce(new Error('Resend caído'))

    const response = await request(app).post('/api/auth/sign-up/email').send(credentials)

    expect(response.status).toBe(200)
    expect(response.headers['set-cookie']).toBeDefined()
  })
})
