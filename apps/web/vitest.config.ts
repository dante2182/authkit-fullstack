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
    // `request` construye la URL con import.meta.env.VITE_API_URL. Sin esto los
    // tests pedirían a "undefined/auth/...".
    env: {
      VITE_API_URL: 'http://localhost:4000/api',
    },
  },
})
