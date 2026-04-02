import { Migration } from '@mikro-orm/migrations';

export class Migration20260402112256 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "user_role" drop constraint "user_role_user_id_foreign";`
    );

    this.addSql(
      `alter table "user_role" add constraint "user_role_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "user_role" drop constraint "user_role_user_id_foreign";`
    );

    this.addSql(
      `alter table "user_role" add constraint "user_role_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;`
    );
  }
}
