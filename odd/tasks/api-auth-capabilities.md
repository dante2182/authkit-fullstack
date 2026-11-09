# Feature: modos de autenticación y contrato de capacidades (API)

Objetivo: que la API de `apps/api` pueda arrancar en modo "solo credenciales", "solo proveedores" o "ambos", y publicar sus capacidades para que el frontend componga la pantalla de acceso sin duplicar configuración.
Rama: `feat/api-auth-capabilities`. Runner: `pnpm --filter api test` (Vitest + Supertest, Postgres de test).

## Specs

- **S1 — Flags de entorno**: `AUTH_EMAIL_PASSWORD_ENABLED` y `AUTH_SIGN_UP_ENABLED` en `src/config/env.ts`, con el helper `booleanFlag` existente, valores `"true"`/`"false"` y default `true`. Ausentes o vacías equivalen al default. Documentadas en `apps/api/.env.example`.
- **S2 — Guarda de arranque**: si `AUTH_EMAIL_PASSWORD_ENABLED=false` y no hay ninguna pareja completa de proveedor social, el esquema de entorno falla con un mensaje que explica que no quedaría ningún método de acceso.
- **S3 — Fuente única**: un solo módulo deriva las capacidades desde `env` y `src/config/auth.ts` consume ese mismo módulo. La lista pública de proveedores no se escribe a mano en dos sitios.
- **S4 — Endpoint**: `GET /api/config/auth` público (sin sesión, sin rate limit de `/auth`) que responde `{ emailPassword: { enabled, signUpEnabled }, socialProviders: string[] }`, con proveedores en orden estable `google`, `github`.
- **S5 — Enforcement de credenciales**: con `AUTH_EMAIL_PASSWORD_ENABLED=false`, `POST /api/auth/sign-in/email` y `POST /api/auth/sign-up/email` responden `400` con `EMAIL_PASSWORD_DISABLED` / `EMAIL_PASSWORD_SIGN_UP_DISABLED`. Con `AUTH_SIGN_UP_ENABLED=false`, el registro por email responde `400 EMAIL_PASSWORD_SIGN_UP_DISABLED` pero el login de un usuario existente sigue funcionando.
- **S6 — Enforcement social**: un proveedor no configurado responde `404 PROVIDER_NOT_FOUND`; uno configurado inicia el flujo en `POST /api/auth/sign-in/social`. La UI no es la que aplica la regla.
- **S7 — Registro social**: con `AUTH_SIGN_UP_ENABLED=false`, cada proveedor configurado recibe `disableSignUp: true` (mismo comportamiento que el registro por credenciales).
- **S8 — Documentación**: `README.md` raíz con una sección de modos, tabla de endpoint y las dos variables; `.env.example` con comentarios. Se documenta el comportamiento por defecto de better-auth para account linking sin cambiarlo.
- **S9 — Sin regresiones**: con los defaults (ambos flags `true`) el comportamiento y las respuestas de hoy no cambian. Sin dependencias nuevas ni cambios de esquema o migraciones.
- **S10 — Tests**: matriz credenciales on/off, registro on/off y proveedor configurado/no configurado, siempre contra la app real reimportada con `vi.stubEnv`. Checks finales: `format:check`, `lint`, `typecheck`, `test`.

## Tasks

| ID  | Specs      | Ruta   | Estado   | Evidencia                                                     |
| --- | ---------- | ------ | -------- | ------------------------------------------------------------- |
| T1  | S1, S2     | inline | hecho    | `src/config/env.ts` + 5 tests en `env.test.ts` (RED → GREEN)  |
| T2  | S3, S4     | inline | hecho    | `auth-capabilities.ts` + `modules/config/config.routes.ts`    |
| T3  | S5, S6, S7 | inline | hecho    | 5 tests de enforcement en `modules/config/config.test.ts`     |
| T4  | S8         | inline | hecho    | `README.md` + `apps/api/.env.example`                         |
| T5  | S9, S10    | inline | en curso | format/lint/typecheck OK; 114 tests OK; verificador pendiente |

