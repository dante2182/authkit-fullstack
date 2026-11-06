import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError } from '@/services/http'
import { AuthContext } from '../context/auth-context'
import { authService } from '../services/auth.service'
import type { AuthUser } from '../types'

// Un 401 al restaurar la sesión es el estado normal de un visitante anónimo.
function isAnonymousSession(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}

// Restaura la sesión una sola vez al arrancar. Mientras `isLoading` es true,
// los guards no redirigen: evita el parpadeo de login → dashboard al recargar.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    authService
      .getSession()
      .then((session) => {
        if (active) setUser(session.user)
      })
      .catch((error: unknown) => {
        if (!active) return
        setUser(null)

        if (!isAnonymousSession(error)) {
          console.error('No se pudo restaurar la sesión', error)
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  // Se usa después de login, registro o verificación de email para validar la
  // cookie recién emitida contra la API. Devuelve null si no hay sesión, para
  // que quien llama pueda distinguir "sin sesión" de "sesión confirmada".
  const refreshSession = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const { user: nextUser } = await authService.getSession()
      setUser(nextUser)
      return nextUser
    } catch (error) {
      setUser(null)

      if (!isAnonymousSession(error)) {
        console.error('No se pudo restaurar la sesión', error)
      }

      return null
    }
  }, [])

  // La cookie httpOnly solo la puede invalidar el servidor. Si el logout falla,
  // el estado local se mantiene: presentar la sesión como cerrada sería mentira
  // y la cookie seguiría autenticando al recargar.
  const signOut = useCallback(async () => {
    try {
      await authService.logout()
    } catch (error) {
      // Una sesión ya expirada tampoco tiene cookie que invalidar.
      if (!isAnonymousSession(error)) throw error
    }

    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, refreshSession, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
