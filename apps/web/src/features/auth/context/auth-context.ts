import { createContext } from 'react'
import type { AuthUser } from '../types'

export interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  // Devuelve el usuario restaurado, o null si no hay sesión válida.
  refreshSession: () => Promise<AuthUser | null>
  // Limpia siempre la sesión local; el fallo del servidor solo se registra.
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
