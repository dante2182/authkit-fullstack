import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

// Prueba de composición sin runner de tests: renderiza las páginas a HTML con
// el contexto de capacidades simulado y comprueba qué se pinta en cada modo.
// Uso: `pnpm --filter web test:composition` (desde la raíz del monorepo).
const here = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(here, '..')
const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'authkit-probe-'))

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

try {
  const { cases } = await server.ssrLoadModule('/scripts/auth-composition.cases.mjs')
  let failed = 0

  for (const testCase of cases) {
    if (testCase.ok) {
      console.log(`PASS ${testCase.name}`)
      continue
    }

    failed += 1
    console.log(
      `FAIL ${testCase.name} missing=${JSON.stringify(testCase.missing)} leaked=${JSON.stringify(testCase.leaked)}`,
    )
  }

  console.log(`${cases.length} cases, ${failed} failed`)
  process.exitCode = failed ? 1 : 0
} finally {
  await server.close()
  fs.rmSync(cacheDir, { recursive: true, force: true })
}
