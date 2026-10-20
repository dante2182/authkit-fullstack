# AuthKit — Fullstack

Monorepo para un sistema de autenticación completo: frontend React + Vite + Tailwind y API Express + Prisma + better-auth.

## Stack

| Capa       | Tecnología                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------- |
| `apps/web` | React 19, Vite 8, TypeScript 6, Tailwind CSS 4, React Router, React Hook Form + Zod         |
| `apps/api` | Express 5, Prisma 7 (PostgreSQL), better-auth, Zod, helmet + rate-limit                     |
| Tooling    | pnpm workspaces, ESLint 10 (flat config), Prettier 3, Husky 9, commitlint 21 + commitizen 4 |

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
| `pnpm format`       | Prettier escribe todo el repo                      |
| `pnpm format:check` | Prettier en modo verificación (lo que usa el hook) |
| `pnpm commit`       | Asistente interactivo de commits (commitizen)      |
| `pnpm commit:dry`   | Igual, pero sin crear el commit (simulación)       |

Atajos por app: `pnpm --filter web <script>` y `pnpm --filter api <script>`.

## Calidad de código

- **Prettier** es la única fuente de verdad del formato: `semi: false`, comillas simples, 100 columnas, `lf`.
  Config raíz para ficheros de la raíz y config por app para añadir plugins
  (`prettier-plugin-tailwindcss` en web ordena las clases, `prettier-plugin-prisma` en api).
- **ESLint** en las dos apps con `eslint-config-prettier` al final, así que **no hay reglas de estilo en conflicto**:
  Prettier formatea, ESLint detecta errores.
- **Husky** ejecuta dos hooks en cada commit:
  - `.husky/pre-commit` → `format:check` → `lint` → `typecheck`. Arreglo rápido: `pnpm format && pnpm lint:fix`.
  - `.husky/commit-msg` → valida el mensaje con commitlint (ver abajo).

Si cualquiera de los dos falla, el commit se cancela.

## Convención de commits

Se usa **Conventional Commits**, validado automáticamente por `commitlint.config.mjs`:

```
[emoji opcional] <tipo>(<scope opcional>): <descripción>
```

| Tipo       | Emoji | Para qué                                    |
| ---------- | ----- | ------------------------------------------- |
| `feat`     | ✨    | Nueva funcionalidad                         |
| `fix`      | 🐛    | Corrección de un bug                        |
| `docs`     | 📝    | Solo documentación                          |
| `style`    | 🎨    | Formato, sin cambios de comportamiento      |
| `refactor` | ♻️    | Reestructura sin cambiar comportamiento     |
| `perf`     | ⚡️    | Mejora de rendimiento                       |
| `test`     | ✅    | Tests                                       |
| `build`    | 📦    | Build, dependencias, tooling de empaquetado |
| `ci`       | 👷    | Configuración de integración continua       |
| `chore`    | 🔧    | Tareas varias (deps, config)                |
| `revert`   | ⏪    | Revertir un commit anterior                 |

Scopes permitidos (validados por la regla `scope-enum`): `web`, `api`, `repo`, `deps`.

```bash
git commit -m "feat(web): añade pantalla de login"
git commit -m "fix(api): corrige la validación del email"
git commit -m "chore(repo): actualiza dependencias"
```

Los títulos pueden escribirse en español (la regla de mayúsculas está desactivada a propósito).
Límite de 100 caracteres en la cabecera.

## Commits interactivos (Commitizen)

Para no memorizar el formato hay un asistente que **usa el mismo `commitlint.config.mjs`** que el validador:
así lo que escribes nunca puede ser inválido.

```bash
pnpm commit       # asistente interactivo: escribe el commit por ti
pnpm commit:dry   # el mismo asistente, sin crear el commit (simulación)
```

> Necesita algo en staging, igual que `git commit`: `git add <ficheros>` antes de lanzarlo.

Qué hace:

1. Menú de **tipos** con emoji y descripción (lee `type-enum` y `prompt.questions.type.enum`).
2. Menú de **scopes**: `web`, `api`, `repo`, `deps`. Con **flecha + espacio** eliges varios → `feat(web,api): ...`.
3. **Descripción** con contador de caracteres (límite 100) y avisos de longitud.
4. **Cuerpo**, **footer** (`Closes #12`) y si hay **cambios rompientes** (`!` + footer `BREAKING CHANGE:`).

### Emojis

El asistente los escribe en la cabecera (`✨ feat(web): ...`). Funciona porque `parserPreset.headerPattern`
acepta un emoji **opcional** delante del tipo:

| Mensaje                                              | Resultado                    |
| ---------------------------------------------------- | ---------------------------- |
| `✨ feat(web): añade login`                          | ✅ válido                    |
| `feat(web): añade login` (escrito a mano, sin emoji) | ✅ válido                    |
| `feat(web,api): multiscope`                          | ✅ válido                    |
| `✨ chore(repo)!: cambio rompiente`                  | ✅ válido                    |
| `✨ wip(web): tipo inválido`                         | ❌ `type-enum`               |
| `feat(movil): scope inválido`                        | ❌ `scope-enum`              |
| `Merge branch 'main'` / `Revert "..."`               | ⏭️ ignorados automáticamente |

Para **quitar los emojis de la cabecera**: `prompt.questions.type.emojiInHeader: false`
(siguen viéndose en el menú, pero no se escriben en el commit).

⚠️ Si algún día añades `semantic-release` o generadores de changelog que esperan el tipo en la
posición 0, desactiva `emojiInHeader` para evitar sorpresas.

Si prefieres no usar el asistente, `git commit -m "..."` funciona igual: el hook `.husky/commit-msg`
valida el mensaje de todas formas.

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
├─ .husky/            # hooks de git (pre-commit y commit-msg)
├─ commitlint.config.mjs # reglas de commit + configuración del asistente
└─ pnpm-workspace.yaml
```

## Licencia

MIT
