import pino from 'pino'
import { env } from './env.js'

// Logger único del proceso. En test queda en silencio (LOG_LEVEL=silent).
export const logger = pino({ level: env.LOG_LEVEL })
