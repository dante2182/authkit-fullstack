import type { ApiErrorBody } from '@/types/api'

const API_URL = import.meta.env.VITE_API_URL

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: unknown

  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.error.message ?? 'Error de red')
    this.name = 'ApiError'
    this.status = status
    this.code = body?.error.code ?? 'NETWORK_ERROR'
    this.details = body?.error.details
  }
}

interface RequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown
  headers?: Record<string, string>
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
    throw new ApiError(response.status, errorBody)
  }

  if (response.status === 204) return undefined as T

  return (await response.json()) as T
}
