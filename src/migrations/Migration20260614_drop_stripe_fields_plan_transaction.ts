import { Migration } from '@mikro-orm/migrations';

export class Migration20260614_drop_stripe_fields_plan_transaction extends Migration {
  override async up(): Promise<void> {
    // ── plan ──────────────────────────────────────────────────────
    this.addSql(`drop index if exists "plan_stripe_price_id_index";`);
    this.addSql(`alter table "plan" drop column if exists "stripe_price_id";`);
    this.addSql(
      `alter table "plan" drop column if exists "stripe_product_id";`
    );

    // ── transaction ───────────────────────────────────────────────
    this.addSql(
      `alter table "transaction" drop column if exists "stripe_payment_intent_id";`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "plan" add column if not exists "stripe_price_id" varchar(100) null;`
    );
    this.addSql(
      `alter table "plan" add column if not exists "stripe_product_id" varchar(100) null;`
    );
    this.addSql(
      `create index if not exists "plan_stripe_price_id_index" on "plan" ("stripe_price_id");`
    );
    this.addSql(
      `alter table "transaction" add column if not exists "stripe_payment_intent_id" varchar(100) null;`
    );
  }
}
