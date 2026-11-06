import { createContext } from 'react'
import type { AuthUser } from '../types'

export interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  // Devuelve el usuario restaurado, o null si no hay sesión válida.
  refreshSession: () => Promise<AuthUser | null>
  // Lanza si el servidor no pudo cerrar la sesión: la cookie seguiría viva.
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
