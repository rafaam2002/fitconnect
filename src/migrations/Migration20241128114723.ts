import { Migration } from '@mikro-orm/migrations';

export class Migration20241128114723 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "notification" add column "created_at" timestamptz not null, add column "updated_at" timestamptz not null;`);

    this.addSql(`alter table "schedule" add column "created_at" timestamptz not null, add column "updated_at" timestamptz not null;`);

    this.addSql(`alter table "schedules_option" drop column "link";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "notification" drop column "created_at", drop column "updated_at";`);

    this.addSql(`alter table "schedule" drop column "created_at", drop column "updated_at";`);

    this.addSql(`alter table "schedules_option" add column "link" varchar(255) not null;`);
  }

}
