# web

Frontend de AuthKit: **React 19 + Vite 8 + TypeScript 6 + Tailwind CSS 4**.

## Comandos

```bash
pnpm dev          # servidor de desarrollo en http://localhost:5173
pnpm build        # typecheck (tsc -b) + build de producción
pnpm preview      # sirve el build de dist/
pnpm lint         # ESLint (flat config)
pnpm lint:fix     # ESLint con --fix
pnpm typecheck    # solo TypeScript, sin emitir
```

Desde la raíz del monorepo: `pnpm --filter web <comando>`.
El formato se ejecuta siempre desde la raíz (`pnpm format` / `pnpm format:check`), no por app.

## Variables de entorno

Copia `.env.example` a `.env`:

| Variable       | Descripción            |
| -------------- | ---------------------- |
| `VITE_API_URL` | URL base de `apps/api` |

Los tipos están declarados en `src/vite-env.d.ts` (`ImportMetaEnv`), así que añadir una variable
nueva requiere declararla ahí para tener autocompletado.

## Estructura

```
src/
├─ app/
│  ├─ App.tsx           # providers + RouterProvider
│  ├─ router.tsx        # rutas y guards
│  └─ NotFoundPage.tsx
├─ features/
│  ├─ auth/
│  │  ├─ components/    # layout, campos, guards y botones
│  │  ├─ context/       # AuthContext
│  │  ├─ hooks/         # useAuth
│  │  ├─ lib/           # traducción de errores de autenticación
│  │  ├─ pages/         # login, registro, recuperación y verificación
│  │  ├─ providers/     # AuthProvider (restaura la sesión)
│  │  ├─ services/      # llamadas a la API
│  │  ├─ types/         # contrato de sesión y usuario
│  │  └─ index.ts       # API pública de la feature
│  ├─ admin/
│  │  ├─ components/    # guard, tabla, selector de rol y paginación
│  │  ├─ lib/           # etiquetas de rol y traducción de errores
│  │  ├─ pages/         # listado y cambio de rol de usuarios
│  │  ├─ services/      # llamadas a /api/admin
│  │  ├─ types/         # contrato del módulo admin
│  │  └─ index.ts       # API pública de la feature
│  └─ dashboard/
│     └─ pages/         # destino protegido de ejemplo
├─ lib/cn.ts            # helper de clases CSS
├─ services/http.ts     # cliente HTTP único (cookie httpOnly)
├─ types/api.ts
├─ main.tsx             # entry point (createRoot)
├─ index.css            # @import "tailwindcss"
└─ vite-env.d.ts        # tipos de import.meta.env
```

Las features solo se importan desde fuera por su barril (`@/features/auth`); dentro usan rutas
relativas. El **React Compiler** está activado vía `babel-plugin-react-compiler` en `vite.config.ts`.

## Autenticación

El frontend consume estos endpoints de `apps/api`:

| Pantalla               | Endpoint                                                                |
| ---------------------- | ----------------------------------------------------------------------- |
| Registro               | `POST /api/auth/sign-up/email`                                          |
| Login                  | `POST /api/auth/sign-in/email`                                          |
| Login social           | `POST /api/auth/sign-in/social` + `GET /api/auth/callback/:provider`    |
| Logout                 | `POST /api/auth/sign-out`                                               |
| Restaurar sesión       | `GET /api/auth/get-session`                                             |
| Olvidé mi contraseña   | `POST /api/auth/request-password-reset`                                 |
| Restablecer contraseña | `POST /api/auth/reset-password`                                         |
| Verificar email        | `GET /api/auth/verify-email` + `POST /api/auth/send-verification-email` |

Los endpoints son los nativos de better-auth. `GET /api/auth/get-session` responde `200`
con `null` cuando no hay sesión.

La sesión vive en una cookie `httpOnly`: el cliente usa `credentials: 'include'` y nunca guarda
tokens en el navegador.

Rutas del frontend: `/login`, `/register`, `/forgot-password`, `/reset-password?token=…`,
`/verify-email`, `/dashboard` y `/admin/users` (protegidas). `/` redirige a `/dashboard`.

## Administración

`/admin/users` consume el módulo admin de la API:

| Pantalla        | Endpoint                          |
| --------------- | --------------------------------- |
| Listar usuarios | `GET /api/admin/users?page&limit` |
| Cambiar rol     | `PATCH /api/admin/users/:id/role` |

`AdminRoute` exige sesión, rol `ADMIN` y email verificado; la autorización real la
impone la API (`requireAuth → requireVerifiedEmail → requirePermission`). La tabla
muestra solo campos públicos y nunca datos de `Account`. El selector de rol pide
confirmación y refleja los errores de negocio de la API (último administrador,
auto-degradación, permisos insuficientes).

La API redirige los enlaces de correo a `CORS_ORIGIN/reset-password` y `CORS_ORIGIN/verify-email`,
así que `CORS_ORIGIN` en `apps/api/.env` debe coincidir con la URL del frontend.

## Notas de formato y lint

- Prettier se configura una sola vez en la raíz (`prettier.config.mjs`) e incluye
  `prettier-plugin-tailwindcss` (`tailwindStylesheet: ./apps/web/src/index.css`,
  `tailwindFunctions: ['cn', 'clsx', 'cva', 'twMerge']`): las clases se ordenan solas al formatear.
  No hay `prettier.config.mjs` propio en esta app.
- ESLint (`eslint.config.js`) usa `eslint-config-prettier` al final, por lo que no duplica reglas de estilo.
