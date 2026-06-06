import { MikroORM } from '@mikro-orm/core';

import { storeNews } from '../helpers/articles';
import config from '../mikro-orm.config';

async function runStoreNews() {
  console.log('🔄 Initializing MikroORM...');
  const orm = await MikroORM.init(config);
  const em = orm.em.fork();

  console.log(
    '📰 Running storeNews task with limit: 3 and pages: [1, 2, 3, 4]...'
  );
  try {
    await storeNews(em, 3, [1, 2, 3, 4]);
    console.log('✅ storeNews executed successfully.');
  } catch (error: any) {
    console.error('❌ Error executing storeNews:', error);
  } finally {
    await orm.close();
    console.log('🔌 Database connection closed.');
  }
}

runStoreNews().catch(err => {
  console.error('❌ Fatal error in script:', err);
});
