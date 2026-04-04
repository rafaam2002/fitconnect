import { Migration } from '@mikro-orm/migrations';

export class Migration20260403211202 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "plan" add constraint "plan_name_company_id_unique" unique ("name", "company_id");`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "plan" drop constraint "plan_name_company_id_unique";`
    );
  }
}
