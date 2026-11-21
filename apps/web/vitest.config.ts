import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Configuración propia de tests: la de Vite arrastra el preset de React Compiler,
// que no aporta nada aquí y ralentiza cada suite.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // El default de 5 s se queda corto: `pnpm test` corre la suite de la API en
    // paralelo y jsdom con React 19 supera ese margen cuando la máquina está cargada.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    // `request` construye la URL con import.meta.env.VITE_API_URL. Sin esto los
    // tests pedirían a "undefined/auth/...".
    env: {
      VITE_API_URL: 'http://localhost:4000/api',
    },
  },
})
