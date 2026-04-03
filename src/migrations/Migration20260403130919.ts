import { Migration } from '@mikro-orm/migrations';

export class Migration20260403130919 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "plan_permission" drop constraint "plan_permission_plan_id_foreign";`
    );

    this.addSql(
      `alter table "plan_permission" add constraint "plan_permission_plan_id_foreign" foreign key ("plan_id") references "plan" ("id") on update cascade on delete cascade;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "plan_permission" drop constraint "plan_permission_plan_id_foreign";`
    );

    this.addSql(
      `alter table "plan_permission" add constraint "plan_permission_plan_id_foreign" foreign key ("plan_id") references "plan" ("id") on update cascade;`
    );
  }
}
