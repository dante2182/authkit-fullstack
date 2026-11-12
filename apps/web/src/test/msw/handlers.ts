import type { RequestHandler } from 'msw'

// Sin handlers por defecto: cada test declara lo que necesita con `server.use`.
// Un endpoint sin handler falla (onUnhandledRequest: 'error'), así una suite no
// puede pasar por accidente contra la API real.
export const handlers: RequestHandler[] = []
