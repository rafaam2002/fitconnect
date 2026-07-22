import { Migration } from '@mikro-orm/migrations';

export class Migration20260721230526 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "promotion_redemption" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "promotion_id" uuid not null, "user_id" uuid not null, "company_id" uuid not null, constraint "promotion_redemption_pkey" primary key ("id"));`);

    this.addSql(`create table "product_purchase" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "product_id" uuid not null, "company_id" uuid not null, "user_id" uuid null, "quantity" int not null, "unit_price" bigint not null, constraint "product_purchase_pkey" primary key ("id"));`);

    this.addSql(`alter table "promotion_redemption" add constraint "promotion_redemption_promotion_id_foreign" foreign key ("promotion_id") references "promotion" ("id") on update cascade;`);
    this.addSql(`alter table "promotion_redemption" add constraint "promotion_redemption_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;`);
    this.addSql(`alter table "promotion_redemption" add constraint "promotion_redemption_company_id_foreign" foreign key ("company_id") references "company" ("id") on update cascade;`);

    this.addSql(`alter table "product_purchase" add constraint "product_purchase_product_id_foreign" foreign key ("product_id") references "product" ("id") on update cascade;`);
    this.addSql(`alter table "product_purchase" add constraint "product_purchase_company_id_foreign" foreign key ("company_id") references "company" ("id") on update cascade;`);
    this.addSql(`alter table "product_purchase" add constraint "product_purchase_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "user" add column "blocked_at" timestamptz null, add column "birth_date" timestamptz null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "user" drop column "blocked_at", drop column "birth_date";`);

    this.addSql(`drop table if exists "promotion_redemption" cascade;`);
    this.addSql(`drop table if exists "product_purchase" cascade;`);
  }

}
