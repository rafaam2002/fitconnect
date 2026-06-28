import { Migration } from '@mikro-orm/migrations';

export class Migration20260614_drop_stripe_fields_subscription extends Migration {
  override async up(): Promise<void> {
    // Eliminar índices de stripe si existen
    this.addSql(
      `drop index if exists "subscription_stripe_subscription_id_index";`
    );

    // Eliminar columnas stripe de la tabla subscription si existen
    this.addSql(
      `alter table "subscription" drop column if exists "stripe_subscription_id";`
    );
    this.addSql(
      `alter table "subscription" drop column if exists "stripe_customer_id";`
    );
  }

  override async down(): Promise<void> {
    // Restaurar columnas y sus índices
    this.addSql(
      `alter table "subscription" add column if not exists "stripe_subscription_id" varchar(100) null;`
    );
    this.addSql(
      `alter table "subscription" add column if not exists "stripe_customer_id" varchar(100) null;`
    );
    this.addSql(
      `create index if not exists "subscription_stripe_subscription_id_index" on "subscription" ("stripe_subscription_id");`
    );
  }
}
