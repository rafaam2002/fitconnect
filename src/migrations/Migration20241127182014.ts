import { Migration } from '@mikro-orm/migrations';

export class Migration20241127182014 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "message" ("id" varchar(255) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "message" varchar(255) not null, "is_fixed" boolean not null, "sender" varchar(255) not null, "reciver" varchar(255) not null, constraint "message_pkey" primary key ("id"));`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "message" cascade;`);
  }

}
