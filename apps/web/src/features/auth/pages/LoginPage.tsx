import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Alert } from '../components/Alert'
import { AuthCard } from '../components/AuthCard'
import { AuthDivider } from '../components/AuthDivider'
import { AuthMethodsError, AuthMethodsLoading } from '../components/AuthMethodsStatus'
import { PasswordField } from '../components/PasswordField'
import { SocialButtons } from '../components/SocialButtons'
import { SubmitButton } from '../components/SubmitButton'
import { TextField } from '../components/TextField'
import { useAuth } from '../hooks/use-auth'
import { useAuthCapabilities } from '../hooks/use-auth-capabilities'
import { useOAuthCallbackError } from '../hooks/use-oauth-callback-error'
import { authErrorMessage } from '../lib/auth-errors'
import { authService } from '../services/auth.service'

const loginSchema = z.object({
  email: z.email('Introduce un correo válido'),
  password: z.string().min(1, 'Introduce tu contraseña'),
})

type LoginValues = z.infer<typeof loginSchema>

interface LocationState {
  from?: { pathname?: string }
}

export function LoginPage() {
  const { refreshSession } = useAuth()
  // Los métodos de acceso los decide la API, no este proyecto: si un despliegue
  // apaga las credenciales, esta pantalla se queda solo con los proveedores.
  const { capabilities, isLoading, error, reload } = useAuthCapabilities()
  // Un fallo del callback OAuth vuelve aquí con `?error=...`.
  const oauthError = useOAuthCallbackError()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  // ProtectedRoute guarda aquí el destino que el usuario quería abrir.
  const state = location.state as LocationState | null
  const redirectTo = state?.from?.pathname ?? '/dashboard'

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)

    try {
      await authService.login({ email: values.email.trim(), password: values.password })

      // El login puede aceptar las credenciales y aun así no dejar sesión
      // utilizable (cookie rechazada, fallo transitorio al leerla).
      const sessionUser = await refreshSession()

      if (!sessionUser) {
        setFormError('No pudimos confirmar tu sesión. Vuelve a intentarlo.')
        return
      }

      navigate(redirectTo, { replace: true })
    } catch (error) {
      setFormError(authErrorMessage(error))
    }
  })

  const providers = capabilities?.socialProviders ?? []
  const credentialsEnabled = capabilities?.emailPassword.enabled ?? false
  const socialEnabled = providers.length > 0
  const hasMethods = credentialsEnabled || socialEnabled

  const content = isLoading ? (
    <AuthMethodsLoading />
  ) : error ? (
    <AuthMethodsError message={error} onRetry={reload} />
  ) : !hasMethods ? (
    <Alert variant="error">
      No hay ningún método de acceso activo. Revisa la configuración del servidor.
    </Alert>
  ) : (
    <>
      {credentialsEnabled ? (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {formError ? <Alert variant="error">{formError}</Alert> : null}

          <TextField
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <PasswordField
            label="Contraseña"
            autoComplete="current-password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="-mt-1 flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <SubmitButton isPending={isSubmitting}>Entrar</SubmitButton>
        </form>
      ) : null}

      {credentialsEnabled && socialEnabled ? <AuthDivider /> : null}

      {socialEnabled ? (
        <SocialButtons
          providers={providers}
          callbackURL={`${window.location.origin}${redirectTo}`}
        />
      ) : null}
    </>
  )

  return (
    <AuthCard
      title="Inicia sesión"
      description="Accede a tu cuenta para continuar."
      footer={
        capabilities?.emailPassword.signUpEnabled ? (
          <>
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              Crear una cuenta
            </Link>
          </>
        ) : undefined
      }
    >
      {oauthError && !isLoading && !error ? (
        <div className="mb-4">
          <Alert variant="error">{oauthError}</Alert>
        </div>
      ) : null}
      {content}
    </AuthCard>
  )
}
