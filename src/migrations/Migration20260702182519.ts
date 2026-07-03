import { Migration } from '@mikro-orm/migrations';

export class Migration20260702182519 extends Migration {
  override async up(): Promise<void> {
    // article
    this.addSql(`ALTER TABLE "article" ALTER COLUMN "title" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "article" DROP CONSTRAINT IF EXISTS "article_title_not_null";`
    );
    this.addSql(
      `ALTER TABLE "article" ALTER COLUMN "published_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "article" DROP CONSTRAINT IF EXISTS "article_published_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "article" ALTER COLUMN "description" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "article" DROP CONSTRAINT IF EXISTS "article_description_not_null";`
    );
    this.addSql(`ALTER TABLE "article" ALTER COLUMN "link" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "article" DROP CONSTRAINT IF EXISTS "article_link_not_null";`
    );
    this.addSql(`ALTER TABLE "article" ALTER COLUMN "image" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "article" DROP CONSTRAINT IF EXISTS "article_image_not_null";`
    );

    // card
    this.addSql(`ALTER TABLE "card" ALTER COLUMN "created_at" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "card" DROP CONSTRAINT IF EXISTS "card_created_at_not_null";`
    );
    this.addSql(`ALTER TABLE "card" ALTER COLUMN "updated_at" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "card" DROP CONSTRAINT IF EXISTS "card_updated_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "card" ALTER COLUMN "stripe_payment_method_id" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "card" DROP CONSTRAINT IF EXISTS "card_stripe_payment_method_id_not_null";`
    );
    this.addSql(`ALTER TABLE "card" ALTER COLUMN "user_id" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "card" DROP CONSTRAINT IF EXISTS "card_user_id_not_null";`
    );
    this.addSql(`ALTER TABLE "card" ALTER COLUMN "card_brand" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "card" DROP CONSTRAINT IF EXISTS "card_card_brand_not_null";`
    );
    this.addSql(`ALTER TABLE "card" ALTER COLUMN "card_last4" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "card" DROP CONSTRAINT IF EXISTS "card_card_last4_not_null";`
    );
    this.addSql(
      `ALTER TABLE "card" ALTER COLUMN "card_exp_month" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "card" DROP CONSTRAINT IF EXISTS "card_card_exp_month_not_null";`
    );
    this.addSql(
      `ALTER TABLE "card" ALTER COLUMN "card_exp_year" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "card" DROP CONSTRAINT IF EXISTS "card_card_exp_year_not_null";`
    );
    this.addSql(`ALTER TABLE "card" ALTER COLUMN "status" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "card" DROP CONSTRAINT IF EXISTS "card_status_not_null";`
    );
    this.addSql(`ALTER TABLE "card" ALTER COLUMN "is_default" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "card" DROP CONSTRAINT IF EXISTS "card_is_default_not_null";`
    );

    // company
    this.addSql(
      `ALTER TABLE "company" ALTER COLUMN "created_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "company" DROP CONSTRAINT IF EXISTS "company_created_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "company" ALTER COLUMN "updated_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "company" DROP CONSTRAINT IF EXISTS "company_updated_at_not_null";`
    );
    this.addSql(`ALTER TABLE "company" ALTER COLUMN "name" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "company" DROP CONSTRAINT IF EXISTS "company_name_not_null";`
    );
    this.addSql(
      `ALTER TABLE "company" ALTER COLUMN "phone_number" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "company" DROP CONSTRAINT IF EXISTS "company_phone_number_not_null";`
    );
    this.addSql(`ALTER TABLE "company" ALTER COLUMN "email" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "company" DROP CONSTRAINT IF EXISTS "company_email_not_null";`
    );
    this.addSql(`ALTER TABLE "company" ALTER COLUMN "address" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "company" DROP CONSTRAINT IF EXISTS "company_address_not_null";`
    );
    this.addSql(
      `ALTER TABLE "company" ALTER COLUMN "is_validated" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "company" DROP CONSTRAINT IF EXISTS "company_is_validated_not_null";`
    );
    this.addSql(`ALTER TABLE "company" ALTER COLUMN "code" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "company" DROP CONSTRAINT IF EXISTS "company_code_not_null";`
    );

    // company_config
    this.addSql(
      `ALTER TABLE "company_config" ALTER COLUMN "created_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "company_config" DROP CONSTRAINT IF EXISTS "company_config_created_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "company_config" ALTER COLUMN "updated_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "company_config" DROP CONSTRAINT IF EXISTS "company_config_updated_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "company_config" ALTER COLUMN "polls_enabled" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "company_config" DROP CONSTRAINT IF EXISTS "company_config_polls_enabled_not_null";`
    );
    this.addSql(
      `ALTER TABLE "company_config" ALTER COLUMN "products_enabled" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "company_config" DROP CONSTRAINT IF EXISTS "company_config_products_enabled_not_null";`
    );
    this.addSql(
      `ALTER TABLE "company_config" ALTER COLUMN "chat_enabled" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "company_config" DROP CONSTRAINT IF EXISTS "company_config_chat_enabled_not_null";`
    );
    this.addSql(
      `ALTER TABLE "company_config" ALTER COLUMN "training_enabled" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "company_config" DROP CONSTRAINT IF EXISTS "company_config_training_enabled_not_null";`
    );
    this.addSql(
      `ALTER TABLE "company_config" ALTER COLUMN "auto_accept_users" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "company_config" DROP CONSTRAINT IF EXISTS "company_config_auto_accept_users_not_null";`
    );

    // customer
    this.addSql(
      `ALTER TABLE "customer" ALTER COLUMN "created_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "customer" DROP CONSTRAINT IF EXISTS "customer_created_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "customer" ALTER COLUMN "updated_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "customer" DROP CONSTRAINT IF EXISTS "customer_updated_at_not_null";`
    );
    this.addSql(`ALTER TABLE "customer" ALTER COLUMN "user_id" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "customer" DROP CONSTRAINT IF EXISTS "customer_user_id_not_null";`
    );
    this.addSql(
      `ALTER TABLE "customer" ALTER COLUMN "is_active" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "customer" DROP CONSTRAINT IF EXISTS "customer_is_active_not_null";`
    );
    this.addSql(
      `ALTER TABLE "customer" ALTER COLUMN "default_currency" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "customer" DROP CONSTRAINT IF EXISTS "customer_default_currency_not_null";`
    );

    // invoice
    this.addSql(
      `ALTER TABLE "invoice" ALTER COLUMN "created_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "invoice" DROP CONSTRAINT IF EXISTS "invoice_created_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "invoice" ALTER COLUMN "updated_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "invoice" DROP CONSTRAINT IF EXISTS "invoice_updated_at_not_null";`
    );
    this.addSql(`ALTER TABLE "invoice" ALTER COLUMN "user_id" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "invoice" DROP CONSTRAINT IF EXISTS "invoice_user_id_not_null";`
    );
    this.addSql(`ALTER TABLE "invoice" ALTER COLUMN "status" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "invoice" DROP CONSTRAINT IF EXISTS "invoice_status_not_null";`
    );
    this.addSql(`ALTER TABLE "invoice" ALTER COLUMN "subtotal" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "invoice" DROP CONSTRAINT IF EXISTS "invoice_subtotal_not_null";`
    );
    this.addSql(`ALTER TABLE "invoice" ALTER COLUMN "tax" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "invoice" DROP CONSTRAINT IF EXISTS "invoice_tax_not_null";`
    );
    this.addSql(`ALTER TABLE "invoice" ALTER COLUMN "total" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "invoice" DROP CONSTRAINT IF EXISTS "invoice_total_not_null";`
    );
    this.addSql(
      `ALTER TABLE "invoice" ALTER COLUMN "amount_paid" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "invoice" DROP CONSTRAINT IF EXISTS "invoice_amount_paid_not_null";`
    );
    this.addSql(
      `ALTER TABLE "invoice" ALTER COLUMN "amount_remaining" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "invoice" DROP CONSTRAINT IF EXISTS "invoice_amount_remaining_not_null";`
    );
    this.addSql(`ALTER TABLE "invoice" ALTER COLUMN "currency" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "invoice" DROP CONSTRAINT IF EXISTS "invoice_currency_not_null";`
    );

    // member_ship
    this.addSql(
      `ALTER TABLE "member_ship" ALTER COLUMN "created_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "member_ship" DROP CONSTRAINT IF EXISTS "member_ship_created_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "member_ship" ALTER COLUMN "updated_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "member_ship" DROP CONSTRAINT IF EXISTS "member_ship_updated_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "member_ship" ALTER COLUMN "user_id" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "member_ship" DROP CONSTRAINT IF EXISTS "member_ship_user_id_not_null";`
    );
    this.addSql(
      `ALTER TABLE "member_ship" ALTER COLUMN "company_id" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "member_ship" DROP CONSTRAINT IF EXISTS "member_ship_company_id_not_null";`
    );
    this.addSql(`ALTER TABLE "member_ship" ALTER COLUMN "role" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "member_ship" DROP CONSTRAINT IF EXISTS "member_ship_role_not_null";`
    );

    // message
    this.addSql(
      `ALTER TABLE "message" ALTER COLUMN "created_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "message_created_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "message" ALTER COLUMN "updated_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "message_updated_at_not_null";`
    );
    this.addSql(`ALTER TABLE "message" ALTER COLUMN "text" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "message_text_not_null";`
    );
    this.addSql(`ALTER TABLE "message" ALTER COLUMN "is_fixed" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "message_is_fixed_not_null";`
    );
    this.addSql(
      `ALTER TABLE "message" ALTER COLUMN "is_forum_message" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "message_is_forum_message_not_null";`
    );
    this.addSql(
      `ALTER TABLE "message" ALTER COLUMN "company_id" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "message_company_id_not_null";`
    );

    // notification
    this.addSql(
      `ALTER TABLE "notification" ALTER COLUMN "created_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "notification" DROP CONSTRAINT IF EXISTS "notification_created_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "notification" ALTER COLUMN "updated_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "notification" DROP CONSTRAINT IF EXISTS "notification_updated_at_not_null";`
    );
    this.addSql(`ALTER TABLE "notification" ALTER COLUMN "type" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "notification" DROP CONSTRAINT IF EXISTS "notification_type_not_null";`
    );
    this.addSql(
      `ALTER TABLE "notification" ALTER COLUMN "message" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "notification" DROP CONSTRAINT IF EXISTS "notification_message_not_null";`
    );
    this.addSql(
      `ALTER TABLE "notification" ALTER COLUMN "user_id" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "notification" DROP CONSTRAINT IF EXISTS "notification_user_id_not_null";`
    );
    this.addSql(
      `ALTER TABLE "notification" ALTER COLUMN "title" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "notification" DROP CONSTRAINT IF EXISTS "notification_title_not_null";`
    );
    this.addSql(`ALTER TABLE "notification" ALTER COLUMN "read" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "notification" DROP CONSTRAINT IF EXISTS "notification_read_not_null";`
    );

    // payment_method
    this.addSql(
      `ALTER TABLE "payment_method" ALTER COLUMN "created_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "payment_method" DROP CONSTRAINT IF EXISTS "payment_method_created_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "payment_method" ALTER COLUMN "updated_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "payment_method" DROP CONSTRAINT IF EXISTS "payment_method_updated_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "payment_method" ALTER COLUMN "customer_id" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "payment_method" DROP CONSTRAINT IF EXISTS "payment_method_customer_id_not_null";`
    );
    this.addSql(
      `ALTER TABLE "payment_method" ALTER COLUMN "type" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "payment_method" DROP CONSTRAINT IF EXISTS "payment_method_type_not_null";`
    );
    this.addSql(
      `ALTER TABLE "payment_method" ALTER COLUMN "status" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "payment_method" DROP CONSTRAINT IF EXISTS "payment_method_status_not_null";`
    );
    this.addSql(
      `ALTER TABLE "payment_method" ALTER COLUMN "is_default" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "payment_method" DROP CONSTRAINT IF EXISTS "payment_method_is_default_not_null";`
    );

    // permission
    this.addSql(
      `ALTER TABLE "permission" ALTER COLUMN "created_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "permission" DROP CONSTRAINT IF EXISTS "permission_created_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "permission" ALTER COLUMN "updated_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "permission" DROP CONSTRAINT IF EXISTS "permission_updated_at_not_null";`
    );
    this.addSql(`ALTER TABLE "permission" ALTER COLUMN "name" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "permission" DROP CONSTRAINT IF EXISTS "permission_name_not_null";`
    );
    this.addSql(`ALTER TABLE "permission" ALTER COLUMN "module" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "permission" DROP CONSTRAINT IF EXISTS "permission_module_not_null";`
    );
    this.addSql(`ALTER TABLE "permission" ALTER COLUMN "action" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "permission" DROP CONSTRAINT IF EXISTS "permission_action_not_null";`
    );
    this.addSql(
      `ALTER TABLE "permission" ALTER COLUMN "is_active" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "permission" DROP CONSTRAINT IF EXISTS "permission_is_active_not_null";`
    );

    // picture_url
    this.addSql(
      `ALTER TABLE "picture_url" ALTER COLUMN "created_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "picture_url" DROP CONSTRAINT IF EXISTS "picture_url_created_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "picture_url" ALTER COLUMN "updated_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "picture_url" DROP CONSTRAINT IF EXISTS "picture_url_updated_at_not_null";`
    );
    this.addSql(`ALTER TABLE "picture_url" ALTER COLUMN "name" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "picture_url" DROP CONSTRAINT IF EXISTS "picture_url_name_not_null";`
    );
    this.addSql(`ALTER TABLE "picture_url" ALTER COLUMN "url" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "picture_url" DROP CONSTRAINT IF EXISTS "picture_url_url_not_null";`
    );

    // plan
    this.addSql(`ALTER TABLE "plan" ALTER COLUMN "created_at" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "plan" DROP CONSTRAINT IF EXISTS "plan_created_at_not_null";`
    );
    this.addSql(`ALTER TABLE "plan" ALTER COLUMN "updated_at" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "plan" DROP CONSTRAINT IF EXISTS "plan_updated_at_not_null";`
    );
    this.addSql(`ALTER TABLE "plan" ALTER COLUMN "name" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "plan" DROP CONSTRAINT IF EXISTS "plan_name_not_null";`
    );
    this.addSql(`ALTER TABLE "plan" ALTER COLUMN "amount" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "plan" DROP CONSTRAINT IF EXISTS "plan_amount_not_null";`
    );
    this.addSql(`ALTER TABLE "plan" ALTER COLUMN "currency" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "plan" DROP CONSTRAINT IF EXISTS "plan_currency_not_null";`
    );
    this.addSql(`ALTER TABLE "plan" ALTER COLUMN "interval" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "plan" DROP CONSTRAINT IF EXISTS "plan_interval_not_null";`
    );
    this.addSql(
      `ALTER TABLE "plan" ALTER COLUMN "interval_count" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "plan" DROP CONSTRAINT IF EXISTS "plan_interval_count_not_null";`
    );
    this.addSql(`ALTER TABLE "plan" ALTER COLUMN "status" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "plan" DROP CONSTRAINT IF EXISTS "plan_status_not_null";`
    );
    this.addSql(`ALTER TABLE "plan" ALTER COLUMN "is_active" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "plan" DROP CONSTRAINT IF EXISTS "plan_is_active_not_null";`
    );

    // plan_permission
    this.addSql(
      `ALTER TABLE "plan_permission" ALTER COLUMN "created_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "plan_permission" DROP CONSTRAINT IF EXISTS "plan_permission_created_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "plan_permission" ALTER COLUMN "updated_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "plan_permission" DROP CONSTRAINT IF EXISTS "plan_permission_updated_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "plan_permission" ALTER COLUMN "plan_id" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "plan_permission" DROP CONSTRAINT IF EXISTS "plan_permission_plan_id_not_null";`
    );
    this.addSql(
      `ALTER TABLE "plan_permission" ALTER COLUMN "permission_id" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "plan_permission" DROP CONSTRAINT IF EXISTS "plan_permission_permission_id_not_null";`
    );
    this.addSql(
      `ALTER TABLE "plan_permission" ALTER COLUMN "is_active" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "plan_permission" DROP CONSTRAINT IF EXISTS "plan_permission_is_active_not_null";`
    );

    // poll
    this.addSql(`ALTER TABLE "poll" ALTER COLUMN "created_at" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "poll" DROP CONSTRAINT IF EXISTS "poll_created_at_not_null";`
    );
    this.addSql(`ALTER TABLE "poll" ALTER COLUMN "updated_at" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "poll" DROP CONSTRAINT IF EXISTS "poll_updated_at_not_null";`
    );
    this.addSql(`ALTER TABLE "poll" ALTER COLUMN "end_date" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "poll" DROP CONSTRAINT IF EXISTS "poll_end_date_not_null";`
    );
    this.addSql(`ALTER TABLE "poll" ALTER COLUMN "title" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "poll" DROP CONSTRAINT IF EXISTS "poll_title_not_null";`
    );
    this.addSql(`ALTER TABLE "poll" ALTER COLUMN "options" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "poll" DROP CONSTRAINT IF EXISTS "poll_options_not_null";`
    );
    this.addSql(`ALTER TABLE "poll" ALTER COLUMN "admin_id" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "poll" DROP CONSTRAINT IF EXISTS "poll_admin_id_not_null";`
    );
    this.addSql(`ALTER TABLE "poll" ALTER COLUMN "company_id" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "poll" DROP CONSTRAINT IF EXISTS "poll_company_id_not_null";`
    );

    // poll_vote
    this.addSql(
      `ALTER TABLE "poll_vote" ALTER COLUMN "option_selected" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "poll_vote" DROP CONSTRAINT IF EXISTS "poll_vote_option_selected_not_null";`
    );

    // product
    this.addSql(
      `ALTER TABLE "product" ALTER COLUMN "created_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "product" DROP CONSTRAINT IF EXISTS "product_created_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "product" ALTER COLUMN "updated_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "product" DROP CONSTRAINT IF EXISTS "product_updated_at_not_null";`
    );
    this.addSql(`ALTER TABLE "product" ALTER COLUMN "name" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "product" DROP CONSTRAINT IF EXISTS "product_name_not_null";`
    );
    this.addSql(
      `ALTER TABLE "product" ALTER COLUMN "description" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "product" DROP CONSTRAINT IF EXISTS "product_description_not_null";`
    );
    this.addSql(`ALTER TABLE "product" ALTER COLUMN "price" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "product" DROP CONSTRAINT IF EXISTS "product_price_not_null";`
    );
    this.addSql(
      `ALTER TABLE "product" ALTER COLUMN "company_id" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "product" DROP CONSTRAINT IF EXISTS "product_company_id_not_null";`
    );

    // promotion
    this.addSql(
      `ALTER TABLE "promotion" ALTER COLUMN "created_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "promotion" DROP CONSTRAINT IF EXISTS "promotion_created_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "promotion" ALTER COLUMN "updated_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "promotion" DROP CONSTRAINT IF EXISTS "promotion_updated_at_not_null";`
    );
    this.addSql(`ALTER TABLE "promotion" ALTER COLUMN "title" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "promotion" DROP CONSTRAINT IF EXISTS "promotion_title_not_null";`
    );
    this.addSql(
      `ALTER TABLE "promotion" ALTER COLUMN "start_date" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "promotion" DROP CONSTRAINT IF EXISTS "promotion_start_date_not_null";`
    );
    this.addSql(
      `ALTER TABLE "promotion" ALTER COLUMN "end_date" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "promotion" DROP CONSTRAINT IF EXISTS "promotion_end_date_not_null";`
    );
    this.addSql(`ALTER TABLE "promotion" ALTER COLUMN "price" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "promotion" DROP CONSTRAINT IF EXISTS "promotion_price_not_null";`
    );
    this.addSql(
      `ALTER TABLE "promotion" ALTER COLUMN "description" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "promotion" DROP CONSTRAINT IF EXISTS "promotion_description_not_null";`
    );

    // push_token
    this.addSql(
      `ALTER TABLE "push_token" ALTER COLUMN "created_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "push_token" DROP CONSTRAINT IF EXISTS "push_token_created_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "push_token" ALTER COLUMN "updated_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "push_token" DROP CONSTRAINT IF EXISTS "push_token_updated_at_not_null";`
    );
    this.addSql(`ALTER TABLE "push_token" ALTER COLUMN "token" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "push_token" DROP CONSTRAINT IF EXISTS "push_token_token_not_null";`
    );
    this.addSql(
      `ALTER TABLE "push_token" ALTER COLUMN "user_id" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "push_token" DROP CONSTRAINT IF EXISTS "push_token_user_id_not_null";`
    );

    // refresh_token
    this.addSql(
      `ALTER TABLE "refresh_token" ALTER COLUMN "created_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "refresh_token" DROP CONSTRAINT IF EXISTS "refresh_token_created_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "refresh_token" ALTER COLUMN "updated_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "refresh_token" DROP CONSTRAINT IF EXISTS "refresh_token_updated_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "refresh_token" ALTER COLUMN "user_id" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "refresh_token" DROP CONSTRAINT IF EXISTS "refresh_token_user_id_not_null";`
    );
    this.addSql(
      `ALTER TABLE "refresh_token" ALTER COLUMN "token" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "refresh_token" DROP CONSTRAINT IF EXISTS "refresh_token_token_not_null";`
    );
    this.addSql(
      `ALTER TABLE "refresh_token" ALTER COLUMN "expires_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "refresh_token" DROP CONSTRAINT IF EXISTS "refresh_token_expires_at_not_null";`
    );

    // schedule
    this.addSql(
      `ALTER TABLE "schedule" ALTER COLUMN "created_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule" DROP CONSTRAINT IF EXISTS "schedule_created_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "schedule" ALTER COLUMN "updated_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule" DROP CONSTRAINT IF EXISTS "schedule_updated_at_not_null";`
    );
    this.addSql(`ALTER TABLE "schedule" ALTER COLUMN "title" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "schedule" DROP CONSTRAINT IF EXISTS "schedule_title_not_null";`
    );
    this.addSql(
      `ALTER TABLE "schedule" ALTER COLUMN "start_date" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule" DROP CONSTRAINT IF EXISTS "schedule_start_date_not_null";`
    );
    this.addSql(`ALTER TABLE "schedule" ALTER COLUMN "end_date" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "schedule" DROP CONSTRAINT IF EXISTS "schedule_end_date_not_null";`
    );
    this.addSql(
      `ALTER TABLE "schedule" ALTER COLUMN "max_users" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule" DROP CONSTRAINT IF EXISTS "schedule_max_users_not_null";`
    );
    this.addSql(
      `ALTER TABLE "schedule" ALTER COLUMN "company_id" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule" DROP CONSTRAINT IF EXISTS "schedule_company_id_not_null";`
    );
    this.addSql(`ALTER TABLE "schedule" ALTER COLUMN "type" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "schedule" DROP CONSTRAINT IF EXISTS "schedule_type_not_null";`
    );
    this.addSql(`ALTER TABLE "schedule" ALTER COLUMN "state" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "schedule" DROP CONSTRAINT IF EXISTS "schedule_state_not_null";`
    );
    this.addSql(`ALTER TABLE "schedule" ALTER COLUMN "admin_id" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "schedule" DROP CONSTRAINT IF EXISTS "schedule_admin_id_not_null";`
    );
    this.addSql(
      `ALTER TABLE "schedule" ALTER COLUMN "notified_quota_thresholds" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule" DROP CONSTRAINT IF EXISTS "schedule_notified_quota_thresholds_not_null";`
    );

    // schedule_options
    this.addSql(
      `ALTER TABLE "schedule_options" ALTER COLUMN "created_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" DROP CONSTRAINT IF EXISTS "schedule_options_created_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" ALTER COLUMN "updated_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" DROP CONSTRAINT IF EXISTS "schedule_options_updated_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" ALTER COLUMN "max_active_reservations" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" DROP CONSTRAINT IF EXISTS "schedule_options_max_active_reservations_not_null";`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" ALTER COLUMN "max_advance_booking_days" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" DROP CONSTRAINT IF EXISTS "schedule_options_max_advance_booking_days_not_null";`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" ALTER COLUMN "same_day_booking_allowed" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" DROP CONSTRAINT IF EXISTS "schedule_options_same_day_booking_allowed_not_null";`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" ALTER COLUMN "full_open_hours" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" DROP CONSTRAINT IF EXISTS "schedule_options_full_open_hours_not_null";`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" ALTER COLUMN "booking_cutoff_minutes" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" DROP CONSTRAINT IF EXISTS "schedule_options_booking_cutoff_minutes_not_null";`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" ALTER COLUMN "min_bookings_required" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" DROP CONSTRAINT IF EXISTS "schedule_options_min_bookings_required_not_null";`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" ALTER COLUMN "quota_warning_thresholds" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" DROP CONSTRAINT IF EXISTS "schedule_options_quota_warning_thresholds_not_null";`
    );

    // schedule_programmed
    this.addSql(
      `ALTER TABLE "schedule_programmed" ALTER COLUMN "created_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" DROP CONSTRAINT IF EXISTS "schedule_programmed_created_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" ALTER COLUMN "updated_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" DROP CONSTRAINT IF EXISTS "schedule_programmed_updated_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" ALTER COLUMN "days_of_week" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" DROP CONSTRAINT IF EXISTS "schedule_programmed_days_of_week_not_null";`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" ALTER COLUMN "start_hour" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" DROP CONSTRAINT IF EXISTS "schedule_programmed_start_hour_not_null";`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" ALTER COLUMN "end_hour" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" DROP CONSTRAINT IF EXISTS "schedule_programmed_end_hour_not_null";`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" ALTER COLUMN "max_users" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" DROP CONSTRAINT IF EXISTS "schedule_programmed_max_users_not_null";`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" ALTER COLUMN "title" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" DROP CONSTRAINT IF EXISTS "schedule_programmed_title_not_null";`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" ALTER COLUMN "description" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" DROP CONSTRAINT IF EXISTS "schedule_programmed_description_not_null";`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" ALTER COLUMN "type" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" DROP CONSTRAINT IF EXISTS "schedule_programmed_type_not_null";`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" ALTER COLUMN "company_id" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" DROP CONSTRAINT IF EXISTS "schedule_programmed_company_id_not_null";`
    );

    // schedule_wait_list_users
    this.addSql(
      `ALTER TABLE "schedule_wait_list_users" ALTER COLUMN "schedule_id" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule_wait_list_users" DROP CONSTRAINT IF EXISTS "schedule_wait_list_users_schedule_id_not_null";`
    );
    this.addSql(
      `ALTER TABLE "schedule_wait_list_users" ALTER COLUMN "user_id" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "schedule_wait_list_users" DROP CONSTRAINT IF EXISTS "schedule_wait_list_users_user_id_not_null";`
    );

    // subscription
    this.addSql(
      `ALTER TABLE "subscription" ALTER COLUMN "created_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "subscription" DROP CONSTRAINT IF EXISTS "subscription_created_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "subscription" ALTER COLUMN "updated_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "subscription" DROP CONSTRAINT IF EXISTS "subscription_updated_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "subscription" ALTER COLUMN "user_id" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "subscription" DROP CONSTRAINT IF EXISTS "subscription_user_id_not_null";`
    );
    this.addSql(
      `ALTER TABLE "subscription" ALTER COLUMN "customer_id" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "subscription" DROP CONSTRAINT IF EXISTS "subscription_customer_id_not_null";`
    );
    this.addSql(
      `ALTER TABLE "subscription" ALTER COLUMN "plan_id" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "subscription" DROP CONSTRAINT IF EXISTS "subscription_plan_id_not_null";`
    );
    this.addSql(
      `ALTER TABLE "subscription" ALTER COLUMN "status" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "subscription" DROP CONSTRAINT IF EXISTS "subscription_status_not_null";`
    );
    this.addSql(
      `ALTER TABLE "subscription" ALTER COLUMN "failed_payment_attempts" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "subscription" DROP CONSTRAINT IF EXISTS "subscription_failed_payment_attempts_not_null";`
    );

    // training_task
    this.addSql(
      `ALTER TABLE "training_task" ALTER COLUMN "created_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "training_task" DROP CONSTRAINT IF EXISTS "training_task_created_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "training_task" ALTER COLUMN "updated_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "training_task" DROP CONSTRAINT IF EXISTS "training_task_updated_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "training_task" ALTER COLUMN "content" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "training_task" DROP CONSTRAINT IF EXISTS "training_task_content_not_null";`
    );
    this.addSql(
      `ALTER TABLE "training_task" ALTER COLUMN "repeat" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "training_task" DROP CONSTRAINT IF EXISTS "training_task_repeat_not_null";`
    );
    this.addSql(
      `ALTER TABLE "training_task" ALTER COLUMN "company_id" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "training_task" DROP CONSTRAINT IF EXISTS "training_task_company_id_not_null";`
    );

    // transaction
    this.addSql(
      `ALTER TABLE "transaction" ALTER COLUMN "created_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "transaction" DROP CONSTRAINT IF EXISTS "transaction_created_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "transaction" ALTER COLUMN "updated_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "transaction" DROP CONSTRAINT IF EXISTS "transaction_updated_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "transaction" ALTER COLUMN "user_id" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "transaction" DROP CONSTRAINT IF EXISTS "transaction_user_id_not_null";`
    );
    this.addSql(`ALTER TABLE "transaction" ALTER COLUMN "type" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "transaction" DROP CONSTRAINT IF EXISTS "transaction_type_not_null";`
    );
    this.addSql(
      `ALTER TABLE "transaction" ALTER COLUMN "status" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "transaction" DROP CONSTRAINT IF EXISTS "transaction_status_not_null";`
    );
    this.addSql(
      `ALTER TABLE "transaction" ALTER COLUMN "amount" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "transaction" DROP CONSTRAINT IF EXISTS "transaction_amount_not_null";`
    );
    this.addSql(
      `ALTER TABLE "transaction" ALTER COLUMN "amount_refunded" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "transaction" DROP CONSTRAINT IF EXISTS "transaction_amount_refunded_not_null";`
    );
    this.addSql(
      `ALTER TABLE "transaction" ALTER COLUMN "currency" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "transaction" DROP CONSTRAINT IF EXISTS "transaction_currency_not_null";`
    );

    // user
    this.addSql(`ALTER TABLE "user" ALTER COLUMN "created_at" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_created_at_not_null";`
    );
    this.addSql(`ALTER TABLE "user" ALTER COLUMN "updated_at" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_updated_at_not_null";`
    );
    this.addSql(`ALTER TABLE "user" ALTER COLUMN "email" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_email_not_null";`
    );
    this.addSql(`ALTER TABLE "user" ALTER COLUMN "nickname" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_nickname_not_null";`
    );
    this.addSql(`ALTER TABLE "user" ALTER COLUMN "is_active" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_is_active_not_null";`
    );
    this.addSql(`ALTER TABLE "user" ALTER COLUMN "is_blocked" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_is_blocked_not_null";`
    );
    this.addSql(`ALTER TABLE "user" ALTER COLUMN "is_verified" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_is_verified_not_null";`
    );
    this.addSql(
      `ALTER TABLE "user" ALTER COLUMN "is_admin_verified" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_is_admin_verified_not_null";`
    );
    this.addSql(
      `ALTER TABLE "user" ALTER COLUMN "is_super_admin" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_is_super_admin_not_null";`
    );

    // user_role
    this.addSql(
      `ALTER TABLE "user_role" ALTER COLUMN "created_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "user_role" DROP CONSTRAINT IF EXISTS "user_role_created_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "user_role" ALTER COLUMN "updated_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "user_role" DROP CONSTRAINT IF EXISTS "user_role_updated_at_not_null";`
    );
    this.addSql(`ALTER TABLE "user_role" ALTER COLUMN "user_id" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "user_role" DROP CONSTRAINT IF EXISTS "user_role_user_id_not_null";`
    );
    this.addSql(
      `ALTER TABLE "user_role" ALTER COLUMN "company_id" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "user_role" DROP CONSTRAINT IF EXISTS "user_role_company_id_not_null";`
    );
    this.addSql(`ALTER TABLE "user_role" ALTER COLUMN "role" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "user_role" DROP CONSTRAINT IF EXISTS "user_role_role_not_null";`
    );

    // user_weight
    this.addSql(
      `ALTER TABLE "user_weight" ALTER COLUMN "created_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "user_weight" DROP CONSTRAINT IF EXISTS "user_weight_created_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "user_weight" ALTER COLUMN "updated_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "user_weight" DROP CONSTRAINT IF EXISTS "user_weight_updated_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "user_weight" ALTER COLUMN "weight" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "user_weight" DROP CONSTRAINT IF EXISTS "user_weight_weight_not_null";`
    );
    this.addSql(`ALTER TABLE "user_weight" ALTER COLUMN "date" SET NOT NULL;`);
    this.addSql(
      `ALTER TABLE "user_weight" DROP CONSTRAINT IF EXISTS "user_weight_date_not_null";`
    );
    this.addSql(
      `ALTER TABLE "user_weight" ALTER COLUMN "company_id" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "user_weight" DROP CONSTRAINT IF EXISTS "user_weight_company_id_not_null";`
    );

    // webhook_event_log
    this.addSql(
      `ALTER TABLE "webhook_event_log" ALTER COLUMN "created_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "webhook_event_log" DROP CONSTRAINT IF EXISTS "webhook_event_log_created_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "webhook_event_log" ALTER COLUMN "updated_at" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "webhook_event_log" DROP CONSTRAINT IF EXISTS "webhook_event_log_updated_at_not_null";`
    );
    this.addSql(
      `ALTER TABLE "webhook_event_log" ALTER COLUMN "stripe_event_id" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "webhook_event_log" DROP CONSTRAINT IF EXISTS "webhook_event_log_stripe_event_id_not_null";`
    );
    this.addSql(
      `ALTER TABLE "webhook_event_log" ALTER COLUMN "event_type" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "webhook_event_log" DROP CONSTRAINT IF EXISTS "webhook_event_log_event_type_not_null";`
    );
    this.addSql(
      `ALTER TABLE "webhook_event_log" ALTER COLUMN "status" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "webhook_event_log" DROP CONSTRAINT IF EXISTS "webhook_event_log_status_not_null";`
    );
    this.addSql(
      `ALTER TABLE "webhook_event_log" ALTER COLUMN "payload" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "webhook_event_log" DROP CONSTRAINT IF EXISTS "webhook_event_log_payload_not_null";`
    );
    this.addSql(
      `ALTER TABLE "webhook_event_log" ALTER COLUMN "retry_count" SET NOT NULL;`
    );
    this.addSql(
      `ALTER TABLE "webhook_event_log" DROP CONSTRAINT IF EXISTS "webhook_event_log_retry_count_not_null";`
    );
  }

