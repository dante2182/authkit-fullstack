# AuthKit — Fullstack

Monorepo para un sistema de autenticación completo: frontend React + Vite + Tailwind y API Express + Prisma + better-auth.

## Stack

| Capa       | Tecnología                                                                          |
| ---------- | ----------------------------------------------------------------------------------- |
| `apps/web` | React 19, Vite 8, TypeScript 6, Tailwind CSS 4, React Router, React Hook Form + Zod |
| `apps/api` | Express 5, Prisma 7 (PostgreSQL), better-auth, Zod, helmet + rate-limit             |
| Tooling    | pnpm workspaces, ESLint 10 (flat config), Prettier 3, Husky 9                       |

## Requisitos

- **Node** `>=24` (ver `.nvmrc` → `v24.22.0`)
- **pnpm** `12.14.0` (fijado en `packageManager`; `corepack enable` lo instala solo)
- **PostgreSQL** accesible (local o gestionado) y su cadena de conexión en `DATABASE_URL`

## Puesta en marcha

```bash
# 1. Dependencias
pnpm install

# 2. Variables de entorno
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
#    ...y genera el secreto de better-auth:
#    openssl rand -base64 32

# 3. Apunta DATABASE_URL a tu instancia de PostgreSQL
#    (edita apps/api/.env)

# 4. Cliente de Prisma y migraciones
pnpm --filter api db:generate
pnpm --filter api db:migrate

# 5. Desarrollo (web + api en paralelo)
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:4000

## API (`apps/api`)

Todas las rutas públicas cuelgan de `/api`. La única excepción es la sonda de
infraestructura `GET /health`, que vive en la raíz para que el balanceador no dependa
del prefijo de la API.

| Método | Ruta                                | Auth   | Qué hace                                                             |
| ------ | ----------------------------------- | ------ | -------------------------------------------------------------------- |
| GET    | `/health`                           | —      | Estado del proceso y de Postgres (503 si la DB no responde)          |
| GET    | `/api`                              | —      | Mensaje de bienvenida                                                |
| POST   | `/api/auth/register`                | —      | Registro con email y contraseña                                      |
| POST   | `/api/auth/login`                   | —      | Login; la sesión viaja en una cookie httpOnly                        |
| POST   | `/api/auth/logout`                  | —      | Cierra la sesión y expira la cookie (sirve con la sesión ya vencida) |
| GET    | `/api/auth/session`                 | Cookie | Sesión actual                                                        |
| POST   | `/api/auth/forgot-password`         | —      | Envía el enlace de reset (respuesta genérica, no revela si existe)   |
| POST   | `/api/auth/reset-password`          | —      | Cambia la contraseña con el token y revoca todas las sesiones        |
| POST   | `/api/auth/send-verification-email` | —      | Reenvía el correo de verificación                                    |
| GET    | `/api/auth/verify-email`            | —      | Valida el token y redirige al frontend (`?error=` si falla)          |
| GET    | `/api/auth/sessions`                | Cookie | Lista las sesiones activas (sin el token)                            |
| DELETE | `/api/auth/sessions/:id`            | Cookie | Revoca una sesión propia por id                                      |
| POST   | `/api/auth/sessions/revoke-others`  | Cookie | Revoca todas las sesiones menos la actual                            |
| POST   | `/api/auth/change-password`         | Cookie | Cambia la contraseña; opcionalmente revoca las otras sesiones        |
| GET    | `/api/users/me`                     | Cookie | Usuario actual                                                       |
| PATCH  | `/api/users/me`                     | Cookie | Actualiza nombre e imagen                                            |
| DELETE | `/api/users/me`                     | Cookie | Borra la cuenta y expira la cookie                                   |

`BETTER_AUTH_URL` es el origen sin prefijo (`http://localhost:4000`): better-auth añade
`/api/auth` con `basePath`.

### Trust proxy

`TRUST_PROXY` controla `app.set('trust proxy', ...)` y, con ello, la IP que ven el rate
limit y `req.ip`. Ajusta el valor al hosting: `false` sin proxy, `1` con un salto
(Vercel, Render, Railway, Fly.io, un Nginx) o una lista de IPs/CIDR. `true` está
prohibido porque permite falsificar la IP y saltarse el rate limit.

### Email transaccional (Resend)

- `RESEND_API_KEY` y `EMAIL_FROM` configuran el envío. Sin clave, en desarrollo se
  registra solo el asunto y el destinatario (nunca el cuerpo, que lleva el enlace con el
  token); en producción la API no arranca sin ella, así que imprimir el correo es
  imposible.
- `src/shared/email/email.service.ts` es el único punto de envío (fetch nativo contra
  la API de Resend, sin SDK). Los tests lo sustituyen con `vi.mock`.
