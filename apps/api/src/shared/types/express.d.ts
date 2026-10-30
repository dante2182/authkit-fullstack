import type { auth } from '../../config/auth.js'

declare global {
  namespace Express {
    interface Request {
      auth?: typeof auth.$Infer.Session
    }
  }
}
