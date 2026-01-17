import { Migration } from '@mikro-orm/migrations';

export class Migration20250710174530 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'create table "refresh_token" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "user_id" uuid not null, "token" text not null, "expires_at" timestamptz not null, constraint "refresh_token_pkey" primary key ("id"));'
    );
    this.addSql(
      'alter table "refresh_token" add constraint "refresh_token_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;'
    );
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists "refresh_token" cascade;');
  }
}
