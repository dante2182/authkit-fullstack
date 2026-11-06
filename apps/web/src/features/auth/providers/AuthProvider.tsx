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

  // Logout optimista: el usuario siempre sale de la vista local, aunque el
  // servidor no responda. El fallo se registra y, si la cookie httpOnly sigue
  // viva, se invalidará al expirar o en un logout posterior.
  const signOut = useCallback(async () => {
    try {
      await authService.logout()
    } catch (error) {
      // Un 401 significa que la sesión ya no existía: no hay nada que avisar.
      if (!isAnonymousSession(error)) {
        console.warn('No se pudo cerrar la sesión en el servidor', error)
      }
    } finally {
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, refreshSession, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
