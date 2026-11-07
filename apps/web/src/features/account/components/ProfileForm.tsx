import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert, SubmitButton, TextField, authErrorMessage, useAuth } from '@/features/auth'
import { accountService } from '../services/account.service'

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(80, 'El nombre no puede superar los 80 caracteres'),
})

type ProfileValues = z.infer<typeof profileSchema>

export function ProfileForm() {
  const { user, refreshSession } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    setSuccess(null)

    try {
      await accountService.updateProfile({ name: values.name })

      // El nombre vive en `session.user`: hay que releer la sesión para que la
      // cabecera y el resto de la app muestren el valor confirmado por la API.
      const refreshed = await refreshSession()

      if (!refreshed) {
        setFormError('No pudimos confirmar tu sesión. Vuelve a iniciar sesión.')
        return
      }

      setSuccess('Nombre actualizado.')
    } catch (error) {
      setFormError(authErrorMessage(error))
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError ? <Alert variant="error">{formError}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <TextField
        label="Nombre"
        autoComplete="name"
        error={errors.name?.message}
        hint="Entre 1 y 80 caracteres."
        {...register('name')}
      />

      <p className="text-xs text-slate-500">
        El correo no se puede cambiar desde aquí:{' '}
        <span className="text-slate-700">{user?.email}</span>
      </p>

      <SubmitButton isPending={isSubmitting}>Guardar cambios</SubmitButton>
    </form>
  )
}
