import { request } from '@/services/http'
import type { AdminUsersResponse, ChangeRoleResponse, UserRole } from '../types'

export const adminService = {
  listUsers({ page, limit }: { page: number; limit: number }) {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) })
    return request<AdminUsersResponse>(`/admin/users?${query.toString()}`)
  },

  changeRole(userId: string, role: UserRole) {
    return request<ChangeRoleResponse>(`/admin/users/${encodeURIComponent(userId)}/role`, {
      method: 'PATCH',
      body: { role },
    })
  },
}
