// Global test setup
global.console = {
  ...console,
  // Silenciar logs en tests
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Mantener errors
  error: console.error,
};

// Mock de variables de entorno
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