  override async down(): Promise<void> {
    // article
    this.addSql(
      `ALTER TABLE "article" ADD CONSTRAINT "article_title_not_null" CHECK (title IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "article" ADD CONSTRAINT "article_published_at_not_null" CHECK (published_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "article" ADD CONSTRAINT "article_description_not_null" CHECK (description IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "article" ADD CONSTRAINT "article_link_not_null" CHECK (link IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "article" ADD CONSTRAINT "article_image_not_null" CHECK (image IS NOT NULL);`
    );

    // card
    this.addSql(
      `ALTER TABLE "card" ADD CONSTRAINT "card_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "card" ADD CONSTRAINT "card_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "card" ADD CONSTRAINT "card_stripe_payment_method_id_not_null" CHECK (stripe_payment_method_id IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "card" ADD CONSTRAINT "card_user_id_not_null" CHECK (user_id IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "card" ADD CONSTRAINT "card_card_brand_not_null" CHECK (card_brand IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "card" ADD CONSTRAINT "card_card_last4_not_null" CHECK (card_last4 IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "card" ADD CONSTRAINT "card_card_exp_month_not_null" CHECK (card_exp_month IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "card" ADD CONSTRAINT "card_card_exp_year_not_null" CHECK (card_exp_year IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "card" ADD CONSTRAINT "card_status_not_null" CHECK (status IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "card" ADD CONSTRAINT "card_is_default_not_null" CHECK (is_default IS NOT NULL);`
    );

    // company
    this.addSql(
      `ALTER TABLE "company" ADD CONSTRAINT "company_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "company" ADD CONSTRAINT "company_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "company" ADD CONSTRAINT "company_name_not_null" CHECK (name IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "company" ADD CONSTRAINT "company_phone_number_not_null" CHECK (phone_number IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "company" ADD CONSTRAINT "company_email_not_null" CHECK (email IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "company" ADD CONSTRAINT "company_address_not_null" CHECK (address IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "company" ADD CONSTRAINT "company_is_validated_not_null" CHECK (is_validated IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "company" ADD CONSTRAINT "company_code_not_null" CHECK (code IS NOT NULL);`
    );

    // company_config
    this.addSql(
      `ALTER TABLE "company_config" ADD CONSTRAINT "company_config_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "company_config" ADD CONSTRAINT "company_config_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "company_config" ADD CONSTRAINT "company_config_polls_enabled_not_null" CHECK (polls_enabled IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "company_config" ADD CONSTRAINT "company_config_products_enabled_not_null" CHECK (products_enabled IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "company_config" ADD CONSTRAINT "company_config_chat_enabled_not_null" CHECK (chat_enabled IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "company_config" ADD CONSTRAINT "company_config_training_enabled_not_null" CHECK (training_enabled IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "company_config" ADD CONSTRAINT "company_config_auto_accept_users_not_null" CHECK (auto_accept_users IS NOT NULL);`
    );

    // customer
    this.addSql(
      `ALTER TABLE "customer" ADD CONSTRAINT "customer_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "customer" ADD CONSTRAINT "customer_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "customer" ADD CONSTRAINT "customer_user_id_not_null" CHECK (user_id IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "customer" ADD CONSTRAINT "customer_is_active_not_null" CHECK (is_active IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "customer" ADD CONSTRAINT "customer_default_currency_not_null" CHECK (default_currency IS NOT NULL);`
    );

    // invoice
    this.addSql(
      `ALTER TABLE "invoice" ADD CONSTRAINT "invoice_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "invoice" ADD CONSTRAINT "invoice_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "invoice" ADD CONSTRAINT "invoice_user_id_not_null" CHECK (user_id IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "invoice" ADD CONSTRAINT "invoice_status_not_null" CHECK (status IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "invoice" ADD CONSTRAINT "invoice_subtotal_not_null" CHECK (subtotal IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "invoice" ADD CONSTRAINT "invoice_tax_not_null" CHECK (tax IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "invoice" ADD CONSTRAINT "invoice_total_not_null" CHECK (total IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "invoice" ADD CONSTRAINT "invoice_amount_paid_not_null" CHECK (amount_paid IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "invoice" ADD CONSTRAINT "invoice_amount_remaining_not_null" CHECK (amount_remaining IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "invoice" ADD CONSTRAINT "invoice_currency_not_null" CHECK (currency IS NOT NULL);`
    );

    // member_ship
    this.addSql(
      `ALTER TABLE "member_ship" ADD CONSTRAINT "member_ship_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "member_ship" ADD CONSTRAINT "member_ship_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "member_ship" ADD CONSTRAINT "member_ship_user_id_not_null" CHECK (user_id IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "member_ship" ADD CONSTRAINT "member_ship_company_id_not_null" CHECK (company_id IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "member_ship" ADD CONSTRAINT "member_ship_role_not_null" CHECK (role IS NOT NULL);`
    );

    // message
    this.addSql(
      `ALTER TABLE "message" ADD CONSTRAINT "message_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "message" ADD CONSTRAINT "message_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "message" ADD CONSTRAINT "message_text_not_null" CHECK (text IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "message" ADD CONSTRAINT "message_is_fixed_not_null" CHECK (is_fixed IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "message" ADD CONSTRAINT "message_is_forum_message_not_null" CHECK (is_forum_message IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "message" ADD CONSTRAINT "message_company_id_not_null" CHECK (company_id IS NOT NULL);`
    );

    // notification
    this.addSql(
      `ALTER TABLE "notification" ADD CONSTRAINT "notification_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "notification" ADD CONSTRAINT "notification_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "notification" ADD CONSTRAINT "notification_type_not_null" CHECK (type IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "notification" ADD CONSTRAINT "notification_message_not_null" CHECK (message IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_not_null" CHECK (user_id IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "notification" ADD CONSTRAINT "notification_title_not_null" CHECK (title IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "notification" ADD CONSTRAINT "notification_read_not_null" CHECK (read IS NOT NULL);`
    );

    // payment_method
    this.addSql(
      `ALTER TABLE "payment_method" ADD CONSTRAINT "payment_method_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "payment_method" ADD CONSTRAINT "payment_method_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "payment_method" ADD CONSTRAINT "payment_method_customer_id_not_null" CHECK (customer_id IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "payment_method" ADD CONSTRAINT "payment_method_type_not_null" CHECK (type IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "payment_method" ADD CONSTRAINT "payment_method_status_not_null" CHECK (status IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "payment_method" ADD CONSTRAINT "payment_method_is_default_not_null" CHECK (is_default IS NOT NULL);`
    );

    // permission
    this.addSql(
      `ALTER TABLE "permission" ADD CONSTRAINT "permission_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "permission" ADD CONSTRAINT "permission_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "permission" ADD CONSTRAINT "permission_name_not_null" CHECK (name IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "permission" ADD CONSTRAINT "permission_module_not_null" CHECK (module IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "permission" ADD CONSTRAINT "permission_action_not_null" CHECK (action IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "permission" ADD CONSTRAINT "permission_is_active_not_null" CHECK (is_active IS NOT NULL);`
    );

    // picture_url
    this.addSql(
      `ALTER TABLE "picture_url" ADD CONSTRAINT "picture_url_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "picture_url" ADD CONSTRAINT "picture_url_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "picture_url" ADD CONSTRAINT "picture_url_name_not_null" CHECK (name IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "picture_url" ADD CONSTRAINT "picture_url_url_not_null" CHECK (url IS NOT NULL);`
    );

    // plan
    this.addSql(
      `ALTER TABLE "plan" ADD CONSTRAINT "plan_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "plan" ADD CONSTRAINT "plan_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "plan" ADD CONSTRAINT "plan_name_not_null" CHECK (name IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "plan" ADD CONSTRAINT "plan_amount_not_null" CHECK (amount IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "plan" ADD CONSTRAINT "plan_currency_not_null" CHECK (currency IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "plan" ADD CONSTRAINT "plan_interval_not_null" CHECK ("interval" IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "plan" ADD CONSTRAINT "plan_interval_count_not_null" CHECK (interval_count IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "plan" ADD CONSTRAINT "plan_status_not_null" CHECK (status IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "plan" ADD CONSTRAINT "plan_is_active_not_null" CHECK (is_active IS NOT NULL);`
    );

    // plan_permission
    this.addSql(
      `ALTER TABLE "plan_permission" ADD CONSTRAINT "plan_permission_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "plan_permission" ADD CONSTRAINT "plan_permission_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "plan_permission" ADD CONSTRAINT "plan_permission_plan_id_not_null" CHECK (plan_id IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "plan_permission" ADD CONSTRAINT "plan_permission_permission_id_not_null" CHECK (permission_id IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "plan_permission" ADD CONSTRAINT "plan_permission_is_active_not_null" CHECK (is_active IS NOT NULL);`
    );

    // poll
    this.addSql(
      `ALTER TABLE "poll" ADD CONSTRAINT "poll_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "poll" ADD CONSTRAINT "poll_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "poll" ADD CONSTRAINT "poll_end_date_not_null" CHECK (end_date IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "poll" ADD CONSTRAINT "poll_title_not_null" CHECK (title IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "poll" ADD CONSTRAINT "poll_options_not_null" CHECK (options IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "poll" ADD CONSTRAINT "poll_admin_id_not_null" CHECK (admin_id IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "poll" ADD CONSTRAINT "poll_company_id_not_null" CHECK (company_id IS NOT NULL);`
    );

    // poll_vote
    this.addSql(
      `ALTER TABLE "poll_vote" ADD CONSTRAINT "poll_vote_option_selected_not_null" CHECK (option_selected IS NOT NULL);`
    );

    // product
    this.addSql(
      `ALTER TABLE "product" ADD CONSTRAINT "product_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "product" ADD CONSTRAINT "product_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "product" ADD CONSTRAINT "product_name_not_null" CHECK (name IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "product" ADD CONSTRAINT "product_description_not_null" CHECK (description IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "product" ADD CONSTRAINT "product_price_not_null" CHECK (price IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "product" ADD CONSTRAINT "product_company_id_not_null" CHECK (company_id IS NOT NULL);`
    );

    // promotion
    this.addSql(
      `ALTER TABLE "promotion" ADD CONSTRAINT "promotion_title_not_null" CHECK (title IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "promotion" ADD CONSTRAINT "promotion_start_date_not_null" CHECK (start_date IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "promotion" ADD CONSTRAINT "promotion_end_date_not_null" CHECK (end_date IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "promotion" ADD CONSTRAINT "promotion_price_not_null" CHECK (price IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "promotion" ADD CONSTRAINT "promotion_description_not_null" CHECK (description IS NOT NULL);`
    );

    // push_token
    this.addSql(
      `ALTER TABLE "push_token" ADD CONSTRAINT "push_token_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "push_token" ADD CONSTRAINT "push_token_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "push_token" ADD CONSTRAINT "push_token_token_not_null" CHECK (token IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "push_token" ADD CONSTRAINT "push_token_user_id_not_null" CHECK (user_id IS NOT NULL);`
    );

    // refresh_token
    this.addSql(
      `ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_user_id_not_null" CHECK (user_id IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_token_not_null" CHECK (token IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_expires_at_not_null" CHECK (expires_at IS NOT NULL);`
    );

    // schedule
    this.addSql(
      `ALTER TABLE "schedule" ADD CONSTRAINT "schedule_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule" ADD CONSTRAINT "schedule_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule" ADD CONSTRAINT "schedule_title_not_null" CHECK (title IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule" ADD CONSTRAINT "schedule_start_date_not_null" CHECK (start_date IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule" ADD CONSTRAINT "schedule_end_date_not_null" CHECK (end_date IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule" ADD CONSTRAINT "schedule_max_users_not_null" CHECK (max_users IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule" ADD CONSTRAINT "schedule_company_id_not_null" CHECK (company_id IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule" ADD CONSTRAINT "schedule_type_not_null" CHECK (type IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule" ADD CONSTRAINT "schedule_state_not_null" CHECK (state IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule" ADD CONSTRAINT "schedule_admin_id_not_null" CHECK (admin_id IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule" ADD CONSTRAINT "schedule_notified_quota_thresholds_not_null" CHECK (notified_quota_thresholds IS NOT NULL);`
    );

    // schedule_options
    this.addSql(
      `ALTER TABLE "schedule_options" ADD CONSTRAINT "schedule_options_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" ADD CONSTRAINT "schedule_options_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" ADD CONSTRAINT "schedule_options_max_active_reservations_not_null" CHECK (max_active_reservations IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" ADD CONSTRAINT "schedule_options_max_advance_booking_days_not_null" CHECK (max_advance_booking_days IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" ADD CONSTRAINT "schedule_options_same_day_booking_allowed_not_null" CHECK (same_day_booking_allowed IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" ADD CONSTRAINT "schedule_options_full_open_hours_not_null" CHECK (full_open_hours IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" ADD CONSTRAINT "schedule_options_booking_cutoff_minutes_not_null" CHECK (booking_cutoff_minutes IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" ADD CONSTRAINT "schedule_options_min_bookings_required_not_null" CHECK (min_bookings_required IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule_options" ADD CONSTRAINT "schedule_options_quota_warning_thresholds_not_null" CHECK (quota_warning_thresholds IS NOT NULL);`
    );

    // schedule_programmed
    this.addSql(
      `ALTER TABLE "schedule_programmed" ADD CONSTRAINT "schedule_programmed_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" ADD CONSTRAINT "schedule_programmed_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" ADD CONSTRAINT "schedule_programmed_days_of_week_not_null" CHECK (days_of_week IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" ADD CONSTRAINT "schedule_programmed_start_hour_not_null" CHECK (start_hour IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" ADD CONSTRAINT "schedule_programmed_end_hour_not_null" CHECK (end_hour IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" ADD CONSTRAINT "schedule_programmed_max_users_not_null" CHECK (max_users IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" ADD CONSTRAINT "schedule_programmed_title_not_null" CHECK (title IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" ADD CONSTRAINT "schedule_programmed_description_not_null" CHECK (description IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" ADD CONSTRAINT "schedule_programmed_type_not_null" CHECK (type IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule_programmed" ADD CONSTRAINT "schedule_programmed_company_id_not_null" CHECK (company_id IS NOT NULL);`
    );

    // schedule_wait_list_users
    this.addSql(
      `ALTER TABLE "schedule_wait_list_users" ADD CONSTRAINT "schedule_wait_list_users_schedule_id_not_null" CHECK (schedule_id IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "schedule_wait_list_users" ADD CONSTRAINT "schedule_wait_list_users_user_id_not_null" CHECK (user_id IS NOT NULL);`
    );

    // subscription
    this.addSql(
      `ALTER TABLE "subscription" ADD CONSTRAINT "subscription_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "subscription" ADD CONSTRAINT "subscription_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_not_null" CHECK (user_id IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "subscription" ADD CONSTRAINT "subscription_customer_id_not_null" CHECK (customer_id IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "subscription" ADD CONSTRAINT "subscription_plan_id_not_null" CHECK (plan_id IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "subscription" ADD CONSTRAINT "subscription_status_not_null" CHECK (status IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "subscription" ADD CONSTRAINT "subscription_failed_payment_attempts_not_null" CHECK (failed_payment_attempts IS NOT NULL);`
    );

    // training_task
    this.addSql(
      `ALTER TABLE "training_task" ADD CONSTRAINT "training_task_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "training_task" ADD CONSTRAINT "training_task_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "training_task" ADD CONSTRAINT "training_task_content_not_null" CHECK (content IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "training_task" ADD CONSTRAINT "training_task_repeat_not_null" CHECK (repeat IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "training_task" ADD CONSTRAINT "training_task_company_id_not_null" CHECK (company_id IS NOT NULL);`
    );

    // transaction
    this.addSql(
      `ALTER TABLE "transaction" ADD CONSTRAINT "transaction_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "transaction" ADD CONSTRAINT "transaction_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "transaction" ADD CONSTRAINT "transaction_user_id_not_null" CHECK (user_id IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "transaction" ADD CONSTRAINT "transaction_type_not_null" CHECK (type IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "transaction" ADD CONSTRAINT "transaction_status_not_null" CHECK (status IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "transaction" ADD CONSTRAINT "transaction_amount_not_null" CHECK (amount IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "transaction" ADD CONSTRAINT "transaction_amount_refunded_not_null" CHECK (amount_refunded IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "transaction" ADD CONSTRAINT "transaction_currency_not_null" CHECK (currency IS NOT NULL);`
    );

    // user
    this.addSql(
      `ALTER TABLE "user" ADD CONSTRAINT "user_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "user" ADD CONSTRAINT "user_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "user" ADD CONSTRAINT "user_email_not_null" CHECK (email IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "user" ADD CONSTRAINT "user_nickname_not_null" CHECK (nickname IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "user" ADD CONSTRAINT "user_is_active_not_null" CHECK (is_active IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "user" ADD CONSTRAINT "user_is_blocked_not_null" CHECK (is_blocked IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "user" ADD CONSTRAINT "user_is_verified_not_null" CHECK (is_verified IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "user" ADD CONSTRAINT "user_is_admin_verified_not_null" CHECK (is_admin_verified IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "user" ADD CONSTRAINT "user_is_super_admin_not_null" CHECK (is_super_admin IS NOT NULL);`
    );

    // user_role
    this.addSql(
      `ALTER TABLE "user_role" ADD CONSTRAINT "user_role_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "user_role" ADD CONSTRAINT "user_role_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_not_null" CHECK (user_id IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "user_role" ADD CONSTRAINT "user_role_company_id_not_null" CHECK (company_id IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_not_null" CHECK (role IS NOT NULL);`
    );

    // user_weight
    this.addSql(
      `ALTER TABLE "user_weight" ADD CONSTRAINT "user_weight_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "user_weight" ADD CONSTRAINT "user_weight_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "user_weight" ADD CONSTRAINT "user_weight_weight_not_null" CHECK (weight IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "user_weight" ADD CONSTRAINT "user_weight_date_not_null" CHECK (date IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "user_weight" ADD CONSTRAINT "user_weight_company_id_not_null" CHECK (company_id IS NOT NULL);`
    );

    // webhook_event_log
    this.addSql(
      `ALTER TABLE "webhook_event_log" ADD CONSTRAINT "webhook_event_log_created_at_not_null" CHECK (created_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "webhook_event_log" ADD CONSTRAINT "webhook_event_log_updated_at_not_null" CHECK (updated_at IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "webhook_event_log" ADD CONSTRAINT "webhook_event_log_stripe_event_id_not_null" CHECK (stripe_event_id IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "webhook_event_log" ADD CONSTRAINT "webhook_event_log_event_type_not_null" CHECK (event_type IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "webhook_event_log" ADD CONSTRAINT "webhook_event_log_status_not_null" CHECK (status IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "webhook_event_log" ADD CONSTRAINT "webhook_event_log_payload_not_null" CHECK (payload IS NOT NULL);`
    );
    this.addSql(
      `ALTER TABLE "webhook_event_log" ADD CONSTRAINT "webhook_event_log_retry_count_not_null" CHECK (retry_count IS NOT NULL);`
    );
  }
}
