import { Migration } from '@mikro-orm/migrations';

export class Migration20260412181441 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "schedule_wait_list_users" ("id" serial primary key, "schedule_id" uuid not null, "user_id" uuid not null);`
    );

    this.addSql(
      `alter table "schedule_wait_list_users" add constraint "schedule_wait_list_users_schedule_id_foreign" foreign key ("schedule_id") references "schedule" ("id") on update cascade on delete cascade;`
    );
    this.addSql(
      `alter table "schedule_wait_list_users" add constraint "schedule_wait_list_users_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`
    );
  }
}
