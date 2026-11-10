import { createContext } from 'react'
import type { AuthCapabilities } from '../types'

export interface AuthCapabilitiesContextValue {
  // null mientras carga o si la consulta falló: nunca se inventan métodos.
  capabilities: AuthCapabilities | null
  isLoading: boolean
  error: string | null
  // Vuelve a pedir el contrato a la API (botón de reintento).
  reload: () => void
}

export const AuthCapabilitiesContext = createContext<AuthCapabilitiesContextValue | null>(null)
