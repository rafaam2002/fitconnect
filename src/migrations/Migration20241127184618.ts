import { Migration } from "@mikro-orm/migrations";

export class Migration20241127184618 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table "user" ("id" varchar(255) not null,
       "name" varchar(255) not null,
        "surname" varchar(255) not null,
        "password" varchar(255) not null,
         "mail" varchar(255) not null,
         "profile_picture" bytea not null,
          "nickname" varchar(255) not null,
          "is_actived" boolean not null,
           "is_blocked" boolean not null,
            "rol" varchar(255) not null,
             constraint "user_pkey" primary key ("id"));`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "user" cascade;`);
  }
}
