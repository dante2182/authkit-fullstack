# web

Frontend de AuthKit: **React 19 + Vite 8 + TypeScript 6 + Tailwind CSS 4**.

## Comandos

```bash
pnpm dev          # servidor de desarrollo en http://localhost:5173
pnpm build        # typecheck (tsc -b) + build de producción
pnpm preview      # sirve el build de dist/
pnpm lint         # ESLint (flat config)
pnpm lint:fix     # ESLint con --fix
pnpm test:composition  # renderiza login/registro por modo y comprueba qué pinta
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
│  │  ├─ components/    # layout, campos, botones sociales y guards
│  │  ├─ context/       # AuthContext (sesión) y AuthCapabilitiesContext (métodos)
│  │  ├─ hooks/         # useAuth y useAuthCapabilities
│  │  ├─ lib/           # traducción de errores de autenticación
│  │  ├─ pages/         # login, registro, recuperación y verificación
│  │  ├─ providers/     # AuthProvider (sesión) y AuthCapabilitiesProvider
│  │  ├─ services/      # llamadas a la API
│  │  ├─ types/         # contrato de sesión, usuario y capacidades
│  │  └─ index.ts       # API pública de la feature
│  ├─ admin/
│  │  ├─ components/    # guard, tabla, selector de rol y paginación
│  │  ├─ lib/           # etiquetas de rol y traducción de errores
│  │  ├─ pages/         # listado y cambio de rol de usuarios
│  │  ├─ services/      # llamadas a /api/admin
│  │  ├─ types/         # contrato del módulo admin
│  │  └─ index.ts       # API pública de la feature
│  ├─ account/
│  │  ├─ components/    # perfil, contraseña y lista de sesiones
│  │  ├─ lib/           # descripción de user-agent y fechas
│  │  ├─ pages/         # página /account
│  │  ├─ services/      # llamadas a /api/users/me y /api/auth
│  │  ├─ types/         # contrato de cuenta y sesiones
│  │  └─ index.ts       # API pública de la feature
│  └─ dashboard/
│     └─ pages/         # destino protegido de ejemplo
├─ components/
│  └─ AppHeader.tsx     # cabecera compartida de páginas privadas
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
| Capacidades de acceso  | `GET /api/config/auth`                                                  |
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

### Métodos de acceso

La pantalla de acceso no se configura en el frontend: la compone con lo que publica
`GET /api/config/auth`.

```json
{ "emailPassword": { "enabled": true, "signUpEnabled": true }, "socialProviders": ["google"] }
```

`AuthCapabilitiesProvider` pide ese contrato una vez al arrancar y lo comparte por contexto.
Es estado independiente de la sesión: si la consulta falla, solo se ven afectadas las pantallas
de acceso (muestran el error y un reintento); las rutas protegidas siguen funcionando.

`LoginPage` y `RegisterPage` pintan, en este orden:

1. Cargando: solo el indicador; no se adelanta un método que luego desaparece.
2. Error: aviso y botón de reintento. Sin contrato no se inventan métodos (falla cerrado).
3. Sin ningún método: aviso de configuración del servidor.
4. Registro cerrado (`signUpEnabled: false`): en `/register`, mensaje neutro, sin formulario.
   En `/login` se oculta el enlace para crear cuenta.
5. Si hay credenciales: formulario. Si hay proveedores: `SocialButtons`, separados por `AuthDivider`
   cuando conviven ambos.

Los proveedores salen de `socialProviders`, así que un id desconocido se pinta con su nombre
crudo en vez de romper la página. El login social llama a `POST /api/auth/sign-in/social` con
`callbackURL` y navega a la `url` devuelta: la sesión se crea en el callback del backend,
nunca en el SPA.

La regla la aplica la API, no la UI: aunque alguien llame al endpoint directamente, un método
apagado responde `400 EMAIL_PASSWORD_DISABLED` / `400 EMAIL_PASSWORD_SIGN_UP_DISABLED`, y un
proveedor sin configurar `404 PROVIDER_NOT_FOUND`. Esos códigos están traducidos en
`lib/auth-errors.ts`.

Si el callback del proveedor falla, better-auth vuelve a la misma pantalla con `?error=<código>`.
`SocialButtons` envía `errorCallbackURL` para eso; `useOAuthCallbackError` captura el código,
lo traduce y limpia la URL para que recargar no repita el aviso. El caso típico es
`account_not_linked`: ya existe una cuenta con ese correo pero no verificó el email, así que
la vinculación automática se rechaza y hay que entrar con la contraseña y verificar el correo.

Rutas del frontend: `/login`, `/register`, `/forgot-password`, `/reset-password?token=…`,
`/verify-email`, `/dashboard`, `/account` y `/admin/users` (protegidas). `/` redirige a
`/dashboard`.

## Cuenta

`/account` consume los endpoints de perfil y sesiones:

| Pantalla           | Endpoint                               |
| ------------------ | -------------------------------------- |
| Editar perfil      | `PATCH /api/users/me`                  |
| Cambiar contraseña | `POST /api/auth/change-password`       |
| Listar sesiones    | `GET /api/auth/list-sessions`          |
| Sesión actual      | `GET /api/auth/get-session`            |
| Revocar una sesión | `POST /api/auth/revoke-session`        |
| Revocar las demás  | `POST /api/auth/revoke-other-sessions` |

La sesión actual se identifica comparando el `token` de `list-sessions` con el de
`get-session`; el token no se guarda en el navegador. La sesión actual no se revoca
desde la lista: para eso está el logout. Al cambiar la contraseña con
`revokeOtherSessions`, la API emite una cookie nueva y la UI relee la sesión.

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
