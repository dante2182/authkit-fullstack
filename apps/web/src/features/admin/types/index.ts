// Contrato del módulo admin de la API. Solo campos públicos: nunca datos de Account (password, tokens OAuth...).

import type { UserRole } from '@/features/auth'

export type { UserRole }

export interface AdminUser {
  id: string
  name: string
  email: string
  emailVerified: boolean
  role: UserRole
  createdAt: string
}

export interface AdminPagination {
  page: number
  limit: number
  total: number
  pages: number
}

export interface AdminUsersResponse {
  users: AdminUser[]
  pagination: AdminPagination
}

export interface ChangeRoleResponse {
  user: AdminUser
}
