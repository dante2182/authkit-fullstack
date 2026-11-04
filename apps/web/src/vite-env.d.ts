/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API (apps/api), incluye el prefijo /api. Definida en .env */
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
