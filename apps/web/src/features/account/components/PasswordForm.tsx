import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert, PasswordField, SubmitButton, authErrorMessage, useAuth } from '@/features/auth'
import { accountService } from '../services/account.service'

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Introduce tu contraseña actual'),
    newPassword: z
      .string()
      .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
      .max(128, 'La nueva contraseña no puede superar los 128 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma la nueva contraseña'),
    revokeOtherSessions: z.boolean(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  })

type PasswordValues = z.infer<typeof passwordSchema>

interface PasswordFormProps {
  // Se avisa cuando el cambio invalida la sesión actual y emite un token nuevo.
  onOtherSessionsRevoked?: () => void
}

export function PasswordForm({ onOtherSessionsRevoked }: PasswordFormProps) {
  const { refreshSession } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      revokeOtherSessions: true,
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    setSuccess(null)

    try {
      await accountService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: values.revokeOtherSessions,
      })

      // Con revokeOtherSessions la API emite una cookie nueva; releer la sesión
      // confirma que el navegador la aceptó.
      if (values.revokeOtherSessions) {
        await refreshSession()
        onOtherSessionsRevoked?.()
      }

      reset()
      setSuccess('Contraseña actualizada.')
    } catch (error) {
      setFormError(authErrorMessage(error))
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError ? <Alert variant="error">{formError}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <PasswordField
        label="Contraseña actual"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register('currentPassword')}
      />

      <PasswordField
        label="Nueva contraseña"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        hint="Mínimo 8 caracteres."
        {...register('newPassword')}
      />

      <PasswordField
        label="Confirma la nueva contraseña"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          className="mt-0.5 size-4 rounded border-slate-300 text-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          {...register('revokeOtherSessions')}
        />
        Cerrar sesión en los demás dispositivos
      </label>

      <SubmitButton isPending={isSubmitting}>Cambiar contraseña</SubmitButton>
    </form>
  )
}
