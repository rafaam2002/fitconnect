import { Migration } from '@mikro-orm/migrations';

export class Migration20260615072605 extends Migration {
  override async up(): Promise<void> {
    // Eliminar campos de Braintree Connect (si se aplicó esa migración antes)
    this.addSql(`
      alter table "company"
      drop column if exists "braintree_access_token",
        drop column if exists "braintree_merchant_id",
        drop column if exists "braintree_environment",
        drop column if exists "braintree_connected_at",
        drop column if exists "braintree_expires_at",
        drop column if exists "braintree_refresh_token";
    `);

    // Añadir campos de Stripe Connect
    this.addSql(`
      alter table "company"
        add column if not exists "stripe_account_id"     varchar(100)  null,
        add column if not exists "stripe_access_token"   varchar(500)  null,
        add column if not exists "stripe_refresh_token"  varchar(500)  null,
        add column if not exists "stripe_account_status" varchar(50)   null,
        add column if not exists "stripe_connected_at"   timestamptz   null;
    `);

    this.addSql(
      `create index if not exists "company_stripe_account_id_index" on "company" ("stripe_account_id");`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "company_stripe_account_id_index";`);
    this.addSql(`
      alter table "company"
        drop column if exists "stripe_account_id",
        drop column if exists "stripe_access_token",
        drop column if exists "stripe_refresh_token",
        drop column if exists "stripe_account_status",
        drop column if exists "stripe_connected_at";
    `);
  }
}
