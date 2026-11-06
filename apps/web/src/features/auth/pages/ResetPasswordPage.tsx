import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Alert } from '../components/Alert'
import { AuthCard } from '../components/AuthCard'
import { PasswordField } from '../components/PasswordField'
import { SubmitButton } from '../components/SubmitButton'
import { authErrorMessage, linkErrorMessage } from '../lib/auth-errors'
import { authService } from '../services/auth.service'

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Mínimo 8 caracteres').max(128, 'Máximo 128 caracteres'),
    confirmPassword: z.string().min(1, 'Repite la contraseña'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  })

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const linkError = searchParams.get('error')
  const [done, setDone] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    if (!token) return

    setFormError(null)

    try {
      await authService.resetPassword({ token, newPassword: values.newPassword })
      setDone(true)
    } catch (error) {
      setFormError(authErrorMessage(error))
    }
  })

  if (done) {
    return (
      <AuthCard
        title="Contraseña actualizada"
        description="Ya puedes iniciar sesión con tu nueva contraseña."
        footer={
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Ir a iniciar sesión
          </Link>
        }
      >
        <Alert variant="success">Tu contraseña se ha actualizado correctamente.</Alert>
      </AuthCard>
    )
  }

  if (linkError || !token) {
    return (
      <AuthCard
        title="Enlace no válido"
        description="No pudimos usar este enlace de recuperación."
        footer={
          <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
            Solicitar un enlace nuevo
          </Link>
        }
      >
        <Alert variant="error">{linkErrorMessage(linkError)}</Alert>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Nueva contraseña"
      description="Elige una contraseña segura para tu cuenta."
      footer={
        <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          Volver a iniciar sesión
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {formError ? <Alert variant="error">{formError}</Alert> : null}

        <PasswordField
          label="Contraseña"
          autoComplete="new-password"
          placeholder="••••••••"
          hint="Mínimo 8 caracteres."
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />

        <PasswordField
          label="Repite la contraseña"
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <SubmitButton isPending={isSubmitting}>Guardar contraseña</SubmitButton>
      </form>
    </AuthCard>
  )
}
