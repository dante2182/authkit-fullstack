import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthCapabilitiesContext } from '../context/auth-capabilities-context'
import { authService } from '../services/auth.service'
import type { AuthCapabilities } from '../types'

const LOAD_ERROR =
  'No pudimos cargar los métodos de acceso. Revisa tu conexión e inténtalo de nuevo.'

// Lee el contrato de la API una sola vez al arrancar y lo comparte. Es estado
// independiente de la sesión: si falla, solo afecta a las pantallas de acceso;
// las rutas protegidas siguen funcionando.
export function AuthCapabilitiesProvider({ children }: { children: ReactNode }) {
  const [capabilities, setCapabilities] = useState<AuthCapabilities | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Cambiar el contador relanza el efecto: así el reintento no hace setState
  // síncrono dentro del efecto.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true

    authService
      .getAuthCapabilities()
      .then((next) => {
        if (!active) return
        setCapabilities(next)
        setError(null)
      })
      .catch((loadError: unknown) => {
        if (!active) return
        console.error('No se pudieron cargar los métodos de acceso', loadError)
        setCapabilities(null)
        setError(LOAD_ERROR)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [attempt])

  const reload = useCallback(() => {
    setIsLoading(true)
    setError(null)
    setAttempt((current) => current + 1)
  }, [])

  return (
    <AuthCapabilitiesContext.Provider value={{ capabilities, isLoading, error, reload }}>
      {children}
    </AuthCapabilitiesContext.Provider>
  )
}
