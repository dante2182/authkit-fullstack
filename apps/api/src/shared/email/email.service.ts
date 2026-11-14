import { env } from '../../config/env.js'

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

// Cliente HTTP mínimo de Resend. Se usa fetch nativo para no añadir dependencias.
export async function sendWithResend(
  message: EmailMessage,
  config: { apiKey: string; from: string },
): Promise<void> {
  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.from,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Resend respondió ${response.status}: ${detail.slice(0, 200)}`)
  }
}

// Punto único de envío: los tests lo sustituyen con vi.mock.
export const emailService = {
  async send(message: EmailMessage): Promise<void> {
    if (env.RESEND_API_KEY) {
      await sendWithResend(message, { apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM })
      return
    }

    // Sin clave (desarrollo y tests) se registra solo asunto y destinatario, nunca el
    // cuerpo con el token. En producción es inalcanzable (RESEND_API_KEY obligatoria).
    if (env.NODE_ENV === 'development') {
      console.info(`[email] ${message.subject} → ${message.to}`)
    }
  },
}
