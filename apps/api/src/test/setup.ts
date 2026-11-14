import { TEST_DATABASE_URL } from './env.js'

// Corre antes de importar la app: config/env.ts lee process.env al cargarse y dotenv no lo pisa.
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = TEST_DATABASE_URL
process.env.BETTER_AUTH_URL = 'http://localhost:4000'
process.env.BETTER_AUTH_SECRET = 'test-secret-for-vitest-only-32-chars-min'
process.env.CORS_ORIGIN = 'http://localhost:5173'
process.env.TRUST_PROXY = 'false'
// `.env` define SENSITIVE_RATE_LIMIT_ENABLED=true; los tests parten desactivados y
// solo el test de rate limit lo activa con vi.stubEnv antes de reimportar la app.
process.env.SENSITIVE_RATE_LIMIT_ENABLED = 'false'
// El resto de variables que cambian comportamiento también se fijan: el `.env` no altera la suite.
process.env.API_RATE_LIMIT_ENABLED = 'false'
process.env.AUTH_EMAIL_PASSWORD_ENABLED = 'true'
process.env.AUTH_SIGN_UP_ENABLED = 'true'
process.env.AUTH_REQUIRE_EMAIL_VERIFICATION = 'false'
process.env.SESSION_EXPIRES_IN = '604800'
process.env.SESSION_UPDATE_AGE = '86400'
// Sin proveedores por defecto. Cada test que los necesita los stubea.
process.env.GOOGLE_CLIENT_ID = ''
process.env.GOOGLE_CLIENT_SECRET = ''
process.env.GITHUB_CLIENT_ID = ''
process.env.GITHUB_CLIENT_SECRET = ''
// Sin clave real: email.service no debe llamar a Resend desde la suite.
process.env.RESEND_API_KEY = ''
process.env.LOG_LEVEL = 'silent'
