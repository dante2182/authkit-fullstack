import type { RequestHandler } from 'express'
import { notFound } from '../../shared/errors/app-error.js'
import type { UpdateUserInput } from './users.schema.js'
import { usersService } from './users.service.js'

export const me: RequestHandler = async (req, res) => {
  const user = await usersService.findById(req.auth!.user.id)
  if (!user) throw notFound('Usuario no encontrado')
  res.json({ user })
}

export const updateMe: RequestHandler = async (req, res) => {
  const user = await usersService.update(req.auth!.user.id, req.body as UpdateUserInput)
  res.json({ user })
}

export const deleteMe: RequestHandler = async (req, res) => {
  await usersService.remove(req.auth!.user.id)
  res.status(204).end()
}
