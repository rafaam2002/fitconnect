import { Migration } from '@mikro-orm/migrations';

export class Migration20260614_drop_stripe_payment_method_id extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `drop index if exists "payment_method_stripe_payment_method_id_index";`
    );
    this.addSql(
      `alter table "payment_method" drop constraint if exists "payment_method_stripe_payment_method_id_unique";`
    );
    this.addSql(
      `alter table "payment_method" drop column if exists "stripe_payment_method_id";`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "payment_method" add column if not exists "stripe_payment_method_id" varchar(100) null;`
    );
    this.addSql(
      `create index if not exists "payment_method_stripe_payment_method_id_index" on "payment_method" ("stripe_payment_method_id");`
    );
  }
}
