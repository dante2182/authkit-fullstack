// Descripción legible de una sesión. No pretende ser un parser completo de
// user-agents: solo distingue los navegadores y sistemas más habituales.

export function describeUserAgent(userAgent: string | null | undefined): string {
  if (!userAgent) return 'Dispositivo desconocido'

  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Firefox\//.test(userAgent)
      ? 'Firefox'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : 'Navegador'

  const system = /Windows/.test(userAgent)
    ? 'Windows'
    : /Mac OS X|Macintosh/.test(userAgent)
      ? 'macOS'
      : /Android/.test(userAgent)
        ? 'Android'
        : /iPhone|iPad|iPod/.test(userAgent)
          ? 'iOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : null

  return system ? `${browser} en ${system}` : browser
}

const sessionDateFormatter = new Intl.DateTimeFormat('es', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatSessionDate(value: string): string {
  return sessionDateFormatter.format(new Date(value))
}
