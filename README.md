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

# 6. Primer administrador (obligatorio en cada proyecto nuevo)
#    Regístrate primero con POST /api/auth/sign-up/email, pon ese correo en ADMIN_EMAIL
#    (apps/api/.env) y ejecuta:
pnpm --filter api admin:bootstrap
```

- Web: http://localhost:5173
- API: http://localhost:4000

## API (`apps/api`)

Todas las rutas públicas cuelgan de `/api`. La única excepción es la sonda de
infraestructura `GET /health`, que vive en la raíz para que el balanceador no dependa
del prefijo de la API.

| Método | Ruta                                | Auth   | Qué hace                                                                     |
| ------ | ----------------------------------- | ------ | ---------------------------------------------------------------------------- |
| GET    | `/health`                           | —      | Estado del proceso y de Postgres (503 si la DB no responde)                  |
| GET    | `/api`                              | —      | Mensaje de bienvenida                                                        |
| GET    | `/api/config/auth`                  | —      | Capacidades de autenticación para el frontend (sin secretos)                 |
| POST   | `/api/auth/sign-up/email`           | —      | Registro con email y contraseña                                              |
| POST   | `/api/auth/sign-in/email`           | —      | Login; la sesión viaja en una cookie httpOnly                                |
| POST   | `/api/auth/sign-in/social`          | —      | Inicia el flujo OAuth de Google o GitHub                                     |
| GET    | `/api/auth/callback/:provider`      | —      | Callback OAuth (`google`, `github`)                                          |
| POST   | `/api/auth/sign-out`                | —      | Cierra la sesión y expira la cookie                                          |
| GET    | `/api/auth/get-session`             | Cookie | Sesión actual (`200 null` si no hay sesión)                                  |
| POST   | `/api/auth/request-password-reset`  | —      | Envía el enlace de reset (respuesta genérica, no revela si existe)           |
| POST   | `/api/auth/reset-password`          | —      | Cambia la contraseña con el token y revoca todas las sesiones                |
| POST   | `/api/auth/send-verification-email` | —      | Reenvía el correo de verificación                                            |
| GET    | `/api/auth/verify-email`            | —      | Valida el token y redirige al frontend (`?error=` si falla)                  |
| GET    | `/api/auth/list-sessions`           | Cookie | Lista las sesiones activas                                                   |
| POST   | `/api/auth/revoke-session`          | Cookie | Revoca una sesión propia por token                                           |
| POST   | `/api/auth/revoke-other-sessions`   | Cookie | Revoca todas las sesiones menos la actual                                    |
| POST   | `/api/auth/change-password`         | Cookie | Cambia la contraseña; opcionalmente revoca las otras sesiones                |
| GET    | `/api/users/me`                     | Cookie | Usuario actual                                                               |
| PATCH  | `/api/users/me`                     | Cookie | Actualiza nombre e imagen                                                    |
| DELETE | `/api/users/me`                     | Cookie | Borra la cuenta; exige la contraseña actual y expira la cookie               |
| GET    | `/api/admin/users`                  | Cookie | Lista usuarios paginada, con búsqueda parcial por `email` (ADMIN verificado) |
| PATCH  | `/api/admin/users/:id/role`         | Cookie | Cambia el rol de un usuario (ADMIN verificado)                               |

`/api/auth/*` lo sirve el handler nativo de better-auth (`toNodeHandler(auth)`),
montado en `src/app.ts` **antes** de `express.json()` para que el body llegue intacto.
`BETTER_AUTH_URL` es el origen sin prefijo (`http://localhost:4000`): better-auth añade
`/api/auth` con `basePath`.

### Proveedores sociales (Google y GitHub)

Cada proveedor se activa solo cuando existen sus dos variables. No se admite media
pareja: la API falla al arrancar con un mensaje claro.

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

Registra estos callbacks en cada consola:

- Google: `${BETTER_AUTH_URL}/api/auth/callback/google`
- GitHub: `${BETTER_AUTH_URL}/api/auth/callback/github`

El frontend inicia el flujo con `POST /api/auth/sign-in/social` enviando
`{ provider: "google" | "github", callbackURL }`. El modelo `Account` ya guarda los
tokens OAuth, así que no hace falta ninguna migración adicional.

### Modos de autenticación

Dos flags eligen con qué se entra. Los defaults reproducen el comportamiento
histórico: credenciales activas y registro abierto. Se aplican en el servidor, no
solo en la UI.

| Variable                          | Default | Qué hace                                                  |
| --------------------------------- | ------- | --------------------------------------------------------- |
| `AUTH_EMAIL_PASSWORD_ENABLED`     | `true`  | Habilita login y registro con email/contraseña            |
| `AUTH_SIGN_UP_ENABLED`            | `true`  | Permite crear cuentas nuevas (credenciales y proveedores) |
| `AUTH_REQUIRE_EMAIL_VERIFICATION` | `false` | Exige verificar el email para entrar con credenciales     |

| Caso                           | Configuración                                             |
| ------------------------------ | --------------------------------------------------------- |
| Ambos métodos (e-commerce)     | defaults + pareja de proveedor                            |
| Solo credenciales (inventario) | defaults, sin `GOOGLE_*` ni `GITHUB_*`                    |
| Solo proveedores (blog)        | `AUTH_EMAIL_PASSWORD_ENABLED=false` + una pareja completa |
| Panel interno sin registro     | `AUTH_SIGN_UP_ENABLED=false`                              |

`AUTH_EMAIL_PASSWORD_ENABLED=false` sin ningún proveedor completo impide arrancar:
la API no tendría ninguna forma de autenticar.

Consecuencias en las rutas nativas:

- Credenciales apagadas: `sign-in/email` y `sign-up/email` responden `400` con
  `EMAIL_PASSWORD_DISABLED` y `EMAIL_PASSWORD_SIGN_UP_DISABLED`.
- Registro cerrado: el registro por email devuelve `400 EMAIL_PASSWORD_SIGN_UP_DISABLED`,
  los usuarios existentes siguen iniciando sesión, y cada proveedor recibe
  `disableSignUp: true`.
- Proveedor no configurado (sin sus dos variables): `404 PROVIDER_NOT_FOUND`. Una
  pareja incompleta no llega a servir rutas: la API no arranca.

`GET /api/config/auth` publica el contrato que consume el frontend (sin secretos,
sin sesión y sin el rate limit de `/auth`):

```json
{
  "emailPassword": { "enabled": true, "signUpEnabled": true },
  "socialProviders": ["google"]
}
```

**Account linking**: la vinculación implícita solo se acepta cuando el proveedor
confirma que el email está verificado **y** la cuenta local ya tiene
`emailVerified`. `account.accountLinking.trustedProviders` se deja vacío a
propósito: better-auth trata un proveedor "confiable" como prueba suficiente
aunque el IdP no confirme el email, y eso permitiría apropiarse de una cuenta
pre-registrada. `allowDifferentEmails` también queda en `false`: vincular un
email distinto exige una acción explícita del usuario autenticado. Cualquier
otro caso se rechaza con `account_not_linked` y no crea filas en `Account`.
Cubierto por `src/modules/auth/account-linking.test.ts`.

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
  redirección se reescribe en `src/app.ts` al frontend configurado (`CORS_ORIGIN`):
  un `callbackURL` manipulado en la query o en el body no puede desviar la
  redirección. El frontend debe exponer las rutas `/reset-password` y `/verify-email`.

### Exigir email verificado

Hay dos mecanismos independientes:

- **Login con credenciales**: `AUTH_REQUIRE_EMAIL_VERIFICATION=true` activa
  `emailAndPassword.requireEmailVerification` de better-auth. Un usuario con
  `emailVerified: false` recibe `403 EMAIL_NOT_VERIFIED` al iniciar sesión y se le
  reenvía el enlace. El login social no se ve afectado: better-auth lo controla por
  proveedor (`requireEmailVerification` en cada uno), no con esta variable.
- **Rutas concretas**: `requireVerifiedEmail` (`src/modules/auth/auth.middleware.ts`)
  devuelve `401` sin sesión y `403` con código `EMAIL_NOT_VERIFIED` si
  `emailVerified` es `false`.

`requireVerifiedEmail` no está aplicado a ninguna ruta existente: un usuario con el email
mal escrito debe poder borrar su cuenta o recuperar el acceso. Úsalo en rutas nuevas de
riesgo, por ejemplo cambio de email o acciones de negocio sensibles:

```ts
router.post('/orders', requireVerifiedEmail, ordersController.create)
```

### Gestión de sesiones

La vida de la sesión se ajusta sin tocar código: `SESSION_EXPIRES_IN` (segundos,
default `604800` = 7 días) y `SESSION_UPDATE_AGE` (segundos, default `86400` = 1 día;
pasado ese tiempo, la sesión se renueva al usarla). Una variable vacía toma el default.

Los endpoints son los nativos de better-auth:

- `GET /api/auth/list-sessions` devuelve un array con las sesiones activas. Al ser el
  handler nativo, cada entrada incluye el `token` que better-auth usa internamente; el
  navegador sigue autenticándose solo con la cookie httpOnly.
- `POST /api/auth/revoke-session` recibe `{ token }`. Un token de otro usuario responde
  `200 { status: true }` pero no borra nada.
- `POST /api/auth/revoke-other-sessions` revoca el resto y conserva la actual.
- `POST /api/auth/change-password` recibe `currentPassword`, `newPassword` y el
  opcional `revokeOtherSessions`. Con `revokeOtherSessions: true` emite una cookie nueva
  y las anteriores dejan de servir.

### Roles y permisos (RBAC)

La plantilla trae un RBAC mínimo y genérico, sin lógica de dominio:

- `Role` es un enum de Prisma con `USER` y `ADMIN`; `User.role` vale `USER` por defecto.
- `src/shared/auth/permissions.ts` es la **fuente única de verdad**: define los permisos
  (`PERMISSIONS`), el mapa rol → permisos (`ROLE_PERMISSIONS`) y los helpers
  `resolveRole`, `hasPermission` y `losesPrivileges`.
- `requireRole(...roles)` y `requirePermission(permission)` se componen **siempre después**
  de `requireAuth` y responden `403` con `INSUFFICIENT_ROLE` o `INSUFFICIENT_PERMISSION`.
  Usados solos responden `401`.
- Los endpoints de administración encadenan
  `requireAuth → requireVerifiedEmail → requirePermission(...)`.
- El rol viaja en `session.user.role` (`additionalFields` de better-auth) con
  `input: false`: enviar `role` en `/register` o en `PATCH /api/users/me` no tiene efecto.
- **No actives `session.cookieCache`**: cachea el usuario (incluido `role`) en una cookie
  firmada y un rol degradado conservaría privilegios hasta que caduque. Sin caché,
  better-auth lee la sesión de la base en cada petición y el rol siempre es fresco.

#### Endpoints de administración

| Método | Ruta                        | Permiso                    | Qué hace                                                                                                   |
| ------ | --------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| GET    | `/api/admin/users`          | `admin.users.read`         | Lista paginada (`page`, `limit` máximo 100, default 20; `email` filtra parcial, sin distinguir mayúsculas) |
| PATCH  | `/api/admin/users/:id/role` | `admin.users.roles.update` | Cambia el rol de otro usuario                                                                              |

Solo se devuelven campos seguros (`id`, `name`, `email`, `emailVerified`, `role`,
`createdAt`); nunca datos de `Account`. Reglas del cambio de rol:

- Un admin **no puede cambiar su propio rol**.
- No se puede dejar el sistema sin ningún `ADMIN` (la comprobación corre en una
  transacción `Serializable`).
- Al quitar privilegios se revocan **todas** las sesiones del usuario afectado.
- El cambio se registra con pino (`admin.role.changed`) con ids y roles, sin datos
  sensibles.

#### Bootstrap del primer administrador

Paso obligatorio al arrancar un proyecto derivado. No existe endpoint HTTP para esto.

1. Registra el primer usuario con `POST /api/auth/sign-up/email`.
2. Pon su correo en `ADMIN_EMAIL` dentro de `apps/api/.env`.
3. Ejecuta `pnpm --filter api admin:bootstrap`.

Es idempotente: si el usuario ya es `ADMIN` no hace nada, y si el correo no existe
falla con un mensaje claro pidiendo registrarlo primero.

> El usuario debe tener el **email verificado**: los endpoints `/api/admin/*` exigen
> `emailVerified`. Sin `RESEND_API_KEY` el correo de verificación no se envía en
> desarrollo, así que verifícalo por tu cuenta (por ejemplo, marcando `emailVerified`
> en la base de datos) antes de usar el panel. El script avisa si el email no está
> verificado.

#### Cómo añadir un rol en un proyecto derivado

Ejemplo: `SUPPORT`.

1. **Enum**: añade el valor al enum `Role` en `apps/api/prisma/schema.prisma`.
2. **Migración**: `pnpm --filter api db:migrate --name add_support_role` en desarrollo
   (en producción se aplica con `db:deploy`). La migración solo añade el valor al enum.
3. **Permisos**: mapea el rol en `ROLE_PERMISSIONS` de
   `src/shared/auth/permissions.ts` con sus permisos (o `[]` si no tiene).
   `ROLE_PERMISSIONS` es `Record<Role, ...>`, así que el typecheck falla hasta que lo
   mapees.
4. **Rutas**: protege las rutas nuevas con `requireRole(Role.SUPPORT)` o
   `requirePermission(PERMISSIONS.ALGO)`.
5. **Tests**: añade un caso con un usuario de ese rol (403 sin él, 200 con él) y actualiza
   los tests de permisos.

Para añadir un **permiso** nuevo: agrégalo a `PERMISSIONS`, concédelo en
`ROLE_PERMISSIONS` y úsalo con `requirePermission(PERMISSIONS.NUEVO)`.

#### Extensiones opcionales (no incluidas)

- **Multi-tenant**: el plugin `organization` de better-auth añade organizaciones,
  miembros y roles por organización; requiere modelos y control de acceso propios.
- **Permisos por recurso**: además del rol, comprobar que el recurso pertenece al usuario.
  Esa comprobación vive en el service, no en el middleware.
- **Auditoría**: tabla append-only de cambios sensibles. Nunca guardes tokens.
- **Bans e impersonation**: el plugin `admin` de better-auth. Se omitió a propósito para
  mantener esta plantilla sin lógica de dominio.

### Rate limit

`/auth` tiene un límite general (100 peticiones/minuto). Los endpoints sensibles
(`forgot-password`, `reset-password`, `send-verification-email`) tienen además un límite
estricto por IP y por email: `SENSITIVE_RATE_LIMIT_MAX` (default 5) cada
`SENSITIVE_RATE_LIMIT_WINDOW_MINUTES` (default 15). El email se normaliza (minúsculas y
sin espacios) y se cuenta antes de consultar la base, así que la respuesta es idéntica
exista o no el usuario y el límite no sirve para enumerar cuentas. Se puede desactivar
con `SENSITIVE_RATE_LIMIT_ENABLED=false`.

Las rutas de negocio (`/api/users/*` y `/api/admin/*`) tienen su propio límite general:
`API_RATE_LIMIT_MAX` (default 300) cada `API_RATE_LIMIT_WINDOW_MINUTES` (default 1).
Cada prefijo usa un cubo independiente y se cuenta antes de comprobar la sesión, así que
las peticiones sin autenticar también consumen cuota. Se desactiva con
`API_RATE_LIMIT_ENABLED=false` (en test está desactivado por defecto).

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
  `SENSITIVE_RATE_LIMIT_ENABLED=true`. El límite de `/api/users` y `/api/admin` sigue
  la misma regla con `API_RATE_LIMIT_ENABLED=true`.
- Cobertura: registro (cookie httpOnly, sin `token` en el body), acceso protegido solo
  con esa cookie, login, logout (con y sin cookie), cookie falsificada, sesión
  expirada, `GET/PATCH/DELETE /api/users/me`, validaciones de entrada, limpieza de
  sesiones expiradas, permisos y roles (anti-escalada, paginación, último admin,
  revocación de sesiones y frescura del rol sin `cookieCache`).

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
