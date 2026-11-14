import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './msw/server'

// MSW intercepta fetch a nivel de proceso y una petición sin handler falla el test
// en vez de devolver 404. (MSW 3 renombró `onUnhandledRequest` a `onUnhandledFrame`.)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))

afterEach(() => {
  cleanup()
  server.resetHandlers()
})

afterAll(() => server.close())
