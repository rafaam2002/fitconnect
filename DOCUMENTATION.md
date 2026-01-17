# Documentation Guide

## Writing Code Documentation

### Services

\`\`\`typescript
/**

* Brief description
*
* @remarks Detailed explanation
* @example Usage example
  */
  \`\`\`

### Functions

\`\`\`typescript
/**

* @param paramName - Description
* @returns Description of return value
* @throws {ErrorType} When this error occurs
  */
  \`\`\`

## Generating Docs

\`\`\`bash
npm run docs # Generate once
npm run docs:watch # Watch mode
npm run docs:serve # Serve locally
\`\`\`

## Viewing Docs

- Local: http://localhost:8080
- Production: https://tu-org.github.io/tu-repo