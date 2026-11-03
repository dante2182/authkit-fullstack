import { Router } from 'express'
import { requireVerifiedEmail } from '../modules/auth/auth.middleware.js'

// Router de apoyo para tests: solo se monta con NODE_ENV=test (ver routes/index.ts).
// Permite probar requireVerifiedEmail sin exponer una ruta real en producción.
export const testOnlyRouter: Router = Router()

testOnlyRouter.get('/verified-only', requireVerifiedEmail, (_req, res) => {
  res.json({ ok: true })
})
