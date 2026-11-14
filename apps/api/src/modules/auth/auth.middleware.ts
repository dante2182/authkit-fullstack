import { fromNodeHeaders } from 'better-auth/node'
import type { Request, RequestHandler } from 'express'
import { auth } from '../../config/auth.js'
import {
  hasPermission,
  resolveRole,
  type Permission,
  type Role,
} from '../../shared/auth/permissions.js'
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

// Exige sesión (401) y email verificado (403 EMAIL_NOT_VERIFIED). No se aplica a rutas
// existentes a propósito: el usuario debe poder borrar su cuenta o recuperar el acceso.
export const requireVerifiedEmail: RequestHandler = async (req, _res, next) => {
  // Reutiliza la sesión si requireAuth ya la cargó en esta petición.
  const session = req.auth ?? (await loadSession(req))

  if (!session.user.emailVerified) {
    throw forbidden('Debes verificar tu correo para usar esta función', 'EMAIL_NOT_VERIFIED')
  }

  next()
}

// Los middlewares de autorización se componen SIEMPRE después de requireAuth: reutilizan
// la sesión y, usados sueltos, responden 401 en vez de asumir una identidad.
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) throw unauthorized()

    // Se compara el valor tal cual (no el mapa de permisos): así requireRole
    // sirve también para roles que un proyecto derivado añada al enum.
    const role = req.auth.user.role

    if (!roles.includes(role as Role)) {
      throw forbidden('Rol insuficiente', 'INSUFFICIENT_ROLE')
    }

    next()
  }

export const requirePermission =
  (permission: Permission): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) throw unauthorized()

    const role = resolveRole(req.auth.user.role)

    if (!hasPermission(role, permission)) {
      throw forbidden('Permiso insuficiente', 'INSUFFICIENT_PERMISSION')
    }

    next()
  }
