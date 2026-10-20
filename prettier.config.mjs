/** @type {import('prettier').Config} */
// Reglas base para los ficheros de la raíz (README, .vscode, package.json...).
// Cada app tiene su propio config con sus plugins (tailwind / prisma) y estas mismas reglas.
const config = {
  semi: false,
  singleQuote: true,
  jsxSingleQuote: false,
  quoteProps: 'as-needed',
  trailingComma: 'all',
  arrowParens: 'always',
  bracketSpacing: true,
  bracketSameLine: false,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  endOfLine: 'lf',
  proseWrap: 'preserve',
}

export default config
