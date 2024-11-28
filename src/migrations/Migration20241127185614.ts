import { Migration } from '@mikro-orm/migrations';

export class Migration20241127185614 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "user" alter column "profile_picture" type bytea using ("profile_picture"::bytea);`);
    this.addSql(`alter table "user" alter column "profile_picture" drop not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "user" alter column "profile_picture" type bytea using ("profile_picture"::bytea);`);
    this.addSql(`alter table "user" alter column "profile_picture" set not null;`);
  }

}
