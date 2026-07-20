import { Migration } from '@mikro-orm/migrations';

export class Migration20260720185433 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "rating" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "user_id" uuid not null, "company_id" uuid not null, "score" int not null, "comment" text null, constraint "rating_pkey" primary key ("id"));`);
    this.addSql(`alter table "rating" add constraint "rating_user_id_company_id_unique" unique ("user_id", "company_id");`);

    this.addSql(`alter table "rating" add constraint "rating_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;`);
    this.addSql(`alter table "rating" add constraint "rating_company_id_foreign" foreign key ("company_id") references "company" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "rating" cascade;`);
  }

}
