import { Migration } from '@mikro-orm/migrations';

export class Migration20260321125252 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "schedule_options" add column "min_bookings_required" int not null default 0;`);
  }

}
