/** @type {import('prettier').Config} */
// Configuración única para todo el monorepo. Los plugins viven en la raíz para
// que tanto el CLI (`pnpm format:check`) como el editor (Ctrl+S) los resuelvan.
const config = {
  // Estilo base
  semi: false,
  singleQuote: true,
  jsxSingleQuote: false,
  quoteProps: 'as-needed',
  trailingComma: 'all',
  arrowParens: 'always',
  bracketSpacing: true,
  bracketSameLine: false,

  // Legibilidad
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  endOfLine: 'lf',
  proseWrap: 'preserve',
  htmlWhitespaceSensitivity: 'css',

  // Plugins
  plugins: ['prettier-plugin-tailwindcss', 'prettier-plugin-prisma'],
  // Las rutas se resuelven desde este archivo (la raíz del monorepo)
  tailwindStylesheet: './apps/web/src/index.css',
  tailwindFunctions: ['cn', 'clsx', 'cva', 'twMerge'],
}

export default config
