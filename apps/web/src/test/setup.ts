import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './msw/server'

// MSW intercepta fetch a nivel de proceso: ninguna suite toca la API real.
// `onUnhandledFrame: 'error'` convierte una petición sin handler en un fallo
// explícito, no en un 404 silencioso. (MSW 3 renombró `onUnhandledRequest`.)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))

afterEach(() => {
  cleanup()
  server.resetHandlers()
})

afterAll(() => server.close())
