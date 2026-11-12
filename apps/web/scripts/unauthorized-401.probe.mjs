import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

// Prueba de regresión del manejo global de 401, sin runner de navegador.
// Carga el cliente HTTP real con Vite (SSR) y sustituye `fetch` para simular
// respuestas. Mismo enfoque que auth-composition.probe.mjs: sin dependencias nuevas.
const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'authkit-401-'))

const server = await createServer({
  root: webRoot,
  configFile: false,
  cacheDir,
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true, watch: null, fs: { strict: false, allow: [webRoot, cacheDir] } },
  resolve: { alias: { '@': path.join(webRoot, 'src') } },
  optimizeDeps: { noDiscovery: true },
})

const results = []
const check = (name, ok) => results.push({ name, ok: Boolean(ok) })

const json = (status, body = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

try {
  const http = await server.ssrLoadModule('/src/services/http.ts')

  // Sin `window` (SSR) un 401 debe seguir lanzando ApiError y no romper.
  globalThis.fetch = async () =>
    json(401, { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } })
  let ssrError = null
  try {
    await http.request('/users/me')
  } catch (error) {
    ssrError = error
  }
  check(
    'SSR: un 401 lanza ApiError sin tocar window',
    ssrError?.name === 'ApiError' && ssrError.status === 401,
  )

  const fakeWindow = new EventTarget()
  let fired = 0
  fakeWindow.addEventListener(http.UNAUTHORIZED_EVENT, () => {
    fired += 1
  })
  globalThis.window = fakeWindow

  check('el nombre del evento es estable', http.UNAUTHORIZED_EVENT === 'authkit:unauthorized')

  await http.request('/users/me').catch(() => {})
  check('un 401 en /users/me emite el evento una vez', fired === 1)

  fired = 0
  await http.request('/auth/sign-in/email').catch(() => {})
  check('el 401 de credenciales inválidas NO emite el evento', fired === 0)

  globalThis.fetch = async () =>
    json(403, { error: { code: 'INSUFFICIENT_PERMISSION', message: 'Forbidden' } })
  fired = 0
  await http.request('/admin/users?page=1&limit=10').catch(() => {})
  check('un 403 NO emite el evento', fired === 0)

  globalThis.fetch = async () =>
    json(401, { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' })
  fired = 0
  let loginError = null
  try {
    await http.request('/auth/sign-in/email', { method: 'POST', body: {} })
  } catch (error) {
    loginError = error
  }
  check(
    'el 401 de login conserva código y mensaje',
    loginError?.code === 'INVALID_EMAIL_OR_PASSWORD' && fired === 0,
  )
} finally {
  await server.close()
  fs.rmSync(cacheDir, { recursive: true, force: true })

  for (const result of results) {
    console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}`)
  }

  const failed = results.filter((result) => !result.ok).length
  console.log(`${results.length} checks, ${failed} failed`)
  process.exitCode = failed === 0 ? 0 : 1
}
