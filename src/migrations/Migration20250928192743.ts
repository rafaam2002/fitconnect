import { Migration } from '@mikro-orm/migrations';

export class Migration20250928192743 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "stripe_customer" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "stripe_customer_id" varchar(100) not null, "user_id" uuid not null, "is_active" boolean not null default true, "metadata" jsonb null, "default_currency" varchar(10) not null default 'usd', constraint "stripe_customer_pkey" primary key ("id"));`);
    this.addSql(`create index "stripe_customer_created_at_index" on "stripe_customer" ("created_at");`);
    this.addSql(`create index "stripe_customer_stripe_customer_id_index" on "stripe_customer" ("stripe_customer_id");`);
    this.addSql(`alter table "stripe_customer" add constraint "stripe_customer_stripe_customer_id_unique" unique ("stripe_customer_id");`);
    this.addSql(`create index "stripe_customer_user_id_index" on "stripe_customer" ("user_id");`);
    this.addSql(`create index "stripe_customer_is_active_index" on "stripe_customer" ("is_active");`);

    this.addSql(`create table "invoice" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "stripe_invoice_id" varchar(100) not null, "invoice_number" varchar(50) null, "user_id" uuid not null, "subscription_id" uuid null, "status" text check ("status" in ('draft', 'open', 'paid', 'uncollectible', 'void')) not null, "subtotal" bigint not null, "tax" bigint not null default 0, "total" bigint not null, "amount_paid" bigint not null default 0, "amount_remaining" bigint not null default 0, "currency" varchar(10) not null default 'usd', "due_date" timestamptz null, "paid_at" timestamptz null, "period_start" timestamptz null, "period_end" timestamptz null, "description" text null, "line_items" jsonb null, "metadata" jsonb null, constraint "invoice_pkey" primary key ("id"));`);
    this.addSql(`create index "invoice_created_at_index" on "invoice" ("created_at");`);
    this.addSql(`create index "invoice_stripe_invoice_id_index" on "invoice" ("stripe_invoice_id");`);
    this.addSql(`create index "invoice_user_id_index" on "invoice" ("user_id");`);
    this.addSql(`create index "invoice_status_index" on "invoice" ("status");`);
    this.addSql(`create index "invoice_due_date_index" on "invoice" ("due_date");`);

    this.addSql(`alter table "stripe_customer" add constraint "stripe_customer_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;`);

    this.addSql(`alter table "invoice" add constraint "invoice_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;`);
    this.addSql(`alter table "invoice" add constraint "invoice_subscription_id_foreign" foreign key ("subscription_id") references "subscription" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "payment_method" drop constraint "payment_method_user_id_foreign";`);

    this.addSql(`alter table "transaction" drop constraint "transaction_card_id_foreign";`);
    this.addSql(`alter table "transaction" drop constraint "transaction_subscription_id_foreign";`);

    this.addSql(`alter table "plan" drop constraint "plan_name_unique";`);
    this.addSql(`alter table "plan" drop column "price", drop column "payment_type", drop column "duration_in_days", drop column "icon", drop column "is_best_choice";`);

    this.addSql(`alter table "plan" add column "stripe_price_id" varchar(100) not null, add column "stripe_product_id" varchar(100) null, add column "amount" bigint not null, add column "interval" text check ("interval" in ('day', 'week', 'month', 'year')) not null, add column "interval_count" smallint not null default 1, add column "trial_period_days" smallint null default 7, add column "status" text check ("status" in ('active', 'inactive', 'archived')) not null default 'active', add column "is_active" boolean not null default true, add column "metadata" jsonb null;`);
    this.addSql(`alter table "plan" alter column "name" type varchar(100) using ("name"::varchar(100));`);
    this.addSql(`alter table "plan" alter column "description" type text using ("description"::text);`);
    this.addSql(`alter table "plan" alter column "description" drop not null;`);
    this.addSql(`alter table "plan" alter column "currency" type varchar(10) using ("currency"::varchar(10));`);
    this.addSql(`alter table "plan" alter column "features" type jsonb using ("features"::jsonb);`);
    this.addSql(`alter table "plan" alter column "features" drop not null;`);
    this.addSql(`create index "plan_created_at_index" on "plan" ("created_at");`);
    this.addSql(`create index "plan_stripe_price_id_index" on "plan" ("stripe_price_id");`);
    this.addSql(`create index "plan_status_index" on "plan" ("status");`);
    this.addSql(`create index "plan_is_active_index" on "plan" ("is_active");`);

    this.addSql(`create index "product_created_at_index" on "product" ("created_at");`);

    this.addSql(`create index "promotion_created_at_index" on "promotion" ("created_at");`);

    this.addSql(`create index "schedule_options_created_at_index" on "schedule_options" ("created_at");`);

    this.addSql(`alter table "user" drop column "rol";`);

    this.addSql(`alter table "user" add column "role" text check ("role" in ('standard', 'boss', 'premium', 'coach')) not null;`);
    this.addSql(`create index "user_created_at_index" on "user" ("created_at");`);
    this.addSql(`create index "user_email_index" on "user" ("email");`);

    this.addSql(`create index "training_task_created_at_index" on "training_task" ("created_at");`);

    this.addSql(`alter table "payment_method" drop column "card_brand", drop column "card_last4", drop column "card_exp_month", drop column "card_exp_year";`);

    this.addSql(`alter table "payment_method" add column "brand" varchar(20) null, add column "last4" varchar(4) null, add column "expiry_month" smallint null, add column "expiry_year" smallint null, add column "fingerprint" varchar(100) null, add column "country" varchar(50) null;`);
    this.addSql(`alter table "payment_method" alter column "stripe_payment_method_id" type varchar(100) using ("stripe_payment_method_id"::varchar(100));`);
    this.addSql(`alter table "payment_method" alter column "type" type text using ("type"::text);`);
    this.addSql(`alter table "payment_method" add constraint "payment_method_type_check" check("type" in ('card', 'sepa_debit', 'us_bank_account'));`);
    this.addSql(`alter table "payment_method" rename column "user_id" to "stripe_customer_id";`);
    this.addSql(`alter table "payment_method" add constraint "payment_method_stripe_customer_id_foreign" foreign key ("stripe_customer_id") references "stripe_customer" ("id") on update cascade;`);
    this.addSql(`create index "payment_method_created_at_index" on "payment_method" ("created_at");`);
    this.addSql(`create index "payment_method_stripe_payment_method_id_index" on "payment_method" ("stripe_payment_method_id");`);
    this.addSql(`alter table "payment_method" add constraint "payment_method_stripe_payment_method_id_unique" unique ("stripe_payment_method_id");`);
    this.addSql(`create index "payment_method_stripe_customer_id_index" on "payment_method" ("stripe_customer_id");`);
    this.addSql(`create index "payment_method_brand_index" on "payment_method" ("brand");`);
    this.addSql(`create index "payment_method_last4_index" on "payment_method" ("last4");`);
    this.addSql(`create index "payment_method_expiry_month_index" on "payment_method" ("expiry_month");`);
    this.addSql(`create index "payment_method_expiry_year_index" on "payment_method" ("expiry_year");`);
    this.addSql(`create index "payment_method_fingerprint_index" on "payment_method" ("fingerprint");`);

    this.addSql(`alter table "subscription" drop column "start_date", drop column "end_date";`);

    this.addSql(`alter table "subscription" add column "stripe_subscription_id" varchar(100) not null, add column "stripe_customer_id" uuid not null, add column "default_payment_method_id" uuid null, add column "current_period_start" timestamptz null, add column "current_period_end" timestamptz null, add column "trial_start" timestamptz null, add column "trial_end" timestamptz null, add column "canceled_at" timestamptz null, add column "cancel_at_period_end" boolean null, add column "ended_at" timestamptz null, add column "quantity" bigint null, add column "metadata" jsonb null;`);
    this.addSql(`alter table "subscription" alter column "status" type text using ("status"::text);`);
    this.addSql(`alter table "subscription" add constraint "subscription_stripe_customer_id_foreign" foreign key ("stripe_customer_id") references "stripe_customer" ("id") on update cascade;`);
    this.addSql(`alter table "subscription" add constraint "subscription_default_payment_method_id_foreign" foreign key ("default_payment_method_id") references "payment_method" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "subscription" add constraint "subscription_status_check" check("status" in ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused'));`);
    this.addSql(`create index "subscription_created_at_index" on "subscription" ("created_at");`);
    this.addSql(`create index "subscription_stripe_subscription_id_index" on "subscription" ("stripe_subscription_id");`);
    this.addSql(`create index "subscription_user_id_index" on "subscription" ("user_id");`);
    this.addSql(`create index "subscription_status_index" on "subscription" ("status");`);
    this.addSql(`create index "subscription_current_period_end_index" on "subscription" ("current_period_end");`);

    this.addSql(`create index "schedule_programmed_created_at_index" on "schedule_programmed" ("created_at");`);

    this.addSql(`create index "schedule_created_at_index" on "schedule" ("created_at");`);

    this.addSql(`create index "refresh_token_created_at_index" on "refresh_token" ("created_at");`);

    this.addSql(`create index "push_token_created_at_index" on "push_token" ("created_at");`);

    this.addSql(`create index "poll_created_at_index" on "poll" ("created_at");`);

    this.addSql(`create index "notification_created_at_index" on "notification" ("created_at");`);

    this.addSql(`create index "message_created_at_index" on "message" ("created_at");`);

    this.addSql(`alter table "transaction" drop column "payment_method", drop column "transaction_id", drop column "reference", drop column "transaction_date", drop column "auth_code";`);

    this.addSql(`alter table "transaction" add column "stripe_charge_id" varchar(100) null, add column "stripe_payment_intent_id" varchar(100) null, add column "invoice_id" uuid null, add column "type" text check ("type" in ('charge', 'refund', 'payment', 'subscription')) not null, add column "amount_refunded" bigint not null default 0, add column "failure_reason" text null, add column "metadata" jsonb null;`);
    this.addSql(`alter table "transaction" alter column "subscription_id" drop default;`);
    this.addSql(`alter table "transaction" alter column "subscription_id" type uuid using ("subscription_id"::text::uuid);`);
    this.addSql(`alter table "transaction" alter column "subscription_id" drop not null;`);
    this.addSql(`alter table "transaction" alter column "amount" type bigint using ("amount"::bigint);`);
    this.addSql(`alter table "transaction" alter column "currency" type varchar(10) using ("currency"::varchar(10));`);
    this.addSql(`alter table "transaction" alter column "currency" set default 'usd';`);
    this.addSql(`alter table "transaction" alter column "status" type text using ("status"::text);`);
    this.addSql(`alter table "transaction" alter column "description" type text using ("description"::text);`);
    this.addSql(`alter table "transaction" alter column "description" drop not null;`);
    this.addSql(`alter table "transaction" add constraint "transaction_invoice_id_foreign" foreign key ("invoice_id") references "invoice" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "transaction" add constraint "transaction_status_check" check("status" in ('pending', 'succeeded', 'failed', 'canceled', 'refunded', 'partially_refunded'));`);
    this.addSql(`alter table "transaction" rename column "card_id" to "payment_method_id";`);
    this.addSql(`alter table "transaction" add constraint "transaction_payment_method_id_foreign" foreign key ("payment_method_id") references "payment_method" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "transaction" add constraint "transaction_subscription_id_foreign" foreign key ("subscription_id") references "subscription" ("id") on update cascade on delete set null;`);
    this.addSql(`create index "transaction_created_at_index" on "transaction" ("created_at");`);
    this.addSql(`create index "transaction_stripe_charge_id_index" on "transaction" ("stripe_charge_id");`);
    this.addSql(`create index "transaction_user_id_index" on "transaction" ("user_id");`);
    this.addSql(`create index "transaction_invoice_id_index" on "transaction" ("invoice_id");`);
    this.addSql(`create index "transaction_type_index" on "transaction" ("type");`);
    this.addSql(`create index "transaction_status_index" on "transaction" ("status");`);

    this.addSql(`create index "user_weight_created_at_index" on "user_weight" ("created_at");`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "payment_method" drop constraint "payment_method_stripe_customer_id_foreign";`);

    this.addSql(`alter table "subscription" drop constraint "subscription_stripe_customer_id_foreign";`);

    this.addSql(`alter table "transaction" drop constraint "transaction_invoice_id_foreign";`);

    this.addSql(`drop table if exists "stripe_customer" cascade;`);

    this.addSql(`drop table if exists "invoice" cascade;`);

    this.addSql(`alter table "subscription" drop constraint if exists "subscription_status_check";`);

    this.addSql(`alter table "subscription" drop constraint "subscription_default_payment_method_id_foreign";`);

    this.addSql(`alter table "payment_method" drop constraint if exists "payment_method_type_check";`);

    this.addSql(`alter table "transaction" drop constraint if exists "transaction_status_check";`);

    this.addSql(`alter table "transaction" drop constraint "transaction_payment_method_id_foreign";`);
    this.addSql(`alter table "transaction" drop constraint "transaction_subscription_id_foreign";`);

    this.addSql(`drop index "plan_created_at_index";`);
    this.addSql(`drop index "plan_stripe_price_id_index";`);
    this.addSql(`drop index "plan_status_index";`);
    this.addSql(`drop index "plan_is_active_index";`);
    this.addSql(`alter table "plan" drop column "stripe_price_id", drop column "stripe_product_id", drop column "amount", drop column "interval", drop column "interval_count", drop column "trial_period_days", drop column "status", drop column "is_active", drop column "metadata";`);

    this.addSql(`alter table "plan" add column "price" int not null, add column "payment_type" varchar(255) not null, add column "duration_in_days" int not null default 0, add column "icon" varchar(255) not null default 'book', add column "is_best_choice" boolean not null default false;`);
    this.addSql(`alter table "plan" alter column "name" type varchar(255) using ("name"::varchar(255));`);
    this.addSql(`alter table "plan" alter column "description" type varchar(255) using ("description"::varchar(255));`);
    this.addSql(`alter table "plan" alter column "description" set not null;`);
    this.addSql(`alter table "plan" alter column "currency" type varchar(255) using ("currency"::varchar(255));`);
    this.addSql(`alter table "plan" alter column "features" type text[] using ("features"::text[]);`);
    this.addSql(`alter table "plan" alter column "features" set not null;`);
    this.addSql(`alter table "plan" add constraint "plan_name_unique" unique ("name");`);

    this.addSql(`drop index "product_created_at_index";`);

    this.addSql(`drop index "promotion_created_at_index";`);

    this.addSql(`drop index "schedule_options_created_at_index";`);

    this.addSql(`drop index "user_created_at_index";`);
    this.addSql(`drop index "user_email_index";`);
    this.addSql(`alter table "user" drop column "role";`);

    this.addSql(`alter table "user" add column "rol" varchar(255) not null;`);

    this.addSql(`drop index "training_task_created_at_index";`);

    this.addSql(`drop index "subscription_created_at_index";`);
    this.addSql(`drop index "subscription_stripe_subscription_id_index";`);
    this.addSql(`drop index "subscription_user_id_index";`);
    this.addSql(`drop index "subscription_status_index";`);
    this.addSql(`drop index "subscription_current_period_end_index";`);
    this.addSql(`alter table "subscription" drop column "stripe_subscription_id", drop column "stripe_customer_id", drop column "default_payment_method_id", drop column "current_period_start", drop column "current_period_end", drop column "trial_start", drop column "trial_end", drop column "canceled_at", drop column "cancel_at_period_end", drop column "ended_at", drop column "quantity", drop column "metadata";`);

    this.addSql(`alter table "subscription" add column "start_date" timestamptz not null, add column "end_date" timestamptz not null;`);
    this.addSql(`alter table "subscription" alter column "status" type varchar(255) using ("status"::varchar(255));`);

    this.addSql(`drop index "schedule_programmed_created_at_index";`);

    this.addSql(`drop index "schedule_created_at_index";`);

    this.addSql(`drop index "refresh_token_created_at_index";`);

    this.addSql(`drop index "push_token_created_at_index";`);

    this.addSql(`drop index "poll_created_at_index";`);

    this.addSql(`drop index "payment_method_created_at_index";`);
    this.addSql(`drop index "payment_method_stripe_payment_method_id_index";`);
    this.addSql(`alter table "payment_method" drop constraint "payment_method_stripe_payment_method_id_unique";`);
    this.addSql(`drop index "payment_method_stripe_customer_id_index";`);
    this.addSql(`drop index "payment_method_brand_index";`);
    this.addSql(`drop index "payment_method_last4_index";`);
    this.addSql(`drop index "payment_method_expiry_month_index";`);
    this.addSql(`drop index "payment_method_expiry_year_index";`);
    this.addSql(`drop index "payment_method_fingerprint_index";`);
    this.addSql(`alter table "payment_method" drop column "brand", drop column "last4", drop column "expiry_month", drop column "expiry_year", drop column "fingerprint", drop column "country";`);

    this.addSql(`alter table "payment_method" add column "card_brand" varchar(255) not null, add column "card_last4" varchar(255) not null, add column "card_exp_month" int not null, add column "card_exp_year" int not null;`);
    this.addSql(`alter table "payment_method" alter column "stripe_payment_method_id" type varchar(255) using ("stripe_payment_method_id"::varchar(255));`);
    this.addSql(`alter table "payment_method" alter column "type" type varchar(255) using ("type"::varchar(255));`);
    this.addSql(`alter table "payment_method" rename column "stripe_customer_id" to "user_id";`);

    this.addSql(`drop index "transaction_created_at_index";`);
    this.addSql(`drop index "transaction_stripe_charge_id_index";`);
    this.addSql(`drop index "transaction_user_id_index";`);
    this.addSql(`drop index "transaction_invoice_id_index";`);
    this.addSql(`drop index "transaction_type_index";`);
    this.addSql(`drop index "transaction_status_index";`);
    this.addSql(`alter table "transaction" drop column "stripe_charge_id", drop column "stripe_payment_intent_id", drop column "invoice_id", drop column "type", drop column "amount_refunded", drop column "failure_reason", drop column "metadata";`);

    this.addSql(`alter table "transaction" add column "payment_method" text check ("payment_method" in ('credit_card', 'apple_pay', 'google_pay')) not null, add column "transaction_id" varchar(255) not null, add column "reference" varchar(255) not null, add column "transaction_date" timestamptz not null, add column "auth_code" varchar(255) not null;`);
    this.addSql(`alter table "transaction" alter column "subscription_id" drop default;`);
    this.addSql(`alter table "transaction" alter column "subscription_id" type uuid using ("subscription_id"::text::uuid);`);
    this.addSql(`alter table "transaction" alter column "subscription_id" set not null;`);
    this.addSql(`alter table "transaction" alter column "status" type varchar(255) using ("status"::varchar(255));`);
    this.addSql(`alter table "transaction" alter column "amount" type int using ("amount"::int);`);
    this.addSql(`alter table "transaction" alter column "currency" drop default;`);
    this.addSql(`alter table "transaction" alter column "currency" type varchar(255) using ("currency"::varchar(255));`);
    this.addSql(`alter table "transaction" alter column "description" type varchar(255) using ("description"::varchar(255));`);
    this.addSql(`alter table "transaction" alter column "description" set not null;`);
    this.addSql(`alter table "transaction" rename column "payment_method_id" to "card_id";`);

    this.addSql(`drop index "notification_created_at_index";`);

    this.addSql(`drop index "message_created_at_index";`);

    this.addSql(`drop index "user_weight_created_at_index";`);
  }

}
