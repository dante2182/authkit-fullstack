import { CheckCircle2, CircleAlert, LayoutDashboard, LogOut, MailCheck, Shield } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

// Destino mínimo tras el login: demuestra la sesión, el logout y la ruta
// protegida. Las secciones reales se añadirán encima de esta base.
export function DashboardPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [isSigningOut, setIsSigningOut] = useState(false)

  if (!user) return null

  // signOut limpia siempre el estado local, aunque falle el servidor.
  async function handleSignOut() {
    setIsSigningOut(true)

    try {
      await signOut()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600">
              <LayoutDashboard className="size-4 text-white" aria-hidden="true" />
            </span>
            <span className="font-semibold tracking-tight text-slate-900">AuthKit</span>
          </Link>

          <div className="flex items-center gap-3">
            {user.role === 'ADMIN' ? (
              <Link
                to="/admin/users"
                aria-label="Usuarios"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none"
              >
                <Shield className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Usuarios</span>
              </Link>
            ) : null}

            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

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
          <p className="text-sm font-medium text-slate-900">Más secciones próximamente</p>
          <p className="mt-1 text-xs text-slate-500">
            Perfil, cambio de contraseña y gestión de sesiones se conectarán en la siguiente fase.
          </p>
        </section>
      </main>
    </div>
  )
}
