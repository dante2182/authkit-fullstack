import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { authErrorMessage } from '../lib/auth-errors'
import { authService } from '../services/auth.service'

type ResendStatus = 'idle' | 'sending' | 'sent' | 'error'

interface ResendVerificationButtonProps {
  email: string
}

// La verificación de email vive en la feature auth: el dashboard solo la usa.
export function ResendVerificationButton({ email }: ResendVerificationButtonProps) {
  const [status, setStatus] = useState<ResendStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setStatus('sending')
    setError(null)

    try {
      await authService.sendVerificationEmail(email)
      setStatus('sent')
    } catch (cause) {
      setStatus('error')
      setError(authErrorMessage(cause))
    }
  }

  const isPending = status === 'sending'

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending || status === 'sent'}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw className={isPending ? 'size-4 animate-spin' : 'size-4'} aria-hidden="true" />
        {status === 'sent' ? 'Correo enviado' : 'Reenviar verificación'}
      </button>

      {status === 'sent' ? (
        <p className="text-xs text-emerald-600">
          Si el correo está configurado, recibirás un enlace en unos minutos.
        </p>
      ) : null}

      {status === 'error' && error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
