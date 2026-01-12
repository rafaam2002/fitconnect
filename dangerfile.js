import { danger, fail, markdown, message, warn } from 'danger';
// Configuración
const MAX_PR_SIZE = 500;
const MIN_DESCRIPTION_LENGTH = 50;

// 1. PR demasiado grande
const additions = danger.github.pr.additions;
const deletions = danger.github.pr.deletions;
const totalChanges = additions + deletions;

if (totalChanges > MAX_PR_SIZE) {
  warn(
    `⚠️ Este PR tiene ${totalChanges} líneas de cambios. Considera dividirlo en PRs más pequeños.`
  );
}

// dangerfile.js - Reglas específicas backend

// Verificar documentación en archivos nuevos/modificados
const tsFiles = danger.git.modified_files.filter(f => f.endsWith('.ts'));

for (const file of tsFiles) {
  const content = await danger.github.utils.fileContents(file);

  // Verificar que clases públicas tengan JSDoc
  const hasClassDeclaration = /export class/.test(content);
  const hasJSDoc = /\/\*\*/.test(content);

  if (hasClassDeclaration && !hasJSDoc) {
    warn(`⚠️ ${file} exporta clases pero no tiene documentación JSDoc/TSDoc.`);
  }
}

// Verificar migraciones de base de datos
const hasMigration = danger.git.created_files.some(f =>
  f.includes('/migrations/')
);
if (hasMigration) {
  message(`📊 Se detectó una nueva migración. Asegúrate de:
  - [ ] Probarla en environment de desarrollo
  - [ ] Tener rollback plan
  - [ ] Documentar cambios en el schema
  `);
}

// 2. Descripción vacía o muy corta
const prDescription = danger.github.pr.body || '';
if (prDescription.length < MIN_DESCRIPTION_LENGTH) {
  fail('❌ Por favor agrega una descripción detallada del PR.');
}

// 3. Cambios en package.json sin actualizar package-lock.json
const packageChanged = danger.git.modified_files.includes('package.json');
const lockfileChanged = danger.git.modified_files.includes('package-lock.json');

if (packageChanged && !lockfileChanged) {
  fail(
    '❌ Actualizaste package.json pero no package-lock.json. Corre `npm install`.'
  );
}

// 4. Archivos grandes (potenciales binarios)
const bigFiles = danger.git.created_files.filter(file => {
  const fileSizeKB = danger.github.utils.fileLinks([file])[0]?.size / 1024;
  return fileSizeKB > 500;
});

if (bigFiles.length > 0) {
  warn(
    `⚠️ Archivos grandes detectados: ${bigFiles.join(', ')}. ¿Son necesarios?`
  );
}

// 5. Código sin tests
const hasSourceChanges = danger.git.modified_files.some(
  file => file.startsWith('src/') && !file.includes('.test.')
);
const hasTestChanges = danger.git.modified_files.some(
  file => file.includes('.test.') || file.includes('.spec.')
);

if (hasSourceChanges && !hasTestChanges) {
  warn('⚠️ Modificaste código de producción sin agregar/modificar tests.');
}

// 6. TODOs agregados
const newTodos = [];
for (const file of danger.git.modified_files) {
  const diff = await danger.git.diffForFile(file);
  const addedLines = diff.added
    .split('\n')
    .filter(line => line.includes('TODO') || line.includes('FIXME'));
  if (addedLines.length > 0) {
    newTodos.push({ file, todos: addedLines });
  }
}

if (newTodos.length > 0) {
  warn(
    `⚠️ Se agregaron ${newTodos.length} TODOs/FIXMEs. Considera crear issues para trackearlos.`
  );
}

// 7. Cambios en archivos críticos
const criticalFiles = [
  'src/auth/',
  'src/payment/',
  'src/database/',
  '.github/workflows/',
];

const touchedCriticalFiles = danger.git.modified_files.filter(file =>
  criticalFiles.some(critical => file.includes(critical))
);

if (touchedCriticalFiles.length > 0) {
  message(
    `🔴 Cambios en áreas críticas detectados: ${touchedCriticalFiles.join(', ')}`
  );
  markdown(`### ⚠️ REVISIÓN CRÍTICA REQUERIDA
   
   Este PR modifica archivos en áreas sensibles. Por favor:
   - [ ] Revisar con especial cuidado
   - [ ] Verificar tests de integración
   - [ ] Considerar testing manual
   `);
}

// 8. Stats del PR
markdown(`
   ## 📊 Estadísticas del PR
   - **Archivos modificados:** ${danger.git.modified_files.length}
   - **Líneas agregadas:** ${additions} ➕
   - **Líneas eliminadas:** ${deletions} ➖
   - **Total de cambios:** ${totalChanges}
   `);

const resolverChanged = danger.git.modified_files.some(
  f => f.includes('resolvers/') && f.endsWith('.ts')
);
const schemaChanged = danger.git.modified_files.some(
  f => f.includes('schema') && (f.endsWith('.graphql') || f.endsWith('.gql'))
);

if (resolverChanged && !schemaChanged) {
  warn('⚠️ Modificaste resolvers pero no el schema. ¿Es intencional?');
}

// Cambios en services sin seguir el patrón
const serviceFiles = danger.git.modified_files.filter(
  f => f.includes('/services/') && f.endsWith('.service.ts')
);

for (const serviceFile of serviceFiles) {
  const content = await danger.github.utils.fileContents(serviceFile);

  // Verificar que tenga los métodos estándar del patrón
  const hasAuthCheck =
    content.includes('checkAuth') || content.includes('requireAuth');
  const hasValidation = content.includes('validate');

  if (!hasAuthCheck) {
    warn(`⚠️ ${serviceFile} podría necesitar validación de autenticación.`);
  }

  if (!hasValidation) {
    warn(`⚠️ ${serviceFile} podría necesitar validación de inputs.`);
  }

  // Si el PR tiene label "hotfix", relajar algunas reglas
  const isHotfix = danger.github.issue.labels.some(l => l.name === 'hotfix');

  if (isHotfix) {
    message('🚨 Este es un HOTFIX. Algunas validaciones están relajadas.');
  } else {
    // Aplicar reglas estrictas
    if (totalChanges > MAX_PR_SIZE) {
      fail(
        `❌ PR demasiado grande (${totalChanges} líneas). Los no-hotfix deben ser < ${MAX_PR_SIZE}.`
      );
    }
  }
}

// Leer el comentario de Codecov y resaltarlo
const comments = await danger.github.api.issues.listComments({
  owner: danger.github.thisPR.owner,
  repo: danger.github.thisPR.repo,
  issue_number: danger.github.thisPR.number,
});

const codecovComment = comments.data.find(
  c => c.user.login === 'codecov' || c.user.login === 'codecov-commenter'
);

if (codecovComment) {
  markdown(`### 📊 Codecov Report
   ${codecovComment.body}
   `);
}
