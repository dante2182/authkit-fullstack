# Feature: deployabilidad de la plantilla (backend, frontend y docs)

Objetivo: que un tercero despliegue web y API en su propio hosting y la sesión funcione, sin tocar código.
Rama: `feat/deployability`. Runner: `pnpm check`, `pnpm --filter api test`, `pnpm --filter web test`, `pnpm build`.
Plan: `docs/superpowers/plans/2026-11-14-deployability.md`.

## Specs

- **S1** — `CORS_ORIGIN` acepta una lista separada por comas; cada entrada es una URL `http`/`https`; la primera es el frontend canónico (callback de los enlaces de correo). Un valor único sigue funcionando.
- **S2** — La cookie de sesión se configura por entorno: `COOKIE_SAME_SITE` (`lax`|`strict`|`none`, default `lax`), `COOKIE_SECURE` (default `true` en producción), `COOKIE_DOMAIN` (opcional). `sameSite: none` sin `secure` es error de arranque.
- **S3** — En `NODE_ENV=production` la API no arranca si `BETTER_AUTH_URL` o algún origen de `CORS_ORIGIN` no es `https` o contiene `localhost`.
- **S4** — Toda respuesta lleva `x-request-id` (generado o el entrante saneado) y se registra una línea de acceso con método, URL, estado y duración.
- **S5** — El CI ejecuta `pnpm --filter web test:401` y `pnpm --filter web test:composition` en el job `quality`.
- **S6** — La web incluye fallback SPA para Vercel, Netlify y un ejemplo de Nginx, documentado en `docs/deploy/`.
- **S7** — `README.md` documenta el despliegue: dos topologías, tabla de variables, cookies, pasos y checklist de humo. Ambos `.env.example` documentan las variables nuevas.
- **S8** — Sin Docker y sin dependencias nuevas de runtime. Defaults actuales intactos para quien no defina las variables nuevas.
- **S9** — `pnpm check`, `pnpm test` y `pnpm build` verdes al cerrar cada tarea.

## Tasks

| ID  | Specs | Ruta   | Estado    | Evidencia                                                  |
| --- | ----- | ------ | --------- | ---------------------------------------------------------- |
| T1  | S1    | inline | hecho     | `cors-origins.test.ts` 5/5; suite 158/158; `pnpm check` OK |
| T2  | S2    | inline | pendiente | —                                                          |
| T3  | S3    | inline | pendiente | —                                                          |
| T4  | S4    | inline | pendiente | —                                                          |
| T5  | S5    | inline | pendiente | —                                                          |
| T6  | S6    | inline | pendiente | —                                                          |
| T7  | S7    | inline | pendiente | —                                                          |

## Log

### L1 — Petición original (verbatim)

"okey, crea una nueva rama y ejcuta el plan"

Contexto previo del usuario, verbatim: "ya funciona la autenticacion con credenciales y proveedores con google y github, que mas falta?, ponmelo en lista, siempre separado tanto por backend y frontend, ojo no es necesario docker por que esto sera desplegado en un futuro por usuarios que ellos mismos pondran su configuracion."

### L2 — Decisiones de ejecución

- Rama nueva `feat/deployability` desde `main` (029f2bb), no worktree: lo pidió el usuario.
- Ejecución inline (sin subagente por tarea): T1–T3 comparten `env.ts` y se pisarían.
- `parseCorsOrigins` vive en `config/cors-origins.ts` para evitar el ciclo `env.ts` ↔ `cors.ts`.
