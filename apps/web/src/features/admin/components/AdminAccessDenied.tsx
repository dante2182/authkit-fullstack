import { MailWarning, ShieldX } from 'lucide-react'
import { Link } from 'react-router-dom'

type DeniedReason = 'role' | 'email'

interface AdminAccessDeniedProps {
  reason: DeniedReason
}

const COPY: Record<DeniedReason, { title: string; message: string; icon: typeof ShieldX }> = {
  role: {
    title: 'Acceso restringido',
    message: 'Esta sección solo está disponible para administradores.',
    icon: ShieldX,
  },
  email: {
    title: 'Verifica tu correo',
    message:
      'El panel de administración exige un correo verificado. Revisa tu bandeja de entrada y vuelve a intentarlo.',
    icon: MailWarning,
  },
}

export function AdminAccessDenied({ reason }: AdminAccessDeniedProps) {
  const { title, message, icon: Icon } = COPY[reason]

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-100">
          <Icon className="size-6 text-rose-600" aria-hidden="true" />
        </span>

        <p className="mt-6 text-sm font-semibold text-rose-600">403</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>

        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Volver al dashboard
        </Link>
      </div>
    </div>
  )
}
