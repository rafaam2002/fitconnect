export const rules = {
  prSize: { max: 500, level: 'warn' },
  description: { minLength: 50, level: 'fail' },
  criticalPaths: ['src/auth/', 'src/payment/'],
  requiredLabels: ['type: feature', 'type: bug', 'type: chore'],
};
