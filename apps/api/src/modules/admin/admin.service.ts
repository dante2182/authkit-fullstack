import { prisma } from '../../config/prisma.js'
import { Role } from '../../generated/prisma/enums.js'
import { losesPrivileges } from '../../shared/auth/permissions.js'
import { badRequest, conflict, notFound } from '../../shared/errors/app-error.js'

// Campos públicos del listado. Nunca se seleccionan datos de Account
// (password, accessToken, refreshToken, idToken...).
export const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  role: true,
  createdAt: true,
} as const

interface ListUsersParams {
  page: number
  limit: number
  email?: string | undefined
}

interface ChangeRoleParams {
  actorId: string
  targetId: string
  newRole: Role
}

export const adminService = {
  async listUsers({ page, limit, email }: ListUsersParams) {
    // `contains` + `mode: insensitive`: búsqueda parcial y sin distinguir
    // mayúsculas. El where se comparte entre listado y conteo para que la
    // paginación refleje el filtro.
    const where = email ? { email: { contains: email, mode: 'insensitive' as const } } : {}

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: adminUserSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return { users, total, page, limit, pages: Math.ceil(total / limit) }
  },

  // Serializable: dos degradaciones concurrentes no pueden dejar el sistema
  // sin ningún ADMIN (contar y actualizar ocurre en la misma transacción).
  changeRole({ actorId, targetId, newRole }: ChangeRoleParams) {
    return prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findUnique({
          where: { id: targetId },
          select: { id: true, role: true },
        })

        if (!target) throw notFound('Usuario no encontrado')

        // Un admin no puede cambiar su propio rol: evita auto-degradaciones
        // accidentales y bloquea el caso "último admin se quita a sí mismo".
        if (target.id === actorId) {
          throw badRequest('No puedes cambiar tu propio rol')
        }

        if (target.role === newRole) {
          const user = await tx.user.findUniqueOrThrow({
            where: { id: targetId },
            select: adminUserSelect,
          })
          return { user, previousRole: target.role, sessionsRevoked: 0 }
        }

        if (target.role === Role.ADMIN && newRole !== Role.ADMIN) {
          const admins = await tx.user.count({ where: { role: Role.ADMIN } })
          if (admins <= 1) {
            throw conflict('No puedes dejar el sistema sin administradores')
          }
        }

        const user = await tx.user.update({
          where: { id: targetId },
          data: { role: newRole },
          select: adminUserSelect,
        })

        // Al quitar privilegios se revocan todas las sesiones del usuario para
        // que el cambio surta efecto de inmediato, no solo en la siguiente.
        let sessionsRevoked = 0
        if (losesPrivileges(target.role, newRole)) {
          const result = await tx.session.deleteMany({ where: { userId: targetId } })
          sessionsRevoked = result.count
        }

        return { user, previousRole: target.role, sessionsRevoked }
      },
      { isolationLevel: 'Serializable' },
    )
  },
}
