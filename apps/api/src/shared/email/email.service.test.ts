import { afterEach, describe, expect, it, vi } from 'vitest'
import { emailService, sendWithResend } from './email.service.js'

const message = {
  to: 'destinatario@example.com',
  subject: 'Asunto de prueba',
  html: '<p>Hola</p>',
  text: 'Hola',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sendWithResend', () => {
  it('envía el correo a la API de Resend', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await sendWithResend(message, { apiKey: 're_test_key', from: 'AuthKit <no-reply@test.com>' })

    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://api.resend.com/emails')

    const request = init as RequestInit
    expect(request.headers).toMatchObject({ Authorization: 'Bearer re_test_key' })
    expect(JSON.parse(String(request.body))).toMatchObject({
      from: 'AuthKit <no-reply@test.com>',
      to: ['destinatario@example.com'],
      subject: 'Asunto de prueba',
    })
  })

  it('lanza un error con el status cuando Resend falla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 500 })))

    await expect(sendWithResend(message, { apiKey: 'k', from: 'f' })).rejects.toThrow(
      'Resend respondió 500',
    )
  })
})

describe('emailService.send', () => {
  it('no llama a Resend cuando no hay RESEND_API_KEY (entorno de test)', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await emailService.send(message)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('en desarrollo registra el asunto y el destinatario, nunca el cuerpo con el enlace', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.resetModules()
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})

    const { emailService: devEmailService } = await import('./email.service.js')
    await devEmailService.send(message)

    const logged = info.mock.calls.flat().join(' ')
    expect(logged).toContain(message.to)
    expect(logged).not.toContain(message.text)

    info.mockRestore()
    vi.unstubAllEnvs()
    vi.resetModules()
  })
})
