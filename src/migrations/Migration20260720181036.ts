import { Migration } from '@mikro-orm/migrations';

export class Migration20260720181036 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`drop index if exists "company_stripe_account_id_index";`);

    this.addSql(
      `alter table "company" alter column "stripe_account_id" type varchar(255) using ("stripe_account_id"::varchar(255));`
    );
    this.addSql(
      `alter table "company" alter column "stripe_access_token" type varchar(255) using ("stripe_access_token"::varchar(255));`
    );
    this.addSql(
      `alter table "company" alter column "stripe_refresh_token" type varchar(255) using ("stripe_refresh_token"::varchar(255));`
    );
    this.addSql(
      `alter table "company" alter column "stripe_account_status" type varchar(255) using ("stripe_account_status"::varchar(255));`
    );

    // AÑADIDO "if not exists" A TODAS LAS COLUMNAS DE PROMOTION:
    this.addSql(`alter table "promotion"
      add column if not exists "discount_tag" varchar(255) not null,
      add column if not exists "original_price" real not null,
      add column if not exists "new_price" real not null,
      add column if not exists "expires_at" timestamptz not null,
      add column if not exists "is_hero" boolean not null default false,
      add column if not exists "is_active" boolean not null default true;`);

    // Si la columna "picture" ya se renombró antes, esto también podría fallar si no lo protegemos,
    // pero prueba primero con las columnas añadidas.
    this.addSql(
      `alter table "promotion" rename column "picture" to "accent_color";`
    );

    this.addSql(`drop index if exists "notification_created_at_index";`);

    // AÑADIDO "if not exists" A LAS COLUMNAS DE NOTIFICATION (Aquí estaba tu error actual):
    this.addSql(`alter table "notification"
      add column if not exists "title" varchar(255) not null,
      add column if not exists "read" boolean not null default false;`);

    this.addSql(
      `alter table "notification" alter column "type" type text using ("type"::text);`
    );
    this.addSql(
      `alter table "notification" alter column "link" type varchar(255) using ("link"::varchar(255));`
    );
    this.addSql(
      `alter table "notification" alter column "link" drop not null;`
    );
    this.addSql(
      `alter table "notification" alter column "company_id" drop default;`
    );
    this.addSql(
      `alter table "notification" alter column "company_id" type uuid using ("company_id"::text::uuid);`
    );
    this.addSql(
      `alter table "notification" alter column "company_id" drop not null;`
    );

    // Eliminamos constraints si existieran previamente para evitar duplicados al recrearlas:
    this.addSql(
      `alter table "notification" drop constraint if exists "notification_type_check";`
    );
    this.addSql(
      `alter table "notification" drop constraint if exists "notification_user_id_foreign";`
    );
    this.addSql(
      `alter table "notification" drop constraint if exists "notification_company_id_foreign";`
    );

    this.addSql(
      `alter table "notification" add constraint "notification_type_check" check("type" in ('message', 'warning', 'error', 'info'));`
    );
    this.addSql(
      `alter table "notification" add constraint "notification_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`
    );
    this.addSql(
      `alter table "notification" add constraint "notification_company_id_foreign" foreign key ("company_id") references "company" ("id") on update cascade on delete cascade;`
    );

    // PROTECCIÓN AL CREAR ÍNDICES:
    this.addSql(
      `create index if not exists "notification_user_id_index" on "notification" ("user_id");`
    );
    this.addSql(
      `create index if not exists "notification_company_id_index" on "notification" ("company_id");`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `create table "card" ("id" uuid not null, "created_at" timestamptz(6) not null, "updated_at" timestamptz(6) not null, "stripe_payment_method_id" varchar(255) not null, "user_id" uuid not null, "card_brand" varchar(255) not null, "card_last4" varchar(255) not null, "card_exp_month" int4 not null, "card_exp_year" int4 not null, "status" text check ("status" in ('active', 'inactive', 'expired')) not null default 'active', "is_default" bool not null default false, constraint "card_pkey" primary key ("id"));`
    );

    this.addSql(
      `create table "member_ship" ("id" uuid not null, "created_at" timestamptz(6) not null, "updated_at" timestamptz(6) not null, "user_id" uuid not null, "company_id" uuid not null, "role" text check ("role" in ('standard', 'boss', 'premium', 'coach')) not null, constraint "member_ship_pkey" primary key ("id"));`
    );
    this.addSql(
      `create index "member_ship_created_at_index" on "member_ship" ("created_at");`
    );
    this.addSql(
      `alter table "member_ship" add constraint "member_ship_user_id_company_id_unique" unique ("user_id", "company_id");`
    );

    this.addSql(
      `create table "user_promotions" ("user_id" uuid not null, "promotion_id" uuid not null, constraint "user_promotions_pkey" primary key ("user_id", "promotion_id"));`
    );

    this.addSql(
      `create table "webhook_event_log" ("id" uuid not null, "created_at" timestamptz(6) not null, "updated_at" timestamptz(6) not null, "stripe_event_id" varchar(100) not null, "event_type" varchar(100) not null, "status" text check ("status" in ('pending', 'processed', 'failed', 'ignored')) not null default 'pending', "payload" jsonb not null, "error_message" text null, "retry_count" int2 not null default 0, "processed_at" timestamptz(6) null, "last_attempt_at" timestamptz(6) null, constraint "webhook_event_log_pkey" primary key ("id"));`
    );
    this.addSql(
      `create index "webhook_event_log_stripe_event_id_index" on "webhook_event_log" ("stripe_event_id");`
    );

    this.addSql(
      `alter table "user_promotions" add constraint "user_promotions_promotion_id_foreign" foreign key ("promotion_id") references "promotion" ("id") on update cascade on delete cascade;`
    );
    this.addSql(
      `alter table "user_promotions" add constraint "user_promotions_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`
    );

    this.addSql(
      `alter table "notification" drop constraint if exists "notification_type_check";`
    );

    this.addSql(
      `alter table "notification" drop constraint "notification_user_id_foreign";`
    );
    this.addSql(
      `alter table "notification" drop constraint "notification_company_id_foreign";`
    );

    this.addSql(
      `alter table "company" alter column "stripe_account_id" type varchar(100) using ("stripe_account_id"::varchar(100));`
    );
    this.addSql(
      `alter table "company" alter column "stripe_access_token" type varchar(500) using ("stripe_access_token"::varchar(500));`
    );
    this.addSql(
      `alter table "company" alter column "stripe_refresh_token" type varchar(500) using ("stripe_refresh_token"::varchar(500));`
    );
    this.addSql(
      `alter table "company" alter column "stripe_account_status" type varchar(50) using ("stripe_account_status"::varchar(50));`
    );
    this.addSql(
      `create index "company_stripe_account_id_index" on "company" ("stripe_account_id");`
    );

    this.addSql(`drop index if exists "notification_user_id_index";`);
    this.addSql(`drop index if exists "notification_company_id_index";`);

    this.addSql(
      `alter table "notification" alter column "type" type varchar(255) using ("type"::varchar(255));`
    );
    this.addSql(
      `alter table "notification" alter column "link" type varchar(255) using ("link"::varchar(255));`
    );
    this.addSql(`alter table "notification" alter column "link" set not null;`);
    this.addSql(
      `alter table "notification" alter column "company_id" drop default;`
    );
    this.addSql(
      `alter table "notification" alter column "company_id" type uuid using ("company_id"::text::uuid);`
    );
    this.addSql(
      `alter table "notification" alter column "company_id" set not null;`
    );
    this.addSql(
      `create index "notification_created_at_index" on "notification" ("created_at");`
    );

    this.addSql(
      `alter table "promotion" add column "end_date" timestamptz(6) not null, add column "price" int4 not null;`
    );
    this.addSql(
      `alter table "promotion" rename column "expires_at" to "start_date";`
    );
    this.addSql(
      `alter table "promotion" rename column "accent_color" to "picture";`
    );

    this.addSql(
      `alter table "transaction" add column "stripe_charge_id" varchar(100) null;`
    );
  }
}
