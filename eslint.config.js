// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import astro from 'eslint-plugin-astro';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/storybook-static/**',
      // Los tipos que Astro genera en `apps/landing` (`astro sync`): no se escriben a mano.
      '**/.astro/**',
      '**/*.d.ts',
      // Se sirven tal cual, sin pasar por el build: JS a mano, fuera de todo tsconfig. Hoy
      // es sólo el bootstrap del tema, que el test de theme-bootstrap ya ejecuta y compara.
      'apps/web/public/**',
      // Worktrees de Claude Code: checkouts anidados, no pertenecen al proyecto raíz.
      '.claude/worktrees/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Prohibido `any` — CLAUDE.md. Es error, no warning.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Regla de arquitectura: un módulo de la API nunca importa el modelo de otro módulo
  // directamente, y `domain` no conoce `infrastructure` (docs/architecture.md).
  {
    files: ['apps/api/src/modules/*/domain/**/*.ts', 'apps/api/src/modules/*/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/infrastructure/**'],
              message:
                'domain/application no pueden importar infrastructure. Invertí la dependencia con una interfaz (docs/architecture.md).',
            },
            {
              group: ['../../*/domain/**', '../../*/application/**', '../../*/infrastructure/**'],
              message:
                'Un módulo no importa el interior de otro módulo. Usá su puerto público o un evento de dominio (docs/architecture.md).',
            },
          ],
        },
      ],
    },
  },

  // @wasabi-cross/ui no puede tener lógica de negocio: no habla con el mundo exterior.
  {
    files: ['packages/ui/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'axios',
              message: '@wasabi-cross/ui no hace data fetching (CLAUDE.md → Prohibido).',
            },
          ],
          patterns: [
            {
              group: ['**/modules/**', '@wasabi-cross/schemas/*'],
              message: '@wasabi-cross/ui no importa lógica de negocio (CLAUDE.md → Prohibido).',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: '@wasabi-cross/ui no hace data fetching.' },
      ],
    },
  },

  // Archivos de configuración: Node, sin type-checking de proyecto.
  {
    files: ['**/*.config.{js,ts,mjs}', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
    ...tseslint.configs.disableTypeChecked,
  },

  // La landing (spec §5.7, ADR-0013): los `.astro` con el parser de Astro, que por dentro usa el de
  // TypeScript, y las reglas de accesibilidad de JSX aplicadas a sus plantillas (spec §11, WCAG 2.2
  // AA). Es una primera barrera: la que cuenta es axe en el E2E (F10-10).
  ...astro.configs['flat/jsx-a11y-recommended'],
  {
    files: ['**/*.astro'],
    languageOptions: {
      // `astro-eslint-parser` no soporta `projectService`: lo convertiría a `project: true` y
      // avisaría en cada corrida. Se pide directo.
      parserOptions: {
        projectService: false,
        project: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.astro'],
      },
    },
  },

  prettier,
);
