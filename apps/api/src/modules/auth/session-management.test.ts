import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.js'
import { resetDatabase } from '../../test/db.js'

const credentials = {
  name: 'Test User',
  email: 'user@example.com',
  password: 'SuperSecret123!',
}

const otherCredentials = {
  name: 'Other User',
  email: 'other@example.com',
  password: 'OtherSecret123!',
}

interface NativeSession {
  id: string
  token: string
}

function sessionCookie(response: request.Response): string {
  const raw = response.headers['set-cookie'] as string | string[] | undefined
  const cookies = !raw ? [] : Array.isArray(raw) ? raw : [raw]
  const cookie = cookies.find((entry) => entry.startsWith('better-auth.session_token='))
  if (!cookie) throw new Error('La respuesta no incluye la cookie de sesión')
  return cookie.split(';')[0]!
}

async function register(user = credentials): Promise<string> {
  const response = await request(app).post('/api/auth/sign-up/email').send(user)
  expect(response.status).toBe(200)
  return sessionCookie(response)
}

async function login(user = credentials): Promise<string> {
  const response = await request(app)
    .post('/api/auth/sign-in/email')
    .send({ email: user.email, password: user.password })
  expect(response.status).toBe(200)
  return sessionCookie(response)
}

async function listSessions(cookie: string): Promise<NativeSession[]> {
  const response = await request(app).get('/api/auth/list-sessions').set('Cookie', cookie)
  expect(response.status).toBe(200)
  return response.body as NativeSession[]
}

async function currentToken(cookie: string): Promise<string> {
  const response = await request(app).get('/api/auth/get-session').set('Cookie', cookie)
  expect(response.status).toBe(200)
  return response.body.session.token as string
}

beforeEach(async () => {
  await resetDatabase()
})

describe('GET /api/auth/list-sessions', () => {
  it('lista las sesiones activas', async () => {
    const cookie = await register()
    await login()

    const sessions = await listSessions(cookie)

    expect(sessions).toHaveLength(2)
  })

  it('devuelve 401 sin sesión', async () => {
    const response = await request(app).get('/api/auth/list-sessions')
    expect(response.status).toBe(401)
  })
})

describe('POST /api/auth/revoke-session', () => {
  it('revoca otra sesión del mismo usuario y deja viva la actual', async () => {
    const currentCookie = await register()
    const otherCookie = await login()

    const sessions = await listSessions(currentCookie)
    const otherToken = await currentToken(otherCookie)
    const other = sessions.find((session) => session.token === otherToken)
    if (!other) throw new Error('No hay otra sesión que revocar')

    const response = await request(app)
      .post('/api/auth/revoke-session')
      .set('Cookie', currentCookie)
      .send({ token: other.token })

    expect(response.status).toBe(200)

    expect((await request(app).get('/api/users/me').set('Cookie', otherCookie)).status).toBe(401)
    expect((await request(app).get('/api/users/me').set('Cookie', currentCookie)).status).toBe(200)
  })

  it('no permite revocar la sesión de otro usuario', async () => {
    const attackerCookie = await register()
    const victimCookie = await register(otherCredentials)

    const victimSessions = await listSessions(victimCookie)
    const victimSession = victimSessions[0]
    if (!victimSession) throw new Error('La víctima no tiene sesión')

    const response = await request(app)
      .post('/api/auth/revoke-session')
      .set('Cookie', attackerCookie)
      .send({ token: victimSession.token })

    // better-auth responde 200 genérico y no borra una sesión ajena.
    expect(response.status).toBe(200)
    expect((await request(app).get('/api/users/me').set('Cookie', victimCookie)).status).toBe(200)
  })

  it('revocar la sesión actual invalida la cookie', async () => {
    const cookie = await register()
    const token = await currentToken(cookie)

    const response = await request(app)
      .post('/api/auth/revoke-session')
      .set('Cookie', cookie)
      .send({ token })

    expect(response.status).toBe(200)
    expect((await request(app).get('/api/users/me').set('Cookie', cookie)).status).toBe(401)
  })
})

describe('POST /api/auth/revoke-other-sessions', () => {
  it('revoca el resto de sesiones y conserva la actual', async () => {
    const currentCookie = await register()
    const otherCookie = await login()

    const response = await request(app)
      .post('/api/auth/revoke-other-sessions')
      .set('Cookie', currentCookie)

    expect(response.status).toBe(200)

    expect((await request(app).get('/api/users/me').set('Cookie', otherCookie)).status).toBe(401)
    expect((await request(app).get('/api/users/me').set('Cookie', currentCookie)).status).toBe(200)
  })
})

describe('POST /api/auth/change-password', () => {
  const newPassword = 'NewPassword456!'

  it('rechaza la contraseña actual incorrecta', async () => {
    const cookie = await register()

    const response = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: 'WrongPassword123!', newPassword })

    expect(response.status).toBe(400)
    expect(response.body.code).toBe('INVALID_PASSWORD')
  })

  it('cambia la contraseña sin revocar la sesión actual', async () => {
    const cookie = await register()

    const response = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: credentials.password, newPassword })

    expect(response.status).toBe(200)

    const oldLogin = await request(app)
      .post('/api/auth/sign-in/email')
      .send({ email: credentials.email, password: credentials.password })
    expect(oldLogin.status).toBe(401)

    const newLogin = await request(app)
      .post('/api/auth/sign-in/email')
      .send({ email: credentials.email, password: newPassword })
    expect(newLogin.status).toBe(200)

    expect((await request(app).get('/api/users/me').set('Cookie', cookie)).status).toBe(200)
  })

  it('con revokeOtherSessions emite una cookie nueva e invalida las anteriores', async () => {
    const currentCookie = await register()
    const otherCookie = await login()

    const response = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', currentCookie)
      .send({ currentPassword: credentials.password, newPassword, revokeOtherSessions: true })

    expect(response.status).toBe(200)

    const newCookie = sessionCookie(response)

    expect((await request(app).get('/api/users/me').set('Cookie', currentCookie)).status).toBe(401)
    expect((await request(app).get('/api/users/me').set('Cookie', otherCookie)).status).toBe(401)
    expect((await request(app).get('/api/users/me').set('Cookie', newCookie)).status).toBe(200)
  })
})
