import type { Response } from 'express'
import { AppError } from '../errors/app-error.js'

interface AuthErrorBody {
  code?: string
  message?: string
}

// El token de sesión viaja en la cookie httpOnly: nunca debe exponerse en el body.
// Solo actúa sobre objetos JSON; ante cualquier otra forma devuelve el texto intacto.
function stripSessionToken(body: string): string {
  try {
    const parsed: unknown = JSON.parse(body)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return body

    const record = parsed as Record<string, unknown>
    if (!('token' in record)) return body

    delete record.token
    return JSON.stringify(record)
  } catch {
    return body
  }
}

// Copia solo las cookies de better-auth. Útil en respuestas sin body (204).
export function copySetCookies(res: Response, response: globalThis.Response): void {
  const cookies = response.headers.getSetCookie()
  if (cookies.length > 0) res.setHeader('set-cookie', cookies)
}

// Reenvía status, headers (incluidas varias set-cookie) y cuerpo de better-auth.
// Los errores se traducen al formato uniforme de la API.
export async function pipeAuthResponse(
  res: Response,
  response: globalThis.Response,
): Promise<void> {
  // Las redirecciones (verify-email) se reenvían tal cual, no son errores.
  const isRedirect = response.status >= 300 && response.status < 400

  if (!response.ok && !isRedirect) {
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

  copySetCookies(res, response)

  // content-length se omite al copiar headers: Express lo recalcula tras filtrar el body.
  const body = await response.text()
  if (body.length === 0) {
    res.end()
    return
  }

  const isJson = (response.headers.get('content-type') ?? '').includes('application/json')
  res.send(isJson ? stripSessionToken(body) : body)
}
