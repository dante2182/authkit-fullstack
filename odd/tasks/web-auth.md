# Feature: interfaz de autenticación web

Objetivo: implementar la sección de autenticación de `apps/web` consumiendo la API existente (registro, login, logout, recuperación de contraseña, verificación de email, restauración de sesión y ruta protegida).
Rama: `main` (sin commits; entrega en árbol de trabajo). Checks: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm --filter web build`.

## Specs

- **S1 — Arquitectura**: la lógica vive en `src/features/auth` con `types/`, `services/`, `context/`, `providers/`, `components/` y `pages/`; se consume desde fuera solo por su barril `@/features/auth`. El destino protegido vive en `src/features/dashboard`. Sin dependencias nuevas.
- **S2 — Cliente HTTP**: todos los servicios usan `request()` de `src/services/http.ts` (`credentials: 'include'`); ningún token viaja en bodies ni se guarda en `localStorage`.
- **S3 — Registro**: `name`, `email`, `password` y confirmación con Zod + React Hook Form; el registro inicia sesión y redirige a `/dashboard`.
- **S4 — Login**: `email` y `password`; redirige al destino original (`location.state.from`) o a `/dashboard`; errores traducidos a español.
- **S5 — Logout**: llama a `POST /api/auth/logout`, limpia el estado local y vuelve a `/login`.
- **S6 — Olvidé mi contraseña**: formulario de email con respuesta genérica (no revela si la cuenta existe).
- **S7 — Restablecer contraseña**: lee `?token=` y `?error=`; formulario de nueva contraseña + confirmación; éxito → enlace a login.
- **S8 — Verificar email**: página pública que interpreta el redirect de la API (`?error=INVALID_TOKEN|TOKEN_EXPIRED|...`), refresca la sesión y ofrece el siguiente paso.
- **S9 — Restauración de sesión**: `AuthProvider` consulta `GET /api/auth/session` al arrancar; expone `user`, `isLoading`, `refreshSession` y `signOut`; un 401 significa "sin sesión", no un error.
- **S10 — Guards**: `GuestRoute` (login/registro/olvidé) y `ProtectedRoute` (`/dashboard`); `/` redirige a `/dashboard`; 404 propia.
- **S11 — UI**: Tailwind, copy en español, formularios accesibles (label, `aria-invalid`, `aria-describedby`), estados de carga y deshabilitado, errores y éxitos visibles.
- **S12 — Checks**: `format:check`, `lint`, `typecheck` y `build` de `apps/web` en verde.

## Tasks

| ID  | Specs   | Ruta   | Estado | Evidencia                          |
| --- | ------- | ------ | ------ | ---------------------------------- |
| T1  | S1, S2  | inline | hecho  | types + service + errores          |
| T2  | S9, S10 | inline | hecho  | AuthProvider + guards              |
| T3  | S11     | inline | hecho  | layout y componentes de formulario |
| T4  | S3–S8   | inline | hecho  | páginas de auth                    |
| T5  | S10     | inline | hecho  | dashboard + router + 404           |
| T6  | S12     | inline | hecho  | checks + README web                |

## Log

### L1 — Petición original (verbatim)

ahora analizando el proyecto pasemos al apartado web, vamos iniciar con la interface de utenticaion:

- segun la arquitectura vamos a consumir la api para, register, login, logout, reset-password y lo demas que lleva toda esa seccion

### L2 — Evidencia de exploración

- `apps/web/src` solo tiene `app/App.tsx` (placeholder), `main.tsx`, `services/http.ts`, `types/api.ts`, `index.css` y carpetas vacías por feature (`auth`, `dashboard`).
- `request()` adjunta `credentials: 'include'` y lanza `ApiError` con `{ status, code, message }`.
- ESLint prohíbe imports `@/features/*/*` fuera de la feature: se consume solo por barril y dentro se usan rutas relativas.
- `tsconfig.app.json`: `verbatimModuleSyntax`, `noUnusedLocals/Parameters`, `erasableSyntaxOnly`. No hay `strict`, pero el código se escribe apto para strict.
- API: `POST /auth/register|login|logout`, `GET /auth/session`, `POST /auth/forgot-password|reset-password|send-verification-email`, `GET /auth/verify-email`.
- `GET /api/auth/session` responde `{ session, user }` con `user.role` (`USER`/`ADMIN`) y `user.emailVerified`.
- Recuperación: `forgot-password` redirige a `CORS_ORIGIN/reset-password?token=...` o `?error=INVALID_TOKEN`.
- Verificación: la API redirige a `CORS_ORIGIN/verify-email` sin query en éxito, o con `?error=...` en fallo.
- Códigos de error relevantes: `INVALID_EMAIL_OR_PASSWORD`, `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`, `EMAIL_NOT_VERIFIED`, `RATE_LIMITED`, `VALIDATION_ERROR`, `NETWORK_ERROR`.

### L3 — Decisiones

- `AuthProvider` no implementa login/registro: las páginas llaman al service y luego `refreshSession()`, validando la cookie contra la API.
- `unauthorized` (401) al restaurar sesión se trata como "sin sesión"; cualquier otro fallo también deja `user = null` y se registra en consola (la app no puede funcionar sin API).
- `reset-password` y `verify-email` quedan fuera de `GuestRoute`: un usuario con sesión también debe poder usarlos.
- El registro inicia sesión (la API no exige email verificado); el dashboard muestra el estado y permite reenviar la verificación.
- No se añaden dependencias: React Hook Form, Zod, React Router y lucide-react ya están instalados.

### L4 — Verificación

- `pnpm format:check` → OK.
- `pnpm lint` (api + web) → OK.
- `pnpm typecheck` (api + web) → OK.
- `pnpm --filter web build` → OK (2050 módulos, bundle 438.6 kB).
- Archivos nuevos: `src/lib/cn.ts`; `features/auth/{types,services,lib,context,hooks,providers,components,pages}` y barril; `features/dashboard/pages/DashboardPage.tsx`; `app/{router,NotFoundPage}.tsx`; `apps/web/.env` (ignorado por git).
- Ajuste durante el lint: `react-hooks/set-state-in-effect` rechaza llamar a `refreshSession()` desde el efecto inicial; la carga inicial usa promesas con callback y `active` para evitar setState tras desmontar.
- No se probó contra la API en local porque la base `authkit` sigue con migraciones pendientes (`db:deploy`). Los contratos usados están cubiertos por los 93 tests del API.

### L5 — Revisión nativa (RDD)

- `assess` → `risk: high` (hot path `auth`), `review_due: true`.
- Candidato `sha256:4086f0c8…b958e`, lineage `review-d75af751c5ab6231`, 35 archivos / 1442 líneas.
- Consentimiento del usuario: **granted** (revisar este cambio).
- Lentes: `risk`, `resilience`, `readability`, `reliability` (4 revisores admitidos, ninguno bloqueante).
- Resultado: **approved**; authority `burned` en `sha256:818796a0…9183e5`. Sin correcciones.
- 19 hallazgos informativos (no abren corrección, no reabren la revisión). Los más relevantes para una siguiente fase:
  - Logout: si `POST /auth/logout` falla, `signOut` limpia el estado local en `finally` y la UI navega a `/login`; la cookie del servidor puede seguir viva y la sesión se restaura al recargar (shared device).
  - Tras login/registro, `refreshSession()` no propaga errores: si falla, se navega a `/dashboard` y `ProtectedRoute` devuelve al login sin mensaje.
  - Restauración inicial: cualquier fallo distinto de 401 se trata como anónimo (sin reintento ni aviso visible).
  - `isLoading` depende de una única promesa sin timeout: si nunca resuelve, la app queda en el loader.
  - Sin tests automatizados en `apps/web` (solo format/lint/typecheck/build).

### L6 — Corrección de hallazgos 1 y 2 (pedido del usuario)

- `signOut` ya no limpia el estado en `finally`: si `POST /auth/logout` falla con algo distinto de 401, relanza y la sesión local se mantiene. El dashboard muestra el error y permanece en la página; solo navega a `/login` si el servidor invalidó la cookie.
- `refreshSession` devuelve `AuthUser | null`. Login y registro comprueban el valor: si no hay sesión confirmada, muestran un mensaje en vez de navegar a `/dashboard` y rebotar al login sin explicación.
- `authErrorMessage` se exporta desde el barril de la feature para que el dashboard traduzca el fallo de logout.
- Verificación: `format:check`, `lint`, `typecheck` y `build` web en verde. Sin tests ejecutables en `apps/web`: excepción declarada del policy test-first.
