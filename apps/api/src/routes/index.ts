import { Router } from 'express'
import { authRateLimit } from '../config/rate-limit.js'
import { authRouter } from '../modules/auth/auth.routes.js'
import { usersRouter } from '../modules/users/users.routes.js'

export const router: Router = Router()

router.get('/', (req, res) => {
  res.json({ message: 'Welcome to the API' })
})

router.use('/auth', authRateLimit, authRouter)
router.use('/users', usersRouter)
