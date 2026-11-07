import { CheckCircle2, CircleAlert } from 'lucide-react'
import type { AdminUser, UserRole } from '../types'
import { RoleSelect } from './RoleSelect'

const dateFormatter = new Intl.DateTimeFormat('es', { dateStyle: 'medium' })

interface AdminUsersTableProps {
  users: AdminUser[]
  currentUserId: string
  isBusy: boolean
  onRoleChange: (user: AdminUser, role: UserRole) => void
}

export function AdminUsersTable({
  users,
  currentUserId,
  isBusy,
  onRoleChange,
}: AdminUsersTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[44rem] text-left text-sm">
        <caption className="sr-only">Usuarios registrados</caption>
        <thead className="border-b border-slate-200 bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Nombre
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Correo
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Verificado
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Rol
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Creado
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((row) => {
            const isCurrentUser = row.id === currentUserId

            return (
              <tr key={row.id} className="align-middle">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {row.name}
                  {isCurrentUser ? (
                    <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      Tú
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-slate-600">{row.email}</td>
                <td className="px-4 py-3">
                  {row.emailVerified ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700">
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      Sí
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-amber-700">
                      <CircleAlert className="size-4" aria-hidden="true" />
                      No
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <RoleSelect
                    userName={row.name}
                    value={row.role}
                    disabled={isCurrentUser || isBusy}
                    disabledReason={
                      isCurrentUser ? 'No puedes cambiar tu propio rol' : 'Actualizando…'
                    }
                    onChange={(role) => onRoleChange(row, role)}
                  />
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {dateFormatter.format(new Date(row.createdAt))}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
