import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { oauthErrorMessage } from '../lib/auth-errors'

// El callback OAuth vuelve a la misma pantalla con `?error=...`. Se captura una
// sola vez: limpiar la URL no debe borrar el aviso que ya se está mostrando.
export function useOAuthCallbackError(): string | null {
  const [searchParams, setSearchParams] = useSearchParams()
  const [code] = useState(() => searchParams.get('error'))

  useEffect(() => {
    if (!searchParams.has('error')) return

    // Quita el parámetro para que recargar no repita el aviso.
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete('error')
        next.delete('error_description')
        return next
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams])

  return code ? oauthErrorMessage(code) : null
}
