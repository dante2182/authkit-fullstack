import type { Response } from 'express'
import { AppError } from '../errors/app-error.js'

interface AuthErrorBody {
  code?: string
  message?: string
}

// Reenvía status, headers (incluidas varias set-cookie) y cuerpo de better-auth.
// Los errores se traducen al formato uniforme de la API.
export async function pipeAuthResponse(
  res: Response,
  response: globalThis.Response,
): Promise<void> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as AuthErrorBody | null
    throw new AppError(
      response.status,
      body?.code ?? 'AUTH_ERROR',
      body?.message ?? 'Error de autenticación',
    )
  }

  res.status(response.status)

  for (const [key, value] of response.headers) {
    if (key === 'set-cookie' || key === 'content-length') continue
    res.setHeader(key, value)
  }

  const cookies = response.headers.getSetCookie()
  if (cookies.length > 0) res.setHeader('set-cookie', cookies)

  const body = await response.text()
  if (body.length > 0) res.send(body)
  else res.end()
}
