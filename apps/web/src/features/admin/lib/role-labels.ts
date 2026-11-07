import type { UserRole } from '../types'

// Copy en español para el selector y las etiquetas de la tabla.
export const ROLE_LABELS: Record<UserRole, string> = {
  USER: 'Usuario',
  ADMIN: 'Administrador',
}

export const ROLE_OPTIONS: UserRole[] = ['USER', 'ADMIN']
