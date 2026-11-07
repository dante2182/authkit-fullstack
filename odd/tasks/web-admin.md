# Feature: UI de administración de usuarios en la web

Objetivo: consumir desde `apps/web` el módulo admin ya existente en la API (listado paginado y cambio de rol) con una página protegida solo para ADMIN con email verificado.
Rama: `feat/web-admin-panel`. Checks: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm --filter web build`.

## Specs

- **S1 — Arquitectura**: nueva feature `src/features/admin` con `types/`, `services/`, `lib/`, `components/`, `pages/` y barril `@/features/admin`; se consume desde fuera solo por el barril. Imports internos relativos. Sin dependencias nuevas.
- **S2 — Contrato**: consume `GET /api/admin/users?page&limit` (respuesta `{ users, pagination: { page, limit, total, pages } }`) y `PATCH /api/admin/users/:id/role` (`{ role }` → `{ user }`). Campos de usuario: `id, name, email, emailVerified, role, createdAt`. Nunca `Account`.
- **S3 — Página**: `AdminUsersPage` en `/admin/users`: tabla con `name`, `email`, `emailVerified`, `role`, `createdAt`, paginación de 20 por página (límite máximo de la API 100), estados de carga, vacío y error.
- **S4 — Guard**: `AdminRoute` exige sesión, `role === 'ADMIN'` y `emailVerified === true` (la API devuelve 403 sin ellos). Sin sesión redirige a `/login`; sin permisos o sin verificar muestra una pantalla de acceso denegado con vuelta al dashboard.
- **S5 — Cambio de rol**: selector por fila con confirmación explícita antes de aplicar. La fila del usuario actual no permite el cambio (la API responde 400). Errores de la API visibles y traducidos: 400 auto-degradación, 409 último admin, 403 permisos/email.
- **S6 — Navegación**: enlace "Usuarios" en la cabecera del dashboard, visible solo para ADMIN.
- **S7 — UI**: Tailwind, copy en español, tabla accesible (`th scope="col"`, `aria-live` para resultados), botones con estados de deshabilitado y carga; coherente con auth/dashboard.
- **S8 — Checks**: `format:check`, `lint`, `typecheck` y `build` de `apps/web` en verde.

## Tasks

| ID  | Specs  | Ruta   | Estado | Evidencia                                    |
| --- | ------ | ------ | ------ | -------------------------------------------- |
| T1  | S1, S2 | inline | hecho  | types + service + lib                        |
| T2  | S4     | inline | hecho  | AdminRoute + acceso denegado                 |
| T3  | S3, S5 | inline | hecho  | tabla, selectores, confirmación y paginación |
| T4  | S6     | inline | hecho  | enlace en dashboard                          |
| T5  | S7, S8 | inline | hecho  | checks + README web                          |

## Log

### L1 — Petición original (verbatim)

entonces vamos primero por faces, creando primero tambien una nueva rama, primero la ui del admin, luego lo que falta, antes de empezar con cada face me tienes que preguntar y esperar mi confirmacion.

### L2 — Evidencia de exploración

- API admin completa y testeada (`admin.routes.ts`, `admin.controller.ts`, `admin.service.ts`, `admin.schema.ts`): `GET /api/admin/users` y `PATCH /api/admin/users/:id/role`; cadena `requireAuth → requireVerifiedEmail → requirePermission(...)`.
- `limit` máximo 100, default 20; `page` mínimo 1. Listado ordenado por `createdAt desc`, solo campos seguros.
- Reglas: no cambiar el propio rol (400), no dejar el sistema sin ADMIN (409), revocar sesiones al quitar privilegios.
- Web: `request()` centraliza la cookie httpOnly; `useAuth()` expone `user` con `role` y `emailVerified`; `ProtectedRoute` ya guarda el destino original; ESLint prohíbe `@/features/*/*` fuera del barril.
- No hay tests en `apps/web` ni runner configurado (deuda conocida, fuera de esta fase).
- `react-hooks/set-state-in-effect` (React Compiler) rechaza `setState` síncrono dentro de un efecto: el fetch inicial seguirá el patrón de `AuthProvider` (promesa + flag `active`).

### L3 — Decisiones

- El guard vive en la web solo como UX; la autorización real sigue siendo de la API. La pantalla de acceso denegado distingue "sin rol" de "email sin verificar" porque la API los trata igual (403) pero la salida es distinta.
- El cambio de rol se confirma en un diálogo propio (sin `window.confirm`) y actualiza la fila con el usuario que devuelve la API, sin recargar la tabla.
- La fila del usuario actual deshabilita el selector: evita el 400 previsible de la API.
- No se añade caché ni librería de data fetching: `useEffect` + estado local, como el resto de la app.

### L4 — Verificación

- `pnpm format:check` → OK (tras corregir la tabla de este documento).
- `pnpm lint` (api + web) → OK.
- `pnpm typecheck` (api + web) → OK.
- `pnpm --filter web build` → OK (2061 módulos, bundle 452.44 kB).
- Verificador independiente: 2 bloqueadores, resueltos en una corrección y recheck limitado:
  - **S8**: `format:check` fallaba por la tabla de `web-admin.md` sin alinear (el primer `format` corrió antes del último edit). Corregido con `pnpm format`.
  - **Paginación**: si el fetch de una página fallaba, `page` avanzaba pero `Pagination` recibía `pagination.page`, así que _Siguiente_ caía en el early return y no reintentaba. Ahora `page` es la página solicitada, `reloadKey` fuerza el reintento y hay botón "Reintentar"; el estado vacío se oculta si hay error.
  - Recheck: ambos **RESOLVED**, ningún bloqueador nuevo.
- Avisos aplicados de paso: nombre accesible en el enlace móvil del dashboard y motivo del selector deshabilitado expuesto en `aria-label`.
- Avisos pendientes (no bloquean): sin focus trap ni foco inicial en el diálogo; tras un cambio de página fallido se mantienen las filas de la página anterior hasta que el reintento tenga éxito.
- Archivos nuevos: `features/admin/{types,lib,services,components,pages}` y barril; `app/router.tsx` (ruta `/admin/users`); `features/auth/index.ts` (exporta `Alert` y `FullPageLoader`); `features/dashboard/pages/DashboardPage.tsx` (enlace visible solo para ADMIN); `apps/web/README.md`.
- Sin tests ejecutables en `apps/web` (runner no configurado, fase posterior): la UI admin no tiene cobertura automática. Risk: item 6.
- No se probó contra la API en local (la base `authkit` sigue con migraciones pendientes); el contrato usado está cubierto por los tests de la API y por lectura directa de `admin.routes/controller/service/schema`.
- Commit de la fase: `b3a19d7` (17 archivos, 720 líneas). Supera la heurística de ~400 líneas porque es una feature nueva completa; partirla por componentes dejaría commits sin comportamiento verificable.
