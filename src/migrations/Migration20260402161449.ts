import { Migration } from '@mikro-orm/migrations';

export class Migration20260402161449 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "message" drop constraint "message_sender_id_foreign";`
    );

    this.addSql(`alter table "message" alter column "sender_id" drop default;`);
    this.addSql(
      `alter table "message" alter column "sender_id" type uuid using ("sender_id"::text::uuid);`
    );
    this.addSql(
      `alter table "message" alter column "sender_id" drop not null;`
    );
    this.addSql(
      `alter table "message" add constraint "message_sender_id_foreign" foreign key ("sender_id") references "user" ("id") on update cascade on delete set null;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "message" drop constraint "message_sender_id_foreign";`
    );

    this.addSql(`alter table "message" alter column "sender_id" drop default;`);
    this.addSql(
      `alter table "message" alter column "sender_id" type uuid using ("sender_id"::text::uuid);`
    );
    this.addSql(`alter table "message" alter column "sender_id" set not null;`);
    this.addSql(
      `alter table "message" add constraint "message_sender_id_foreign" foreign key ("sender_id") references "user" ("id") on update cascade;`
    );
  }
}
