import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Alert } from '../components/Alert'
import { AuthCard } from '../components/AuthCard'
import { PasswordField } from '../components/PasswordField'
import { SubmitButton } from '../components/SubmitButton'
import { TextField } from '../components/TextField'
import { useAuth } from '../hooks/use-auth'
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
    </AuthCard>
  )
}
