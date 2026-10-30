import cors from 'cors'
import express from 'express'
import type { Express } from 'express'
import helmet from 'helmet'
import { corsOptions } from './config/cors.js'
import { router } from './routes.js'
import { errorHandler } from './shared/errors/error-handler.js'
import { notFoundHandler } from './shared/middlewares/not-found.js'

export const app: Express = express()

app.use(helmet())
app.use(cors(corsOptions))
app.use(express.json())

app.use(router)
app.use(notFoundHandler)
app.use(errorHandler)
