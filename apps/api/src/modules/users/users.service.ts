import { prisma } from '../../config/prisma.js'
import type { UpdateUserInput } from './users.schema.js'

// Selección pública: nunca expone columnas de Account.
const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
  createdAt: true,
  updatedAt: true,
} as const

export const usersService = {
  findById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: publicUserSelect })
  },

  update(id: string, input: UpdateUserInput) {
    // Se omiten las claves ausentes: exactOptionalPropertyTypes no admite undefined.
    const data: { name?: string; image?: string | null } = {}
    if (input.name !== undefined) data.name = input.name
    if (input.image !== undefined) data.image = input.image

    return prisma.user.update({
      where: { id },
      data,
      select: publicUserSelect,
    })
  },

  remove(id: string) {
    return prisma.user.delete({ where: { id }, select: { id: true } })
  },
}
