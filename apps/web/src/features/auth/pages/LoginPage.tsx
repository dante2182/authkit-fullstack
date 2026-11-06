import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Alert } from '../components/Alert'
import { AuthCard } from '../components/AuthCard'
import { PasswordField } from '../components/PasswordField'
import { SubmitButton } from '../components/SubmitButton'
import { TextField } from '../components/TextField'
import { useAuth } from '../hooks/use-auth'
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

  return (
    <AuthCard
      title="Inicia sesión"
      description="Accede a tu cuenta para continuar."
      footer={
        <>
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            Crear una cuenta
          </Link>
        </>
      }
    >
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
    </AuthCard>
  )
}
