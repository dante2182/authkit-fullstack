/** @type {import('@commitlint/types').UserConfig} */
// ─────────────────────────────────────────────────────────────────────────────
// Conventional Commits (https://www.conventionalcommits.org)
//
// UNA SOLA FUENTE DE VERDAD:
//   · `rules`  → valida cada commit (hook .husky/commit-msg)
//   · `prompt` → alimenta el asistente interactivo de commitizen (`pnpm commit`)
//
// Formato:  [emoji ]<tipo>(<scope opcional>): <descripción>
// Ejemplos: ✨ feat(web): añade pantalla de login
//           🐛 fix(api): corrige la validación del email
//           🔧 chore(repo): actualiza dependencias
// ─────────────────────────────────────────────────────────────────────────────

const config = {
  extends: ['@commitlint/config-conventional'],

  // La cabecera admite un emoji opcional delante del tipo (lo inserta commitizen
  // cuando `prompt.questions.type.emojiInHeader` está activo). Al ser opcional,
  // los commits escritos a mano sin emoji siguen siendo válidos.
  parserPreset: {
    parserOpts: {
      headerPattern:
        /^((?:\p{Extended_Pictographic}|\uFE0F|\u200D|\p{Emoji_Modifier})+\s+)?(\w+)(?:\(([^)]*)\))?!?: (.+)$/u,
      headerCorrespondence: ['emoji', 'type', 'scope', 'subject'],
    },
  },

  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'type-empty': [2, 'never'],
    'type-case': [2, 'always', 'lower-case'],
    'scope-enum': [2, 'always', ['web', 'api', 'repo', 'deps']],
    'subject-empty': [2, 'never'],
    // Los títulos suelen escribirse en español: no forzamos un estilo de mayúsculas
    'subject-case': [0],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    // Aviso (no bloquea) si el cuerpo del mensaje tiene líneas muy largas
    'body-max-line-length': [1, 'always', 120],
    'footer-max-line-length': [1, 'always', 120],
  },

  prompt: {
    settings: {
      // Permite elegir varios scopes: feat(web,api): ...
      enableMultipleScopes: true,
      scopeEnumSeparator: ',',
      // Añade el "!" en cambios rompientes: feat(api)!: ...
      useExclamationMark: true,
    },
    messages: {
      skip: '(enter para omitir)',
      max: '(máximo %d caracteres)',
      min: '(mínimo %d caracteres)',
      emptyWarning: '(%s es obligatorio)',
      upperLimitWarning: '%s supera el límite en %d caracteres',
      lowerLimitWarning: '%s queda %d caracteres por debajo del mínimo',
    },
    questions: {
      type: {
        description: 'Selecciona el TIPO de cambio que estás haciendo',
        // El emoji elegido se escribe también en la cabecera del commit
        emojiInHeader: true,
        enum: {
          feat: { emoji: '✨', description: 'Nueva funcionalidad', title: 'Features' },
          fix: { emoji: '🐛', description: 'Corrección de un bug', title: 'Bug Fixes' },
          docs: { emoji: '📝', description: 'Solo documentación', title: 'Documentation' },
          style: {
            emoji: '🎨',
            description: 'Formato, sin cambios de comportamiento',
            title: 'Styles',
          },
          refactor: {
            emoji: '♻️',
            description: 'Reestructura el código sin cambiar comportamiento',
            title: 'Refactoring',
          },
          perf: { emoji: '⚡️', description: 'Mejora de rendimiento', title: 'Performance' },
          test: { emoji: '✅', description: 'Añade o corrige tests', title: 'Tests' },
          build: { emoji: '📦', description: 'Build o dependencias', title: 'Build' },
          ci: { emoji: '👷', description: 'Integración continua', title: 'CI' },
          chore: { emoji: '🔧', description: 'Tareas varias y configuración', title: 'Chores' },
          revert: { emoji: '⏪', description: 'Revierte un commit anterior', title: 'Reverts' },
        },
      },
      scope: {
        description: 'Selecciona el SCOPE afectado (opcional)',
        enum: {
          web: { emoji: '🖥️', description: 'Frontend: React + Vite + Tailwind' },
          api: { emoji: '⚙️', description: 'Backend: Express + Prisma + better-auth' },
          repo: { emoji: '🏗️', description: 'Tooling y configuración del monorepo' },
          deps: { emoji: '📚', description: 'Dependencias y versiones' },
        },
      },
      subject: {
        description: 'Describe el cambio en una línea (imperativo, sin punto final)',
      },
      body: {
        description: 'Detalla el cambio (opcional)',
      },
      footer: {
        description: 'Issues relacionadas, ej: Closes #12 (opcional)',
      },
      isBreaking: {
        description: '¿Introduce cambios rompientes (BREAKING CHANGE)?',
      },
      isIssueAffected: {
        description: '¿Cierra alguna issue?',
      },
    },
  },
}

export default config
