import type { ReactNode } from 'react'

interface AuthCardProps {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
      <header className="mb-6 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500">{description}</p>
      </header>

      {children}

      {footer ? (
        <footer className="mt-6 border-t border-slate-100 pt-4 text-center text-sm text-slate-500">
          {footer}
        </footer>
      ) : null}
    </section>
  )
}
