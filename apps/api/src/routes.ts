import { Router } from 'express'
import { authRateLimit } from './config/rate-limit.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { usersRouter } from './modules/users/users.routes.js'

export const router: Router = Router()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

router.use('/auth', authRateLimit, authRouter)
router.use('/users', usersRouter)
