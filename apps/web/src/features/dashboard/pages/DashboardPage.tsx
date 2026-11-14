import { CheckCircle2, CircleAlert, LayoutDashboard, MailCheck, Shield } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import { ResendVerificationButton, useAuth } from '@/features/auth'

interface InfoCardProps {
  title: string
  icon: ReactNode
  children: ReactNode
}

function InfoCard({ title, icon, children }: InfoCardProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span className="text-indigo-600">{icon}</span>
        {title}
      </header>
      {children}
    </section>
  )
}

// Destino mínimo tras el login: demuestra la sesión, el logout y la ruta protegida. Las secciones reales se añadirán encima de esta base.
export function DashboardPage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <section>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Hola, {user.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tu sesión está activa. Este es el punto de partida de la aplicación.
          </p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <InfoCard title="Estado del correo" icon={<MailCheck className="size-4" />}>
            {user.emailVerified ? (
              <p className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Verificado
              </p>
            ) : (
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm text-amber-700">
                  <CircleAlert className="size-4" aria-hidden="true" />
                  Pendiente de verificar
                </p>
                <p className="text-xs text-slate-500">
                  Revisa tu bandeja de entrada. En desarrollo, sin RESEND_API_KEY, el correo no se
                  envía.
                </p>
                <ResendVerificationButton email={user.email} />
              </div>
            )}
          </InfoCard>

          <InfoCard title="Rol" icon={<Shield className="size-4" />}>
            <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 ring-inset">
              {user.role}
            </span>
            <p className="mt-3 text-xs text-slate-500">
              El rol se lee de la base de datos en cada petición: los cambios de permisos se aplican
              de inmediato.
            </p>
          </InfoCard>
        </div>

        <InfoCard title="Sesión" icon={<LayoutDashboard className="size-4" />}>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                ID de usuario
              </dt>
              <dd className="mt-1 font-mono text-xs break-all text-slate-700">{user.id}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Cuenta creada
              </dt>
              <dd className="mt-1 text-slate-700">
                {new Intl.DateTimeFormat('es', { dateStyle: 'long' }).format(
                  new Date(user.createdAt),
                )}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            La sesión viaja en una cookie httpOnly y no es accesible desde JavaScript.
          </p>
        </InfoCard>

        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
          <p className="text-sm font-medium text-slate-900">Gestiona tu cuenta</p>
          <p className="mt-1 text-xs text-slate-500">
            Cambia tu nombre, tu contraseña y revisa las sesiones abiertas.
          </p>
          <Link
            to="/account"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Ir a mi cuenta
          </Link>
        </section>
      </main>
    </div>
  )
}
