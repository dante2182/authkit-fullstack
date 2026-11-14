import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Alert } from '../components/Alert'
import { AuthCard } from '../components/AuthCard'
import { useAuth } from '../hooks/use-auth'
import { linkErrorMessage } from '../lib/auth-errors'

// La API valida el token y redirige aquí. Si todo fue bien no hay query; si falla, llega `?error=INVALID_TOKEN|TOKEN_EXPIRED|...`.
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const errorCode = searchParams.get('error')
  const { user, refreshSession } = useAuth()

  useEffect(() => {
    // El token ya lo consumió la API: se refresca el usuario para reflejar `emailVerified: true` si esta sesión sigue abierta.
    void refreshSession()
  }, [refreshSession])

  if (errorCode) {
    return (
      <AuthCard
        title="No pudimos verificar tu correo"
        description="El enlace puede haber caducado o haberse usado ya."
        footer={
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Ir a iniciar sesión
          </Link>
        }
      >
        <Alert variant="error">{linkErrorMessage(errorCode)}</Alert>
        <p className="mt-4 text-sm text-slate-500">
          Si ya tienes sesión, puedes pedir un enlace nuevo desde tu panel.
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Correo verificado"
      description="Tu dirección de correo ya está confirmada."
      footer={
        <Link to="/" className="font-medium text-indigo-600 hover:text-indigo-500">
          Volver al inicio
        </Link>
      }
    >
      <Alert variant="success">Todo listo. Ya puedes usar tu cuenta con normalidad.</Alert>

      <Link
        to={user ? '/dashboard' : '/login'}
        className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {user ? 'Ir al panel' : 'Iniciar sesión'}
      </Link>
    </AuthCard>
  )
}
