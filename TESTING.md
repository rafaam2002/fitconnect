# Testing Guide

## Test Structure

\`\`\`
src/
├── services/
│ ├── user.service.ts
│ └── __tests__/
│ └── user.service.test.ts # Unit tests
├── __tests__/
│ ├── integration/ # Integration tests
│ └── e2e/ # End-to-end tests
└── test/
├── factories/ # Test data factories
└── helpers/ # Test utilities
\`\`\`

## Test Levels

### Unit Tests

- Test individual functions/methods
- Mock dependencies
- Fast execution (<100ms per test)
- 90% coverage goal

### Integration Tests

- Test multiple components together
- Use test database
- Real dependencies when possible
- 80% coverage goal

### E2E Tests

- Test critical user flows
- Real database + services
- Slower execution acceptable
- Cover happy paths only

## Running Tests

\`\`\`bash
npm test # All tests
npm run test:watch # Watch mode
npm run test:coverage # With coverage
npm test -- user.service # Specific file
npm test -- --testNamePattern="should return user"  # Specific test
\`\`\`

## Coverage Thresholds

- Global: 80%
- Services: 90%
- Auth/Payment: 95%

## Best Practices

1. **AAA Pattern** (Arrange, Act, Assert)
2. **One assertion per test** (when possible)
3. **Clear test names** ("should ... when ...")
4. **Mock external dependencies**
5. **Clean up after tests**