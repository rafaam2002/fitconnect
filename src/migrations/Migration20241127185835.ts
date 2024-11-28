import { Migration } from '@mikro-orm/migrations';

export class Migration20241127185835 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "message" add column "fixed_duration" int null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "message" drop column "fixed_duration";`);
  }

}
