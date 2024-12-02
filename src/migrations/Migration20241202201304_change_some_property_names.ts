import { Migration } from '@mikro-orm/migrations';

export class Migration20241202201304_change_some_property_names extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "message"
      alter column "id" drop default;`);
    this.addSql(`alter table "message" alter column "id" type uuid using ("id"::text::uuid);`);
    this.addSql(`alter table "message" rename column "reciver" to "receiver";`);

    this.addSql(`alter table "notification" alter column "id" drop default;`);
    this.addSql(`alter table "notification" alter column "id" type uuid using ("id"::text::uuid);`);

    this.addSql(`alter table "schedule" alter column "id" drop default;`);
    this.addSql(`alter table "schedule" alter column "id" type uuid using ("id"::text::uuid);`);
    this.addSql(`alter table "schedule" rename column "is_progammed" to "is_programmed";`);

    this.addSql(`alter table "schedules_option" add column "created_at" timestamptz not null, add column "updated_at" timestamptz not null;`);
    this.addSql(`alter table "schedules_option" alter column "id" drop default;`);
    this.addSql(`alter table "schedules_option" alter column "id" type uuid using ("id"::text::uuid);`);

    this.addSql(`alter table "user" add column "created_at" timestamptz not null, add column "updated_at" timestamptz not null;`);
    this.addSql(`alter table "user" alter column "id" drop default;`);
    this.addSql(`alter table "user" alter column "id" type uuid using ("id"::text::uuid);`);
    this.addSql(`alter table "user" rename column "is_actived" to "is_active";`);
    this.addSql(`alter table "user" add constraint "user_email_unique" unique ("email");`);
    this.addSql(`alter table "user" add constraint "user_nickname_unique" unique ("nickname");`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "message" alter column "id" type text using ("id"::text);`);

    this.addSql(`alter table "notification" alter column "id" type text using ("id"::text);`);

    this.addSql(`alter table "schedule" alter column "id" type text using ("id"::text);`);

    this.addSql(`alter table "schedules_option" alter column "id" type text using ("id"::text);`);

    this.addSql(`alter table "user" alter column "id" type text using ("id"::text);`);

    this.addSql(`alter table "message" alter column "id" type varchar(255) using ("id"::varchar(255));`);
    this.addSql(`alter table "message" rename column "receiver" to "reciver";`);

    this.addSql(`alter table "notification" alter column "id" type varchar(255) using ("id"::varchar(255));`);

    this.addSql(`alter table "schedule" alter column "id" type varchar(255) using ("id"::varchar(255));`);
    this.addSql(`alter table "schedule" rename column "is_programmed" to "is_progammed";`);

    this.addSql(`alter table "schedules_option" drop column "created_at", drop column "updated_at";`);

    this.addSql(`alter table "schedules_option" alter column "id" type varchar(255) using ("id"::varchar(255));`);

    this.addSql(`alter table "user" drop constraint "user_email_unique";`);
    this.addSql(`alter table "user" drop constraint "user_nickname_unique";`);
    this.addSql(`alter table "user" drop column "created_at", drop column "updated_at";`);

    this.addSql(`alter table "user" alter column "id" type varchar(255) using ("id"::varchar(255));`);
    this.addSql(`alter table "user" rename column "is_active" to "is_actived";`);
  }

}
