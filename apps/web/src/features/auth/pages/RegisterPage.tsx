import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
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
import { authErrorMessage } from '../lib/auth-errors'
import { authService } from '../services/auth.service'

const registerSchema = z
  .object({
    name: z.string().min(1, 'Introduce tu nombre').max(80, 'Máximo 80 caracteres'),
    email: z.email('Introduce un correo válido'),
    password: z.string().min(8, 'Mínimo 8 caracteres').max(128, 'Máximo 128 caracteres'),
    confirmPassword: z.string().min(1, 'Repite la contraseña'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  })

type RegisterValues = z.infer<typeof registerSchema>

export function RegisterPage() {
  const { refreshSession } = useAuth()
  // El contrato también decide si se puede crear cuenta: con el registro cerrado
  // no tiene sentido pintar un formulario que la API va a rechazar.
  const { capabilities, isLoading, error, reload } = useAuthCapabilities()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)

    try {
      await authService.register({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      })
      // La API crea la sesión al registrarse: se refresca para validar la cookie.
      const sessionUser = await refreshSession()

      if (!sessionUser) {
        setFormError('Tu cuenta se creó, pero no pudimos abrir la sesión. Inicia sesión.')
        return
      }

      navigate('/dashboard', { replace: true })
    } catch (error) {
      setFormError(authErrorMessage(error))
    }
  })

  const providers = capabilities?.socialProviders ?? []
  const credentialsEnabled = capabilities?.emailPassword.enabled ?? false
  const signUpEnabled = capabilities?.emailPassword.signUpEnabled ?? false
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
  ) : !signUpEnabled ? (
    // Registro cerrado es un estado legítimo, no un fallo: mensaje neutro.
    <p className="text-sm text-slate-600">
      El registro está cerrado. Si ya tienes cuenta, inicia sesión.
    </p>
  ) : credentialsEnabled ? (
    <>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {formError ? <Alert variant="error">{formError}</Alert> : null}

        <TextField
          label="Nombre"
          autoComplete="name"
          placeholder="Tu nombre"
          error={errors.name?.message}
          {...register('name')}
        />

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
          autoComplete="new-password"
          placeholder="••••••••"
          hint="Mínimo 8 caracteres."
          error={errors.password?.message}
          {...register('password')}
        />

        <PasswordField
          label="Repite la contraseña"
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <SubmitButton isPending={isSubmitting}>Crear cuenta</SubmitButton>
      </form>

      {socialEnabled ? <AuthDivider /> : null}

      {socialEnabled ? (
        <SocialButtons providers={providers} callbackURL={`${window.location.origin}/dashboard`} />
      ) : null}
    </>
  ) : (
    <>
      <p className="mb-2 text-sm text-slate-600">Te darás de alta al continuar con un proveedor.</p>
      <SocialButtons providers={providers} callbackURL={`${window.location.origin}/dashboard`} />
    </>
  )

  return (
    <AuthCard
      title="Crea tu cuenta"
      description="Empieza en menos de un minuto."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Inicia sesión
          </Link>
        </>
      }
    >
      {content}
    </AuthCard>
  )
}
