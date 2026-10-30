import { fromNodeHeaders } from 'better-auth/node'
import type { RequestHandler } from 'express'
import { auth } from '../../config/auth.js'
import { unauthorized } from '../../shared/errors/app-error.js'

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  })

  if (!session) throw unauthorized()

  req.auth = session
  next()
}
