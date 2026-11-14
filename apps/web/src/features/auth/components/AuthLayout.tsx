import { CheckCircle2, ShieldCheck } from 'lucide-react'
import { Outlet } from 'react-router-dom'

const highlights = [
  'Sesiones con cookies httpOnly',
  'Roles y permisos (USER / ADMIN)',
  'Verificación de email y recuperación de contraseña',
]

export function AuthLayout() {
  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-slate-950 p-12 lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.35),transparent_55%),radial-gradient(circle_at_85%_85%,rgba(14,165,233,0.25),transparent_50%)]"
          aria-hidden="true"
        />

        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/15 ring-1 ring-indigo-400/30">
              <ShieldCheck className="size-5 text-indigo-300" aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-white">AuthKit</span>
          </div>

          <h2 className="mt-16 max-w-sm text-3xl leading-tight font-semibold text-white">
            Autenticación completa, sin reinventarla en cada proyecto.
          </h2>

          <ul className="mt-8 space-y-3">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-indigo-400"
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-400">React · Express · Prisma · better-auth</p>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-center gap-2 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-600">
              <ShieldCheck className="size-4.5 text-white" aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">AuthKit</span>
          </div>

          <Outlet />
        </div>
      </main>
    </div>
  )
}
