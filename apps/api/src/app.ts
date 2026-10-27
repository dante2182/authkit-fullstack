import { toNodeHandler } from 'better-auth/node'
import cors from 'cors'
import express from 'express'
import type { Express, NextFunction, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { auth } from './config/auth.js'
import { corsOptions } from './config/cors.js'

export const app: Express = express()

app.use(helmet())
app.use(cors(corsOptions))

// Límite solo para auth (fuerza bruta); 100 peticiones por minuto.
app.use('/api/auth', rateLimit({ windowMs: 60_000, limit: 100 }))

// better-auth necesita el body crudo: va antes de express.json().
app.all('/api/auth/*splat', toNodeHandler(auth))

app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Manejo de errores centralizado (Express 5 exige los 4 parámetros).
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})
