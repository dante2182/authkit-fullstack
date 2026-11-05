import type { RequestHandler } from 'express'
import { logger } from '../../config/logger.js'
import { badRequest } from '../../shared/errors/app-error.js'
import type { ChangeRoleInput, ListUsersQuery } from './admin.schema.js'
import { adminService } from './admin.service.js'

export const listUsers: RequestHandler = async (req, res) => {
  const { page, limit } = req.query as unknown as ListUsersQuery
  const result = await adminService.listUsers({ page, limit })

  res.json({
    users: result.users,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      pages: result.pages,
    },
  })
}

export const changeRole: RequestHandler = async (req, res) => {
  const targetId = req.params.id
  if (typeof targetId !== 'string' || targetId.length === 0) {
    throw badRequest('Falta el id del usuario')
  }

  const { role } = req.body as ChangeRoleInput
  const actorId = req.auth!.user.id

  const { user, previousRole, sessionsRevoked } = await adminService.changeRole({
    actorId,
    targetId,
    newRole: role,
  })

  // Sin datos sensibles: solo ids, roles y cuántas sesiones se revocaron.
  logger.info(
    { actorId, targetId, previousRole, newRole: role, sessionsRevoked },
    'admin.role.changed',
  )

  res.json({ user })
}
