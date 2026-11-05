# Feature: roles y permisos en la API

Objetivo: añadir RBAC genérico a la plantilla `apps/api` (rol único `USER`/`ADMIN`, mapa de permisos, middlewares, módulo admin, bootstrap y tests).
Rama: `main` (sin commits; entrega como cambios en el árbol de trabajo). Runner: `pnpm --filter api test` (Vitest + Supertest, Postgres de test).

## Specs

- **S1 — Modelo**: `apps/api` es plantilla reutilizable; rol único en `User` con `enum Role { USER ADMIN }`; sin plugin admin de better-auth ni multi-rol; migración que deja las filas existentes en `USER`.
- **S2 — Fuente única de verdad**: `src/shared/auth/permissions.ts` con mapa rol → permisos (`ADMIN`: todos; `USER`: ninguno de administración) y tipos derivados del enum de Prisma. Añadir rol o permiso debe requerir tocar solo ese archivo, el enum y las rutas que lo usen.
- **S3 — Middlewares**: `requireRole(...roles)` y `requirePermission(permission)`, compuestos tras `requireAuth`, con 403 y códigos `INSUFFICIENT_ROLE` / `INSUFFICIENT_PERMISSION`. Endpoints admin: `requireAuth → requireVerifiedEmail → requirePermission(...)`.
- **S4 — better-auth**: `additionalFields` con `role` e `input: false`. Tests: `role` en `/register` no tiene efecto; `PATCH /api/users/me` no puede modificarlo.
- **S5 — Módulo admin**: `modules/admin/` con solo `GET /api/admin/users` (paginado con límite máximo; campos `id, name, email, emailVerified, role, createdAt`, nunca `Account`) y `PATCH /api/admin/users/:id/role` (zod; no dejar el sistema sin ADMIN; un admin no puede cambiar su propio rol; si se quitan privilegios, revocar todas las sesiones del usuario).
- **S6 — Bootstrap**: script `pnpm admin:bootstrap` que lee `ADMIN_EMAIL`, es idempotente y falla con mensaje claro si el usuario no existe. Sin endpoint HTTP. Documentado como paso obligatorio.
- **S7 — Frescura del rol**: verificar en la fuente instalada que `advanced.database.joins: true` mantiene el rol fresco por request y que `cookieCache` no está activo. Test: degradar a un admin con sesión activa → su siguiente petición admin da 403. Comentario en `config/auth.ts` sobre el riesgo de activar `cookieCache`.
- **S8 — Logs**: pino registra quién cambia el rol de quién, sin datos sensibles.
- **S9 — Sin dominio**: nada de bans, impersonation, auditoría ni lógica de dominio. Extensiones útiles solo documentadas en el README (p. ej. plugin `organization` para multi-tenant).
- **S10 — Tests mínimos**: 401 sin sesión; 403 con USER; 403 con ADMIN no verificado; 200 con ADMIN verificado; `requirePermission` y `requireRole` con un rol de prueba añadido solo en test; cambio de rol correcto; protección del último admin; auto-degradación rechazada; sesiones revocadas al quitar privilegios; paginación con límite; anti-escalada.
- **S11 — Restricciones**: avisar antes de instalar dependencias (no deberían hacer falta), cambios mínimos, estilo del repo, no exponer tokens en bodies, no `migrate dev` contra producción.

## Tasks

| ID  | Specs    | Ruta   | Estado | Evidencia                          |
| --- | -------- | ------ | ------ | ---------------------------------- |
| T1  | S1       | inline | hecho  | schema + migración                 |
| T2  | S2, S3   | inline | hecho  | permissions.ts + middleware        |
| T3  | S4, S7   | inline | hecho  | config/auth.ts + tests             |
| T4  | S5, S8   | inline | hecho  | módulo admin + pino                |
| T5  | S6       | inline | hecho  | script + package.json              |
| T6  | S9       | inline | hecho  | README                             |
| T7  | S10, S11 | inline | hecho  | tests + format/lint/typecheck/test |

## Log

### L1 — Petición original (verbatim)

okey vamo con esto:
Contexto importante: apps/api es una PLANTILLA reutilizable para varios proyectos (e-commerce, gestores de inventario, etc.), no una app única. El diseño de roles debe ser genérico y fácil de adaptar por proyecto, sin lógica de dominio.

Decisión: rol único en User con enum Role { USER ADMIN }. Sin plugin admin de better-auth ni multi-rol. Los proyectos que usen la plantilla añadirán sus propios valores al enum.

Alcance:

