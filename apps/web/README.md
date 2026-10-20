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
pnpm format       # Prettier (con ordenación de clases de Tailwind)
pnpm format:check # Prettier en modo verificación
```

Desde la raíz del monorepo: `pnpm --filter web <comando>`.

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
├─ App.tsx          # componente raíz
├─ main.tsx         # entry point (createRoot)
├─ index.css        # @import "tailwindcss"
└─ vite-env.d.ts    # tipos de import.meta.env
```

El **React Compiler** está activado vía `babel-plugin-react-compiler` en `vite.config.ts`.

## Notas de formato y lint

- Prettier vive en `prettier.config.mjs` e incluye `prettier-plugin-tailwindcss`
  (`tailwindStylesheet: ./src/index.css`, `tailwindFunctions: ['cn', 'clsx', 'cva', 'twMerge']`):
  las clases se ordenan solas al formatear.
- ESLint (`eslint.config.js`) usa `eslint-config-prettier` al final, por lo que no duplica reglas de estilo.
