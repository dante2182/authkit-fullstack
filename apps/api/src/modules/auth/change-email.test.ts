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

const newEmail = 'nuevo@example.com'

function sessionCookie(response: request.Response): string {
  const raw = response.headers['set-cookie'] as string | string[] | undefined
  const cookies = !raw ? [] : Array.isArray(raw) ? raw : [raw]
  const cookie = cookies.find((entry) => entry.startsWith('better-auth.session_token='))
  if (!cookie) throw new Error('La respuesta no incluye la cookie de sesión')
  return cookie.split(';')[0]!
}

function lastEmailUrl(): string {
  const call = send.mock.calls.at(-1)
  if (!call) throw new Error('No se envió ningún correo')

  const url = call[0].text.match(/https?:\/\/\S+/)?.[0]
  if (!url) throw new Error('El correo no contiene una URL')

  return url
}

async function registerVerifiedUser(): Promise<string> {
  const response = await request(app).post('/api/auth/sign-up/email').send(credentials)
  expect(response.status).toBe(200)

  await prisma.user.update({
    where: { email: credentials.email },
    data: { emailVerified: true },
  })

  return sessionCookie(response)
}

function requestChange(cookie: string, email = newEmail) {
  return request(app)
    .post('/api/auth/change-email')
    .set('Cookie', cookie)
    .send({ newEmail: email, callbackURL: 'http://localhost:5173/account' })
}

// Abre el enlace tal como lo haría el navegador: ruta + query, sin host.
function open(url: string) {
  const parsed = new URL(url)
  return request(app).get(`${parsed.pathname}${parsed.search}`)
}

beforeEach(async () => {
  await resetDatabase()
  send.mockClear()
})

describe('POST /api/auth/change-email', () => {
  it('responde 401 sin sesión', async () => {
    const response = await request(app).post('/api/auth/change-email').send({ newEmail })

    expect(response.status).toBe(401)
    expect(send).not.toHaveBeenCalled()
  })

  it('envía la confirmación al correo actual y no cambia nada todavía', async () => {
    const cookie = await registerVerifiedUser()
    send.mockClear()

    const response = await requestChange(cookie)

    expect(response.status).toBe(200)
    expect(response.body.status).toBe(true)
    expect(send).toHaveBeenCalledTimes(1)

    const message = send.mock.calls[0]![0]
    expect(message.to).toBe(credentials.email)
    expect(message.text).toContain(newEmail)

    const url = lastEmailUrl()
    expect(url).toContain('/api/auth/verify-email?token=')

    const user = await prisma.user.findUniqueOrThrow({ where: { email: credentials.email } })
    expect(user.email).toBe(credentials.email)
  })

  it('una cuenta sin verificar tampoco cambia de dirección sin abrir el correo', async () => {
    const signUp = await request(app).post('/api/auth/sign-up/email').send(credentials)
    expect(signUp.status).toBe(200)
    const cookie = sessionCookie(signUp)
    send.mockClear()

    const change = await requestChange(cookie)

    expect(change.status).toBe(200)
    const untouched = await prisma.user.findUniqueOrThrow({ where: { email: credentials.email } })
    expect(untouched.emailVerified).toBe(false)

    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0]![0].to).toBe(newEmail)

    const opened = await open(lastEmailUrl())
    expect(opened.status).toBe(302)

    const moved = await prisma.user.findUniqueOrThrow({ where: { email: newEmail } })
    expect(moved.emailVerified).toBe(true)
  })

  it('tras confirmar desde el correo actual envía la verificación al correo nuevo', async () => {
    const cookie = await registerVerifiedUser()
    send.mockClear()

    await requestChange(cookie)
    const confirmationUrl = lastEmailUrl()

    const opened = await open(confirmationUrl)

    expect(opened.status).toBe(302)
    expect(send).toHaveBeenCalledTimes(2)

    const verification = send.mock.calls.at(-1)![0]
    expect(verification.to).toBe(newEmail)

    const user = await prisma.user.findUniqueOrThrow({ where: { email: credentials.email } })
    expect(user.email).toBe(credentials.email)
  })

  it('al abrir la verificación del correo nuevo actualiza el email y permite entrar con él', async () => {
    const cookie = await registerVerifiedUser()
    send.mockClear()

    await requestChange(cookie)
    await open(lastEmailUrl())

    const verificationUrl = lastEmailUrl()
    const opened = await open(verificationUrl)

    expect(opened.status).toBe(302)
    expect(opened.headers.location).toContain('http://localhost:5173/verify-email')

    const updated = await prisma.user.findUniqueOrThrow({ where: { email: newEmail } })
    expect(updated.emailVerified).toBe(true)
    expect(await prisma.user.findUnique({ where: { email: credentials.email } })).toBeNull()

    const oldLogin = await request(app)
      .post('/api/auth/sign-in/email')
      .send({ email: credentials.email, password: credentials.password })
    expect(oldLogin.status).toBe(401)

    const newLogin = await request(app)
      .post('/api/auth/sign-in/email')
      .send({ email: newEmail, password: credentials.password })
    expect(newLogin.status).toBe(200)
  })

  it('un correo ya registrado responde igual y no envía nada (sin enumeración)', async () => {
    const cookie = await registerVerifiedUser()

    await request(app)
      .post('/api/auth/sign-up/email')
      .send({ name: 'Other', email: 'ocupado@example.com', password: 'OtherSecret123!' })

    send.mockClear()

    const response = await requestChange(cookie, 'ocupado@example.com')

    expect(response.status).toBe(200)
    expect(response.body.status).toBe(true)
    expect(send).not.toHaveBeenCalled()

    const user = await prisma.user.findUniqueOrThrow({ where: { email: credentials.email } })
    expect(user.email).toBe(credentials.email)
  })

  it('rechaza cambiar al mismo correo', async () => {
    const cookie = await registerVerifiedUser()
    send.mockClear()

    const response = await requestChange(cookie, credentials.email)

    expect(response.status).toBe(400)
    expect(send).not.toHaveBeenCalled()
  })
})
