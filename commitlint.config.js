module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // Nueva funcionalidad
        'fix', // Corrección de bug
        'docs', // Solo documentación
        'style', // Cambios de formato (no afecta código)
        'refactor', // Refactorización (ni fix ni feat)
        'perf', // Mejora de performance
        'test', // Añadir o modificar tests
        'build', // Cambios en build system
        'ci', // Cambios en CI
        'chore', // Tareas de mantenimiento
        'revert', // Revertir commit anterior
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-case': [2, 'always', 'kebab-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 100],
    'footer-leading-blank': [2, 'always'],
  },
};
