import type { ComponentPropsWithRef } from 'react'
import { cn } from '@/lib/cn'

export interface TextFieldProps extends ComponentPropsWithRef<'input'> {
  label: string
  error?: string
  hint?: string
}

export function TextField({ label, error, hint, id, className, ...props }: TextFieldProps) {
  const inputId = id ?? props.name
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition outline-none',
          'placeholder:text-slate-400',
          'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20',
          error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20',
          className,
        )}
        {...props}
      />

      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
