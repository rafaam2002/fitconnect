import { Migration } from '@mikro-orm/migrations';

export class Migration20260614_drop_customer_field_user extends Migration {
  override async up(): Promise<void> {
    // En la migración anterior (Migration20260612113009) la columna
    // stripe_customer_id de la tabla user fue renombrada a "customer".
    // Ya no se usa — la relación con el customer se gestiona
    // a través de la tabla customer con su FK a user.
    this.addSql(`alter table "user" drop column if exists "customer";`);
    this.addSql(
      `alter table "user" drop column if exists "stripe_customer_id";`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "user" add column if not exists "customer" varchar(255) null;`
    );
  }
}
