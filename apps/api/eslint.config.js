import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'generated', 'prisma/migrations']),
  {
    files: ['**/*.{ts,js}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      // Debe ir al final: desactiva reglas de estilo que chocan con Prettier
      prettier,
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
])
