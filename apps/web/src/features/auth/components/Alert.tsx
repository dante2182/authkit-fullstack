import { CircleAlert, CircleCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface AlertProps {
  variant: 'error' | 'success'
  children: ReactNode
}

const VARIANTS = {
  error: {
    icon: CircleAlert,
    className: 'border-red-200 bg-red-50 text-red-700',
  },
  success: {
    icon: CircleCheck,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
} as const

export function Alert({ variant, children }: AlertProps) {
  const { icon: Icon, className } = VARIANTS[variant]

  return (
    <div
      role="alert"
      className={cn('flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm', className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="space-y-1">{children}</div>
    </div>
  )
}
