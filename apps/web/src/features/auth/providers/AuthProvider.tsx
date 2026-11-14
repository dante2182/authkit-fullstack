import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError, UNAUTHORIZED_EVENT } from '@/services/http'
import { AuthContext } from '../context/auth-context'
import { authService } from '../services/auth.service'
import type { AuthUser } from '../types'

// Un 401 al llamar a endpoints con sesión obligatoria es el estado normal de un visitante anónimo. /get-session ya devuelve 200 con null.
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
        if (active) setUser(session?.user ?? null)
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

  // Valida la cookie recién emitida tras login, registro o verificación. Devuelve null
  // si no hay sesión, para distinguir "sin sesión" de "sesión confirmada".
  const refreshSession = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const session = await authService.getSession()
      const nextUser = session?.user ?? null
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

  // Logout optimista: el usuario sale de la vista local aunque el servidor no responda.
  // Si la cookie httpOnly sigue viva, se invalidará al expirar o en otro logout.
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

  // Sesión invalidada desde fuera (caducada o revocada en otra pestaña): el cliente
  // HTTP avisa y aquí se limpia el usuario; la cookie ya no sirve.
  useEffect(() => {
    const handleUnauthorized = () => setUser(null)
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, refreshSession, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
