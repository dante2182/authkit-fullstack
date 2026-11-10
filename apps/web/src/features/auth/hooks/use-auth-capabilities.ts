import { useContext } from 'react'
import { AuthCapabilitiesContext } from '../context/auth-capabilities-context'
import type { AuthCapabilitiesContextValue } from '../context/auth-capabilities-context'

export function useAuthCapabilities(): AuthCapabilitiesContextValue {
  const context = useContext(AuthCapabilitiesContext)

  if (!context) {
    throw new Error('useAuthCapabilities debe usarse dentro de <AuthCapabilitiesProvider>')
  }

  return context
}