1. Prisma: enum Role y User.role Role @default(USER), con migración que deje las filas existentes en USER. Documenta en el README, paso a paso, cómo añadir un rol nuevo en un proyecto derivado (schema, migración, mapa de permisos, tests).
2. Fuente única de verdad: un archivo (por ejemplo src/shared/auth/permissions.ts) con el mapa rol → permisos (ADMIN: todos; USER: ninguno de administración) y los tipos derivados del enum de Prisma. Añadir un rol o permiso nuevo debe requerir tocar solo ese archivo, el enum y las rutas que lo usen.
3. Middlewares: requireRole(...roles) y requirePermission(permission), ambos compuestos tras requireAuth, con 403 y códigos INSUFFICIENT_ROLE / INSUFFICIENT_PERMISSION. Los endpoints admin usan requireAuth → requireVerifiedEmail → requirePermission(...).
4. better-auth: additionalFields con role e input: false. Tests que demuestren que role en /register no tiene efecto y que PATCH /api/users/me no puede modificarlo.
5. Módulo modules/admin/ con solo:
   - GET /api/admin/users: paginado con límite máximo, solo campos seguros (id, name, email, emailVerified, role, createdAt), nunca datos de Account.
   - PATCH /api/admin/users/:id/role: validado con zod; no dejar el sistema sin ADMIN; un admin no puede cambiar su propio rol; si se quitan privilegios, revocar todas las sesiones de ese usuario.
6. Bootstrap del primer admin: script (pnpm admin:bootstrap) que lee ADMIN_EMAIL del env, es idempotente y falla con mensaje claro si el usuario no existe. Sin endpoint HTTP. Documéntalo en el README como paso obligatorio al arrancar un proyecto nuevo.
7. Verifica en la fuente instalada que advanced.database.joins: true mantiene el rol fresco por request y que cookieCache no está activo. Deja un test (degradar a un admin con sesión activa → su siguiente petición admin da 403) y un comentario en config/auth.ts avisando del riesgo de activar cookieCache.
8. Logs con pino de quién cambia el rol de quién, sin datos sensibles.
9. No añadas bans, impersonation, tablas de auditoría ni nada específico de un dominio. Si ves puntos de extensión útiles para proyectos derivados, solo documéntalos en el README (por ejemplo, el plugin organization para multi-tenant, como extensión opcional).

Tests mínimos: 401 sin sesión; 403 con USER; 403 con ADMIN no verificado; 200 con ADMIN verificado; requirePermission y requireRole con un rol de prueba añadido solo en test; cambio de rol correcto; protección del último admin; auto-degradación rechazada; sesiones revocadas al quitar privilegios; paginación con límite; tests anti-escalada.

Restricciones de siempre: avisa antes de instalar dependencias (no deberían hacer falta), cambios mínimos, estilo del repo, no expongas tokens en bodies, no uses migrate dev contra producción.
Entrega: archivos modificados, decisiones, resultados de format/lint/typecheck/test y riesgos pendientes.

### L2 — Evidencia de exploración

- `prisma/schema.prisma`: `User` sin rol; `Session`, `Account`, `Verification` estándar de better-auth.
- `src/config/auth.ts`: `prismaAdapter`, `advanced.database.joins: true`, sin `session.cookieCache`.
- Fuente instalada `better-auth@1.7.11`: `dist/api/routes/session.mjs` sólo usa la cookie caché si `options.session.cookieCache.enabled === true`; en caso contrario llama a `internalAdapter.findSession(token)` en cada request (rol fresco). `dist/db/schema.mjs parseInputData` aplica el `defaultValue` a los campos `input: false` en creación, así que un `role` enviado en el body no se persiste.
- `src/test/setup.ts` fija `NODE_ENV=test`; `vitest.config.ts` desactiva paralelismo entre ficheros; `resetDatabase()` trunca las tablas.
- Postgres local accesible en `localhost:5432`; existe `.env` con base `authkit`, no existe `.env.test` (se crea local, ignorado por git).

### L3 — Decisiones de implementación

- `permissions.ts` exporta `PERMISSIONS` (const), `ROLE_PERMISSIONS` como `Record<Role, ...>` para que ampliar el enum sin mapear el rol rompa el typecheck, y helpers `resolveRole`, `permissionsFor`, `hasPermission`, `losesPrivileges`.
- El cambio de rol corre en `prisma.$transaction` con `isolationLevel: 'Serializable'` para que dos degradaciones concurrentes no puedan dejar el sistema sin admins.
- Respuestas: `{ users, pagination: { page, limit, total, pages } }` y `{ user }`; nunca tokens ni datos de `Account`.
- `requireRole`/`requirePermission` no releen la sesión: asumen `requireAuth` previo y devuelven 401 defensivo si falta `req.auth`.
- `pino` no estaba instalado; se instala porque S8 lo exige (aviso en la entrega).

### L4 — Verificación

- `pnpm format:check` → OK; `pnpm lint` → OK; `pnpm typecheck` → OK.
- `pnpm --filter api test` → 12 archivos, **93 tests OK**.
- Verificador independiente (S1–S10): 0 bloqueadores, 6 avisos. Se corrigió el aviso
  operativo del bootstrap (aviso si el email no está verificado + nota en README) y se
  añadieron tests de límites de paginación y tipos inválidos de `role`.
- Avisos pendientes (no bloquean): conflicto de transacción concurrente puede devolver
  500 (el invariante de ≥1 ADMIN se mantiene); `page` sin cota superior (OFFSET
  profundo); el último admin puede borrarse la cuenta por el endpoint preexistente
  `DELETE /api/users/me`; TOCTOU mínimo si al actor lo degradan a mitad de la petición.
