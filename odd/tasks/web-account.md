# Feature: cuenta — perfil, contraseña y sesiones en la web

Objetivo: consumir desde `apps/web` los endpoints de cuenta ya existentes en la API (perfil, cambio de contraseña y gestión de sesiones) en una página protegida `/account`.
Rama: `feat/web-admin-panel`. Checks: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm --filter web build`.

## Specs

- **S1 — Arquitectura**: nueva feature `src/features/account` con `types/`, `services/`, `lib/`, `components/`, `pages/` y barril `@/features/account`; se consume desde fuera solo por el barril. Los componentes de formulario genéricos (`TextField`, `PasswordField`, `SubmitButton`) y `authErrorMessage` se reutilizan desde el barril de `auth`. Sin dependencias nuevas.
- **S2 — Perfil**: formulario de nombre con Zod + React Hook Form (1–80 caracteres, `trim`), `PATCH /api/users/me` con `{ name }`; tras el éxito se llama a `refreshSession()` para actualizar el contexto y se muestra confirmación.
- **S3 — Contraseña**: formulario con contraseña actual, nueva y confirmación (mínimo 8, máximo 128, coincidencia validada); `POST /api/auth/change-password` con `{ currentPassword, newPassword, revokeOtherSessions }`. `INVALID_PASSWORD` traducido. Si se revocan otras sesiones, se refresca la sesión tras el cambio.
- **S4 — Sesiones**: `GET /api/auth/list-sessions` + `GET /api/auth/get-session` para identificar la sesión actual por `token`; lista con navegador/SO, IP, creación y caducidad; la sesión actual se marca y no se puede revocar desde la lista (para eso está el logout). Revocar una (`POST /api/auth/revoke-session` con `{ token }`) y revocar las demás (`POST /api/auth/revoke-other-sessions`), actualizando la lista sin recargar.
- **S5 — Navegación**: ruta `/account` bajo `ProtectedRoute`; cabecera compartida `src/components/AppHeader.tsx` con enlace "Cuenta" para todos y "Usuarios" solo para ADMIN, usada por dashboard y cuenta. El bloque "próximamente" del dashboard pasa a enlazar a la cuenta.
- **S6 — UI**: Tailwind, copy en español, formularios accesibles (label, `aria-invalid`, `aria-describedby`), estados de carga/deshabilitado y errores/éxitos visibles.
- **S7 — Checks**: `format:check`, `lint`, `typecheck` y `build` de `apps/web` en verde.

## Tasks

| ID  | Specs  | Ruta   | Estado | Evidencia                          |
| --- | ------ | ------ | ------ | ---------------------------------- |
| T1  | S1     | inline | hecho  | types + service + lib              |
| T2  | S2, S3 | inline | hecho  | formularios de perfil y contraseña |
| T3  | S4     | inline | hecho  | lista de sesiones                  |
| T4  | S5     | inline | hecho  | AppHeader + ruta + dashboard       |
| T5  | S6, S7 | inline | hecho  | checks + README                    |

## Log

### L1 — Petición original (verbatim)

Sí, arranca la Fase 2 (perfil, cambio de contraseña y gestión de sesiones) con este alcance. Incluye: página `/account`, editar nombre con `PATCH /api/users/me`, cambiar contraseña con `POST /api/auth/change-password` (opción de revocar otras sesiones), listar sesiones con `GET /api/auth/list-sessions`, revocar una sesión y revocar las demás. Dejo fuera el borrado de cuenta para una fase posterior por ser destructivo.

### L2 — Evidencia de exploración

- `users.routes.ts`: `GET /api/users/me`, `PATCH /api/users/me` y `DELETE /api/users/me`, todos tras `requireAuth`.
- `users.schema.ts`: `{ name?: string.trim().min(1).max(80), image?: url|null }`, al menos un campo. `PATCH` responde `{ user }`.
- better-auth instalado: `GET /list-sessions` devuelve un array de sesiones que incluye `token`; `POST /revoke-session` recibe `{ token }`; `POST /revoke-other-sessions` conserva la actual; `POST /change-password` recibe `{ currentPassword, newPassword, revokeOtherSessions? }` y con `revokeOtherSessions` emite cookie nueva.
- Tests de la API (`session-management.test.ts`): 401 sin sesión, revocación de sesión ajena no borra nada, cambio de contraseña rechaza la actual incorrecta con `INVALID_PASSWORD`.
- Web: `useAuth()` expone `user`, `refreshSession` y `signOut`; `request()` centraliza la cookie httpOnly; `authErrorMessage` traduce códigos de better-auth y hoy no incluye `INVALID_PASSWORD`.
- `AuthSession` del web no declara `token`, necesario para marcar la sesión actual.

### L3 — Decisiones

- `AppHeader` compartido en `src/components` para no duplicar la cabecera entre dashboard y cuenta; el dashboard deja de tener su propio header.
- La sesión actual no se revoca desde la lista: el logout ya es la salida y evita dejar la UI con una cookie muerta.
- El token de sesión se compara contra `GET /api/auth/get-session`; no se guarda en ningún almacenamiento.
- `accountService.getSession()` se declara en la feature porque `authService` no se exporta y exponerlo entero acoplaría más de lo necesario.
- Se añade `INVALID_PASSWORD` al mapa compartido de `auth-errors.ts` en vez de duplicar traducciones.
- `revokeOtherSessions` viene marcado por defecto: un cambio de contraseña debe expulsar a los demás dispositivos salvo que el usuario lo desmarque.
- Cambiar la contraseña con revocación rota el token actual. `AccountPage` mantiene `sessionsVersion` y remonta `SessionsList` con `key` para que el efecto rerele la lista con la cookie nueva; no se reutiliza el token viejo.
- Tras revocar una sesión se incrementa `reloadKey`: better-auth responde 200 incluso con un token ajeno, así que el filtro optimista se confirma contra el servidor.

### L4 — Verificación

- `pnpm format:check` → OK.
- `pnpm lint` (api + web) → OK.
- `pnpm typecheck` (api + web) → OK.
- `pnpm --filter web build` → OK (2070 módulos, bundle 468.37 kB).
- Verificador independiente: 2 bloqueadores, resueltos en una corrección y recheck limitado:
  - **S7**: `format:check` fallaba por la tabla de `web-account.md`. Corregido con `pnpm format`.
  - **S4**: tras cambiar la contraseña con `revokeOtherSessions`, la lista seguía mostrando el token muerto como "Esta sesión" y las sesiones revocadas. Ahora `PasswordForm` avisa solo en éxito y solo con la opción activa; `AccountPage` remonta `SessionsList` con un `key`, que relee lista y sesión actual con la cookie nueva.
  - Recheck: ambos **RESOLVED**, ningún bloqueador nuevo.
- Avisos aplicados: tipo de respuesta de `change-password` corregido a `{ token, user }`; comentario de `AppHeader` ajustado; revocaciones revalidadas contra el servidor.
- Avisos pendientes (no bloquean): `apps/web` sigue sin runner de tests; `AdminUsersPage` mantiene su propia cabecera (no usa `AppHeader`).
- Sin prueba contra la API en local (base `authkit` con migraciones pendientes); contratos verificados contra el código instalado de better-auth y los tests de la API.
- Commit de la fase: `e66ecc0` (17 archivos, 783 líneas). Incluye un refactor pequeño del header del dashboard a `src/components/AppHeader.tsx` para compartirlo con la cuenta.
