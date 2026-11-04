import { TEST_DATABASE_URL } from './env.js'

// Se ejecuta antes de importar la app: config/env.ts lee process.env al cargarse
// y dotenv no pisa variables ya definidas.
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = TEST_DATABASE_URL
process.env.BETTER_AUTH_URL = 'http://localhost:4000'
process.env.BETTER_AUTH_SECRET = 'test-secret-for-vitest-only-32-chars-min'
process.env.CORS_ORIGIN = 'http://localhost:5173'
process.env.TRUST_PROXY = 'false'
