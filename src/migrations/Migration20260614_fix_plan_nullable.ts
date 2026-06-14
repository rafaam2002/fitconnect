import { Migration } from '@mikro-orm/migrations';

export class Migration20260614_fix_plan_nullable extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE plan ALTER COLUMN stripe_price_id DROP NOT NULL;
    `);
    this.addSql(`
      ALTER TABLE plan ALTER COLUMN stripe_product_id DROP NOT NULL;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE plan ALTER COLUMN stripe_price_id SET NOT NULL;
    `);
    this.addSql(`
      ALTER TABLE plan ALTER COLUMN stripe_product_id SET NOT NULL;
    `);
  }
}