## Log

### L1 — Petición original (verbatim)

okey primero vamos a iniciar con el backend:

- crea una nueva rama
- empieza con todo lo que se tiene que me dijiste

### L2 — Evidencia de exploración

- `src/config/auth.ts` ya registraba Google/GitHub solo con la pareja completa; `emailAndPassword.enabled` estaba fijo en `true`.
- Fuente instalada `better-auth@1.7.11`: `sign-in.mjs` lanza `400 EMAIL_PASSWORD_DISABLED` si `enabled` es falso; `sign-up.mjs` lanza `400 EMAIL_PASSWORD_SIGN_UP_DISABLED` si `enabled` es falso **o** `disableSignUp` es true; un `provider` no registrado devuelve `404 PROVIDER_NOT_FOUND`.
- `src/app.ts` monta `app.all('/api/auth/*splat')` antes de `express.json()`, así que el contrato se expone en `/api/config/auth` por el router normal (sin rate limit ni body crudo).
- Patrón de tests por modo: `vi.stubEnv` + `vi.resetModules()` + import dinámico de `app.js` (ya usado en `sensitive-rate-limit.test.ts`).
- No existía `.env.test` local; se creó (ignorado por git) para poder observar RED/GREEN.

### L3 — Decisiones de implementación

- Flags `AUTH_EMAIL_PASSWORD_ENABLED` y `AUTH_SIGN_UP_ENABLED`, ambos default `true`: los proyectos existentes no cambian nada.
- `AUTH_SIGN_UP_ENABLED` cubre credenciales y proveedores sociales: una sola decisión de producto para dos mecanismos.
- El contrato público es mínimo (`emailPassword.enabled`, `emailPassword.signUpEnabled`, lista de proveedores). No se añade un `mode` derivable.
- Account linking no se modifica: se documenta el default de better-auth y cómo cambiarlo, sin decidir producto dentro de este cambio.
- El endpoint responde `Cache-Control: no-store` porque el contrato cambia al desplegar.

### L4 — Verificación

- `pnpm format:check` → OK; `pnpm lint` → OK; `pnpm typecheck` → OK.
- `pnpm --filter api test` → 13 archivos, **114 tests OK** (99 preexistentes + 15 nuevos).
- RED observado antes de implementar: 13 tests fallando (endpoint inexistente, flags ignorados, módulo ausente).

### L5 — Verificador independiente

- Veredicto inicial: S2–S9 cumplidos; **S1 incumplido (bloqueador)**: `booleanFlag` usaba `z.enum(...).default(...)`, y `AUTH_EMAIL_PASSWORD_ENABLED=` vacío abortaba el arranque en vez de tomar el default.
- Corrección acotada: helper `optionalBooleanFlag` (vacío → `undefined` antes de `booleanFlag`) solo para los flags nuevos; `booleanFlag` intacto para `SENSITIVE_RATE_LIMIT_ENABLED`, con test que fija ese invariante. Añadidos tests de vacío, solo espacios, mezcla vacío/`false` y valores inválidos (`yes`, `FALSE`, `1`).
- Recheck del verificador sobre `30c16d5`: **S1 resuelto**, sin bloqueadores nuevos. Probes de arranque real: vacíos → `true/true`; `false` sin proveedor → exit 1 con la guarda; `false` + pareja Google → arranca; ausentes → defaults; `SENSITIVE_RATE_LIMIT_ENABLED=` → mismo rechazo que en `8927df3`.
- Avisos aceptados sin cambio: `env.ts` mantiene su propia enumeración de proveedores para validar parejas (no es la lista pública); no se añade un test de rate limit para `/api/config/auth` porque el montaje en `app.ts` lo hace estructuralmente imposible.
- Tras el lote: `pnpm --filter api test` → **115 tests OK**.
