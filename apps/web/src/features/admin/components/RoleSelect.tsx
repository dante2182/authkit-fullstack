import type { ChangeEvent } from 'react'
import { ROLE_LABELS, ROLE_OPTIONS } from '../lib/role-labels'
import type { UserRole } from '../types'

interface RoleSelectProps {
  userName: string
  value: UserRole
  disabled?: boolean
  disabledReason?: string
  onChange: (role: UserRole) => void
}

export function RoleSelect({
  userName,
  value,
  disabled = false,
  disabledReason,
  onChange,
}: RoleSelectProps) {
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    onChange(event.target.value as UserRole)
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      aria-label={
        disabled && disabledReason ? `Rol de ${userName} — ${disabledReason}` : `Rol de ${userName}`
      }
      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 shadow-sm transition focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
    >
      {ROLE_OPTIONS.map((role) => (
        <option key={role} value={role}>
          {ROLE_LABELS[role]}
        </option>
      ))}
    </select>
  )
}
