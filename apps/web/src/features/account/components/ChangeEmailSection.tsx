import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert, SubmitButton, TextField, authErrorMessage, useAuth } from '@/features/auth'
import { accountService } from '../services/account.service'

const changeEmailSchema = z.object({
  newEmail: z.email('Introduce un correo válido'),
})

type ChangeEmailValues = z.infer<typeof changeEmailSchema>

// Cambio de correo en dos pasos: aquí solo se solicita. La dirección no cambia hasta
// abrir el enlace que llega al correo ACTUAL, así que una sesión robada no basta.
export function ChangeEmailSection() {
  const { user } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const [requested, setRequested] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangeEmailValues>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { newEmail: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    setRequested(null)

    try {
      await accountService.changeEmail({ newEmail: values.newEmail })
      // Mensaje genérico a propósito: la API responde igual aunque la dirección ya pertenezca a otra cuenta (anti-enumeración).
      setRequested(values.newEmail)
      reset()
    } catch (error) {
      setFormError(authErrorMessage(error))
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      {requested ? (
        <Alert variant="success">
          Hemos enviado un enlace de confirmación a {user?.email}. Ábrelo para cambiar tu correo a{' '}
          {requested}.
        </Alert>
      ) : null}

      <TextField
        label="Nuevo correo"
        type="email"
        autoComplete="email"
        error={errors.newEmail?.message}
        hint={`Ahora mismo entras con ${user?.email ?? 'tu correo actual'}.`}
        {...register('newEmail')}
      />

      <SubmitButton isPending={isSubmitting}>Enviar confirmación</SubmitButton>
    </form>
  )
}
