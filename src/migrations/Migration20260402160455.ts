import { Migration } from '@mikro-orm/migrations';

export class Migration20260402160455 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "stripe_customer" drop constraint "stripe_customer_user_id_foreign";`
    );

    this.addSql(
      `alter table "stripe_customer" add constraint "stripe_customer_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "stripe_customer" drop constraint "stripe_customer_user_id_foreign";`
    );

    this.addSql(
      `alter table "stripe_customer" add constraint "stripe_customer_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;`
    );
  }
}
