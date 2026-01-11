/**
 *  @type {import('eslint').ESLint.ConfigData}
 */
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  plugins: [
    'imports',
    'boundaries',
    'security',
    'promise',
    'sonarjs',
    'no-secrets',
    'perfectionist',
    'unused-imports',
    '@typescript-eslint',
    'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:security/recommended',
    'plugin:promise/recommended',
    'plugin:sonarjs/recommended',
    'prettier'
  ],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 'latest',
    ecmaFeatures: { jsx: true },
    project: './tsconfig.json',
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json'
      }
    },
    'boundaries/elements': [
      { type: 'resolvers', pattern: 'src/resolvers/*' },
      { type: 'services', pattern: 'src/services/*' },
      { type: 'repositories', pattern: 'src/repositories/*' },
      { type: 'types', pattern: 'src/types/*' },
      { type: 'utils', pattern: 'src/utils/*' }
    ]
  },
  rules: {
    'prettier/prettier': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-secrets/no-secrets': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_'
    }],
    'import/order': ['error', {
      groups: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index'
      ],
      'newlines-between': 'always',
      alphabetize: { order: 'asc' }
    }],
    'boundaries/element-types': ['error', {
      default: 'disallow',
      rules: [
        {
          from: 'resolvers',
          allow: ['services', 'types']
        },
        {
          from: 'services',
          allow: ['repositories', 'types', 'utils']
        }
      ]
    }]
  },
};
