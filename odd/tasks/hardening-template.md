# Feature: hardening de la plantilla AuthKit (backend, frontend e infra)

Branch: `feat/hardening-template`. Delivery: `ask-on-risk`. Runner: `pnpm check` + `pnpm --filter api test`.

## Specs

- **S1** — Account linking solo cuando el proveedor confirma `email_verified` y la cuenta local ya está verificada; en cualquier otro caso se rechaza (sin crear `Account`).
- **S2** — El rechazo de S1 cubre también emails distintos: `allowDifferentEmails` queda en `false`.
- **S3** — Rate limit por email en las rutas sensibles (`request-password-reset`, `reset-password`, `send-verification-email`), normalizando el email a minúsculas y sin revelar si el usuario existe.
- **S4** — `requireEmailVerification` de better-auth se controla con una variable de entorno booleana (default actual: `false`).
- **S5** — Duración de sesión configurable con `SESSION_EXPIRES_IN` y `SESSION_UPDATE_AGE` (segundos), con defaults de better-auth.
- **S6** — `DELETE /api/users/me` exige re-autenticación con contraseña; sin contraseña válida responde error y no borra.
- **S7** — `/api/users/*` y `/api/admin/*` tienen rate limit general.
- **S8** — `GET /api/admin/users` acepta búsqueda por email (parcial, case-insensitive) manteniendo paginación.
- **S9** — Cambio de email con re-verificación usando `changeEmail` de better-auth.
- **S10** — Un 401 global limpia la sesión local y redirige a `/login`.
- **S11** — La sección de contraseña se oculta para usuarios sin cuenta `credential`.
- **S12** — UI de borrar cuenta que pide contraseña (según S6).
- **S13** — Tests web con Vitest + Testing Library + MSW para guards, login y admin.
- **S14** — ErrorBoundary global y toasts con `sonner`.
- **S15** — Búsqueda y filtro por email en la tabla de admin (según S8) y UI de cambio de email (según S9).
- **S16** — CI ejecuta `pnpm build` y Dependabot está configurado.
- **S17** — README documenta que `EMAIL_FROM` con dominio verificado es obligatorio en producción (sin programar nada más de Resend).

## Tasks

| ID  | Specs  | Route  | Status  | Evidence                                                            |
| --- | ------ | ------ | ------- | ------------------------------------------------------------------- |
| B1  | S1, S2 | inline | hecho   | `account-linking.test.ts` 5/5 (RED config → GREEN); `pnpm check` OK |
| B2  | S3     | inline | hecho   | `sensitive-rate-limit.test.ts` 5/5 (+3 nuevos); `pnpm check` OK     |
| B3  | S4     | inline | hecho   | `require-email-verification-env.test.ts` 3/3; `pnpm check` OK       |
| B4  | S5     | inline | hecho   | `session-config.test.ts` 3/3; `pnpm check` OK                       |
| B5  | S6     | inline | hecho   | `users.test.ts` 8/8 (+2 nuevos); `pnpm check` OK                    |
| B6  | S7     | inline | hecho   | `api-rate-limit.test.ts` 3/3; `pnpm check` OK                       |
| B7  | S8     | inline | pending | —                                                                   |
| B8  | S9     | inline | pending | —                                                                   |
| F1  | S10    | inline | pending | —                                                                   |
| F2  | S11    | inline | pending | —                                                                   |
| F3  | S12    | inline | pending | —                                                                   |
| F4  | S13    | inline | pending | —                                                                   |
| F5  | S14    | inline | pending | —                                                                   |
| F6  | S15    | inline | pending | —                                                                   |
| F7  | S15    | inline | pending | —                                                                   |
| I1  | S16    | inline | pending | —                                                                   |
| I2  | S16    | inline | pending | —                                                                   |
| D1  | S17    | inline | pending | —                                                                   |

## Log

### L1 — Petición original (verbatim)

Contexto: estoy en desarrollo, sin dominio propio. Resend solo entrega
al correo con el que creé la cuenta, así que el punto del dominio
Resend queda FUERA: solo documéntalo en el README (EMAIL_FROM
obligatorio en producción). No lo programes.

REGLAS DE TRABAJO

1. Crea una rama nueva desde main: feat/hardening-template.
2. Trabaja UNA tarea a la vez. Al terminar cada una:
   - corre pnpm check,
   - haz un commit con mensaje claro,
   - dime qué archivos cambiaste,
   - y PREGÚNTAME si avanzas con la siguiente. No continúes sin mi OK.
3. Primero todas las del backend, después las del frontend.
4. Antes de cada tarea, lee el código actual; no asumas. Verifica los
   nombres de opciones de better-auth en su documentación oficial.

BACKEND (en este orden)
B1. Account linking seguro: solo proveedores confiables con email
verificado; si no, rechazar. Con test.
B2. Rate limit por email (normalizado a minúsculas, sin permitir
enumerar usuarios) en las rutas sensibles. Con test.
B3. requireEmailVerification controlado por variable de entorno.
B4. Duración de sesión por variables (SESSION_EXPIRES_IN y
SESSION_UPDATE_AGE).
B5. Borrar cuenta pide contraseña (re-autenticación). Con test.
B6. Rate limit general en /api/users y /api/admin.
B7. Búsqueda y filtro por email en GET /api/admin/users.
B8. Cambio de email con re-verificación (changeEmail de better-auth).

FRONTEND (en este orden)
F1. Manejo global de 401: limpiar sesión y redirigir a /login.
F2. Usuario solo-OAuth: ocultar el formulario de contraseña si no
tiene cuenta "credential".
F3. UI de borrar cuenta (con contraseña, según B5).
F4. Tests: Vitest + Testing Library + MSW (guards, login, admin).
F5. ErrorBoundary y toasts (sonner).
F6. Búsqueda y filtro en la tabla de admin (según B7).
F7. UI de cambio de email (según B8).

INFRA (al final)
I1. CI ejecuta pnpm build.
I2. Dependabot.

NO HACER: 2FA, avatar, i18n, OpenAPI, ban/impersonation/auditoría.

Empieza solo con B1 y detente a preguntarme.

### L2 — Evidencia de exploración (B1)

- better-auth 1.7.11: `account.accountLinking` admite `enabled`, `disableImplicitLinking`, `trustedProviders`, `allowDifferentEmails`, `requireLocalEmailVerified` (deprecado, default `true`).
- `trustedProviders` NO exige verificación: mejor-auth vincula un proveedor confiable aunque el IdP no confirme el email (`link-account.mjs:137-139`). Dejarlo vacío mantiene `email_verified` obligatorio.
- La puerta real vive en `handleOAuthUserInfo`, exportado desde `better-auth/oauth2`, y usa `c.context`; es testeable con la instancia real y la base de test.
