import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.js'
import { prisma } from '../../config/prisma.js'
import { Role } from '../../generated/prisma/enums.js'
import { resetDatabase } from '../../test/db.js'
import { adminService } from './admin.service.js'

const password = 'SuperSecret123!'

interface TestUser {
  id: string
  email: string
  cookie: string
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

async function registerUser(email: string, name = 'Test User'): Promise<TestUser> {
  const response = await request(app).post('/api/auth/register').send({ name, email, password })
  expect(response.status).toBe(200)

  const user = await prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } })
  return { id: user.id, email, cookie: sessionCookie(response) }
}

async function setRole(userId: string, role: Role, verified = true): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { role, emailVerified: verified } })
}

async function registerAdmin(email = 'admin@example.com'): Promise<TestUser> {
  const user = await registerUser(email, 'Admin')
  await setRole(user.id, Role.ADMIN)
  return user
}

beforeEach(async () => {
  await resetDatabase()
})

describe('GET /api/admin/users', () => {
  it('responde 401 sin sesión', async () => {
    const response = await request(app).get('/api/admin/users')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })

  it('responde 403 con un USER verificado', async () => {
    const user = await registerUser('user@example.com')
    await setRole(user.id, Role.USER)

    const response = await request(app).get('/api/admin/users').set('Cookie', user.cookie)

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSION')
  })

  it('responde 403 con un ADMIN sin email verificado', async () => {
    const user = await registerUser('admin@example.com', 'Admin')
    await setRole(user.id, Role.ADMIN, false)

    const response = await request(app).get('/api/admin/users').set('Cookie', user.cookie)

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('EMAIL_NOT_VERIFIED')
  })

  it('responde 200 con un ADMIN verificado y solo campos seguros', async () => {
    const admin = await registerAdmin()

    const response = await request(app).get('/api/admin/users').set('Cookie', admin.cookie)

    expect(response.status).toBe(200)
    expect(response.body.users).toHaveLength(1)

    const exposed = response.body.users[0] as Record<string, unknown>
    expect(Object.keys(exposed).sort()).toEqual(
      ['createdAt', 'email', 'emailVerified', 'id', 'name', 'role'].sort(),
    )
    expect(JSON.stringify(response.body)).not.toContain('password')
    expect(JSON.stringify(response.body)).not.toContain('accounts')
  })

  it('pagina con un límite máximo', async () => {
    const admin = await registerAdmin()
    await registerUser('user1@example.com')
    await registerUser('user2@example.com')

    const secondPage = await request(app)
      .get('/api/admin/users?page=2&limit=2')
      .set('Cookie', admin.cookie)

    expect(secondPage.status).toBe(200)
    expect(secondPage.body.users).toHaveLength(1)
    expect(secondPage.body.pagination).toEqual({ page: 2, limit: 2, total: 3, pages: 2 })

    const exactLimit = await request(app)
      .get('/api/admin/users?limit=100')
      .set('Cookie', admin.cookie)

    expect(exactLimit.status).toBe(200)
    expect(exactLimit.body.pagination.limit).toBe(100)

    const overLimit = await request(app)
      .get('/api/admin/users?limit=500')
      .set('Cookie', admin.cookie)

    expect(overLimit.status).toBe(422)
    expect(overLimit.body.error.code).toBe('VALIDATION_ERROR')
  })

  it.each(['limit=101', 'limit=0', 'limit=1.5', 'limit=abc', 'page=0', 'page=-1', 'page=1.5'])(
    'rechaza la query inválida %s con 422',
    async (query) => {
      const admin = await registerAdmin()

      const response = await request(app)
        .get(`/api/admin/users?${query}`)
        .set('Cookie', admin.cookie)

      expect(response.status).toBe(422)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    },
  )
})

