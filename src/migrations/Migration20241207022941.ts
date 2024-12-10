import { Migration } from '@mikro-orm/migrations';

export class Migration20241207022941 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "promotion" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "title" varchar(255) not null, "start_date" timestamptz not null, "end_date" timestamptz not null, "price" int not null, "picture" varchar(255) not null, "description" varchar(255) not null);`);

    this.addSql(`create table "schedules_option" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "max_active_reservations" int not null default 3, "cancellation_deadline" int not null default 30, "max_strikes_before_penalty" int not null default 2, "penalty_duration" int not null default 7, "max_advance_booking_days" int not null default 7);`);

    this.addSql(`create table "user" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "name" varchar(255) not null, "surname" varchar(255) not null, "password" varchar(255) not null, "email" varchar(255) not null, "phone_number" varchar(255) not null, "profile_picture" varchar(255) not null, "nickname" varchar(255) not null, "is_active" boolean not null, "is_blocked" boolean not null, "start_payment_date" timestamptz not null, "end_payment_date" timestamptz not null, "rol" varchar(255) not null);`);
    this.addSql(`alter table "user" add constraint "user_email_unique" unique ("email");`);
    this.addSql(`alter table "user" add constraint "user_nickname_unique" unique ("nickname");`);

    this.addSql(`create table "schedule" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "start_date" timestamptz not null, "duration" int not null, "max_users" int not null, "is_cancelled" boolean not null default false, "is_programmed" boolean not null default false, "admin_id" int null);`);

    this.addSql(`create table "poll" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "start_date" timestamptz not null, "end_date" timestamptz not null, "options" text[] not null, "creator_id" int not null);`);

    this.addSql(`create table "notification" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "type" varchar(255) not null, "message" varchar(255) not null, "link" varchar(255) not null, "user_id" int not null);`);

    this.addSql(`create table "message" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "message" varchar(255) not null, "is_fixed" boolean not null, "fixed_duration" int null, "sender_id" int not null, "receiver_id" int not null);`);

    this.addSql(`create table "user_promotions" ("user_id" int not null, "promotion_id" int not null, constraint "user_promotions_pkey" primary key ("user_id", "promotion_id"));`);

    this.addSql(`create table "user_schedules" ("user_id" int not null, "schedule_id" int not null, constraint "user_schedules_pkey" primary key ("user_id", "schedule_id"));`);

    this.addSql(`alter table "schedule" add constraint "schedule_admin_id_foreign" foreign key ("admin_id") references "user" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "poll" add constraint "poll_creator_id_foreign" foreign key ("creator_id") references "user" ("id") on update cascade;`);

    this.addSql(`alter table "notification" add constraint "notification_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;`);

    this.addSql(`alter table "message" add constraint "message_sender_id_foreign" foreign key ("sender_id") references "user" ("id") on update cascade;`);
    this.addSql(`alter table "message" add constraint "message_receiver_id_foreign" foreign key ("receiver_id") references "user" ("id") on update cascade;`);

    this.addSql(`alter table "user_promotions" add constraint "user_promotions_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "user_promotions" add constraint "user_promotions_promotion_id_foreign" foreign key ("promotion_id") references "promotion" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "user_schedules" add constraint "user_schedules_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "user_schedules" add constraint "user_schedules_schedule_id_foreign" foreign key ("schedule_id") references "schedule" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "user_promotions" drop constraint "user_promotions_promotion_id_foreign";`);

    this.addSql(`alter table "schedule" drop constraint "schedule_admin_id_foreign";`);

    this.addSql(`alter table "poll" drop constraint "poll_creator_id_foreign";`);

    this.addSql(`alter table "notification" drop constraint "notification_user_id_foreign";`);

    this.addSql(`alter table "message" drop constraint "message_sender_id_foreign";`);

    this.addSql(`alter table "message" drop constraint "message_receiver_id_foreign";`);

    this.addSql(`alter table "user_promotions" drop constraint "user_promotions_user_id_foreign";`);

    this.addSql(`alter table "user_schedules" drop constraint "user_schedules_user_id_foreign";`);

    this.addSql(`alter table "user_schedules" drop constraint "user_schedules_schedule_id_foreign";`);

    this.addSql(`drop table if exists "promotion" cascade;`);

    this.addSql(`drop table if exists "schedules_option" cascade;`);

    this.addSql(`drop table if exists "user" cascade;`);

    this.addSql(`drop table if exists "schedule" cascade;`);

    this.addSql(`drop table if exists "poll" cascade;`);

    this.addSql(`drop table if exists "notification" cascade;`);

    this.addSql(`drop table if exists "message" cascade;`);

    this.addSql(`drop table if exists "user_promotions" cascade;`);

    this.addSql(`drop table if exists "user_schedules" cascade;`);
  }

}
