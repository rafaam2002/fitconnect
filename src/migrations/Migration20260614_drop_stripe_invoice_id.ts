import { Migration } from '@mikro-orm/migrations';

export class Migration20260614_drop_stripe_invoice_id extends Migration {
  override async up(): Promise<void> {
    this.addSql(`drop index if exists "invoice_stripe_invoice_id_index";`);
    this.addSql(
      `alter table "invoice" drop column if exists "stripe_invoice_id";`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "invoice" add column if not exists "stripe_invoice_id" varchar(100) null;`
    );
    this.addSql(
      `create index if not exists "invoice_stripe_invoice_id_index" on "invoice" ("stripe_invoice_id");`
    );
  }
}
