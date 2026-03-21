import { Migration } from '@mikro-orm/migrations';

export class Migration20260321192619 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "user_role" alter column "role" type text using ("role"::text);`
    );
    this.addSql(
      `alter table "user_role" alter column "role" set default 'standard';`
    );
  }

  override async down(): Promise<void> {
    // 1. Comentamos estas 3 líneas para que NO intente recrear la tabla
    // y así conservamos tus datos intactos:
    // this.addSql(`create table "user_companies" ("user_id" uuid not null, "company_id" uuid not null, constraint "user_companies_pkey" primary key ("user_id", "company_id"));`);
    // this.addSql(`alter table "user_companies" add constraint "user_companies_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`);
    // this.addSql(`alter table "user_companies" add constraint "user_companies_company_id_foreign" foreign key ("company_id") references "company" ("id") on update cascade on delete cascade;`);

    // 2. Estas líneas sí las dejamos para que deshaga los cambios de la tabla user_role:
    this.addSql(`alter table "user_role" alter column "role" drop default;`);
    this.addSql(
      `alter table "user_role" alter column "role" type text using ("role"::text);`
    );
  }
}
