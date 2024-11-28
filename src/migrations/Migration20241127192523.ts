import { Migration } from '@mikro-orm/migrations';

export class Migration20241127192523 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "notification" ("id" varchar(255) not null, "type" varchar(255) not null, "message" varchar(255) not null, "link" varchar(255) not null, constraint "notification_pkey" primary key ("id"));`);

    this.addSql(`create table "schedule" ("id" varchar(255) not null, "start_time" timestamptz not null, "duration" int not null, "max_users" int not null, "is_cancelled" boolean not null default false, "is_progammed" boolean not null default false, constraint "schedule_pkey" primary key ("id"));`);

    this.addSql(`create table "schedules_option" ("id" varchar(255) not null, "max_active_reservations" int not null default 3, "cancellation_deadline" int not null default 30, "max_strikes_before_penalty" int not null default 2, "penalty_duration" int not null default 7, "max_advance_booking_days" int not null default 7, "link" varchar(255) not null, constraint "schedules_option_pkey" primary key ("id"));`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "notification" cascade;`);

    this.addSql(`drop table if exists "schedule" cascade;`);

    this.addSql(`drop table if exists "schedules_option" cascade;`);
  }

}
