# AuthKit — Fullstack

Monorepo para un sistema de autenticación completo: frontend React + Vite + Tailwind y API Express + Prisma + better-auth.

## Stack

| Capa       | Tecnología                                                                          |
| ---------- | ----------------------------------------------------------------------------------- |
| `apps/web` | React 19, Vite 8, TypeScript 6, Tailwind CSS 4, React Router, React Hook Form + Zod |
| `apps/api` | Express 5, Prisma 7 (PostgreSQL), better-auth, Zod, helmet + rate-limit             |
| Tooling    | pnpm workspaces, ESLint 10 (flat config), Prettier 3, Husky 9                       |

## Requisitos

- **Node** `>=24` (ver `.nvmrc` → `v24.22.0`)
- **pnpm** `12.14.0` (fijado en `packageManager`; `corepack enable` lo instala solo)
- **PostgreSQL** accesible (local o gestionado) y su cadena de conexión en `DATABASE_URL`

## Puesta en marcha

```bash
# 1. Dependencias
pnpm install

# 2. Variables de entorno
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
#    ...y genera el secreto de better-auth:
#    openssl rand -base64 32

# 3. Apunta DATABASE_URL a tu instancia de PostgreSQL
#    (edita apps/api/.env)

# 4. Cliente de Prisma y migraciones
pnpm --filter api db:generate
pnpm --filter api db:migrate

# 5. Desarrollo (web + api en paralelo)
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:4000

## Comandos (raíz)

| Comando             | Qué hace                                           |
| ------------------- | -------------------------------------------------- |
| `pnpm dev`          | Arranca web y api en paralelo                      |
| `pnpm build`        | Compila todas las apps                             |
| `pnpm lint`         | ESLint en todo el monorepo                         |
| `pnpm lint:fix`     | ESLint con `--fix`                                 |
| `pnpm typecheck`    | TypeScript sin emitir en todas las apps            |
| `pnpm format`       | Prettier formatea todo el monorepo (raíz + apps)   |
| `pnpm format:check` | Prettier en modo verificación (lo que usa el hook) |
| `pnpm check`        | Formato + lint + typecheck (lo que usa el hook)    |
| `pnpm fix`          | Formatea y aplica los fixes automáticos de ESLint  |

Atajos por app: `pnpm --filter web <script>` y `pnpm --filter api <script>`.
El formato se ejecuta siempre desde la raíz: las apps no tienen scripts `format` propios.

## Calidad de código

- **Prettier** es la única fuente de verdad del formato: `semi: false`, comillas simples, 100 columnas, `lf`.
  Hay **una sola configuración en la raíz** (`prettier.config.mjs` + `.prettierignore`) con los plugins
  `prettier-plugin-tailwindcss` (ordena las clases de web según `apps/web/src/index.css`) y
  `prettier-plugin-prisma` (formatea el schema de Prisma). No hay configs por app.
  Así el CLI (`pnpm format:check`) y el editor (Ctrl+S con la extensión de Prettier) usan exactamente
  las mismas reglas y plugins, sin depender de `node_modules` de cada app.
- **ESLint** en las dos apps con `eslint-config-prettier` al final, así que **no hay reglas de estilo en conflicto**:
  Prettier formatea, ESLint detecta errores.
- **Husky** ejecuta un hook en cada commit:
  - `.husky/pre-commit` → `pnpm check` (format:check → lint → typecheck). Arreglo rápido: `pnpm fix`.

Si el hook falla, el commit se cancela.

## Convención de commits

Se recomienda seguir **Conventional Commits** con el formato:

```
<tipo>(<scope opcional>): <descripción>
```

| Tipo       | Para qué                                    |
| ---------- | ------------------------------------------- |
| `feat`     | Nueva funcionalidad                         |
| `fix`      | Corrección de un bug                        |
| `docs`     | Solo documentación                          |
| `style`    | Formato, sin cambios de comportamiento      |
| `refactor` | Reestructura sin cambiar comportamiento     |
| `perf`     | Mejora de rendimiento                       |
| `test`     | Tests                                       |
| `build`    | Build, dependencias, tooling de empaquetado |
| `ci`       | Configuración de integración continua       |
| `chore`    | Tareas varias (deps, config)                |
| `revert`   | Revertir un commit anterior                 |

Scopes recomendados: `web`, `api`, `repo`, `deps`.

```bash
git commit -m "feat(web): añade pantalla de login"
git commit -m "fix(api): corrige la validación del email"
git commit -m "chore(repo): actualiza dependencias"
```

Los títulos pueden escribirse en español. Se recomienda el modo imperativo, sin punto final y
un máximo de 100 caracteres en la cabecera.

> El formato es una recomendación: no hay validación automática del mensaje de commit. Los hooks
> solo comprueban formato, lint y tipos del código.

## TypeScript en `apps/api`

Se usa la estrategia dual de Microsoft mediante alias de pnpm, para que el compilador nativo (TS 7) y
`typescript-eslint` convivan:

```jsonc
"typescript": "npm:@typescript/typescript6@^6.0.2", // lo que ve typescript-eslint (in range)
"typescript-native": "npm:typescript@^7.0.2" // binario "tsc" real que compila
```

Por eso `node_modules/.bin/tsc` es el TS 7 nativo y `node_modules/.bin/tsc6` el 6.x.

## Estructura

```
authkit-fullstack/
├─ apps/
│  ├─ api/            # Express + Prisma + better-auth
│  │  ├─ prisma/      # schema.prisma
│  │  └─ src/
│  └─ web/            # React + Vite + Tailwind
│     └─ src/
├─ .husky/            # hook de git (pre-commit)
├─ prettier.config.mjs   # config única de Prettier (raíz + apps)
├─ .prettierignore       # exclusiones únicas de Prettier
└─ pnpm-workspace.yaml
```

## Licencia

MIT
