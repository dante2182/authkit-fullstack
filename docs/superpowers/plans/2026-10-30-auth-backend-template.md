# Plantilla de autenticación backend — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar `apps/api` en módulos `auth` y `users` con capas routes → controller → service, superficie HTTP propia sobre better-auth y shared/ reutilizable.

**Architecture:** Express 5 compone un router raíz. Cada módulo agrupa rutas, controller, service y esquemas Zod. `shared/` centraliza errores, validación y el proxy de respuestas de better-auth.

**Tech Stack:** TypeScript ESM (`nodenext`), Express 5.3, Prisma 7.10 + `@prisma/adapter-pg`, better-auth 1.7.11, Zod 4.6.

**Spec:** `docs/superpowers/specs/2026-10-30-auth-backend-template-design.md`

## Global Constraints

- ESM con extensiones `.js` en imports relativos (`verbatimModuleSyntax`, `nodenext`).
- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` activos.
- Sin prefijo de versión: rutas `/auth/*`, `/users/*`, `/health`.
- Controllers no importan Prisma; solo services.
- Errores con forma `{ error: { code, message, details? } }`.
- Sin tests automatizados en v1 (deuda aceptada en el spec). Verificación: `pnpm typecheck` + smoke con curl.

## Review Focus

- Cookie `Set-Cookie` ausente o duplicada al reenviar la respuesta de better-auth.
- `req.auth` sin tipar: controller accede a `req.auth.user` y TypeScript no lo conoce.
- Validación de `req.query` con Express 5 (getter de solo lectura, no asignable).
- Sesión inválida o expirada: debe responder 401 con el formato de error, no 500.
- Borrado de usuario: cascada de `Session`/`Account` sin filas huérfanas.

---

### Task 1: Base compartida

**Files:**

- Create: `apps/api/src/shared/errors/app-error.ts`
- Create: `apps/api/src/shared/errors/error-handler.ts`
- Create: `apps/api/src/shared/middlewares/not-found.ts`
- Create: `apps/api/src/shared/middlewares/validate.ts`
- Create: `apps/api/src/shared/utils/http.ts`
- Create: `apps/api/src/shared/types/express.d.ts`

**Interfaces:**

- Produces: `AppError(status, code, message, details?)`, factories `badRequest`, `unauthorized`, `notFound`, `conflict`.
- Produces: `errorHandler(err, req, res, next)`.
- Produces: `notFound(req, res)`.
- Produces: `validate({ body?, query?, params? })` → `RequestHandler`.
- Produces: `pipeAuthResponse(res, response)` → `Promise<void>`.
- Produces: augmentación `Express.Request.auth?: typeof auth.$Infer.Session`.

- [ ] **Step 1: Crear `app-error.ts`**

```ts
export class AppError extends Error {
  readonly status: number
  readonly code: string
  readonly details: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, 'BAD_REQUEST', message, details)

export const unauthorized = (message = 'No autenticado') =>
  new AppError(401, 'UNAUTHORIZED', message)

export const notFound = (message = 'Recurso no encontrado') =>
  new AppError(404, 'NOT_FOUND', message)

export const conflict = (message: string, details?: unknown) =>
  new AppError(409, 'CONFLICT', message, details)
```

- [ ] **Step 2: Crear `error-handler.ts`**

Debe distinguir: `AppError`, `ZodError` (422 `VALIDATION_ERROR`), `APIError` de better-auth (su `status` y `body.message`), y desconocidos (500 `INTERNAL_ERROR`, log en consola).

```ts
import { APIError } from 'better-auth/api'
import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { AppError } from './app-error.js'

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    })
    return
  }

  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos inválidos',
        details: err.issues,
      },
    })
    return
  }

  if (err instanceof APIError) {
    res.status(err.statusCode).json({
      error: {
        code: err.body?.code ?? 'AUTH_ERROR',
        message: err.body?.message ?? 'Error de autenticación',
      },
    })
    return
  }

  console.error(err)
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' },
  })
}
```

- [ ] **Step 3: Crear `not-found.ts`**

```ts
import type { RequestHandler } from 'express'
import { notFound } from '../errors/app-error.js'

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(notFound('Ruta no encontrada'))
}
```

- [ ] **Step 4: Crear `validate.ts`**

`req.query` en Express 5 es un getter de solo lectura: reasignarlo lanza `TypeError`. Usar `Object.defineProperty`.

```ts
import type { RequestHandler } from 'express'
import type { ZodType } from 'zod'

interface ValidationSchemas {
  body?: ZodType
  query?: ZodType
  params?: ZodType
}

export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    if (schemas.body) req.body = schemas.body.parse(req.body)
    if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params
    if (schemas.query) {
      Object.defineProperty(req, 'query', {
        value: schemas.query.parse(req.query),
        writable: true,
        configurable: true,
      })
    }
    next()
  }
}
```

- [ ] **Step 5: Crear `http.ts`**

Reenvía status, headers (incluidas varias `set-cookie`) y cuerpo de una `Response` de better-auth.

```ts
import type { Response } from 'express'

export async function pipeAuthResponse(
  res: Response,
  response: globalThis.Response,
): Promise<void> {
  res.status(response.status)

  for (const [key, value] of response.headers) {
    if (key === 'set-cookie' || key === 'content-length') continue
    res.setHeader(key, value)
  }

  const cookies = response.headers.getSetCookie()
  if (cookies.length > 0) res.setHeader('set-cookie', cookies)

  const body = await response.text()
  if (body.length > 0) res.send(body)
  else res.end()
}
```

- [ ] **Step 6: Crear `express.d.ts`**

```ts
import type { auth } from '../../config/auth.js'

declare global {
  namespace Express {
    interface Request {
      auth?: typeof auth.$Infer.Session
    }
  }
}
```

- [ ] **Step 7: Verificar tipos**

Run: `cd apps/api && pnpm typecheck`
Expected: sin errores. Si `APIError` no expone `statusCode`, revisar `better-auth/dist/api/index.d.mts` y ajustar al campo real.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/shared docs/superpowers
git commit -m "feat(api): add shared errors, validation and auth response helpers"
```

---

### Task 2: Módulo auth

**Files:**

- Create: `apps/api/src/modules/auth/auth.schema.ts`
- Create: `apps/api/src/modules/auth/auth.service.ts`
- Create: `apps/api/src/modules/auth/auth.controller.ts`
- Create: `apps/api/src/modules/auth/auth.middleware.ts`
- Create: `apps/api/src/modules/auth/auth.routes.ts`

**Interfaces:**

- Consumes: `validate`, `badRequest`, `unauthorized`, `pipeAuthResponse` de Task 1.
- Produces: `authRouter` (Express `Router`).
- Produces: `requireAuth: RequestHandler` que puebla `req.auth`.
- Produces: tipos `RegisterInput`, `LoginInput`.

- [ ] **Step 1: Crear `auth.schema.ts`**

```ts
import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email(),
  password: z.string().min(8).max(128),
})

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
```

- [ ] **Step 2: Crear `auth.service.ts`**

Cada método devuelve la `Response` cruda de better-auth (`asResponse: true`).

```ts
import { auth } from '../../config/auth.js'
import type { LoginInput, RegisterInput } from './auth.schema.js'

export const authService = {
  register(input: RegisterInput, headers: Headers): Promise<Response> {
    return auth.api.signUpEmail({ body: input, headers, asResponse: true })
  },

  login(input: LoginInput, headers: Headers): Promise<Response> {
    return auth.api.signInEmail({ body: input, headers, asResponse: true })
  },

  logout(headers: Headers): Promise<Response> {
    return auth.api.signOut({ headers, asResponse: true })
  },
}
```

- [ ] **Step 3: Crear `auth.controller.ts`**

```ts
import { fromNodeHeaders } from 'better-auth/node'
import type { RequestHandler } from 'express'
import { unauthorized } from '../../shared/errors/app-error.js'
import { pipeAuthResponse } from '../../shared/utils/http.js'
import type { LoginInput, RegisterInput } from './auth.schema.js'
import { authService } from './auth.service.js'

export const register: RequestHandler = async (req, res) => {
  const input = req.body as RegisterInput
  const response = await authService.register(input, fromNodeHeaders(req.headers))
  await pipeAuthResponse(res, response)
}

export const login: RequestHandler = async (req, res) => {
  const input = req.body as LoginInput
  const response = await authService.login(input, fromNodeHeaders(req.headers))
  await pipeAuthResponse(res, response)
}

export const logout: RequestHandler = async (req, res) => {
  const response = await authService.logout(fromNodeHeaders(req.headers))
  await pipeAuthResponse(res, response)
}

export const session: RequestHandler = (req, res) => {
  if (!req.auth) throw unauthorized()
  res.json(req.auth)
}
```

- [ ] **Step 4: Crear `auth.middleware.ts`**

```ts
import { fromNodeHeaders } from 'better-auth/node'
import type { RequestHandler } from 'express'
import { auth } from '../../config/auth.js'
import { unauthorized } from '../../shared/errors/app-error.js'

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  })

  if (!session) throw unauthorized()

  req.auth = session
  next()
}
```

- [ ] **Step 5: Crear `auth.routes.ts`**

```ts
import { Router } from 'express'
import * as authController from './auth.controller.js'
import { requireAuth } from './auth.middleware.js'
import { loginSchema, registerSchema } from './auth.schema.js'
import { validate } from '../../shared/middlewares/validate.js'

export const authRouter: Router = Router()

authRouter.post('/register', validate({ body: registerSchema }), authController.register)
authRouter.post('/login', validate({ body: loginSchema }), authController.login)
authRouter.post('/logout', requireAuth, authController.logout)
authRouter.get('/session', requireAuth, authController.session)
```

- [ ] **Step 6: Verificar tipos**

Run: `cd apps/api && pnpm typecheck`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/auth
git commit -m "feat(api): add auth module wrapping better-auth"
```

---

### Task 3: Módulo users

**Files:**

- Create: `apps/api/src/modules/users/users.schema.ts`
- Create: `apps/api/src/modules/users/users.service.ts`
- Create: `apps/api/src/modules/users/users.controller.ts`
- Create: `apps/api/src/modules/users/users.routes.ts`

**Interfaces:**

- Consumes: `requireAuth` de Task 2; `notFound` de Task 1.
- Produces: `usersRouter`.
- Produces: `usersService.findById(id)`, `usersService.update(id, data)`, `usersService.remove(id)`.
- Produce: tipo `UpdateUserInput`.

- [ ] **Step 1: Crear `users.schema.ts`**

```ts
import { z } from 'zod'

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    image: z.url().max(2048).nullable().optional(),
  })
  .refine((data) => data.name !== undefined || data.image !== undefined, {
    message: 'Debes enviar al menos un campo',
  })

export type UpdateUserInput = z.infer<typeof updateUserSchema>
```

- [ ] **Step 2: Crear `users.service.ts`**

`select` explícito; nunca devolver columnas de `Account`.

```ts
import { prisma } from '../../config/prisma.js'
import type { UpdateUserInput } from './users.schema.js'

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
  createdAt: true,
  updatedAt: true,
} as const

export const usersService = {
  findById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: publicUserSelect })
  },

  update(id: string, data: UpdateUserInput) {
    return prisma.user.update({ where: { id }, data, select: publicUserSelect })
  },

  remove(id: string) {
    return prisma.user.delete({ where: { id }, select: { id: true } })
  },
}
```

- [ ] **Step 3: Crear `users.controller.ts`**

```ts
import type { RequestHandler } from 'express'
import { notFound } from '../../shared/errors/app-error.js'
import type { UpdateUserInput } from './users.schema.js'
import { usersService } from './users.service.js'

export const me: RequestHandler = async (req, res) => {
  const user = await usersService.findById(req.auth!.user.id)
  if (!user) throw notFound('Usuario no encontrado')
  res.json({ user })
}

export const updateMe: RequestHandler = async (req, res) => {
  const user = await usersService.update(req.auth!.user.id, req.body as UpdateUserInput)
  res.json({ user })
}

export const deleteMe: RequestHandler = async (req, res) => {
  await usersService.remove(req.auth!.user.id)
  res.status(204).end()
}
```

- [ ] **Step 4: Crear `users.routes.ts`**

```ts
import { Router } from 'express'
import { validate } from '../../shared/middlewares/validate.js'
import { requireAuth } from '../auth/auth.middleware.js'
import * as usersController from './users.controller.js'
import { updateUserSchema } from './users.schema.js'

export const usersRouter: Router = Router()

usersRouter.use(requireAuth)
usersRouter.get('/me', usersController.me)
usersRouter.patch('/me', validate({ body: updateUserSchema }), usersController.updateMe)
usersRouter.delete('/me', usersController.deleteMe)
```

- [ ] **Step 5: Verificar tipos**

Run: `cd apps/api && pnpm typecheck`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/users
git commit -m "feat(api): add users module"
```

---

### Task 4: Composición y límite de peticiones

**Files:**

- Create: `apps/api/src/config/rate-limit.ts`
- Create: `apps/api/src/routes.ts`
- Modify: `apps/api/src/app.ts`

**Interfaces:**

- Consumes: `authRouter`, `usersRouter`, `notFoundHandler`, `errorHandler`.
- Produces: `router` raíz y `app` final.

- [ ] **Step 1: Crear `config/rate-limit.ts`**

```ts
import rateLimit from 'express-rate-limit'

export const authRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Demasiadas peticiones' } },
})
```

- [ ] **Step 2: Crear `routes.ts`**

```ts
import { Router } from 'express'
import { authRateLimit } from './config/rate-limit.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { usersRouter } from './modules/users/users.routes.js'

export const router: Router = Router()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

router.use('/auth', authRateLimit, authRouter)
router.use('/users', usersRouter)
```

- [ ] **Step 3: Reescribir `app.ts`**

Elimina `toNodeHandler`, el rate limit inline, `/health` y el handler de errores local. Orden: helmet → cors → json → router → 404 → error handler.

```ts
import cors from 'cors'
import express from 'express'
import type { Express } from 'express'
import helmet from 'helmet'
import { corsOptions } from './config/cors.js'
import { router } from './routes.js'
import { errorHandler } from './shared/errors/error-handler.js'
import { notFoundHandler } from './shared/middlewares/not-found.js'

export const app: Express = express()

app.use(helmet())
app.use(cors(corsOptions))
app.use(express.json())

app.use(router)
app.use(notFoundHandler)
app.use(errorHandler)
```

- [ ] **Step 4: Verificar tipos**

Run: `cd apps/api && pnpm typecheck`
Expected: sin errores.

- [ ] **Step 5: Smoke test manual**

Run: `cd apps/api && pnpm dev`

```bash
curl -i http://localhost:4000/health
curl -i -X POST http://localhost:4000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"test@example.com","password":"password123"}'
curl -i -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password123"}'
curl -i http://localhost:4000/users/me -b cookies.txt
```

Expected: 200 en health; 200 con `{ token, user }` y `set-cookie` en register/login; 401 `UNAUTHORIZED` en `/users/me` sin cookie.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/config/rate-limit.ts apps/api/src/routes.ts apps/api/src/app.ts
git commit -m "refactor(api): compose modular router and centralize error handling"
```
