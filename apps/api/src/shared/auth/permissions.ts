import { Role } from '../../generated/prisma/enums.js'

export type { Role }

// Fuente única de verdad de la autorización: añade permisos a PERMISSIONS y roles
// al enum Role de Prisma, y mapea ambos en ROLE_PERMISSIONS.
export const PERMISSIONS = {
  ADMIN_USERS_READ: 'admin.users.read',
  ADMIN_USERS_ROLES_UPDATE: 'admin.users.roles.update',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

// Record<Role, ...> a propósito: si el enum crece y falta el mapeo, el typecheck falla.
export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  [Role.ADMIN]: Object.values(PERMISSIONS),
  [Role.USER]: [],
}

const ROLE_VALUES = new Set<string>(Object.values(Role))

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && ROLE_VALUES.has(value)
}

// better-auth tipa los additionalFields como string: se normaliza el valor y,
// ante cualquier cosa desconocida, se cae al rol menos privilegiado.
export function resolveRole(value: unknown): Role {
  return isRole(value) ? value : Role.USER
}

export function permissionsFor(role: Role): readonly Permission[] {
  // La anotación permite que un rol presente en runtime pero no mapeado
  // (por ejemplo, uno añadido solo en tests) se deniegue en vez de romper.
  const permissions: readonly Permission[] | undefined = ROLE_PERMISSIONS[role]
  return permissions ?? []
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return permissionsFor(role).includes(permission)
}

// True cuando el rol destino pierde algún permiso del origen. Se usa para revocar las sesiones al quitar privilegios.
export function losesPrivileges(from: Role, to: Role): boolean {
  const next = permissionsFor(to)
  return permissionsFor(from).some((permission) => !next.includes(permission))
}
