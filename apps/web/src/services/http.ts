import type { ApiErrorBody } from '@/types/api'

const API_URL = import.meta.env.VITE_API_URL

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: unknown

  constructor(status: number, body: ApiErrorBody | null) {
    const nested = body?.error
    super(nested?.message ?? body?.message ?? 'Error de red')
    this.name = 'ApiError'
    this.status = status
    this.code = nested?.code ?? body?.code ?? 'NETWORK_ERROR'
    this.details = nested?.details
  }
}

interface RequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown
  headers?: Record<string, string>
}

// Evento de sesión inválida: AuthProvider limpia el usuario y los guards redirigen a /login.
export const UNAUTHORIZED_EVENT = 'authkit:unauthorized'

// Rutas donde un 401 es respuesta de negocio y NO sesión inválida. Solo el login con
// contraseña incorrecta; el resto de 401 significa que la cookie ya no vale.
const BUSINESS_401_PATHS = new Set(['/auth/sign-in/email'])

function notifyUnauthorized(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
}

// Cliente HTTP único. La cookie de sesión viaja en httpOnly, por eso `credentials: include`.
// Las features no llaman a fetch directamente: usan su service, que usa esta función.
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers: extraHeaders, ...init } = options

  const headers = new Headers(extraHeaders)
  headers.set('Accept', 'application/json')

  const payload = body === undefined ? undefined : JSON.stringify(body)
  if (payload !== undefined) headers.set('Content-Type', 'application/json')

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
    ...(payload === undefined ? {} : { body: payload }),
  })

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as ApiErrorBody | null

    // 401 en una petición autenticada: la sesión caducó o fue revocada. Se avisa una
    // vez por petición; AuthProvider limpia el usuario y ProtectedRoute redirige a /login.
    if (response.status === 401 && !BUSINESS_401_PATHS.has(path)) notifyUnauthorized()

    throw new ApiError(response.status, errorBody)
  }

  if (response.status === 204) return undefined as T

  return (await response.json()) as T
}
