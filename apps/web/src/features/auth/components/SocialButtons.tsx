import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { authErrorMessage } from '../lib/auth-errors'
import { authService } from '../services/auth.service'
import { Alert } from './Alert'

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  github: 'GitHub',
}

interface SocialButtonsProps {
  providers: string[]
  // A dónde vuelve el proveedor tras autenticar (origen ya incluido).
  callbackURL: string
}

// Un botón por proveedor activo. La lista viene de la API: si un proveedor no
// está configurado en el backend, aquí no existe.
export function SocialButtons({ providers, callbackURL }: SocialButtonsProps) {
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (providers.length === 0) return null

  const signIn = async (provider: string) => {
    setError(null)
    setPending(provider)

    try {
      const { url } = await authService.signInSocial({ provider, callbackURL })
      // Se sale del SPA: la sesión se crea en el callback del backend.
      window.location.assign(url)
    } catch (signInError) {
      setError(authErrorMessage(signInError))
      setPending(null)
    }
  }

  return (
    <div className="space-y-3">
      {error ? <Alert variant="error">{error}</Alert> : null}

      {providers.map((provider) => (
        <button
          key={provider}
          type="button"
          onClick={() => void signIn(provider)}
          disabled={pending !== null}
          aria-busy={pending === provider}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending === provider ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : null}
          Continuar con {PROVIDER_LABELS[provider] ?? provider}
        </button>
      ))}
    </div>
  )
}
