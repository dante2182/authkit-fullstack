import { fromNodeHeaders } from 'better-auth/node'
import type { RequestHandler } from 'express'
import { unauthorized } from '../../shared/errors/app-error.js'
import { pipeAuthResponse } from '../../shared/utils/http.js'
import type { LoginInput, RegisterInput } from './auth.schema.js'
import { authService } from './auth.service.js'

export const register: RequestHandler = async (req, res) => {
  const input = req.body as RegisterInput
  const response = await authService.register(input, fromNodeHeaders(req.headers))
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
