import { Migration } from '@mikro-orm/migrations';

export class Migration20260324152100 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "user" add column "is_super_admin" boolean not null default false;`);
    this.addSql(`alter table "user" alter column "is_active" type boolean using ("is_active"::boolean);`);
    this.addSql(`alter table "user" alter column "is_active" set default true;`);
    this.addSql(`alter table "user" alter column "is_blocked" type boolean using ("is_blocked"::boolean);`);
    this.addSql(`alter table "user" alter column "is_blocked" set default false;`);
    this.addSql(`alter table "user" alter column "is_verified" type boolean using ("is_verified"::boolean);`);
    this.addSql(`alter table "user" alter column "is_verified" set default false;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "user" alter column "is_blocked" drop default;`);
    this.addSql(`alter table "user" alter column "is_blocked" type boolean using ("is_blocked"::boolean);`);
    this.addSql(`alter table "user" alter column "is_verified" drop default;`);
    this.addSql(`alter table "user" alter column "is_verified" type boolean using ("is_verified"::boolean);`);
  }

}
