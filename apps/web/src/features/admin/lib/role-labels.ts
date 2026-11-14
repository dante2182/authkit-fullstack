import type { UserRole } from '../types'

export const ROLE_LABELS: Record<UserRole, string> = {
  USER: 'Usuario',
  ADMIN: 'Administrador',
}

export const ROLE_OPTIONS: UserRole[] = ['USER', 'ADMIN']
