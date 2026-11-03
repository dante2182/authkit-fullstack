import type { EmailMessage } from './email.service.js'

interface EmailRecipient {
  to: string
  name: string
}

const PARAGRAPH_STYLE =
  'margin: 0 0 16px; font-family: system-ui, -apple-system, Segoe UI, sans-serif; font-size: 15px; line-height: 1.6; color: #1f2937;'

function button(href: string, label: string): string {
  return `<a href="${href}" style="display: inline-block; padding: 12px 20px; border-radius: 8px; background: #2563eb; color: #ffffff; font-family: system-ui, -apple-system, Segoe UI, sans-serif; font-size: 15px; font-weight: 600; text-decoration: none;">${label}</a>`
}

function layout(title: string, body: string): string {
  return `<!doctype html><html lang="es"><body style="margin: 0; padding: 24px; background: #f9fafb;"><div style="max-width: 520px; margin: 0 auto; padding: 24px; border-radius: 12px; background: #ffffff;"><h1 style="margin: 0 0 16px; font-family: system-ui, -apple-system, Segoe UI, sans-serif; font-size: 20px; color: #111827;">${title}</h1>${body}</div></body></html>`
}

export function passwordResetEmail(recipient: EmailRecipient, url: string): EmailMessage {
  return {
    to: recipient.to,
    subject: 'Restablece tu contraseña',
    text: `Hola ${recipient.name},

Recibimos una solicitud para restablecer tu contraseña.

${url}

Si no fuiste tú, ignora este correo: tu contraseña no cambiará. El enlace caduca en 1 hora.`,
    html: layout(
      'Restablece tu contraseña',
      `<p style="${PARAGRAPH_STYLE}">Hola ${recipient.name},</p>
<p style="${PARAGRAPH_STYLE}">Recibimos una solicitud para restablecer tu contraseña.</p>
<p style="${PARAGRAPH_STYLE}">${button(url, 'Elegir nueva contraseña')}</p>
<p style="${PARAGRAPH_STYLE}">Si no fuiste tú, ignora este correo: tu contraseña no cambiará. El enlace caduca en 1 hora.</p>`,
    ),
  }
}

export function verificationEmail(recipient: EmailRecipient, url: string): EmailMessage {
  return {
    to: recipient.to,
    subject: 'Verifica tu correo',
    text: `Hola ${recipient.name},

Confirma tu dirección de correo para terminar de configurar tu cuenta.

${url}

Si no creaste esta cuenta, ignora este correo.`,
    html: layout(
      'Verifica tu correo',
      `<p style="${PARAGRAPH_STYLE}">Hola ${recipient.name},</p>
<p style="${PARAGRAPH_STYLE}">Confirma tu dirección de correo para terminar de configurar tu cuenta.</p>
<p style="${PARAGRAPH_STYLE}">${button(url, 'Verificar correo')}</p>
<p style="${PARAGRAPH_STYLE}">Si no creaste esta cuenta, ignora este correo.</p>`,
    ),
  }
}
