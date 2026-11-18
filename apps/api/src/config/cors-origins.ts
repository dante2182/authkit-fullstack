// `CORS_ORIGIN` admite una lista separada por comas; el primero es el frontend canónico.
export function parseCorsOrigins(value: string): string[] {
  const origins = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

  if (origins.length === 0) {
    throw new Error('CORS_ORIGIN debe contener al menos un origen')
  }

  return origins.map((origin) => {
    let parsed: URL
    try {
      parsed = new URL(origin)
    } catch {
      throw new Error(`CORS_ORIGIN contiene un origen inválido: "${origin}"`)
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`CORS_ORIGIN contiene un origen inválido: "${origin}"`)
    }

    if (parsed.pathname !== '/' || parsed.search !== '' || parsed.hash !== '') {
      throw new Error(`CORS_ORIGIN espera un origen sin ruta: "${origin}"`)
    }

    // `parsed.origin` normaliza mayúsculas y quita la barra final del origen.
    return parsed.origin
  })
}
