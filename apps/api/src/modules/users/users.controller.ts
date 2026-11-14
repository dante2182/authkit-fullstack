import { fromNodeHeaders } from 'better-auth/node'
import { APIError } from 'better-auth/api'
import type { RequestHandler } from 'express'
import { auth } from '../../config/auth.js'
import { AppError, notFound } from '../../shared/errors/app-error.js'
import type { DeleteUserInput, UpdateUserInput } from './users.schema.js'
import { usersService } from './users.service.js'

export const me: RequestHandler = async (req, res) => {
  const user = await usersService.findById(req.auth!.user.id)
  if (!user) throw notFound('Usuario no encontrado')
  res.json({ user })
}

export const updateMe: RequestHandler = async (req, res) => {
  const user = await usersService.update(req.auth!.user.id, req.body as UpdateUserInput)
  res.json({ user })
}

export const deleteMe: RequestHandler = async (req, res) => {
  const { password } = req.body as DeleteUserInput

  // Re-autenticación: la sesión sola no basta para una acción irreversible.
  try {
    await auth.api.verifyPassword({
      body: { password },
      headers: fromNodeHeaders(req.headers),
    })
  } catch (error) {
    if (error instanceof APIError) {
      throw new AppError(400, 'INVALID_PASSWORD', 'Contraseña incorrecta')
    }
    throw error
  }

  await usersService.remove(req.auth!.user.id)

  // El usuario y sus sesiones ya no existen (cascade), así que signOut solo aporta el Set-Cookie que expira la cookie del navegador.
  const response = await auth.api.signOut({
    headers: fromNodeHeaders(req.headers),
    asResponse: true,
  })
  const cookies = response.headers.getSetCookie()
  if (cookies.length > 0) res.setHeader('set-cookie', cookies)

  res.status(204).end()
}
