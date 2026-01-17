# Development Guide

## 🚀 Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

## 📋 Pre-commit Checklist (automático)

- ✅ ESLint
- ✅ Prettier
- ✅ Commitlint
- ✅ Tests en archivos modificados

## 🔄 PR Workflow

1. Crear branch desde `main`: `git checkout -b feat/mi-feature`
2. Commits siguiendo conventional commits
3. Push → abrir PR
4. Esperar checks:
    - Lint ✓
    - Tests + Coverage ✓
    - SonarCloud Quality Gate ✓
    - Danger checks ✓
    - Security audit ✓
5. Mínimo 1 approval requerido
6. Merge cuando todo esté verde

## 📊 Coverage Requirements

- Global: 80% mínimo
- Critical paths (`src/auth/`, `src/payment/`): 95% mínimo
- Patch coverage: No bajar el coverage existente

## 🔐 Security

- Dependabot automático los lunes
- npm audit falla en high/critical
- Secret scanning activo

## 🤖 Automation

- **Danger.js**: Comenta en PRs con warnings
- **Semantic Release**: Genera releases automáticas desde `main`
- **Codecov**: Comenta coverage diff

## 📝 Commit Convention

\`\`\`
feat: nueva funcionalidad
fix: bug fix
docs: documentación
chore: tareas de mantenimiento
\`\`\`

## 🏗️ Architecture Standards

- Resolvers delegan a Services
- Services manejan auth + validación + lógica
- Tests unitarios para services
- Tests de integración para resolvers

Ver `ARCHITECTURE.md` para detalles.