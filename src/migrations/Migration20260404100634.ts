import { Migration } from '@mikro-orm/migrations';

export class Migration20260404100634 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "subscription" drop constraint "subscription_user_id_foreign";`
    );

    this.addSql(
      `alter table "subscription" add constraint "subscription_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "subscription" drop constraint "subscription_user_id_foreign";`
    );

    this.addSql(
      `alter table "subscription" add constraint "subscription_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;`
    );
  }
}
