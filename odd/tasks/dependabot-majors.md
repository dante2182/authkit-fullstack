# Dependabot: cerrar los 8 PRs abiertos

Rama por PR. Entrega: ramas verdes con enlace de PR listo. Sin merge ni push a `main`.
Runner: `pnpm check`, `pnpm test`, `pnpm build`, probes de web.

## Specs

- **S1** — PR #23 (minor/patch): `better-auth` 1.7.25, `eslint` 10.15.0, `lucide-react` 1.73.0, `eslint-plugin-react-refresh` 0.5.8, `msw` 3.0.6. Si `better-auth` cambia otra vez la semántica de `change-email`, el código y el README se adaptan.
- **S2** — PRs #11, #12, #13 (actions): `actions/setup-node` 4→7, `actions/checkout` 4→7, `pnpm/action-setup` 4→6. Verificación: el CI del propio PR.
- **S3** — PR #15: `@hookform/resolvers` 5.9.2 → 7.0.6.
- **S4** — PR #16: `@babel/core` 7.29.7 → 8.1.2.
- **S5** — PR #17: `typescript` 6.0.3 → 7.0.2. Bloqueado: `typescript-eslint` no soporta TS 7. No se fuerza.
- **S6** — PR #18: `react-router-dom` 6.30.6 → 7.18.5.
- **S7** — Cada rama pusheada con enlace de PR. Un major que no se pueda completar sin una decisión de producto se documenta con evidencia y no se fuerza.

## Tasks

| ID  | Spec | Estado    | Evidencia                                                            |
| --- | ---- | --------- | -------------------------------------------------------------------- |
| T1  | S1   | hecho     | `a60c1f2` · CI success · API 175/175, web 20/20                      |
| T2  | S2   | hecho     | `1764454` · CI success con las tres acciones en su major             |
| T3  | S3   | hecho     | `d748a99` · CI success · typecheck, build, 20/20, probes 6/6 y 15/15 |
| T4  | S4   | hecho     | `4e9bea7` · CI success · build, typecheck, 20/20, probes             |
| T5  | S5   | bloqueado | `typescript-eslint does not support TS 7.0` (exit 2 en `eslint .`)   |
| T6  | S6   | hecho     | `4949d0a` · CI success · sin cambios de código                       |
| T7  | S7   | hecho     | Cinco ramas pusheadas y verdes                                       |

## Log

**L1** (2026-11-20) — «sabes terminalo todo y dejamelo listo». Autoriza cerrar los 8 PRs de Dependabot abiertos sobre `main` en `d159878`.

**L2** — T1. `better-auth` 1.7.23 → 1.7.25. `email-verification.mjs` es idéntico entre ambas versiones (`diff` vacío), así que la semántica de `change-email` no cambia y el test adaptado en `8211ca9` sigue válido.

**L3** — T2. Las tres acciones se suben juntas en un commit. La verificación es el propio run: si una acción cambió su contrato de entradas, falla antes de los tests. Verde.

**L4** — T3. `@hookform/resolvers` 5 → 7 sin tocar código: los siete formularios usan `zodResolver` con esquemas de Zod 4 y la firma no cambió.

**L5** — T4. `@babel/core` 8.1.2. El peer de `@rolldown/plugin-babel` ya admitía `^8.0.0-rc.1`. `vite.config.ts` y el preset del React Compiler no necesitaron cambios.

**L6** — T5 bloqueado, no abandonado. Con `typescript` 7.0.2 en `apps/web`, `pnpm --filter web lint` termina en exit 2:

```
typescript-eslint does not support TS 7.0.
Error: typescript-eslint does not support TS 7.0.
```

`typescript-eslint@8.73.0` (última publicada) declara `typescript: ">=4.8.4 <6.1.0"`. El propio error apunta a `typescript-eslint/typescript-eslint#10940` para el soporte de TS ≥7.1. `tsc -b` sí compila con 7, pero el lint es obligatorio en `pnpm check`. Rama borrada: no se pushea una rama roja.

**L7** — T6. `react-router-dom` 7.18.5 sin cambios de código: los 20 ficheros que lo importan usan solo la API de v6 en modo librería (`createBrowserRouter`, `RouterProvider`, `Navigate`, `Outlet`, `Link`, `useNavigate`, `useLocation`, `useSearchParams`).

**L8** — Suites locales inestables bajo carga, no relacionado con los bumps. En cuatro corridas del mismo árbol fallaron tests distintos (`ChangeEmailSection`, `ErrorBoundary`, `config.test.ts`) y en otra todo pasó. La suite de API tarda ~308 s sola; los tests de web usan el timeout por defecto de 5 s. El CI, que es el gate real, pasó en las cinco ramas. Queda como follow-up.
