import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      // Debe ir al final: desactiva reglas de estilo que chocan con Prettier
      prettier,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Las features solo se consumen desde su barril: @/features/<nombre>.
      // Los imports internos dentro de una feature usan rutas relativas.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/*'],
              message: 'Importa desde el barril de la feature: @/features/<nombre>',
            },
          ],
        },
      ],
    },
  },
])
