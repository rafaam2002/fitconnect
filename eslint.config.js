const { fixupPluginRules } = require('@eslint/compat');
const js = require('@eslint/js');
// Plugins
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');
const prettierConfig = require('eslint-config-prettier');
const boundaries = require('eslint-plugin-boundaries');
const imports = require('eslint-plugin-import-x');
const noSecrets = require('eslint-plugin-no-secrets');
const perfectionist = require('eslint-plugin-perfectionist');
const prettierPlugin = require('eslint-plugin-prettier');
const promise = require('eslint-plugin-promise');
const security = require('eslint-plugin-security');
const sonarjs = require('eslint-plugin-sonarjs');
const unusedImports = require('eslint-plugin-unused-imports');
const globals = require('globals');

module.exports = [
  // 1. Ignorados
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      'src/migrations/**/*',
      'src/migrations/',
      'src/graphql/schema/',
      'src/utils/templates.util.ts',
    ],
  },

  // 2. Configuración Base de ESLint
  js.configs.recommended,

  // 3. Bloque Principal (TypeScript y Plugins)
  {
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
      },
      parser: typescriptParser,
      sourceType: 'module',
      ecmaVersion: 'latest',
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      import: fixupPluginRules(imports),
      boundaries: boundaries,
      security: fixupPluginRules(security),
      promise: fixupPluginRules(promise),
      sonarjs: fixupPluginRules(sonarjs),
      'no-secrets': noSecrets,
      perfectionist: perfectionist,
      'unused-imports': unusedImports,
      '@typescript-eslint': fixupPluginRules(typescriptEslint),
      prettier: prettierPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: { alwaysTryTypes: true, project: './tsconfig.json' },
      },
      'boundaries/elements': [
        { type: 'resolvers', pattern: 'src/resolvers/*' },
        { type: 'services', pattern: 'src/services/*' },
        { type: 'repositories', pattern: 'src/repositories/*' },
        { type: 'types', pattern: 'src/types/*' },
        { type: 'utils', pattern: 'src/utils/*' },
      ],
    },
    rules: {
      // --- REGLAS DE SEGURIDAD (Copiadas del recomendado para evitar el error de 'name') ---
      'security/detect-buffer-noassert': 'warn',
      'security/detect-child-process': 'warn',
      'security/detect-disable-mustache-escape': 'warn',
      'security/detect-eval-with-expression': 'warn',
      'security/detect-no-csrf-before-method-override': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-non-literal-require': 'warn',
      'security/detect-object-injection': 'off', // Muy ruidosa
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-unsafe-regex': 'warn',

      // --- REGLAS DE SONARJS (Básicas) ---
      'sonarjs/no-all-duplicated-branches': 'error',
      'sonarjs/no-element-overwrite': 'error',
      'sonarjs/no-extra-arguments': 'error',
      'sonarjs/no-identical-conditions': 'error',
      'sonarjs/no-identical-expressions': 'error',

      // --- TUS REGLAS PERSONALIZADAS ---
      'prettier/prettier': 'error',
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
      'no-secrets/no-secrets': 'error',
      'no-unused-vars': 'off',
      // '@typescript-eslint/explicit-function-return-type': 'warn',
      // '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
        },
      ],
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'resolvers', allow: ['services', 'types'] },
            { from: 'services', allow: ['repositories', 'types', 'utils'] },
          ],
        },
      ],
    },
  },

  // 4. Prettier Config (Para desactivar reglas de estilo)
  prettierConfig,
];
