import { Migration } from '@mikro-orm/migrations';

export class Migration20241128184351 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "user" rename column "mail" to "email";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "user" rename column "email" to "mail";`);
  }

}
