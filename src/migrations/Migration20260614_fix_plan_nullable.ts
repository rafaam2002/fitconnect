import { Migration } from '@mikro-orm/migrations';

export class Migration20260614_fix_plan_nullable extends Migration {
  async up(): Promise<void> {
    // No-op: the columns stripe_price_id and stripe_product_id were already dropped
    // in Migration20260614_drop_stripe_fields_plan_transaction
  }

  async down(): Promise<void> {
    // No-op
  }
}
