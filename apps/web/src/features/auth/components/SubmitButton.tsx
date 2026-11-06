import { LoaderCircle } from 'lucide-react'
import type { ComponentPropsWithRef } from 'react'
import { cn } from '@/lib/cn'

interface SubmitButtonProps extends ComponentPropsWithRef<'button'> {
  isPending?: boolean
}

export function SubmitButton({
  children,
  isPending = false,
  disabled,
  className,
  ...props
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled === true || isPending}
      aria-busy={isPending}
      className={cn(
        'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition',
        'hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    >
      {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  )
}
