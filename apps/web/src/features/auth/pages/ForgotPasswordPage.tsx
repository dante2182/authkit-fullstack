import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Alert } from '../components/Alert'
import { AuthCard } from '../components/AuthCard'
import { SubmitButton } from '../components/SubmitButton'
import { TextField } from '../components/TextField'
import { authErrorMessage } from '../lib/auth-errors'
import { authService } from '../services/auth.service'

const forgotPasswordSchema = z.object({
  email: z.email('Introduce un correo válido'),
})

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)

    try {
      await authService.forgotPassword({ email: values.email.trim() })
      setSent(true)
    } catch (error) {
      setFormError(authErrorMessage(error))
    }
  })

  if (sent) {
    return (
      <AuthCard
        title="Revisa tu correo"
        description="Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña."
        footer={
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Volver a iniciar sesión
          </Link>
        }
      >
        <Alert variant="success">
          El enlace caduca en poco tiempo. Revisa también la carpeta de spam.
        </Alert>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Recupera tu contraseña"
      description="Te enviaremos un enlace para restablecerla."
      footer={
        <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          Volver a iniciar sesión
        </Link>
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

        <SubmitButton isPending={isSubmitting}>Enviar enlace</SubmitButton>
      </form>
    </AuthCard>
  )
}