describe('PATCH /api/admin/users/:id/role', () => {
  it('cambia el rol de otro usuario', async () => {
    const admin = await registerAdmin()
    const target = await registerUser('target@example.com')

    const response = await request(app)
      .patch(`/api/admin/users/${target.id}/role`)
      .set('Cookie', admin.cookie)
      .send({ role: Role.ADMIN })

    expect(response.status).toBe(200)
    expect(response.body.user.role).toBe(Role.ADMIN)

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: target.id } })
    expect(stored.role).toBe(Role.ADMIN)
  })

  it('rechaza que un admin cambie su propio rol', async () => {
    const admin = await registerAdmin()

    const response = await request(app)
      .patch(`/api/admin/users/${admin.id}/role`)
      .set('Cookie', admin.cookie)
      .send({ role: Role.USER })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('BAD_REQUEST')

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })
    expect(stored.role).toBe(Role.ADMIN)
  })

  it('responde 404 si el usuario no existe', async () => {
    const admin = await registerAdmin()

    const response = await request(app)
      .patch('/api/admin/users/no-existe/role')
      .set('Cookie', admin.cookie)
      .send({ role: Role.USER })

    expect(response.status).toBe(404)
  })

  it('no deja el sistema sin administradores', async () => {
    const actor = await registerUser('actor@example.com')
    const onlyAdmin = await registerAdmin('only-admin@example.com')

    await expect(
      adminService.changeRole({
        actorId: actor.id,
        targetId: onlyAdmin.id,
        newRole: Role.USER,
      }),
    ).rejects.toMatchObject({ status: 409, code: 'CONFLICT' })

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: onlyAdmin.id } })
    expect(stored.role).toBe(Role.ADMIN)
  })

  it('revoca las sesiones del usuario al quitarle privilegios', async () => {
    const admin = await registerAdmin()
    const target = await registerUser('target@example.com', 'Target')
    await setRole(target.id, Role.ADMIN)

    const response = await request(app)
      .patch(`/api/admin/users/${target.id}/role`)
      .set('Cookie', admin.cookie)
      .send({ role: Role.USER })

    expect(response.status).toBe(200)
    expect(await prisma.session.count({ where: { userId: target.id } })).toBe(0)

    const nextRequest = await request(app).get('/api/users/me').set('Cookie', target.cookie)
    expect(nextRequest.status).toBe(401)
  })

  it('aplica el rol fresco en la siguiente petición (sin cookieCache)', async () => {
    const admin = await registerAdmin()

    // Degradación directa en la base de datos: la sesión sigue viva.
    await prisma.user.update({ where: { id: admin.id }, data: { role: Role.USER } })

    const adminRequest = await request(app).get('/api/admin/users').set('Cookie', admin.cookie)
    expect(adminRequest.status).toBe(403)
    expect(adminRequest.body.error.code).toBe('INSUFFICIENT_PERMISSION')

    // La sesión no se revocó: el 403 es por rol, no por autenticación.
    const sessionRequest = await request(app).get('/api/users/me').set('Cookie', admin.cookie)
    expect(sessionRequest.status).toBe(200)
  })

  it.each([{ role: 123 }, { role: ['ADMIN'] }, { role: null }, {}])(
    'rechaza el cuerpo inválido %j con 422',
    async (body) => {
      const admin = await registerAdmin()
      const target = await registerUser('target@example.com')

      const response = await request(app)
        .patch(`/api/admin/users/${target.id}/role`)
        .set('Cookie', admin.cookie)
        .send(body)

      expect(response.status).toBe(422)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    },
  )

  it('un USER no puede cambiar roles', async () => {
    const user = await registerUser('user@example.com')
    const target = await registerUser('target@example.com')
    await setRole(user.id, Role.USER)

    const response = await request(app)
      .patch(`/api/admin/users/${target.id}/role`)
      .set('Cookie', user.cookie)
      .send({ role: Role.ADMIN })

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSION')
  })
})

describe('anti-escalada de rol', () => {
  it('ignora un role enviado en /register', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Attacker', email: 'attacker@example.com', password, role: 'ADMIN' })

    expect(response.status).toBe(200)

    const stored = await prisma.user.findUniqueOrThrow({
      where: { email: 'attacker@example.com' },
    })
    expect(stored.role).toBe(Role.USER)

    const session = await request(app)
      .get('/api/auth/session')
      .set('Cookie', sessionCookie(response))

    expect(session.status).toBe(200)
    expect(session.body.user.role).toBe(Role.USER)
  })

  it('PATCH /api/users/me no puede modificar el rol', async () => {
    const user = await registerUser('user@example.com')

    const response = await request(app)
      .patch('/api/users/me')
      .set('Cookie', user.cookie)
      .send({ name: 'Nombre Nuevo', role: 'ADMIN' })

    expect(response.status).toBe(200)

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(stored.role).toBe(Role.USER)

    // Solo con `role` tampoco pasa la validación existente.
    const onlyRole = await request(app)
      .patch('/api/users/me')
      .set('Cookie', user.cookie)
      .send({ role: 'ADMIN' })

    expect(onlyRole.status).toBe(422)
  })
})