- Las plantillas viven en `src/shared/email/templates.ts`.
- Los callbacks de better-auth **no** esperan al envío: el correo sale en segundo plano
  y un fallo de Resend se registra sin romper la petición.
- El correo de verificación se envía al registrarse pero **no** bloquea el login:
  `requireEmailVerification` sigue en `false`, así que `emailVerified` queda disponible
  para exigirlo solo en las rutas sensibles.
- El reset de contraseña revoca todas las sesiones del usuario
  (`revokeSessionsOnPasswordReset`).
- Los enlaces del correo apuntan a la API (`/api/auth/...`). El destino de la
  redirección sale siempre de `CORS_ORIGIN`; un `callbackURL` en la query o en el body
  se ignora. El frontend debe exponer las rutas `/reset-password` y `/verify-email`.

### Exigir email verificado

`requireVerifiedEmail` (`src/modules/auth/auth.middleware.ts`) devuelve `401` sin sesión
y `403` con código `EMAIL_NOT_VERIFIED` si `emailVerified` es `false`.

No está aplicado a ninguna ruta existente: un usuario con el email mal escrito debe
poder borrar su cuenta o recuperar el acceso. Úsalo en rutas nuevas de riesgo, por
ejemplo cambio de email o acciones de negocio sensibles:

```ts
router.post('/orders', requireVerifiedEmail, ordersController.create)
```

### Gestión de sesiones

- `GET /api/auth/sessions` devuelve las sesiones activas del usuario. El `token`
  **nunca** aparece en el JSON: solo viaja en la cookie httpOnly. Cada entrada incluye
  `current: true` para la sesión que hace la petición.
- `DELETE /api/auth/sessions/:id` revoca una sesión propia. El servidor resuelve el
  token a partir del id; un id de otro usuario devuelve `404`. Revocar la sesión actual
  equivale a cerrar sesión (también limpia la cookie).
- `POST /api/auth/sessions/revoke-others` revoca el resto y conserva la actual.
- `POST /api/auth/change-password` recibe `currentPassword`, `newPassword` y el
  opcional `revokeOtherSessions`. Con `revokeOtherSessions: true` emite una cookie nueva
  y las anteriores dejan de servir.

### Rate limit

`/auth` tiene un límite general (100 peticiones/minuto). Los endpoints sensibles
(`forgot-password`, `reset-password`, `send-verification-email`) tienen además un límite
estricto por IP y por email: `SENSITIVE_RATE_LIMIT_MAX` (default 5) cada
`SENSITIVE_RATE_LIMIT_WINDOW_MINUTES` (default 15). Se puede desactivar con
`SENSITIVE_RATE_LIMIT_ENABLED=false`.

### Migraciones

En producción se usa siempre `prisma migrate deploy`, nunca `migrate dev`:

```bash
pnpm --filter api db:deploy
```

Antes de aplicar la migración que añade `@@unique([providerId, accountId])`, comprueba
que no haya duplicados en la base de datos de destino:

```sql
SELECT "providerId", "accountId", count(*)
FROM account
GROUP BY 1, 2
HAVING count(*) > 1;
```

Si devuelve filas, la migración falla dentro de una transacción y no deja estado
parcial. Resuelve los duplicados a mano antes de desplegar.

## Tests (`apps/api`)

Vitest + Supertest, con una base de datos **exclusiva para tests**.

```bash
cp apps/api/.env.test.example apps/api/.env.test   # apunta a una base de test
pnpm --filter api test        # una pasada
pnpm --filter api test:watch  # modo watch
```

- `TEST_DATABASE_URL` debe apuntar a una base cuyo nombre contenga `test`. El runner
  aborta si el nombre no lo contiene, si coincide con `DATABASE_URL` o si
  `NODE_ENV=production`. Así es imposible ejecutar la suite contra producción.
- La base se crea sola si no existe y se migra con `prisma migrate deploy` (nunca
  `migrate dev`). Cada test limpia las tablas con `TRUNCATE`.
- El rate limit general de `/auth` se desactiva cuando `NODE_ENV=test`. El límite
  estricto de endpoints sensibles también, salvo que el test lo active con
  `SENSITIVE_RATE_LIMIT_ENABLED=true`.
- Cobertura: registro (cookie httpOnly, sin `token` en el body), acceso protegido solo
  con esa cookie, login, logout (con y sin cookie), cookie falsificada, sesión
  expirada, `GET/PATCH/DELETE /api/users/me`, validaciones de entrada y limpieza de
  sesiones expiradas.

