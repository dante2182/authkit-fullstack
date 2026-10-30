# API de autenticación — diseño de plantilla modular

Fecha: 2026-10-30
Ubicación: `apps/api` (monorepo `authkit-fullstack`)
Estado: propuesto

## Intención

Convertir `apps/api` en una plantilla backend reutilizable de autenticación y usuarios:
modular por feature, sin dependencias de frontend, con Express 5, Prisma 7, better-auth y Zod.

## Objetivos

- Estructura `src/modules/<feature>/` + `src/shared/`, con capas explícitas
  (routes → controller → service).
- Superficie HTTP propia sobre `auth.api` de better-auth (wrapper).
- Rutas sin prefijo de versión: `/auth/*`, `/users/*`, `/health`.
- Validación de entrada con Zod en un único middleware.
- Errores uniformes y manejo global centralizado.
- Cookies de sesión reenviadas correctamente desde better-auth.

## No objetivos (v1)

- OAuth/social login, verificación de email, recuperación de contraseña,
  roles/permisos, panel admin, tests automatizados (se añaden en una iteración posterior).

## Anti-objetivos

- Duplicar el handler nativo `/api/auth/*`: una sola superficie pública.
- Acoplar controllers a Prisma cuando la operación ya vive en better-auth.
- Devolver campos sensibles (`password`, tokens ajenos) en respuestas.

## Enfoques considerados

1. **Feature-based + wrapper** (elegido): cada módulo agrupa routes, controller,
   service y schema. La API expone `/auth/*` propio y delega en `auth.api`.
2. Layer-first (`routes/`, `controllers/`, `services/`): descartado; cada cambio
   toca cuatro directorios y el borrado de una feature deja residuos.
3. Handler nativo de better-auth: descartado; la superficie y los errores quedan
   dictados por la librería y la plantilla pierde control de DTOs.

## Estructura

```text
src/
├── config/
│   ├── auth.ts          # better-auth
│   ├── cors.ts
│   ├── env.ts
│   ├── prisma.ts
│   └── rate-limit.ts    # límite aplicado a /auth
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.schema.ts
│   │   └── auth.middleware.ts   # requireAuth
│   └── users/
│       ├── users.routes.ts
│       ├── users.controller.ts
│       ├── users.service.ts
│       └── users.schema.ts
├── shared/
│   ├── errors/
│   │   ├── app-error.ts
│   │   └── error-handler.ts
│   ├── middlewares/
│   │   ├── validate.ts
│   │   └── not-found.ts
│   ├── types/
│   │   └── express.d.ts        # augmentación de req.auth
│   └── utils/
│       └── http.ts             # respuesta y reenvío de headers de better-auth
├── routes.ts                   # router raíz
├── app.ts
└── index.ts
```

## Contrato HTTP

| Método | Ruta             | Auth | Cuerpo                      | Respuesta                             |
| ------ | ---------------- | ---- | --------------------------- | ------------------------------------- |
| POST   | `/auth/register` | no   | `{ name, email, password }` | 200 `{ token, user }`                 |
| POST   | `/auth/login`    | no   | `{ email, password }`       | 200 `{ redirect, token, url?, user }` |
| POST   | `/auth/logout`   | sí   | —                           | 200 `{ success }`                     |
| GET    | `/auth/session`  | sí   | —                           | 200 `{ session, user }`               |
| GET    | `/users/me`      | sí   | —                           | 200 `{ user }`                        |
| PATCH  | `/users/me`      | sí   | `{ name?, image? }`         | 200 `{ user }`                        |
| DELETE | `/users/me`      | sí   | —                           | 204                                   |
| GET    | `/health`        | no   | —                           | 200 `{ status: 'ok' }`                |

## Decisiones técnicas

- **Proxy de cookies**: los endpoints de auth llaman a `auth.api.*` con
  `asResponse: true` y `fromNodeHeaders(req.headers)`, copian status y headers
  (`Set-Cookie`) a la respuesta Express y devuelven el cuerpo tal cual.
  Los cuerpos son los de better-auth: `signUpEmail` → `{ token, user }`,
  `signInEmail` → `{ redirect, token, url?, user }`, `getSession` → `{ session, user }`.
- **Sesión**: `requireAuth` obtiene la sesión con `auth.api.getSession`,
  la adjunta a `req.auth` (augmentación de tipos) y responde 401 con `AppError`.
- **Errores**: `{ error: { code, message, details? } }`. `AppError` con
  `status`, `code` y `details`. El handler global traduce `ZodError`,
  `AppError`, errores de cliente de Express y desconocidos. better-auth
  devuelve sus propios errores (`{ code, message }`) incluso con
  `asResponse`; `pipeAuthResponse` los convierte en `AppError` para
  conservar el sobre uniforme.
- **Validación**: `validate({ body, params, query })` parsea y reemplaza
  `req.body`/`req.params`/`req.query`; los tipos se derivan con `z.infer`.
- **Usuarios**: lectura y actualización directa con Prisma; `select` explícito
  sin `password`. Borrado en cascada de `Session` y `Account`.
- **Rate limit**: 100 req/min sobre `/auth` (valor actual, se mueve a config).
- **CORS**: sin cambios; credenciales activas.

## Riesgos y límites

- Sin tests en v1: la validación se hace con `pnpm typecheck` y pruebas manuales
  con curl. Deuda registrada.
- better-auth puede devolver cuerpos con forma propia; el wrapper reenvía
  `{ user, session }` sin transformar para no perder campos.
- Cambios de contraseña y verificación de email quedan como extensión documentada.

## Criterios de aceptación

1. `pnpm -C apps/api typecheck` pasa sin errores.
2. Existen las carpetas y archivos de la estructura anterior.
3. `app.ts` registra el router raíz, 404 y error handler.
4. Ningún controller importa Prisma directamente.
5. Las rutas coinciden con la tabla de contrato HTTP.
