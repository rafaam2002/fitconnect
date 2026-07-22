import { Migration } from '@mikro-orm/migrations';

export class Migration20260722002831 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "user" add column "churned_at" timestamptz null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "user" drop column "churned_at";`);
  }

}