CI: `.github/workflows/ci.yml` ejecuta `format:check`, `lint`, `typecheck` y `test` en
cada push a `main` y en cada pull request. Arranca el PostgreSQL que ya trae el runner,
sin contenedores.

## Comandos (raíz)

| Comando             | Qué hace                                           |
| ------------------- | -------------------------------------------------- |
| `pnpm dev`          | Arranca web y api en paralelo                      |
| `pnpm build`        | Compila todas las apps                             |
| `pnpm lint`         | ESLint en todo el monorepo                         |
| `pnpm lint:fix`     | ESLint con `--fix`                                 |
| `pnpm typecheck`    | TypeScript sin emitir en todas las apps            |
| `pnpm test`         | Tests de todas las apps (Vitest en `apps/api`)     |
| `pnpm format`       | Prettier formatea todo el monorepo (raíz + apps)   |
| `pnpm format:check` | Prettier en modo verificación (lo que usa el hook) |
| `pnpm check`        | Formato + lint + typecheck (lo que usa el hook)    |
| `pnpm fix`          | Formatea y aplica los fixes automáticos de ESLint  |

Atajos por app: `pnpm --filter web <script>` y `pnpm --filter api <script>`.
El formato se ejecuta siempre desde la raíz: las apps no tienen scripts `format` propios.

## Calidad de código

- **Prettier** es la única fuente de verdad del formato: `semi: false`, comillas simples, 100 columnas, `lf`.
  Hay **una sola configuración en la raíz** (`prettier.config.mjs` + `.prettierignore`) con los plugins
  `prettier-plugin-tailwindcss` (ordena las clases de web según `apps/web/src/index.css`) y
  `prettier-plugin-prisma` (formatea el schema de Prisma). No hay configs por app.
  Así el CLI (`pnpm format:check`) y el editor (Ctrl+S con la extensión de Prettier) usan exactamente
  las mismas reglas y plugins, sin depender de `node_modules` de cada app.
- **ESLint** en las dos apps con `eslint-config-prettier` al final, así que **no hay reglas de estilo en conflicto**:
  Prettier formatea, ESLint detecta errores.
- **Husky** ejecuta un hook en cada commit:
  - `.husky/pre-commit` → `pnpm check` (format:check → lint → typecheck). Arreglo rápido: `pnpm fix`.

Si el hook falla, el commit se cancela.

## Convención de commits

Se recomienda seguir **Conventional Commits** con el formato:

```
<tipo>(<scope opcional>): <descripción>
```

| Tipo       | Para qué                                    |
| ---------- | ------------------------------------------- |
| `feat`     | Nueva funcionalidad                         |
| `fix`      | Corrección de un bug                        |
| `docs`     | Solo documentación                          |
| `style`    | Formato, sin cambios de comportamiento      |
| `refactor` | Reestructura sin cambiar comportamiento     |
| `perf`     | Mejora de rendimiento                       |
| `test`     | Tests                                       |
| `build`    | Build, dependencias, tooling de empaquetado |
| `ci`       | Configuración de integración continua       |
| `chore`    | Tareas varias (deps, config)                |
| `revert`   | Revertir un commit anterior                 |

Scopes recomendados: `web`, `api`, `repo`, `deps`.

```bash
git commit -m "feat(web): añade pantalla de login"
git commit -m "fix(api): corrige la validación del email"
git commit -m "chore(repo): actualiza dependencias"
```

Los títulos pueden escribirse en español. Se recomienda el modo imperativo, sin punto final y
un máximo de 100 caracteres en la cabecera.

> El formato es una recomendación: no hay validación automática del mensaje de commit. Los hooks
> solo comprueban formato, lint y tipos del código.

## TypeScript en `apps/api`

Se usa la estrategia dual de Microsoft mediante alias de pnpm, para que el compilador nativo (TS 7) y
`typescript-eslint` convivan:

```jsonc
"typescript": "npm:@typescript/typescript6@^6.0.2", // lo que ve typescript-eslint (in range)
"typescript-native": "npm:typescript@^7.0.2" // binario "tsc" real que compila
```

Por eso `node_modules/.bin/tsc` es el TS 7 nativo y `node_modules/.bin/tsc6` el 6.x.

## Estructura

```
authkit-fullstack/
├─ apps/
│  ├─ api/            # Express + Prisma + better-auth
│  │  ├─ prisma/      # schema.prisma
│  │  └─ src/
│  └─ web/            # React + Vite + Tailwind
│     └─ src/
├─ .husky/            # hook de git (pre-commit)
├─ prettier.config.mjs   # config única de Prettier (raíz + apps)
├─ .prettierignore       # exclusiones únicas de Prettier
└─ pnpm-workspace.yaml
```

## Licencia

MIT
