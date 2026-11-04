import { fromNodeHeaders } from 'better-auth/node'
import type { RequestHandler } from 'express'
import { env } from '../../config/env.js'
import { badRequest, notFound, unauthorized } from '../../shared/errors/app-error.js'
import { pipeAuthResponse } from '../../shared/utils/http.js'
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  SendVerificationEmailInput,
} from './auth.schema.js'
import { authService } from './auth.service.js'

// El correo de verificación no debe romper el registro ni el login.
async function sendVerificationEmailSafely(email: string, headers: Headers): Promise<void> {
  try {
    const response = await authService.sendVerificationEmail(
      { email, callbackURL: `${env.CORS_ORIGIN}/verify-email` },
      headers,
    )

    if (!response.ok) {
      console.error(`[auth] No se pudo enviar el correo de verificación (${response.status})`)
    }
  } catch (error) {
    console.error('[auth] No se pudo enviar el correo de verificación:', error)
  }
}

export const register: RequestHandler = async (req, res) => {
  const input = req.body as RegisterInput
  const headers = fromNodeHeaders(req.headers)
  const response = await authService.register(input, headers)

  // Se envía al registrarse, pero sin bloquear el login: requireEmailVerification sigue en false.
  if (response.ok) await sendVerificationEmailSafely(input.email, headers)

  await pipeAuthResponse(res, response)
}

export const login: RequestHandler = async (req, res) => {
  const input = req.body as LoginInput
  const response = await authService.login(input, fromNodeHeaders(req.headers))
  await pipeAuthResponse(res, response)
}

export const logout: RequestHandler = async (req, res) => {
  const response = await authService.logout(fromNodeHeaders(req.headers))
  await pipeAuthResponse(res, response)
}

export const session: RequestHandler = (req, res) => {
  if (!req.auth) throw unauthorized()

  // El token solo vive en la cookie httpOnly; no se repite en el JSON.
  const { token: _token, ...session } = req.auth.session
  res.json({ session, user: req.auth.user })
}

export const requestPasswordReset: RequestHandler = async (req, res) => {
  const input = req.body as RequestPasswordResetInput

  const response = await authService.requestPasswordReset(
    {
      email: input.email,
      redirectTo: input.redirectTo ?? `${env.CORS_ORIGIN}/reset-password`,
    },
    fromNodeHeaders(req.headers),
  )

  await pipeAuthResponse(res, response)
}

export const resetPassword: RequestHandler = async (req, res) => {
  const input = req.body as ResetPasswordInput
  const response = await authService.resetPassword(input, fromNodeHeaders(req.headers))
  await pipeAuthResponse(res, response)
}

export const sendVerificationEmail: RequestHandler = async (req, res) => {
  const input = req.body as SendVerificationEmailInput

  const response = await authService.sendVerificationEmail(
    {
      email: input.email,
      callbackURL: `${env.CORS_ORIGIN}/verify-email`,
    },
    fromNodeHeaders(req.headers),
  )

  await pipeAuthResponse(res, response)
}

// GET: better-auth valida el token y redirige al frontend.
// El destino NO se toma de la query: sale siempre de CORS_ORIGIN, así que un
// callbackURL manipulado no puede desviar la redirección (open redirect).
export const verifyEmail: RequestHandler = async (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : ''
  if (!token) throw badRequest('Falta el token de verificación')

  const response = await authService.verifyEmail(
    { token, callbackURL: `${env.CORS_ORIGIN}/verify-email` },
    fromNodeHeaders(req.headers),
  )
  await pipeAuthResponse(res, response)
}

// ─── Gestión de sesiones ──────────────────────────────────────────────────────
// El token de sesión nunca sale en el JSON: solo viaja en la cookie httpOnly.

export const listSessions: RequestHandler = async (req, res) => {
  const sessions = await authService.listSessions(fromNodeHeaders(req.headers))
  const currentId = req.auth?.session.id

  res.json({
    sessions: sessions.map(({ token: _token, ...session }) => ({
      ...session,
      current: session.id === currentId,
    })),
  })
}

export const revokeSession: RequestHandler = async (req, res) => {
  const id = req.params.id
  if (!id) throw badRequest('Falta el id de la sesión')

  const headers = fromNodeHeaders(req.headers)
  // Se resuelve el token en el servidor: el cliente solo envía el id.
  const sessions = await authService.listSessions(headers)
  const target = sessions.find((session) => session.id === id)
  if (!target) throw notFound('Sesión no encontrada')

  // Revocar la sesión actual equivale a cerrar sesión: así también se limpia la cookie.
  if (target.id === req.auth?.session.id) {
    const response = await authService.logout(headers)
    await pipeAuthResponse(res, response)
    return
  }

  const response = await authService.revokeSession(target.token, headers)
  await pipeAuthResponse(res, response)
}

export const revokeOtherSessions: RequestHandler = async (req, res) => {
  const response = await authService.revokeOtherSessions(fromNodeHeaders(req.headers))
  await pipeAuthResponse(res, response)
}

export const changePassword: RequestHandler = async (req, res) => {
  const input = req.body as ChangePasswordInput
  const response = await authService.changePassword(input, fromNodeHeaders(req.headers))
  // pipeAuthResponse reenvía la cookie nueva y elimina el `token` del body.
  await pipeAuthResponse(res, response)
}
