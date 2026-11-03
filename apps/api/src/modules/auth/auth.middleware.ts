import { fromNodeHeaders } from 'better-auth/node'
import type { Request, RequestHandler } from 'express'
import { auth } from '../../config/auth.js'
import { forbidden, unauthorized } from '../../shared/errors/app-error.js'

async function loadSession(req: Request) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  })

  if (!session) throw unauthorized()

  req.auth = session
  return session
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  await loadSession(req)
  next()
}

// Exige sesión (401) y email verificado (403 EMAIL_NOT_VERIFIED).
// No se aplica a rutas existentes a propósito: el usuario debe poder borrar su
// cuenta o recuperar el acceso aunque su email esté mal escrito.
export const requireVerifiedEmail: RequestHandler = async (req, _res, next) => {
  const session = await loadSession(req)

  if (!session.user.emailVerified) {
    throw forbidden('Debes verificar tu correo para usar esta función', 'EMAIL_NOT_VERIFIED')
  }

  next()
}
