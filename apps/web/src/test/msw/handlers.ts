import type { RequestHandler } from 'msw'

// Sin handlers por defecto: cada test declara lo que necesita con `server.use`.
// Un endpoint sin handler falla, así una suite no pasa por accidente contra la API real.
export const handlers: RequestHandler[] = []
