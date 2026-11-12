import { request } from '@/services/http'
import type { AdminUsersResponse, ChangeRoleResponse, UserRole } from '../types'

export const adminService = {
  // `email` es opcional: vacío no filtra. La API ya normaliza espacios.
  listUsers({ page, limit, email }: { page: number; limit: number; email?: string }) {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (email) query.set('email', email)
    return request<AdminUsersResponse>(`/admin/users?${query.toString()}`)
  },

  changeRole(userId: string, role: UserRole) {
    return request<ChangeRoleResponse>(`/admin/users/${encodeURIComponent(userId)}/role`, {
      method: 'PATCH',
      body: { role },
    })
  },
}
