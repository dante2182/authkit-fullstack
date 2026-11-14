import { z } from 'zod'
import { Role } from '../../generated/prisma/enums.js'

// Se deriva del enum de Prisma: al añadir un rol, la validación se actualiza sola.
const roleValues = Object.values(Role) as [Role, ...Role[]]

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // Límite máximo duro: evita que un cliente pida la tabla entera.
  limit: z.coerce.number().int().min(1).max(100).default(20),
  // Búsqueda parcial por email. Vacío o solo espacios equivale a no filtrar: la UI puede enviar el input tal cual sin romper la petición.
  email: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(254).optional(),
  ),
})

export const userIdParamSchema = z.object({
  id: z.string().min(1),
})

export const changeRoleSchema = z.object({
  role: z.enum(roleValues),
})

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>
